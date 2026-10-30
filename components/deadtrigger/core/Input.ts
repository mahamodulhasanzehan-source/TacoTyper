import * as THREE from 'three';
import { state } from '../state';
import { globals } from '../globals';
import { getActiveWeaponId, getActiveWeaponStats } from '../Utils';
import { buildWeaponMesh } from '../weapons/WeaponBuilder';
import { toggleMenu, updateSurvivalHUD, updateSurvivalShop, updateArmoryHighlights, updateBrightness } from '../ui/UIUtils';
import { spawnZombies } from '../entities/ZombieManager';
import { WEAPONS, SURVIVAL_WEAPONS } from '../config/weapons';
import { playSound } from '../audio/AudioSys';
import { isMultiplayer, sendToggleSpawns } from '../network';

export function setupInput() {
    document.addEventListener('pointerlockchange', () => {
        if (state.gameMode === 'tinkerer') return;
        const isEndgame = state.gameMode === 'survival' && (state.survival.waveState === 'GAMEOVER' || state.survival.waveState === 'VICTORY');
        
        if (document.pointerLockElement !== document.body && state.menuOpen === null && !isEndgame && state.gameMode !== null && !(window as any).isChatting) {
            const startScreen = document.getElementById('startScreen');
            if (startScreen) {
                startScreen.style.display = 'flex';
                const h1 = startScreen.querySelector('h1');
                if (h1) h1.innerText = "⚠️ SURVIVAL SUSPENDED ⚠️";
                const p = startScreen.querySelector('p');
                if (p) {
                    p.innerText = "Hostile threat progression frozen";
                    p.style.fontFamily = 'Special Elite';
                }
                const btn = document.getElementById('startBtn');
                if (btn) btn.innerText = "RESUME DEPLOYMENT";
                const exitBtn = document.getElementById('exitBtn');
                if (exitBtn) exitBtn.style.display = 'block';
            }
            state.paused = true; 
        } else if (document.pointerLockElement === document.body && !isEndgame) {
            state.paused = false;
            const startScreen = document.getElementById('startScreen');
            if (startScreen) startScreen.style.display = 'none';
            const exitBtn = document.getElementById('exitBtn');
            if (exitBtn) exitBtn.style.display = 'none';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === document.body && !state.paused) {
            let baseSens = 0.002;
            const activeId = getActiveWeaponId();
            if (state.gameMode === 'tester') {
                const wStats = WEAPONS[activeId];
                const isSniperOrMarksman = ['dlq33', 'lw3_tundra', 'sks'].includes(wStats.id);
                if (state.player.ads && isSniperOrMarksman) baseSens = 0.001; 
            } else {
                if (state.player.ads) baseSens = 0.0012;
            }

            if (activeId === 'dlq33' && state.player.ads && state.player.extraZoomActive) {
                baseSens = baseSens / 5.0;
            }

            globals.yawObj.rotation.y -= e.movementX * baseSens;
            globals.pitchObj.rotation.x -= e.movementY * baseSens;
            globals.pitchObj.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, globals.pitchObj.rotation.x));

            if (e.movementY > 0) {
                const reduce = e.movementY * baseSens;
                state.recoil.accumulatedClimbPitch = Math.max(0, state.recoil.accumulatedClimbPitch - reduce);
                state.recoil.camPitchVelocity = Math.max(0, state.recoil.camPitchVelocity - reduce);
            }
            if (e.movementX !== 0) {
                const reduce = Math.abs(e.movementX * baseSens);
                state.recoil.accumulatedClimbYaw = Math.sign(state.recoil.accumulatedClimbYaw) * Math.max(0, Math.abs(state.recoil.accumulatedClimbYaw) - reduce);
                state.recoil.camYawVelocity = Math.sign(state.recoil.camYawVelocity) * Math.max(0, Math.abs(state.recoil.camYawVelocity) - reduce);
            }
        }
    });

    window.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('wheel', (e) => {
        if (state.menuOpen || state.paused || document.pointerLockElement !== document.body) return;
        if (e.deltaY !== 0) {
            if (state.gameMode === 'survival') {
                const types = ['Pistol', 'SMG', 'AR'];
                let idx = types.indexOf(state.survival.activeType);
                let attempts = 0;
                while(!state.survival.inventory[types[idx]] || attempts === 0) {
                    if (e.deltaY > 0) idx = (idx + 1) % 3;
                    else idx = (idx - 1 + 3) % 3;
                    attempts++;
                    if (state.survival.inventory[types[idx]]) break;
                    if (attempts > 3) break;
                }
                if (state.survival.inventory[types[idx]]) switchSurvivalGun(types[idx]);
            } else {
                state.player.activeSlot = state.player.activeSlot === 1 ? 2 : 1;
                state.player.ads = false;
                const activeId = getActiveWeaponId();
                state.player.extraZoomActive = activeId === 'dlq33' ? !!state.player.dlqExtraZoom : false;
                state.player.weaponMode = 0;
                state.player.burstsRemaining = 0;
                
                const scopeOverlay = document.getElementById('scopeOverlay');
                const crosshair = document.getElementById('crosshair');
                if (scopeOverlay) scopeOverlay.style.display = 'none';
                if (crosshair) crosshair.style.display = 'block';
                
                const w = WEAPONS[activeId];
                let modeText = w.modes ? ` (${w.modes[0].type.toUpperCase()})` : '';
                const hudWepName = document.getElementById('hudWeaponName');
                if (hudWepName) hudWepName.innerText = w.name + modeText;
                
                buildWeaponMesh(activeId);
                updateArmoryHighlights();
            }
        }
    });

    document.addEventListener('keydown', e => {
        if ((window as any).isChatting) {
            // Let the text box event listener catch Enter/Escape, block everything else
            if (e.key === 'Enter' || e.key === 'Escape') {
                return;
            }
            e.stopPropagation();
            return;
        }

        if (e.key === 'Enter') {
            if ((window as any).openGameChat) {
                (window as any).openGameChat();
                e.preventDefault();
                return;
            }
        }

        if (e.key === '?' || e.key === '/') {
            const help = document.querySelector('.controls-help');
            const tip = document.querySelector('.controls-trigger-tip');
            if (help && tip) {
                if ((window as any).controlsPinned) {
                    (window as any).controlsPinned = false;
                    help.classList.add('hidden');
                    tip.classList.remove('hidden');
                } else {
                    (window as any).controlsPinned = true;
                    help.classList.remove('hidden');
                    tip.classList.add('hidden');
                }
            }
            e.preventDefault();
            return;
        }

        if (!state.gameMode || state.gameMode === 'tinkerer') return;
        const k = e.key.toLowerCase();
        state.keys[k] = true;

        if (k === 'b') {
            const activeId = getActiveWeaponId();
            if (activeId === 'dlq33' && state.player.ads) {
                state.player.extraZoomActive = !state.player.extraZoomActive;
                state.player.dlqExtraZoom = state.player.extraZoomActive;
                playSound('click');
                e.preventDefault();
                return;
            }
        }

        if (k === 'control' || e.key === 'Escape') {
            if (document.pointerLockElement === document.body) document.exitPointerLock(); 
        }

        if (state.gameMode === 'tester') {
            if (k === 'b') {
                const activeId = getActiveWeaponId();
                const w = WEAPONS[activeId];
                if (w.modes && w.modes.length > 1) {
                    state.player.weaponMode = (state.player.weaponMode + 1) % w.modes.length;
                    state.player.burstsRemaining = 0;
                    const hud = document.getElementById('hudWeaponName');
                    if (hud) hud.innerText = w.name + " (" + w.modes[state.player.weaponMode].type.toUpperCase() + ")";
                }
            }
            if (k === 't') {
                if (isMultiplayer) {
                    sendToggleSpawns();
                } else {
                    state.gameplay.spawns = !state.gameplay.spawns;
                    if(state.gameplay.spawns) spawnZombies(3);
                    else {
                        state.entities.zombies.forEach(z => globals.scene.remove(z.mesh));
                        state.entities.zombies = [];
                    }
                }
            }
            if (k === 'p' && state.menuOpen !== 'shop') {
                if (state.menuOpen === 'prob') toggleMenu(null); else toggleMenu('prob');
            }
        } else if (state.gameMode === 'survival') {
            if (k === '1' && state.survival.inventory['Pistol']) switchSurvivalGun('Pistol');
            if (k === '2' && state.survival.inventory['SMG']) switchSurvivalGun('SMG');
            if (k === '3' && state.survival.inventory['AR']) switchSurvivalGun('AR');
            if (k === 'r') startReload();
            if (k === 'b') {
                const nowMs = Date.now();
                if (nowMs - state.survival.lastBPressTime < 300) { buyBandAid(); state.survival.lastBPressTime = 0; } 
                else state.survival.lastBPressTime = nowMs;
            }
            if (k === 'p' && state.menuOpen !== 'shop' && state.menuOpen !== 'survivalShop') {
                if (state.menuOpen === 'bright') toggleMenu(null); else toggleMenu('bright');
            }
            if (k === 'm') {
                state.survival.money += 1000;
                updateSurvivalHUD(); updateSurvivalShop();
            }
            if (k === 'n') {
                state.survival.wave++; state.survival.zombiesKilledThisWave = 0; state.survival.zombiesKilledThisPhase = 0;
                state.survival.currentPhase = 0; state.survival.waveState = 'COUNTDOWN'; state.survival.countdownTimer = 5;
                state.entities.zombies.forEach(z => globals.scene.remove(z.mesh)); state.entities.zombies = []; state.survival.activeZombies = 0;
                updateSurvivalHUD();
            }
        }

        if (k === 'f') {
            const dist = globals.yawObj.position.distanceTo(globals.stationPos);
            if (dist < 5 && state.menuOpen !== 'prob' && state.menuOpen !== 'bright') {
                if (state.gameMode === 'survival') {
                    if (state.menuOpen === 'survivalShop') toggleMenu(null); else toggleMenu('survivalShop');
                } else {
                    if (state.menuOpen === 'shop') toggleMenu(null); else toggleMenu('shop');
                }
            }
        }
    });

    document.addEventListener('keyup', e => state.keys[e.key.toLowerCase()] = false);
    
    document.addEventListener('mousedown', (e) => {
        if(document.pointerLockElement === document.body && !state.paused) {
            if (e.button === 0) { state.mouse = true; state.mouseJustPressed = true; }
            if (e.button === 2) {
                state.player.ads = true;
                const activeId = getActiveWeaponId();
                if (activeId === 'dlq33') {
                    state.player.extraZoomActive = !!state.player.dlqExtraZoom;
                }
            }
        }
    });
    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) state.mouse = false;
        if (e.button === 2) {
            state.player.ads = false;
        }
    });
}

