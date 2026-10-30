import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { User } from '../services/firebase';
import { initGame } from './deadtrigger/main';
import { stopGameLoop, updateEnvironmentLighting } from './deadtrigger/core/Engine';
import { state } from './deadtrigger/state';
import { globals } from './deadtrigger/globals';
import { WEAPONS } from './deadtrigger/config/weapons';
import { initAudio, decodeSounds } from './deadtrigger/audio/AudioSys';
import { getActiveWeaponId } from './deadtrigger/Utils';
import { buildWeaponMesh } from './deadtrigger/weapons/WeaponBuilder';
import { toggleMenu, updateBrightness } from './deadtrigger/ui/UIUtils';
import './deadtrigger/deadtrigger.css';

interface DeadTriggerGameProps {
  onBackToHub: () => void;
  user: User;
  username?: string | null;
}

export default function DeadTriggerGame({ onBackToHub }: DeadTriggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inited = useRef(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [timeMode, setTimeMode] = useState<'auto' | 'night' | 'day'>('auto');
  const [performanceMode, setPerformanceMode] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);

  // Initialize Dead Trigger engine
  useEffect(() => {
    if (!inited.current && canvasRef.current) {
      inited.current = true;
      state.gameMode = 'survival'; // Solo survival wave defense
      state.survival.waveState = 'COUNTDOWN';
      state.survival.countdownTimer = 3;
      state.survival.wave = 1;
      state.survival.health = 1000;
      state.survival.maxHealth = 1000;

      initGame(canvasRef.current);
      populateArmory();

      // Audio init on first interaction
      const handleUserGesture = () => {
        initAudio();
        decodeSounds();
        window.removeEventListener('click', handleUserGesture);
        window.removeEventListener('keydown', handleUserGesture);
      };
      window.addEventListener('click', handleUserGesture);
      window.addEventListener('keydown', handleUserGesture);

      const handlePointerLockChange = () => {
        setIsPointerLocked(document.pointerLockElement === document.body);
      };
      document.addEventListener('pointerlockchange', handlePointerLockChange);

      return () => {
        document.removeEventListener('pointerlockchange', handlePointerLockChange);
        window.removeEventListener('click', handleUserGesture);
        window.removeEventListener('keydown', handleUserGesture);
        stopGameLoop();
        if (document.pointerLockElement) {
          try {
            document.exitPointerLock();
          } catch {
            // Ignore if already exited
          }
        }
      };
    }
  }, []);

  const requestAimLock = useCallback(() => {
    initAudio();
    decodeSounds();
    if (document.body.requestPointerLock) {
      document.body.requestPointerLock();
    }
  }, []);

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
    }).sort((a, b) => a.dps - b.dps);

    weaponsArr.forEach(w => {
      if (cols[w.cat]) {
        const btn = document.createElement('div');
        btn.className = 'weapon-btn';
        btn.dataset.id = w.id;
        const dpsText = w.dps > 10000 ? 'INF' : w.dps.toFixed(0);
        btn.innerHTML = `<span class="weapon-btn-name">${w.name}</span><span class="weapon-btn-stats">DMG: ${w.displayDmg} | RPM: ${w.displayRpm} | DPS: ${dpsText}</span>`;
        btn.onclick = () => {
          if (w.cat === 'sidearms') {
            state.player.secondary = w.id;
            state.player.activeSlot = 2;
          } else {
            state.player.primary = w.id;
            state.player.activeSlot = 1;
          }
          state.player.weaponMode = 0;
          state.player.burstsRemaining = 0;
          const activeId = getActiveWeaponId();
          const activeW = WEAPONS[activeId];
          const modeText = activeW.modes ? ` (${activeW.modes[0].type.toUpperCase()})` : '';
          const hwn = document.getElementById('hudWeaponName');
          if (hwn) hwn.innerText = activeW.name + modeText;
          buildWeaponMesh(activeId);
          toggleMenu(null);
          requestAimLock();
        };
        cols[w.cat]!.appendChild(btn);
      }
    });
  };

  return (
    <div className="dt-root relative w-full h-full bg-[#060706] text-white select-none overflow-hidden font-sans">
      {/* Responsive Top Game Header Bar */}
      <header className="absolute top-0 left-0 right-0 z-40 bg-black/85 backdrop-blur-md border-b border-red-900/40 px-3 py-2 flex items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              if (document.pointerLockElement) document.exitPointerLock();
              stopGameLoop();
              onBackToHub();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all text-xs font-semibold shrink-0 cursor-pointer"
          >
            <span className="text-base leading-none">←</span>
            <span>Hub</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base sm:text-lg font-black tracking-wider text-red-500 truncate" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              DEAD TRIGGER
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold tracking-widest bg-red-950/80 border border-red-600/40 text-red-300 rounded">
              3D SURVIVAL
            </span>
          </div>
        </div>

        {/* Status Indicators & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-3 px-3 py-1 bg-zinc-950/80 border border-zinc-800 rounded font-mono text-xs">
            <span id="survWaveText" className="text-amber-400 font-bold">Wave: 1</span>
            <span id="survZombiesLeftText" className="text-zinc-400"></span>
          </div>

          <button
            onClick={() => toggleMenu(state.menuOpen === 'shop' ? null : 'shop')}
            className="px-2.5 py-1.5 rounded bg-zinc-900 hover:bg-red-950/60 border border-zinc-700 hover:border-red-600 text-zinc-200 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer"
          >
            [F] Armory
          </button>

          <button
            onClick={() => toggleMenu(state.menuOpen === 'prob' ? null : 'prob')}
            className="px-2.5 py-1.5 rounded bg-zinc-900 hover:bg-emerald-950/60 border border-zinc-700 hover:border-emerald-600 text-zinc-200 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer"
          >
            [P] Config
          </button>

          <button
            onClick={requestAimLock}
            className={`px-3 py-1.5 rounded border text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
              isPointerLocked
                ? 'bg-emerald-900/50 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-red-900/60 hover:bg-red-800 border-red-500 text-red-200 animate-pulse'
            }`}
          >
            {isPointerLocked ? 'AIM LOCKED' : 'CLICK TO AIM'}
          </button>
        </div>
      </header>

      {/* Screen Effects & Overlays */}
      <div id="brightnessOverlay" />
      <div
        id="bulletDamageVignette"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 35,
          boxShadow: 'inset 0 0 100px rgba(255, 0, 0, 0.95), inset 0 0 50px rgba(200, 0, 0, 0.9)',
          opacity: 0,
          display: 'none',
          transition: 'opacity 0.05s ease-out'
        }}
      />

      {/* 3D WebGL Canvas */}
      <canvas
        id="gameCanvas"
        ref={canvasRef}
        onClick={requestAimLock}
        className="w-full h-full block cursor-crosshair"
      />

      {/* Crosshair */}
      <div id="crosshair" />

      {/* FPS Counter */}
      <div
        id="fpsCounter"
        style={{
          position: 'absolute',
          top: '56px',
          left: '16px',
          fontFamily: "'Orbitron', monospace",
          color: '#ffffff',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.9)',
          pointerEvents: 'none',
          zIndex: 30
        }}
      >
        FPS: --
      </div>

      {/* Sniper Scopes */}
      <div id="scopeOverlay">
        <div className="scope-line horizontal" />
        <div className="scope-line vertical" />
        <div className="scope-circle" />
      </div>

      <div id="dlqScopeOverlay" className="sniper-scope">
        <div className="scope-vignette" />
        <div className="scope-markings green">
          <div className="reticle-center" />
          <div className="reticle-horizontal" />
          <div className="reticle-vertical" />
          <div className="reticle-ring" />
          <div
            id="dlqZoomLevel"
            style={{
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
            }}
          >
            [B] ZOOM: 20x
          </div>
        </div>
      </div>

      <div id="tundraScopeOverlay" className="sniper-scope">
        <div className="scope-vignette blue-tint" />
        <div className="scope-markings blue">
          <div className="reticle-center" />
          <div className="reticle-horizontal fine" />
          <div className="reticle-vertical fine" />
          <div className="reticle-outer-ring" />
        </div>
      </div>

      <div id="karScopeOverlay" className="sniper-scope">
        <div className="scope-vignette brown-tint" />
        <div className="scope-markings brown">
          <div className="reticle-center" />
          <div className="reticle-horizontal" />
          <div className="reticle-vertical" />
          <div className="reticle-crosshair-lines" />
        </div>
      </div>

      {/* In-Game HUD: Health, Ammo & Active Gun */}
      <div className="hud-container !top-16">
        <div
          className="hud-panel"
          id="hudPlayerHealthPanel"
          style={{ display: 'flex', flexDirection: 'column', width: '135px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#39ff14', fontWeight: 'bold', fontFamily: 'monospace' }}>HP</span>
            <span className="hud-text-large" id="hudPlayerHealthText" style={{ fontSize: '0.8rem', color: '#39ff14', fontFamily: 'monospace' }}>
              1000 HP
            </span>
          </div>
          <div style={{ width: '100%', height: '5px', background: 'rgba(57, 255, 20, 0.1)', border: '1px solid rgba(57, 255, 20, 0.3)', borderRadius: '2px', marginTop: '3px', overflow: 'hidden' }}>
            <div id="hudPlayerHealthBar" style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #39ff14, #1b8a0a)', transition: 'width 0.2s ease-out' }} />
          </div>
        </div>

        <div className="hud-panel">
          <span className="hud-text-large" id="hudWeaponName" style={{ fontSize: '0.78rem' }}>
            M1911 Pistol
          </span>
        </div>

        <div className="hud-panel" id="hudZombiesKilled" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: '#7d8a83', fontFamily: 'monospace' }}>KILLS</span>
          <span className="hud-text-large" id="hudZombieCount" style={{ fontSize: '0.8rem' }}>0</span>
        </div>
      </div>

      {/* Interaction Prompt */}
      <div className="interaction-prompt" id="interactionPrompt">
        Press [F] to Open Armory
      </div>

      {/* Controls Help Badge */}
      <div className={`controls-help ${controlsOpen ? '' : 'hidden'}`}>
        [W,A,S,D]: Move | [SPACE]: Jump | [SHIFT]: Sprint<br />
        [C]: Slide | [SCROLL]: Swap Weapons<br />
        [LEFT CLICK]: Fire | [RIGHT CLICK]: ADS (Aim)<br />
        [B]: Toggle Fire Mode | [F]: Armory | [P]: Settings<br />
        [ESC]: Pause / Release Aim
      </div>

      <div
        className={`controls-trigger-tip ${controlsOpen ? 'hidden' : ''}`}
        title="Show controls guide"
        onClick={() => setControlsOpen(true)}
      >
        ?
      </div>

      {/* ARMORY MODAL */}
      <div className="modal-overlay" id="shopModal">
        <div className="modal-window">
          <div className="modal-header">☣️ BATTLEFIELD ARMORY</div>
          <div className="armory-layout">
            <div className="armory-column" id="col-sidearms"><div className="column-title">Sidearms (Slot 2)</div></div>
            <div className="armory-column" id="col-smg"><div className="column-title">SMGs</div></div>
            <div className="armory-column" id="col-ar"><div className="column-title">Assault Rifles</div></div>
            <div className="armory-column" id="col-marksman"><div className="column-title">Marksman</div></div>
            <div className="armory-column" id="col-sniper"><div className="column-title">Snipers</div></div>
            <div className="armory-column" id="col-special"><div className="column-title">Special</div></div>
          </div>
          <div className="flex justify-center mt-2">
            <button
              onClick={() => {
                toggleMenu(null);
                requestAimLock();
              }}
              className="px-6 py-2 rounded bg-red-950/80 hover:bg-red-900 border border-red-600 text-red-200 text-xs font-mono font-bold tracking-widest uppercase cursor-pointer"
            >
              [ CLOSE ARMORY • ESC OR F ]
            </button>
          </div>
        </div>
      </div>

      {/* CONFIG / BIOMETRIC MODAL */}
      <div className="modal-overlay" id="probModal">
        <div className="modal-window" style={{ width: '520px', height: 'auto' }}>
          <div className="modal-header" style={{ color: '#39ff14', textShadow: '0 0 15px rgba(57, 255, 20, 0.4)', borderBottom: '1px solid rgba(57,255,20,0.2)' }}>
            ⚙️ COMBAT SETTINGS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px', background: 'rgba(10, 15, 10, 0.85)', border: '1px solid rgba(57, 255, 20, 0.15)', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <label style={{ color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', width: '160px', fontFamily: 'Orbitron', fontSize: '0.85rem' }}>
                Day/Night Cycle:
              </label>
              <div style={{ flexGrow: 1, position: 'relative', height: '34px', background: 'rgba(20, 30, 20, 0.9)', borderRadius: '17px', border: '1px solid rgba(57, 255, 20, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px', cursor: 'pointer' }}>
                <div onClick={() => { state.settings.timeMode = 'auto'; setTimeMode('auto'); updateEnvironmentLighting(); }} style={{ flex: 1, textAlign: 'center', color: timeMode === 'auto' ? '#39ff14' : '#666', fontSize: '0.75rem', fontFamily: 'Orbitron', fontWeight: 'bold', zIndex: 2 }}>AUTO</div>
                <div onClick={() => { state.settings.timeMode = 'night'; setTimeMode('night'); updateEnvironmentLighting(); }} style={{ flex: 1, textAlign: 'center', color: timeMode === 'night' ? '#39ff14' : '#666', fontSize: '0.75rem', fontFamily: 'Orbitron', fontWeight: 'bold', zIndex: 2 }}>NIGHT</div>
                <div onClick={() => { state.settings.timeMode = 'day'; setTimeMode('day'); updateEnvironmentLighting(); }} style={{ flex: 1, textAlign: 'center', color: timeMode === 'day' ? '#39ff14' : '#666', fontSize: '0.75rem', fontFamily: 'Orbitron', fontWeight: 'bold', zIndex: 2 }}>DAY</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <label style={{ color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', width: '160px', fontFamily: 'Orbitron', fontSize: '0.85rem' }}>
                Gun Brightness:
              </label>
              <input
                type="range"
                id="gunBrightSlider"
                min="1"
                max="10"
                step="0.5"
                defaultValue="2"
                style={{ flexGrow: 1, cursor: 'pointer' }}
                onChange={(e) => {
                  state.settings.gunBrightness = parseFloat(e.target.value);
                  const d = document.getElementById('gunBrightValueDisplay');
                  if (d) d.innerText = e.target.value;
                  if (globals.gunAmbientLight) {
                    globals.gunAmbientLight.intensity = Math.max(0, state.settings.gunBrightness - 1);
                  }
                }}
              />
              <span id="gunBrightValueDisplay" style={{ color: '#39ff14', fontWeight: 'bold', width: '40px', textAlign: 'right', fontFamily: 'Orbitron' }}>2</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <label style={{ color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', width: '160px', fontFamily: 'Orbitron', fontSize: '0.85rem' }}>
                Performance Mode:
              </label>
              <button
                onClick={() => {
                  const newVal = !performanceMode;
                  setPerformanceMode(newVal);
                  state.settings.disableRealisticGuns = newVal;
                  buildWeaponMesh(getActiveWeaponId());
                  if (globals.renderer) {
                    globals.renderer.setPixelRatio(newVal ? 1.0 : window.devicePixelRatio);
                  }
                  updateEnvironmentLighting();
                }}
                className={`px-3 py-1 rounded font-mono text-xs font-bold cursor-pointer transition-all ${
                  performanceMode ? 'bg-emerald-800 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {performanceMode ? 'ENABLED (HIGH FPS)' : 'DISABLED (FULL QUALITY)'}
              </button>
            </div>
          </div>

          <div className="flex justify-center mt-2">
            <button
              onClick={() => {
                toggleMenu(null);
                requestAimLock();
              }}
              className="px-6 py-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono font-bold tracking-widest uppercase cursor-pointer"
            >
              [ CLOSE CONFIG ]
            </button>
          </div>
        </div>
      </div>

      {/* SUSPENDED SCREEN (PAUSED) */}
      <div id="startScreen">
        <h1 className="title-glow">⚠️ SURVIVAL SUSPENDED ⚠️</h1>
        <p className="text-zinc-400 font-mono text-sm mb-4">Click below to resume your combat deployment</p>
        <button
          id="startBtn"
          className="start-btn"
          onClick={() => {
            state.paused = false;
            const startScreen = document.getElementById('startScreen');
            if (startScreen) startScreen.style.display = 'none';
            requestAimLock();
          }}
        >
          RESUME DEPLOYMENT
        </button>
        <button
          id="exitBtn"
          className="exit-btn"
          style={{ display: 'none' }}
          onClick={() => {
            stopGameLoop();
            onBackToHub();
          }}
        >
          ABANDON ARENA
        </button>
      </div>

      {/* DEATH SCREEN */}
      <div
        id="playerDeathScreen"
        className="modal-overlay"
        style={{
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
          backdropFilter: 'blur(10px)'
        }}
      >
        <div style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center', color: '#ff2525', textShadow: '0 0 30px rgba(255, 37, 37, 0.85)', marginBottom: '10px', fontFamily: 'Orbitron, sans-serif' }}>
          YOU HAVE FALLEN
        </div>
        <div id="deathCountdownText" style={{ fontSize: '1.1rem', color: '#ffaa00', marginBottom: '25px', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '2px' }}>
          PREPARING RESPAWN...
        </div>
        <button
          onClick={() => {
            if ((globals as any).respawnPlayer) {
              (globals as any).respawnPlayer();
            } else {
              state.survival.health = state.survival.maxHealth;
              const pds = document.getElementById('playerDeathScreen');
              if (pds) pds.style.display = 'none';
              requestAimLock();
            }
          }}
          className="px-8 py-3 rounded bg-red-600 hover:bg-red-500 text-white font-mono font-bold tracking-widest text-sm uppercase shadow-lg shadow-red-600/40 cursor-pointer transition-all"
        >
          RESPAWN PROTOCOL
        </button>
      </div>

      {/* VICTORY OVERLAY */}
      <div
        id="survivalVictory"
        className="modal-overlay"
        style={{
          display: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(5, 15, 5, 0.95)',
          zIndex: 9999,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center', color: '#39ff14', textShadow: '0 0 30px rgba(57, 255, 20, 0.85)', marginBottom: '10px', fontFamily: 'Orbitron, sans-serif' }}>
          SURVIVAL VICTORY
        </div>
        <p className="text-zinc-300 font-mono text-sm mb-6">All hostile threat waves eliminated successfully.</p>
        <button
          onClick={() => {
            stopGameLoop();
            onBackToHub();
          }}
          className="px-8 py-3 rounded bg-emerald-600 hover:bg-emerald-500 text-black font-mono font-bold tracking-widest text-sm uppercase shadow-lg shadow-emerald-500/40 cursor-pointer transition-all"
        >
          RETURN TO HUB
        </button>
      </div>
    </div>
  );
}
