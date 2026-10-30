import './index.css';
import { useEffect, useRef, useState } from 'react';
import { initGame, stopGameLoop } from './game/main';
import { state } from './game/state';
import { initNetwork, broadcastTimeMode, sendChatMessage, myPlayerId } from './game/network';
import { updateBrightness, toggleMenu, updateArmoryHighlights } from './game/ui/UIUtils';
import { WEAPONS } from './game/config/weapons';
import { initAudio, decodeSounds } from './game/audio/AudioSys';
import { getActiveWeaponId } from './game/Utils';
import { buildWeaponMesh } from './game/weapons/WeaponBuilder';
import { globals } from './game/globals';
import { updateEnvironmentLighting } from './game/core/Engine';

interface ChatMessage {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
}

interface DeadTriggerAppProps {
    onBackToHub?: () => void;
}

export default function App({ onBackToHub }: DeadTriggerAppProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chatInputRef = useRef<HTMLInputElement>(null);
    const inited = useRef(false);
    const [started, setStarted] = useState(false);
    const [timeMode, setTimeMode] = useState<'auto' | 'night' | 'day'>(state.settings.timeMode);
    
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [fadedMessageIds, setFadedMessageIds] = useState<Record<string, boolean>>({});
    const [chatInputOpen, setChatInputOpen] = useState(false);
    const [chatInputValue, setChatInputValue] = useState('');
    const [performanceMode, setPerformanceMode] = useState(state.settings.disableRealisticGuns);

    useEffect(() => {
        if (!inited.current && canvasRef.current) {
            inited.current = true;
            state.gameMode = 'tester'; // Instantly jump to arena
            setStarted(true); // Ensure HUD shows
            initGame(canvasRef.current);
            initNetwork(); // Init multiplayer
            populateArmory();
            
            // Register callback to update React component state when timeMode is changed via network
            (globals as any).onTimeModeChanged = (mode: 'auto' | 'night' | 'day') => {
                setTimeMode(mode);
            };

            // Setup openGameChat hook
            (window as any).openGameChat = () => {
                (window as any).isChatting = true;
                setChatInputOpen(true);
                document.exitPointerLock();
            };

            // Hook into custom websocket chat messages
            (globals as any).onChatMessage = (senderId: string, text: string) => {
                const msgId = Math.random().toString(36).substring(2, 9);
                const isMe = senderId === myPlayerId;
                const formattedSender = isMe ? 'You' : `Player ${senderId.slice(0, 5)}`;
                
                const newMsg: ChatMessage = {
                    id: msgId,
                    sender: formattedSender,
                    text: text,
                    timestamp: Date.now()
                };

                setChatMessages(prev => [...prev, newMsg]);

                // Clear fade out for 7 seconds
                setTimeout(() => {
                    setFadedMessageIds(prev => ({ ...prev, [msgId]: true }));
                }, 7000);
            };

            // 3 seconds fade out after joining game
            setTimeout(() => {
                const help = document.querySelector('.controls-help');
                const tip = document.querySelector('.controls-trigger-tip');
                if (help && tip && !(window as any).controlsPinned) {
                    help.classList.add('hidden');
                    tip.classList.remove('hidden');
                }
            }, 3000);

            // Allow pointer lock on click instead of through a dedicated screen
            canvasRef.current.addEventListener('click', () => {
                if (!started) {
                    initAudio();
                    decodeSounds();
                }
                if (!(window as any).isChatting) {
                    document.body.requestPointerLock();
                }
            });

            return () => {
                stopGameLoop();
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
            };
        }
    }, [started]);

    useEffect(() => {
        if (chatInputOpen && chatInputRef.current) {
            chatInputRef.current.focus();
        }
    }, [chatInputOpen]);

    const handleSendChat = () => {
        const val = chatInputValue.trim();
        if (val) {
            sendChatMessage(val);
        }
        setChatInputValue('');
        setChatInputOpen(false);
        (window as any).isChatting = false;
        setTimeout(() => {
            document.body.requestPointerLock();
        }, 50);
    };

    const handleCancelChat = () => {
        setChatInputValue('');
        setChatInputOpen(false);
        (window as any).isChatting = false;
        setTimeout(() => {
            document.body.requestPointerLock();
        }, 50);
    };

    const populateArmory = () => {
        const cols: Record<string, HTMLElement | null> = { 
            sidearms: document.getElementById('col-sidearms'), 
            smg: document.getElementById('col-smg'), 
            ar: document.getElementById('col-ar'), 
            marksman: document.getElementById('col-marksman'), 
            sniper: document.getElementById('col-sniper'), 
            special: document.getElementById('col-special') 
        };
        const weaponsArr = Object.values(WEAPONS).map(w => {
            let rpm = 0, dmg = 0;
            if (w.modes) { 
                const autoMode = w.modes.find(m => m.type === 'auto') || w.modes[0]; 
                rpm = autoMode.rpm; dmg = autoMode.damage; 
            } else { 
                rpm = w.rpm || 600; dmg = w.damage || 10; 
            }
            return { ...w, displayRpm: rpm, displayDmg: dmg, dps: (rpm / 60) * dmg };
        }).sort((a, b) => {
            if (a.cat === 'marksman' && b.cat === 'marksman') {
                if (a.id === 'sks') return -1;
                if (b.id === 'sks') return 1;
            }
            return a.dps - b.dps;
        });

        weaponsArr.forEach(w => {
            if(cols[w.cat]) {
                const btn = document.createElement('div'); 
                btn.className = 'weapon-btn'; 
                btn.dataset.id = w.id; 
                const dpsText = w.dps > 10000 ? 'INF' : w.dps.toFixed(0);
                btn.innerHTML = `<span class="weapon-btn-name">${w.name}</span><span class="weapon-btn-stats">DMG: ${w.displayDmg} | RPM: ${w.displayRpm} | DPS: ${dpsText}</span>`;
                btn.onclick = () => {
                    if (w.cat === 'sidearms') { state.player.secondary = w.id; state.player.activeSlot = 2; } 
                    else { state.player.primary = w.id; state.player.activeSlot = 1; }
                    state.player.weaponMode = 0; state.player.burstsRemaining = 0;
                    const activeId = getActiveWeaponId(); const activeW = WEAPONS[activeId];
                    let modeText = activeW.modes ? ` (${activeW.modes[0].type.toUpperCase()})` : '';
                    const hwn = document.getElementById('hudWeaponName');
                    if (hwn) hwn.innerText = activeW.name + modeText;
                    buildWeaponMesh(activeId); 
                    toggleMenu(null);
                };
                cols[w.cat]!.appendChild(btn);
            }
        });
    };

    return (
        <>
            <div id="brightnessOverlay"></div>

            <div id="bulletDamageVignette" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 99,
                boxShadow: 'inset 0 0 100px rgba(255, 0, 0, 0.95), inset 0 0 50px rgba(200, 0, 0, 0.9)',
                opacity: 0,
                display: 'none',
                transition: 'opacity 0.05s ease-out'
            }}></div>

            <canvas id="gameCanvas" ref={canvasRef}></canvas>
            
            {/* Top-Left Hub Escape Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (document.pointerLockElement) {
                        document.exitPointerLock();
                    }
                    if (onBackToHub) {
                        onBackToHub();
                    }
                }}
                style={{
                    position: 'fixed',
                    top: '12px',
                    left: '12px',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: 'rgba(10, 12, 10, 0.94)',
                    color: '#f0f4f0',
                    border: '1px solid rgba(255, 255, 255, 0.28)',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.15s ease'
                }}
                title="Return to Hub (Press Control to unlock cursor)"
            >
                <span>⬅️</span>
                <span>Hub</span>
                <span style={{ fontSize: '0.7rem', color: '#888', marginLeft: '4px' }}>[Ctrl]</span>
            </button>

            <div id="crosshair"></div>
            <div id="fpsCounter" style={{
                position: 'absolute',
                top: '15px',
                left: '115px',
                fontFamily: "'Orbitron', monospace",
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.9)',
                pointerEvents: 'none',
                zIndex: 100
            }}>FPS: --</div>
            <div id="scopeOverlay">
                <div className="scope-line horizontal"></div>
                <div className="scope-line vertical"></div>
                <div className="scope-circle"></div>
            </div>

            <div id="dlqScopeOverlay" className="sniper-scope">
                <div className="scope-vignette"></div>
                <div className="scope-markings green">
                    <div className="reticle-center"></div>
                    <div className="reticle-horizontal"></div>
                    <div className="reticle-vertical"></div>
                    <div className="reticle-ring"></div>
                    <div id="dlqZoomLevel" style={{
                        position: 'absolute',
                        bottom: '20%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontFamily: "'JetBrains Mono', monospace",
                        color: '#39ff14',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        letterSpacing: '1px',
                        textShadow: '0 0 4px rgba(57, 255, 20, 0.6)',
                        pointerEvents: 'none'
                    }}>[B] ZOOM: 20x</div>
                </div>
            </div>

            <div id="tundraScopeOverlay" className="sniper-scope">
                <div className="scope-vignette blue-tint"></div>
                <div className="scope-markings blue">
                    <div className="reticle-center"></div>
                    <div className="reticle-horizontal fine"></div>
                    <div className="reticle-vertical fine"></div>
                    <div className="reticle-outer-ring"></div>
                </div>
            </div>

            <div id="karScopeOverlay" className="sniper-scope">
                <div className="scope-vignette brown-tint"></div>
                <div className="scope-markings brown">
                    <div className="reticle-center"></div>
                    <div className="reticle-horizontal"></div>
                    <div className="reticle-vertical"></div>
                    <div className="reticle-crosshair-lines"></div>
                </div>
            </div>

            <div className="hud-container">
                <div className="hud-panel" id="hudPlayerHealthPanel" style={{ display: 'flex', flexDirection: 'column', width: '135px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: '#39ff14', fontWeight: 'bold', fontFamily: 'monospace' }}>HP</span>
                        <span className="hud-text-large" id="hudPlayerHealthText" style={{ fontSize: '0.8rem', color: '#39ff14', fontFamily: 'monospace' }}>1000 HP</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: 'rgba(57, 255, 20, 0.1)', border: '1px solid rgba(57, 255, 20, 0.3)', borderRadius: '2px', marginTop: '3px', overflow: 'hidden' }}>
                        <div id="hudPlayerHealthBar" style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #39ff14, #1b8a0a)', transition: 'width 0.2s ease-out' }}></div>
                    </div>
                </div>
                <div className="hud-panel">
                    <span className="hud-text-large" id="hudWeaponName" style={{ fontSize: '0.78rem' }}>M1911 Pistol</span>
                </div>
                <div className="hud-panel" id="hudZombiesKilled" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>KILLS</span>
                    <span className="hud-text-large" id="hudZombieCount" style={{ fontSize: '0.8rem' }}>0</span>
                </div>
            </div>

            <div className="interaction-prompt" id="interactionPrompt">Press [F] to Open Armory</div>

            {/* Chat Overlay */}
            <div id="gameChatArea" className={chatInputOpen ? 'chat-container-active' : ''}>
                <div id="gameChatHistory">
                    {chatMessages.map(msg => (
                        <div key={msg.id} className={`chat-message ${fadedMessageIds[msg.id] ? 'faded' : ''}`}>
                            <span style={{ color: msg.sender === 'You' ? '#ffcc00' : 'var(--neon-accent)', fontWeight: 'bold' }}>
                                [{msg.sender}]
                            </span>
                            : {msg.text}
                        </div>
                    ))}
                </div>
                {chatInputOpen && (
                    <input
                        ref={chatInputRef}
                        id="gameChatInput"
                        type="text"
                        placeholder="Type a message & press Enter..."
                        value={chatInputValue}
                        onChange={(e) => setChatInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSendChat();
                                e.stopPropagation();
                            } else if (e.key === 'Escape') {
                                handleCancelChat();
                                e.stopPropagation();
                            }
                        }}
                    />
                )}
            </div>

            <div className="controls-help">
                [W,A,S,D]: Move | [SPACE]: Jump | [SHIFT]: Run<br/>
                [C]: Slide | [SCROLL WHEEL]: Swap Weapons<br/>
                [LEFT CLICK]: Shoot | [RIGHT CLICK]: ADS (Aim)<br/>
                [B]: Toggle Fire Mode | [F]: Armory |[P]: Settings Menu<br/>
                [T]: Toggle Spawns | [ESC]: Pause
            </div>

            <div 
                className="controls-trigger-tip hidden"
                title="Press [?] to toggle controls"
                onClick={() => {
                    const help = document.querySelector('.controls-help');
                    const tip = document.querySelector('.controls-trigger-tip');
                    if (help && tip) {
                        (window as any).controlsPinned = !(window as any).controlsPinned;
                        help.classList.toggle('hidden', !(window as any).controlsPinned);
                        tip.classList.toggle('hidden', (window as any).controlsPinned);
                    }
                }}
            >
                ?
            </div>

            {/* Modals */}
            <div className="modal-overlay" id="shopModal">
                <div className="modal-window">
                    <div className="modal-header" style={{ color: '#ff2525', textShadow: '0 0 15px rgba(255, 37, 37, 0.45)', borderBottom: '1px solid rgba(170, 0, 0, 0.3)' }}>☣️ BATTLEFIELD ARMORY</div>
                    <div className="armory-layout">
                        <div className="armory-column" id="col-sidearms"><div className="column-title">Sidearms (Slot 2)</div></div>
                        <div className="armory-column" id="col-smg"><div className="column-title">SMGs</div></div>
                        <div className="armory-column" id="col-ar"><div className="column-title">Assault Rifles</div></div>
                        <div className="armory-column" id="col-marksman"><div className="column-title">Marksman</div></div>
                        <div className="armory-column" id="col-sniper"><div className="column-title">Snipers</div></div>
                        <div className="armory-column" id="col-special"><div className="column-title">Special</div></div>
                    </div>
                    <div style={{ textAlign: 'center', color: '#7d8a83', fontFamily: 'Special Elite', marginTop: '10px' }}>[ SELECT PROTOCOL WEAPON • ESC OR F TO RESIGN ]</div>
                </div>
            </div>

            <div className="modal-overlay" id="probModal">
                <div className="modal-window" style={{ width: '500px', height: 'auto' }}>
                    <div className="modal-header" style={{ color: '#39ff14', textShadow: '0 0 15px rgba(57, 255, 20, 0.4)', borderBottom: '1px solid rgba(57,255,20,0.2)' }}>⚙️ BIOMETRIC INTEGRATION</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '25px', background: 'rgba(10, 15, 10, 0.85)', border: '1px solid rgba(57, 255, 20, 0.15)', borderRadius: '6px' }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <label style={{ color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', width: '170px', fontFamily: 'Bebas Neue', letterSpacing: '1px', fontSize: '1.2rem' }}>Spawn Chance:</label>
                            <input type="range" id="probSlider" min="0" max="100" defaultValue="10" style={{ flexGrow: 1, cursor: 'pointer' }} onChange={(e) => {
                                state.gameplay.prob = parseInt(e.target.value) / 100;
                                const d = document.getElementById('probValueDisplay');
                                if (d) d.innerText = e.target.value + "%";
                             }} />
                            <span id="probValueDisplay" style={{ color: 'var(--neon-accent)', fontWeight: 'bold', width: '50px', textAlign: 'right', fontFamily: 'Orbitron' }}>10%</span>
                        </div>
 
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <label style={{ color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', width: '170px', fontFamily: 'Bebas Neue', letterSpacing: '1px', fontSize: '1.2rem' }}>Gun Brightness:</label>
                            <input type="range" id="gunBrightSlider" min="1" max="10" step="0.5" defaultValue="2" style={{ flexGrow: 1, cursor: 'pointer' }} onChange={(e) => {
                                 state.settings.gunBrightness = parseFloat(e.target.value);
                                 const d = document.getElementById('gunBrightValueDisplay');
                                 if (d) d.innerText = e.target.value;
                                 if (globals.gunAmbientLight) {
                                     globals.gunAmbientLight.intensity = Math.max(0, state.settings.gunBrightness - 1);
                                 }
                             }} />
                            <span id="gunBrightValueDisplay" style={{ color: 'var(--neon-accent)', fontWeight: 'bold', width: '50px', textAlign: 'right', fontFamily: 'Orbitron' }}>2</span>
                        </div>
 
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <label style={{ color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', width: '170px', fontFamily: 'Bebas Neue', letterSpacing: '1px', fontSize: '1.2rem' }}>Day Env Brightness:</label>
                            <input type="range" id="envBrightSlider" min="0" max="1.4" step="0.05" defaultValue="0.4" style={{ flexGrow: 1, cursor: 'pointer' }} onChange={(e) => {
                                 state.settings.envBrightness = parseFloat(e.target.value);
                                 const d = document.getElementById('envBrightValueDisplay');
                                 if (d) d.innerText = e.target.value;
                             }} />
                            <span id="envBrightValueDisplay" style={{ color: 'var(--neon-accent)', fontWeight: 'bold', width: '50px', textAlign: 'right', fontFamily: 'Orbitron' }}>0.4</span>
                        </div>
 
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <label style={{ color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', width: '170px', fontFamily: 'Bebas Neue', letterSpacing: '1px', fontSize: '1.2rem' }}>Gun Metalness:</label>
                            <input type="range" id="gunMetalSlider" min="0" max="100" defaultValue="97" style={{ flexGrow: 1, cursor: 'pointer' }} onChange={(e) => {
                                 state.settings.gunMetalness = parseInt(e.target.value) / 100;
                                 const d = document.getElementById('gunMetalValueDisplay');
                                 if (d) d.innerText = e.target.value + "%";
                                 if (globals.currentWeaponMesh) {
                                     globals.currentWeaponMesh.traverse((child: any) => {
                                         if (child.isMesh && child.material) {
                                             const mats = Array.isArray(child.material) ? child.material : [child.material];
                                             mats.forEach((m: any) => {
                                                 if (m.metalness !== undefined) m.metalness = state.settings.gunMetalness;
                                             });
                                         }
                                     });
                                 }
                             }} />
                            <span id="gunMetalValueDisplay" style={{ color: 'var(--neon-accent)', fontWeight: 'bold', width: '50px', textAlign: 'right', fontFamily: 'Orbitron' }}>97%</span>
                        </div>
 
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <label style={{ color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', width: '170px', fontFamily: 'Bebas Neue', letterSpacing: '1px', fontSize: '1.2rem' }}>Gun Volume:</label>
                            <input type="range" id="volSlider" min="0" max="100" defaultValue="50" style={{ flexGrow: 1, cursor: 'pointer' }} onChange={(e) => {
                                 state.settings.gunVolume = (parseInt(e.target.value) / 100) * 0.2;
                                 const d = document.getElementById('volValueDisplay');
                                 if (d) d.innerText = e.target.value + "%";
                             }} />
                            <span id="volValueDisplay" style={{ color: 'var(--neon-accent)', fontWeight: 'bold', width: '50px', textAlign: 'right', fontFamily: 'Orbitron' }}>50%</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <label style={{ color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', width: '170px', fontFamily: 'Bebas Neue', letterSpacing: '1px', fontSize: '1.2rem' }}>Performance:</label>
                            <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '30px' }}>
                                <input 
                                    type="checkbox" 
                                    checked={performanceMode} 
                                    onChange={(e) => {
                                        const newVal = e.target.checked;
                                        setPerformanceMode(newVal);
                                        state.settings.disableRealisticGuns = newVal;
                                        buildWeaponMesh(getActiveWeaponId());
                                        if (globals.renderer) {
                                            globals.renderer.setPixelRatio(newVal ? 1.0 : window.devicePixelRatio);
                                            globals.renderer.setSize(window.innerWidth, window.innerHeight);
                                        }
                                        updateEnvironmentLighting();
                                    }} 
                                    style={{ opacity: 0, width: 0, height: 0 }} 
                                />
                                <span style={{
                                    position: 'absolute',
                                    cursor: 'pointer',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: performanceMode ? '#1b8a0a' : '#444',
                                    boxShadow: performanceMode ? '0 0 10px rgba(57, 255, 20, 0.4)' : 'none',
                                    transition: '0.3s',
                                    borderRadius: '15px',
                                    border: '1px solid rgba(57, 255, 20, 0.3)'
                                }}>
                                    <span style={{
                                        position: 'absolute',
                                        content: "''",
                                        height: '22px', width: '22px',
                                        left: performanceMode ? '32px' : '4px',
                                        bottom: '3px',
                                        backgroundColor: '#fff',
                                        transition: '0.3s',
                                        borderRadius: '50%'
                                    }} />
                                </span>
                            </label>
                            <span style={{ color: 'var(--neon-accent)', fontWeight: 'bold', fontFamily: 'Orbitron', fontSize: '0.9rem' }}>
                                {performanceMode ? 'ON' : 'OFF'}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ flexGrow: 1, position: 'relative', height: '34px', background: 'rgba(20, 30, 20, 0.9)', borderRadius: '17px', border: '1px solid rgba(57, 255, 20, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px', cursor: 'pointer', width: '100%' }}>
                                <div onClick={() => { state.settings.timeMode = 'auto'; setTimeMode('auto'); updateEnvironmentLighting(); broadcastTimeMode('auto'); }} style={{ flex: 1, textAlign: 'center', color: timeMode === 'auto' ? '#39ff14' : '#666', fontSize: '0.8rem', fontFamily: 'Orbitron', fontWeight: 'bold', zIndex: 2, userSelect: 'none' }}>AUTO</div>
                                <div onClick={() => { state.settings.timeMode = 'night'; setTimeMode('night'); updateEnvironmentLighting(); broadcastTimeMode('night'); }} style={{ flex: 1, textAlign: 'center', color: timeMode === 'night' ? '#39ff14' : '#666', fontSize: '0.8rem', fontFamily: 'Orbitron', fontWeight: 'bold', zIndex: 2, userSelect: 'none' }}>NIGHT</div>
                                <div onClick={() => { state.settings.timeMode = 'day'; setTimeMode('day'); updateEnvironmentLighting(); broadcastTimeMode('day'); }} style={{ flex: 1, textAlign: 'center', color: timeMode === 'day' ? '#39ff14' : '#666', fontSize: '0.8rem', fontFamily: 'Orbitron', fontWeight: 'bold', zIndex: 2, userSelect: 'none' }}>DAY</div>
                                
                                <div style={{
                                     position: 'absolute',
                                     top: '4px',
                                     left: timeMode === 'auto' ? '4px' : timeMode === 'night' ? 'calc(50% - 47px)' : 'calc(100% - 94px - 4px)',
                                     width: '94px',
                                     height: '24px',
                                     background: 'linear-gradient(135deg, #39ff14, #1b8a0a)',
                                     borderRadius: '12px',
                                     boxShadow: '0 0 10px rgba(57, 255, 20, 0.5)',
                                     transition: 'left 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                     pointerEvents: 'none',
                                     zIndex: 1
                                }} />
                            </div>
                        </div>

                    </div>

                    <div style={{ textAlign: 'center', color: '#7d8a83', fontFamily: 'Special Elite', marginTop: '10px' }}>[ CLOSE DIALOG - ESC OR P ]</div>
                </div>
            </div>
 
            <div className="modal-overlay" id="brightModal">
                <div className="modal-window" style={{ width: '500px', height: 'auto' }}>
                    <div className="modal-header" style={{ color: '#ff6a00', textShadow: '0 0 15px rgba(255, 106, 0, 0.4)', borderBottom: '1px solid rgba(255,106,0,0.2)' }}>🖥️ VIDEO DECK TUNER</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '25px', background: 'rgba(15, 10, 5, 0.85)', border: '1px solid rgba(255, 106, 0, 0.15)', borderRadius: '6px' }}>
                        <label style={{ color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', fontFamily: 'Bebas Neue', letterSpacing: '1px', fontSize: '1.2rem' }}>Brightness:</label>
                        <input type="range" id="brightSlider" min="0" max="100" defaultValue="40" style={{ flexGrow: 1, cursor: 'pointer' }} onChange={(e) => {
                             const d = document.getElementById('brightValueDisplay');
                             if (d) d.innerText = e.target.value + "%";
                             updateBrightness();
                         }} />
                        <span id="brightValueDisplay" style={{ color: 'var(--neon-accent)', fontWeight: 'bold', width: '50px', textAlign: 'right', fontFamily: 'Orbitron' }}>40%</span>
                    </div>
                    <div style={{ textAlign: 'center', color: '#7d8a83', fontFamily: 'Special Elite', marginTop: '10px' }}>[ CLOSE DIALOG - ESC OR P ]</div>
                </div>
            </div>

            {/* Premium Death Screen Overlay */}
            <div id="playerDeathScreen" className="modal-overlay animate-fade-in" style={{
                display: 'none',
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(10, 0, 0, 0.95)',
                zIndex: 9999,
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#ff2525',
                backdropFilter: 'blur(10px)',
                transition: 'opacity 0.3s ease-in-out'
            }}>
                <div style={{
                    fontSize: '4.5rem',
                    fontWeight: '900',
                    letterSpacing: '6px',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    color: '#ff2525',
                    textShadow: '0 0 30px rgba(255, 37, 37, 0.85), 0 0 10px rgba(255, 0, 0, 0.5)',
                    marginBottom: '10px',
                    fontFamily: 'Orbitron, sans-serif'
                }}>
                    YOU HAVE DIED
                </div>
                
                <div id="deathCountdownText" style={{
                    fontSize: '1.25rem',
                    color: '#ffaa00',
                    textShadow: '0 0 10px rgba(255, 170, 0, 0.4)',
                    marginBottom: '35px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    letterSpacing: '2px',
                    textTransform: 'uppercase'
                }}>
                    RESPAWNING IN 3...
                </div>

                <button
                    onClick={() => {
                        if ((globals as any).respawnPlayer) {
                            (globals as any).respawnPlayer();
                        }
                    }}
                    style={{
                        padding: '12px 34px',
                        background: 'linear-gradient(135deg, #ff2525 0%, #a00000 100%)',
                        border: '2px solid rgba(255, 37, 37, 0.6)',
                        borderRadius: '4px',
                        color: 'white',
                        fontFamily: 'Orbitron, sans-serif',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        letterSpacing: '2px',
                        cursor: 'pointer',
                        boxShadow: '0 0 15px rgba(255, 37, 37, 0.35)',
                        transition: 'all 0.2s ease-out'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 37, 37, 0.7)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 37, 37, 0.35)';
                        e.currentTarget.style.transform = 'none';
                    }}
                >
                    RESPAWN PROTOCOL
                </button>
            </div>

        </>
    );
}