export function switchSurvivalGun(type: string) {
    state.survival.activeType = type;
    state.player.ads = false;
    const inv = state.survival.inventory[type];
    if (inv && inv.id === 'dlq33') {
        state.player.extraZoomActive = !!state.player.dlqExtraZoom;
    } else {
        state.player.extraZoomActive = false;
    }
    
    const scopeOverlay = document.getElementById('scopeOverlay');
    const crosshair = document.getElementById('crosshair');
    if (scopeOverlay) scopeOverlay.style.display = 'none';
    if (crosshair) crosshair.style.display = 'block';
    
    state.survival.reloading = false;
    
    if (inv) {
        buildWeaponMesh(inv.id);
        updateSurvivalHUD();
    }
}

export function startReload() {
    const inv = state.survival.inventory[state.survival.activeType];
    const wStats = getActiveWeaponStats();
    if (inv && inv.mag < (wStats.mag || 30) && inv.reserve > 0 && !state.survival.reloading) {
        state.survival.reloading = true;
        state.survival.reloadTimer = Date.now() + (wStats.reload || 2.0) * 1000;
        updateSurvivalHUD();
    }
}

export function buySurvivalGun(id: string) {
    const survKey = Object.keys(SURVIVAL_WEAPONS).find(k => SURVIVAL_WEAPONS[k].id === id)!;
    const gunDef = SURVIVAL_WEAPONS[survKey];
    
    let slot = 'Pistol'; if (gunDef.cat === 'smg') slot = 'SMG'; if (gunDef.cat === 'ar') slot = 'AR';
    const inv = state.survival.inventory;
    
    if (!inv[slot] || inv[slot].id !== id) {
        if (state.survival.money >= gunDef.cost) {
            state.survival.money -= gunDef.cost;
            inv[slot] = { id: id, mag: gunDef.mag, reserve: gunDef.mag * 2 };
            if (state.survival.activeType !== slot) switchSurvivalGun(slot);
            else { buildWeaponMesh(id); updateSurvivalHUD(); }
        }
    } else {
        if (state.survival.money >= gunDef.ammoCost * 2) {
            state.survival.money -= gunDef.ammoCost * 2;
            inv[slot].reserve = Math.min(inv[slot].reserve + gunDef.mag * 2, gunDef.reserve);
        }
    }
    updateSurvivalShop(); updateSurvivalHUD();
}

export function buyBandAid() {
    if (state.survival.money >= 50 && state.survival.health < state.survival.maxHealth) {
        state.survival.money -= 50; state.survival.health = state.survival.maxHealth;
        updateSurvivalShop(); updateSurvivalHUD();
    }
}

export function restartSurvival() {
    const gover = document.getElementById('survivalGameOver');
    const vic = document.getElementById('survivalVictory');
    if (gover) gover.style.display = 'none'; 
    if (vic) vic.style.display = 'none';
    
    state.survival = {
        health: 1000, maxHealth: 1000, money: 0, wave: 1,
        zombiesKilledThisWave: 0, zombiesKilledThisPhase: 0, currentPhase: 0, activeZombies: 0,
        waveState: 'COUNTDOWN', countdownTimer: 5, lastTime: 0,
        inventory: { 'Pistol': { id: 'pistol', mag: 15, reserve: 45 }, 'SMG': null, 'AR': null },
        activeType: 'Pistol', reloading: false, reloadTimer: 0, damageFlashTimer: 0, playerDamageVignetteTimer: 0, lastBPressTime: 0
    };
    state.entities.zombies.forEach(z => globals.scene.remove(z.mesh)); state.entities.zombies = [];
    state.entities.floatingTexts.forEach(ft => ft.element.remove()); state.entities.floatingTexts = [];
    
    updateSurvivalHUD(); switchSurvivalGun('Pistol'); document.body.requestPointerLock();
}

export function triggerPlayerDeath() {
    if (state.survival.health <= 0 && (globals as any).isDead) return; // Prevent double trigger
    state.survival.health = 0;
    (globals as any).isDead = true;
    updateSurvivalHUD();
    playSound('die');
    
    // Release pointer lock so they can interact with the screen
    document.exitPointerLock();
    
    const deathScreen = document.getElementById('playerDeathScreen');
    if (deathScreen) {
        deathScreen.style.display = 'flex';
        const countdownEl = document.getElementById('deathCountdownText');
        let count = 3;
        if (countdownEl) countdownEl.innerText = `RESPAWNING IN ${count}...`;
        
        if ((globals as any).deathInterval) {
            clearInterval((globals as any).deathInterval);
        }
        
        (globals as any).deathInterval = setInterval(() => {
            count--;
            if (countdownEl) countdownEl.innerText = `RESPAWNING IN ${count}...`;
            if (count <= 0) {
                clearInterval((globals as any).deathInterval);
                (globals as any).deathInterval = null;
                respawnPlayer();
            }
        }, 1000);
    } else {
        // Fallback in case element is not loaded
        setTimeout(() => {
            respawnPlayer();
        }, 3000);
    }
}

export function respawnPlayer() {
    if ((globals as any).deathInterval) {
        clearInterval((globals as any).deathInterval);
        (globals as any).deathInterval = null;
    }
    
    (globals as any).isDead = false;
    
    const deathScreen = document.getElementById('playerDeathScreen');
    if (deathScreen) deathScreen.style.display = 'none';
    
    state.survival.health = state.survival.maxHealth;
    updateSurvivalHUD();
    
    if (globals.yawObj) {
        globals.yawObj.position.set(0, 2, 0); // Center starting location, height 2
        state.player.velocity.set(0, 0, 0);   // Reset any sliding/moving velocities
    }
    
    document.body.requestPointerLock();
}

(globals as any).triggerPlayerDeath = triggerPlayerDeath;
(globals as any).respawnPlayer = respawnPlayer;

