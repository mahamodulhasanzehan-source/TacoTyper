import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSRPass } from 'three/examples/jsm/postprocessing/SSRPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { globals } from '../globals';
import { state } from '../state';
import { WEAPONS, SURVIVAL_WEAPONS, getWeaponTracerColor } from '../config/weapons';
import { GUN_MODELS } from '../config/Gunposition';
import { ZOMBIES, SURVIVAL_ZOMBIES, WAVE_CONFIGS } from '../config/zombies';
import { playSound } from '../audio/AudioSys';
import { spawnZombies, spawnSurvivalZombies } from '../entities/ZombieManager';
import { createFloatingText, createParticles, createHitscanTrail, createBulletTracerSegment } from '../entities/Particles';
import { updateSurvivalHUD, updateBrightness, updateZombieHealthHUD } from '../ui/UIUtils';
import { getActiveWeaponId, getActiveWeaponStats } from '../Utils';
import { startReload } from './Input';
import { buildWeaponMesh } from '../weapons/WeaponBuilder';
import { sendPlayerUpdate, sendPlayerShoot, otherPlayers, isMultiplayer, sendZombieDamage, sendPlayerDamage } from '../network';
import { updateProximityAudio } from '../webrtc';
import {
    killZombie,
    animateZombiePivots,
    triggerBloaterExplosion,
    triggerBruteSlam,
    triggerScreamerHowl,
    triggerBruteBoulderToss,
    triggerFireDemonFireball,
    triggerOrcStoneWall,
    triggerPhantomSpectralOrb,
    updateCorpses
} from '../entities/ZombieBehaviors';
import {
    updateZombieProjectiles,
    spawnZombieProjectile,
    spawnFireball,
    spawnSpectralHomingOrb,
    spawnBruteBoulder,
    activeStoneBarricades
} from '../entities/ZombieProjectiles';

export function getHittableMeshes(includeEnv = false) {
    let meshes: any[] = [];
    state.entities.zombies.forEach(z => {
        z.mesh.traverse((child: any) => { if(child.isMesh) meshes.push(child); });
    });
    otherPlayers.forEach(p => {
        p.traverse((child: any) => { if(child.isMesh) meshes.push(child); });
    });
    if (includeEnv) {
        meshes.push(...globals.environmentMeshes);
        activeStoneBarricades.forEach(b => {
            b.meshes.forEach(m => meshes.push(m));
        });
    }
    return meshes;
}

const clock = new THREE.Clock();

// Smooth procedural viewmodel and weapon animation variables
let prevYaw = 0;
let prevPitch = 0;
let swayX = 0;
let swayY = 0;
let swayRotZ = 0;
let bobTime = 0;
let breathTime = 0;
let sniperBreathTime = 0;
let scopeSwayX = 0;
let scopeSwayY = 0;
let sprintFactor = 0;
let crouchFactor = 0;
let moveSwayX = 0;
let moveSwayRotZ = 0;
let lastHealth = 1000;

interface MuzzleFlash {
    light?: THREE.PointLight;
    mesh?: THREE.Object3D;
    life: number;
    maxLife: number;
}
const activeMuzzleFlashes: MuzzleFlash[] = [];
let lastEnvCheckTime = 0;

export function getEffectiveDayTimerRatio() {
    if (state.settings.timeMode === 'day') return 0.25;
    if (state.settings.timeMode === 'night') return 0.875;
    return (globals.dayTimer % 240) / 240;
}

export function getSunAngleAndHeight(timeRatio: number) {
    let sunAngle: number;
    let sunHeight: number;
    
    if (timeRatio < 0.75) {
        // 3 minutes of day (0.0 to 0.75). Map 0 -> 0.75 to 0 -> PI.
        const dayProgress = timeRatio / 0.75;
        sunAngle = dayProgress * Math.PI;
        sunHeight = Math.sin(sunAngle); // positive (0 to 1)
    } else {
        // 1 minute of night (0.75 to 1.0). Map 0.75 -> 1.0 to PI -> 2*PI.
        const nightProgress = (timeRatio - 0.75) / 0.25;
        sunAngle = Math.PI + nightProgress * Math.PI;
        sunHeight = Math.sin(sunAngle); // negative (0 to -1)
    }
    
    return {
        sunAngle,
        sunHeight,
        sunDist: Math.cos(sunAngle)
    };
}

export function updateEnvironmentLighting() {
    const timeRatio = getEffectiveDayTimerRatio(); // 0 to 1
    const { sunAngle, sunHeight, sunDist } = getSunAngleAndHeight(timeRatio);
    
    if (globals.dirLight) {
        globals.dirLight.position.set(sunDist * 200, sunHeight * 200, sunDist * 50);
        const intensity = Math.max(0, sunHeight);
        globals.dirLight.intensity = intensity * (state.settings.disableRealisticGuns ? 0.7 : 1.5);
        
        if (globals.ambientLight) {
            // Blend from night color (blueish) to day color (white/yellow)
            const nightColor = new THREE.Color(0x050510);
            const dayColor = new THREE.Color(0xffffff);
            const mix = Math.max(0.0, intensity);
            const currentAmb = nightColor.clone().lerp(dayColor, mix);
            globals.ambientLight.color = currentAmb;
            globals.ambientLight.intensity = Math.max(0.05, mix * (state.settings.disableRealisticGuns ? 0.4 : 0.8));
        }

        if (globals.gunAmbientLight) {
            const baseIntensity = Math.max(0, state.settings.gunBrightness - 1);
            const nightColor = new THREE.Color(0x050510);
            const dayColor = new THREE.Color(0xffffff);
            const mix = Math.max(0.0, intensity);
            globals.gunAmbientLight.color = nightColor.clone().lerp(dayColor, mix);
            globals.gunAmbientLight.intensity = baseIntensity * Math.max(state.settings.disableRealisticGuns ? 0.06 : 0.12, mix * (state.settings.disableRealisticGuns ? 0.5 : 1.0));
        }

        // Fix for grass staying bright at night: Dim envMapIntensity for standard materials
        globals.environmentMeshes.forEach(m => {
            m.traverse((child: any) => {
                if (child.isMesh && child.material instanceof THREE.MeshStandardMaterial) {
                    child.material.envMapIntensity = Math.max(0.05, intensity);
                }
            });
        });

        // Buy station glowing blue and pulsing at night
        const nightFactor = 1.0 - Math.max(0.0, intensity);
        if (globals.stationLight) {
            if (state.settings.disableRealisticGuns) {
                globals.stationLight.intensity = 0;
            } else {
                const pulse = 1.0 + Math.sin(Date.now() * 0.005) * 0.25;
                globals.stationLight.color.setHex(0x00aaff);
                globals.stationLight.intensity = nightFactor * 8.0 * pulse;
            }
        }
        if (globals.stationMesh) {
            globals.stationMesh.traverse((child: any) => {
                if (child.isMesh && child.material && child.material.transparent) {
                    const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.25;
                    child.material.opacity = pulse;
                }
            });
        }
    }
    
    if (globals.skySphere && globals.skySphere.material instanceof THREE.MeshBasicMaterial) {
        // Tint sky based on sun height
        const skyNight = new THREE.Color(0x111122);
        const skySunset = new THREE.Color(0xffaa55);
        const skyDay = new THREE.Color(0xffffff);
        
        let skyCol = new THREE.Color();
        if (sunHeight > 0.2) {
            skyCol.copy(skyDay);
        } else if (sunHeight > 0.0) {
            skyCol.copy(skySunset).lerp(skyDay, sunHeight / 0.2);
        } else if (sunHeight > -0.2) {
            skyCol.copy(skyNight).lerp(skySunset, (sunHeight + 0.2) / 0.2);
        } else {
            skyCol.copy(skyNight);
        }
        
        globals.skySphere.material.color = skyCol;
        if (globals.scene.fog) {
            globals.scene.fog.color = skyCol;
        }
    }
}

export function updateEngine() {
    const delta = Math.min(clock.getDelta(), 0.1); 
    if (!state.gameMode || state.menuOpen || state.paused) return;

    // Run spatial/positional vocal audio computations
    updateProximityAudio();

    if (state.survival.health < lastHealth) {
        (state.player as any).lastDamageTime = Date.now();
    }
    lastHealth = state.survival.health;

    // Automatic healing checks
    const hNow = Date.now();
    const lastDmg = (state.player as any).lastDamageTime || 0;
    if (hNow - lastDmg >= 3000) {
        if (state.survival.health < state.survival.maxHealth && state.survival.health > 0 && !(globals as any).isDead) {
            if (!(state.player as any).lastHealTickTime) {
                (state.player as any).lastHealTickTime = hNow;
            }
            if (hNow - (state.player as any).lastHealTickTime >= 500) {
                state.survival.health = Math.min(state.survival.maxHealth, state.survival.health + 10);
                updateSurvivalHUD();
                (state.player as any).lastHealTickTime = hNow;
            }
        }
    } else {
        (state.player as any).lastHealTickTime = 0;
    }

    // Day/Night Cycle (240 seconds full cycle, so 2 mins day and 2 mins night)
    globals.dayTimer += delta;
    updateEnvironmentLighting();

    // Real-time environmental sound rays scanning (surroundings & acoustics)
    const nowMs = Date.now();
    if (nowMs - lastEnvCheckTime > 300) {
        lastEnvCheckTime = nowMs;
        let sumDist = 0;
        let count = 0;
        const dirs = [
            new THREE.Vector3(1, 0, 0),   // right
            new THREE.Vector3(-1, 0, 0),  // left
            new THREE.Vector3(0, 0, 1),   // forward
            new THREE.Vector3(0, 0, -1),  // backward
            new THREE.Vector3(0, 1, 0)    // ceiling
        ];
        const cameraPos = new THREE.Vector3();
        if (globals.camera) {
            globals.camera.getWorldPosition(cameraPos);
            const tempRaycaster = new THREE.Raycaster();
            const hittables = getHittableMeshes(true);
            for (const dir of dirs) {
                tempRaycaster.set(cameraPos, dir);
                const intersects = tempRaycaster.intersectObjects(hittables, true);
                if (intersects.length > 0) {
                    sumDist += intersects[0].distance;
                    count++;
                } else {
                    sumDist += 50.0; // Open space fallback
                    count++;
                }
            }
        }
        const avgDist = count > 0 ? (sumDist / count) : 30.0;
        state.player.envEchoDelay = THREE.MathUtils.clamp(avgDist * 0.015, 0.08, 0.35); // 80ms to 350ms delay
        state.player.envEchoDecay = THREE.MathUtils.clamp(avgDist * 0.02, 0.15, 0.6);   // feedback decay
    }

    const activeId = getActiveWeaponId();
    const wStats = getActiveWeaponStats();

    let inputDir = new THREE.Vector3();
    inputDir.z = Number(state.keys['s'] || 0) - Number(state.keys['w'] || 0);
    inputDir.x = Number(state.keys['d'] || 0) - Number(state.keys['a'] || 0);
    inputDir.normalize();

    let isRunning = state.keys['shift'] && inputDir.lengthSq() > 0;
    
    if (!state.keys['c']) {
        state.player.slideLock = false; 
    }

    if (state.keys['c'] && isRunning && !state.player.sliding && state.player.velocity.y === 0 && !state.player.slideLock) {
        state.player.sliding = true;
        state.player.slideTime = state.gameMode === 'survival' ? 0.75 : 3.0;
        state.player.slideDir = inputDir.clone();
    }

    let baseWalk = 10;
    let baseRun = 20;
    
    if (wStats.cat === 'smg') {
        baseWalk *= 0.90;
    } else if (wStats.cat === 'ar') {
        baseWalk *= 0.85;
        baseRun *= 0.95;
    } else if (wStats.cat === 'marksman') {
        baseWalk *= 0.80;
        baseRun *= 0.80;
    } else if (wStats.cat === 'sniper') {
        if (wStats.id === 'lw3_tundra') {
            baseWalk *= 0.75;
            baseRun *= 0.75;
        } else {
            baseWalk *= 0.70;
            baseRun *= 0.70;
        }
    } else if (wStats.id === 'krm262') {
        baseWalk *= 1.05;
        baseRun *= 1.05;
    } else if (wStats.id === 'swarm_killer_smg') {
        baseWalk *= 1.10;
        baseRun *= 1.10;
    } else if (wStats.id === 'swarm_killer_ar') {
        baseWalk *= 0.95;
        baseRun *= 0.90;
    } else if (wStats.id === 'mosquito') {
        baseWalk *= 2.00;
        baseRun *= 2.00;
    }

    let speedMultiplier = state.player.ads ? (baseWalk * 0.5) : (state.keys['shift'] ? baseRun : baseWalk);
    const isCrouching = !!state.keys['c'] && !state.player.sliding;
    if (isCrouching && !state.player.ads) speedMultiplier = baseWalk * 0.6;
    
    if (state.player.sliding) {
        if (!state.keys['c'] || state.player.slideTime <= 0) {
            state.player.sliding = false; 
            state.player.slideLock = true; 
        } else {
            state.player.slideTime -= delta;
            speedMultiplier = 40; inputDir.copy(state.player.slideDir); 
        }
    }

    state.player.direction.copy(inputDir);

    const targetGroundHeight = state.player.sliding ? 1.0 : (isCrouching ? 1.3 : 2.0);
    const isPlayerGrounded = globals.yawObj.position.y <= targetGroundHeight + 0.05;

    if (isPlayerGrounded) {
        if (state.player.direction.z !== 0 || state.player.direction.x !== 0) {
            const dir = state.player.direction.clone(); 
            dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), globals.yawObj.rotation.y);
            state.player.velocity.x = THREE.MathUtils.lerp(state.player.velocity.x, dir.x * speedMultiplier, delta * 15);
            state.player.velocity.z = THREE.MathUtils.lerp(state.player.velocity.z, dir.z * speedMultiplier, delta * 15);
        } else { 
            state.player.velocity.x = THREE.MathUtils.lerp(state.player.velocity.x, 0, delta * 15); 
            state.player.velocity.z = THREE.MathUtils.lerp(state.player.velocity.z, 0, delta * 15); 
        }
    } else {
        // Air physics: preserve existing high momentum, low air resistance, and allow moderate drift steering
        if (state.player.direction.z !== 0 || state.player.direction.x !== 0) {
            const dir = state.player.direction.clone(); 
            dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), globals.yawObj.rotation.y);
            
            const currentHorizSpeed = Math.sqrt(state.player.velocity.x * state.player.velocity.x + state.player.velocity.z * state.player.velocity.z);
            const targetSpeed = Math.max(currentHorizSpeed, speedMultiplier);
            const targetVelX = dir.x * targetSpeed;
            const targetVelZ = dir.z * targetSpeed;
            
            state.player.velocity.x = THREE.MathUtils.lerp(state.player.velocity.x, targetVelX, delta * 3.0);
            state.player.velocity.z = THREE.MathUtils.lerp(state.player.velocity.z, targetVelZ, delta * 3.0);
        } else {
            // Apply minimal horizontal air drag (approx 10% decay per second)
            state.player.velocity.x *= Math.exp(-0.1 * delta);
            state.player.velocity.z *= Math.exp(-0.1 * delta);
        }
    }

    if (state.keys[' '] && isPlayerGrounded) {
        if (state.player.sliding) {
            state.player.sliding = false;
            state.player.slideLock = true;
        }
        state.player.velocity.y = 15; 
        playSound('jump');
    }

    state.player.velocity.y -= 40 * delta; 
    globals.yawObj.position.x += state.player.velocity.x * delta; 
    globals.yawObj.position.z += state.player.velocity.z * delta; 
    globals.yawObj.position.y += state.player.velocity.y * delta;

    if (globals.yawObj.position.y < targetGroundHeight) {
        globals.yawObj.position.y = THREE.MathUtils.lerp(globals.yawObj.position.y, targetGroundHeight, delta * 15);
        if (targetGroundHeight - globals.yawObj.position.y < 0.05) globals.yawObj.position.y = targetGroundHeight;
        if (state.player.velocity.y < 0) state.player.velocity.y = 0;
    }

    if (state.gameMode === 'survival') {
        globals.yawObj.position.x = Math.max(-99.5, Math.min(99.5, globals.yawObj.position.x));
        globals.yawObj.position.z = Math.max(-99.5, Math.min(99.5, globals.yawObj.position.z));
    }

    globals.stationMesh.rotation.y += delta;
    const distToStation = globals.yawObj.position.distanceTo(globals.stationPos);
    const prompt = document.getElementById('interactionPrompt');
    if (distToStation < 5 && prompt) {
        prompt.style.display = 'block';
        prompt.innerText = state.gameMode === 'survival' ? "Press [F] to Open Buy Station" : "Press [F] to Open Armory";
    } else if (prompt) {
        prompt.style.display = 'none';
    }

    const isSniper = state.gameMode === 'tester' && (activeId === 'dlq33' || activeId === 'lw3_tundra' || activeId === 'kar98k');
    
    // ADS transition speed: Marksman rifles take twice as long (15/2), Snipers take 3x as long (15/3)
    let adsLerpSpeed = 15;
    if (activeId === 'lw3_tundra' || activeId === 'kar98k') adsLerpSpeed = 9.75;
    else if (wStats.cat === 'marksman') adsLerpSpeed = 7.5;
    else if (wStats.cat === 'sniper') adsLerpSpeed = 5;

    state.player.adsFactor = THREE.MathUtils.lerp(state.player.adsFactor, state.player.ads ? 1 : 0, delta * adsLerpSpeed);

    let targetFov = 75;
    if (state.player.ads) {
        if (isSniper) {
            targetFov = (activeId === 'dlq33' && state.player.extraZoomActive) ? 4.0 : 20.0;
        } 
        else if (activeId === 'sks' || activeId === 'kar98k') targetFov = 40; 
        else targetFov = 60;
    }
    globals.camera.fov = THREE.MathUtils.lerp(globals.camera.fov, targetFov, delta * adsLerpSpeed); 
    globals.camera.updateProjectionMatrix();

    const scopeOverlay = document.getElementById('scopeOverlay');
    const dlqScope = document.getElementById('dlqScopeOverlay');
    const tundraScope = document.getElementById('tundraScopeOverlay');
    const karScope = document.getElementById('karScopeOverlay');
    const crosshair = document.getElementById('crosshair');

    if (state.player.ads) {
        if (crosshair) crosshair.style.display = 'none';
    } else {
        if (crosshair) crosshair.style.display = 'block';
    }

    if (state.player.ads && isSniper && state.player.adsFactor > 0.8) {
        if (globals.currentWeaponMesh) globals.currentWeaponMesh.visible = false;
        if (activeId === 'dlq33') {
            if (dlqScope) dlqScope.style.display = 'block';
            if (tundraScope) tundraScope.style.display = 'none';
            if (karScope) karScope.style.display = 'none';
            
            const zoomLabel = document.getElementById('dlqZoomLevel');
            if (zoomLabel) {
                zoomLabel.innerText = state.player.extraZoomActive ? '[B] ZOOM: 100x' : '[B] ZOOM: 20x';
            }
        } else if (activeId === 'lw3_tundra') {
            if (tundraScope) tundraScope.style.display = 'block';
            if (dlqScope) dlqScope.style.display = 'none';
            if (karScope) karScope.style.display = 'none';
        } else if (activeId === 'kar98k') {
            if (karScope) karScope.style.display = 'block';
            if (dlqScope) dlqScope.style.display = 'none';
            if (tundraScope) tundraScope.style.display = 'none';
        }
    } else {
        if (globals.currentWeaponMesh) globals.currentWeaponMesh.visible = true;
        if (dlqScope) dlqScope.style.display = 'none';
        if (tundraScope) tundraScope.style.display = 'none';
        if (karScope) karScope.style.display = 'none';
    }
    
    if (state.gameMode === 'survival') {
        if (state.survival.reloading && crosshair) crosshair.style.opacity = '0.3';
        else if (crosshair) crosshair.style.opacity = '1';
    }

    const mOpts = !state.settings.disableRealisticGuns ? GUN_MODELS[activeId] : null;
    const isAds = state.player.ads;

    const currentPos = isAds ? (mOpts?.adsPos || [0, 0.08, -0.4]) : (mOpts?.hipPos || [0.3, -0.25, -0.5]);
    const currentRot = isAds ? (mOpts?.adsRot || [0, 0, 0]) : (mOpts?.hipRot || [0, 0, 0]);

    const targetViewX = currentPos[0];
    const targetViewY = currentPos[1];
    const targetViewZ = currentPos[2];

    const targetRotX = currentRot[0];
    const targetRotY = currentRot[1];
    const targetRotZ = currentRot[2];
    const modeIdx = state.player.weaponMode || 0;
    const activeMode = (wStats.modes && wStats.modes[modeIdx]) ? wStats.modes[modeIdx] : wStats;
    const rpm = activeMode.rpm || wStats.rpm || 600;
    let currentDamage = activeMode.damage || wStats.damage || 10;
    if (wStats.id === 'sks') {
        const odinBase = WEAPONS.odin?.damage || 80;
        currentDamage = odinBase * 1.2;
    }
    if (state.gameMode === 'tester' && wStats.cat === 'sniper') currentDamage *= 2;
    const fireType = activeMode.type || wStats.type || 'auto';
    const now = Date.now();
    const cooldown = 60000 / rpm;

    let canShoot = false;
    let inv: any = null;

    if (state.gameMode === 'survival') {
        inv = state.survival.inventory[state.survival.activeType];
        if (state.survival.reloading) {
            if (now >= state.survival.reloadTimer) {
                state.survival.reloading = false;
                let needed = (wStats.mag || 15) - inv.mag; let take = Math.min(needed, inv.reserve);
                inv.mag += take; inv.reserve -= take; updateSurvivalHUD();
            }
        } else {
            if (inv && inv.mag > 0) {
                if (fireType === 'semi') {
                    if (state.mouseJustPressed && now - state.player.lastShot > cooldown) { canShoot = true; state.player.lastShot = now; inv.mag--; }
                } else {
                    if (state.mouse && now - state.player.lastShot > cooldown) { canShoot = true; state.player.lastShot = now; inv.mag--; }
                }
                if (canShoot) updateSurvivalHUD();
                if (inv.mag <= 0 && inv.reserve > 0) startReload();
            } else if (state.mouseJustPressed && inv && inv.reserve === 0) {
                playSound('empty_mag');
            }
        }
    } else {
        if (fireType === 'burst') {
            if (state.mouse && state.player.burstsRemaining === 0 && now > state.player.burstCooldownEnd) {
                state.player.burstsRemaining = activeMode.burst || 4; state.player.burstNextShotTime = now;
            }
            if (state.player.burstsRemaining > 0 && now >= state.player.burstNextShotTime) {
                canShoot = true; state.player.burstsRemaining--; state.player.burstNextShotTime = now + cooldown;
                if (state.player.burstsRemaining === 0) state.player.burstCooldownEnd = now + (activeMode.delay || 150);
            }
        } else if (fireType === 'semi') {
            if (state.mouseJustPressed && now - state.player.lastShot > cooldown) { canShoot = true; state.player.lastShot = now; }
        } else {
            if (state.mouse && now - state.player.lastShot > cooldown) { canShoot = true; state.player.lastShot = now; }
        }
    }

    if (canShoot) {
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(globals.camera.getWorldQuaternion(new THREE.Quaternion()));
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(globals.camera.getWorldQuaternion(new THREE.Quaternion()));
        let spreadAngles = [[0,0]];
        
        if (wStats.special === 'shotgun_horizontal') {
            spreadAngles = []; 
            const maxSpread = state.player.ads ? 0.125 * 0.75 : 0.25 * 0.75;
            const pelletCount = 162; // 135 * 1.2 = 162
            for (let p = 0; p < pelletCount; p++) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * maxSpread;
                spreadAngles.push([r * Math.cos(angle), r * Math.sin(angle) * 0.5]);
            }
        }
        if (wStats.special === 'spread_horizontal') spreadAngles = [[0, 0.03], [-0.03, -0.015], [0.03, -0.015]];

        let hipfireSpread = 0;
        const excludedIds = ['pistol', 'gs50', 'krm262', 'swarm_killer_smg', 'mosquito'];
        
        // Custom Accuracy Logic for Snipers
        let isFullyAccurate = state.player.ads;
        if (activeId === 'dlq33') {
            isFullyAccurate = state.player.ads && state.player.adsFactor >= 0.8;
        } else if (activeId === 'lw3_tundra') {
            isFullyAccurate = state.player.ads && state.player.adsFactor >= 0.3;
        }

        if (!isFullyAccurate && !excludedIds.includes(wStats.id)) {
            if (wStats.cat === 'sniper') hipfireSpread = 0.3; // Highest deviation
            else if (wStats.cat === 'smg') hipfireSpread = 0.2; // High deviation
            else if (wStats.cat === 'marksman') hipfireSpread = 0.15; // Moderate deviation
            else if (wStats.cat === 'ar' || wStats.id === 'swarm_killer_ar') hipfireSpread = 0.1; // Standard deviation
        }

        if (hipfireSpread > 0 && spreadAngles.length === 1 && spreadAngles[0][0] === 0 && spreadAngles[0][1] === 0) {
            spreadAngles[0] = [(Math.random() - 0.5) * hipfireSpread, (Math.random() - 0.5) * hipfireSpread];
        }

        let camPitchKick = 0; let camYawKick = 0; let wepZKick = 0; let wepPitchKick = 0;
        if (wStats.id === 'mosquito') {
            wepZKick = 0.05; 
        } else if (isSniper) {
            camPitchKick = 0.08; camYawKick = (Math.random() - 0.5) * 0.02; wepZKick = 0.6; wepPitchKick = 0.5;
        } else {
            let kickMod = (currentDamage / 10) + (10 / (rpm / 60));
            if (wStats.id === 'swarm_killer_ar') kickMod *= 0.1; // 90% reduction
            if (wStats.id === 'swarm_killer_smg') kickMod *= 0.3; // 70% reduction as requested
            if (wStats.id === 'fal') kickMod *= 0.2; // 80% reduction
            if (wStats.id === 'uzi') kickMod *= 0.5; // 50% reduction
            camPitchKick = 0.005 * kickMod; camYawKick = (Math.random() - 0.5) * 0.004 * kickMod;
            wepZKick = 0.25 * kickMod; wepPitchKick = 0.20 * kickMod;  
        }

        if (state.player.ads) { camPitchKick *= 0.6; camYawKick *= 0.6; wepZKick *= 0.05; wepPitchKick *= 0.05; }

        // Globally reduce vertical recoil components by 20%
        camPitchKick *= 0.8;
        wepPitchKick *= 0.8;

        // Apply weapon-specific recoil multipliers
        let gunRecoilMult = 1.0;
        if (wStats.id === 'mosquito') {
            gunRecoilMult = 0.0;
        } else if (wStats.id === 'swarm_killer_ar') {
            gunRecoilMult = 0.05; // MG42: 90% reduced recoil
        } else if (wStats.id === 'swarm_killer_smg') {
            gunRecoilMult = 0.5; // Swarmkiller SMG: 50% reduced recoil
        } else if (wStats.id === 'vector_smg') { // Fennec
            gunRecoilMult = 0.175; // Fennec: reduced recoil by another 50% (from 0.35)
        } else if (wStats.id === 'm13') {
            gunRecoilMult = 0.8; // M13: 20% reduced recoil
        } else if (wStats.id === 'odin') {
            gunRecoilMult = 1.3; // Odin: 30% increased recoil
        } else if (wStats.id === 'mac10') {
            gunRecoilMult = 0.5; // Mac-10: reduced recoil by another 10% (0.6 - 0.1 = 0.5)
        }

        camPitchKick *= gunRecoilMult;
        camYawKick *= gunRecoilMult;
        wepZKick *= gunRecoilMult;
        wepPitchKick *= gunRecoilMult;

        state.recoil.targetCamPitch += camPitchKick; state.recoil.targetCamYaw += camYawKick;
        state.recoil.targetWepZ += wepZKick; state.recoil.targetWepPitch += wepPitchKick;

        state.recoil.targetCamPitch = Math.min(state.recoil.targetCamPitch, 0.25);
        state.recoil.targetWepZ = Math.min(state.recoil.targetWepZ, 1.2);
        state.recoil.targetWepPitch = Math.min(state.recoil.targetWepPitch, 1.0);

        // Realistic persistent camera climb push per bullet
        let baseVert = 0.005; // Default vertical push
        let baseHoriz = 0.0;  // Default horizontal push

        if (wStats.id === 'mosquito') {
            baseVert = 0.0001; // Minimal recoil for mosquito cheat gun so it remains controllable
            baseHoriz = 0.0;
        } else if (wStats.cat === 'smg') {
            baseVert = 0.024;    // High vertical recoil
            baseHoriz = 0.015;    // Moderate horizontal recoil
        } else if (wStats.cat === 'ar') {
            baseVert = 0.014;    // Moderate vertical recoil
            baseHoriz = 0.009;   // Moderate horizontal recoil
        } else if (wStats.cat === 'special') {
            baseVert = 0.014;    // Moderate vertical recoil
            baseHoriz = 0.0;     // NO horizontal recoil
        } else if (wStats.cat === 'marksman') {
            baseVert = 0.018;    // Medium vertical recoil
            baseHoriz = 0.001;   // Extremely low horizontal
        } else if (wStats.cat === 'sniper') {
            baseVert = 0.010;    // Low vertical recoil
            baseHoriz = 0.002;   // Low horizontal
        } else if (wStats.cat === 'sidearms') {
            baseVert = 0.012;    // Low vertical recoil (but slightly higher than snipers for feel)
            baseHoriz = 0.002;   // Low horizontal
        }

        // Scale by fire rate using actual RPM to establish realistic scaling
        // Guns with extremely high fire rate (like Fennec, MAC-10, M13) will climb significantly faster
        const rpmScale = rpm ? (rpm / 600) : 1.0;
        let climbVert = baseVert * rpmScale * 1.5; // Increased by 50%
        let climbHoriz = baseHoriz * rpmScale * 1.7; // Increased by 70%

        // Add bullet-by-bullet push variation so it's not a linear slide
        climbVert *= (0.8 + Math.random() * 0.4); 
        climbHoriz *= (Math.random() - 0.5) * 2; 

        // Globally reduce all vertical recoil by 20%
        climbVert *= 0.8;

        // Apply weapon-specific recoil multipliers
        climbVert *= gunRecoilMult;
        climbHoriz *= gunRecoilMult;

        // Aiming down sights narrows focus and reduces direct camera recoil kick by 40% (0.6x)
        if (state.player.ads) {
            climbVert *= 0.6;
            climbHoriz *= 0.6;
        }

        // Add to the target climb velocities
        state.recoil.camPitchVelocity += climbVert;
        state.recoil.camYawVelocity += climbHoriz;

        (rpm / 60) > 10 ? playSound('shoot_fast', wStats.id) : playSound('shoot', wStats.id);

        const camDir = new THREE.Vector3(); globals.camera.getWorldDirection(camDir);
        const cameraPos = new THREE.Vector3(); globals.camera.getWorldPosition(cameraPos);
        
        let barrelPos = new THREE.Vector3();
        // Construct a reliable barrel position relative to the camera to prevent bugs
        // caused by imported GLB models with extremely offset origins (like pivots being 13m behind the mesh).
        barrelPos.copy(cameraPos);
        const isShotgun = wStats.id === 'krm262';
        const aimOffsetRight = state.player.ads ? 0.0 : (isShotgun ? 0.32 : 0.15);
        const aimOffsetDown = state.player.ads ? 0.06 : (isShotgun ? 0.22 : 0.15);
        const forwardOffset = isShotgun ? 0.95 : 0.4;
        barrelPos.add(right.clone().multiplyScalar(aimOffsetRight));
        barrelPos.y -= aimOffsetDown;
        barrelPos.add(camDir.clone().multiplyScalar(forwardOffset));

        // --- Volumetric AAA Muzzle Flash and Sparks system (Call of Duty style) ---
        const isSpecialOrMac = wStats.cat === 'special' || wStats.id === 'mac10';
        if (false) {
            const localBarrelPos = barrelPos.clone();
            globals.viewmodel.worldToLocal(localBarrelPos);
            // Move local barrel position a bit away from the player (in front of the guns)
            localBarrelPos.z -= 0.28;

            // 1. Dynamic casting point light with dual-layer lighting
            // Yellowish-white, high intensity, moderate decay. Dimmed for Fennec (vector_smg)
            const isFennec = wStats.id === 'vector_smg';
            const intensity = isFennec ? 15.0 : 60.0;
            const flashLight = new THREE.PointLight(0xfff5dd, intensity, 15, 1.5);
            flashLight.position.copy(localBarrelPos);
            
            // Critical fix: Gun is on Layer 1, World is on Layer 0.
            // Enable BOTH layers so that muzzle flash illuminates the environment AND the gun itself!
            flashLight.layers.enable(0);
            flashLight.layers.enable(1);
            globals.viewmodel.add(flashLight);

            // 2. High-fidelity Volumetric dual-cone flame mesh (rather than flat crossed 2D billboard sprites)
            const flashGroup = new THREE.Group();
            
            const isPistol = wStats.cat === 'pistol' || wStats.cat === 'sidearms';
            let sizeScale = isPistol ? 0.7 : (wStats.cat === 'sniper' ? 1.4 : 1.0);
            if (isFennec) {
                sizeScale *= 0.55;
            }

            // White hot core plasma cone pointing along gun forward (-Z)
            const innerFlameGeo = new THREE.ConeGeometry(0.045 * sizeScale, 0.3 * sizeScale, 8);
            const innerFlameMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.95,
                blending: THREE.AdditiveBlending
            });
            const innerCone = new THREE.Mesh(innerFlameGeo, innerFlameMat);
            innerCone.rotation.x = -Math.PI / 2; // Point forward along gun barrel
            innerCone.position.set(0, 0, -0.15 * sizeScale); // offset forward

            // Yellow/Orange outer flame expansion cone
            const outerFlameGeo = new THREE.ConeGeometry(0.09 * sizeScale, 0.25 * sizeScale, 8);
            const outerFlameMat = new THREE.MeshBasicMaterial({
                color: 0xffa044,
                transparent: true,
                opacity: 0.65,
                blending: THREE.AdditiveBlending
            });
            const outerCone = new THREE.Mesh(outerFlameGeo, outerFlameMat);
            outerCone.rotation.x = -Math.PI / 2;
            outerCone.position.set(0, 0, -0.125 * sizeScale);

            flashGroup.add(innerCone, outerCone);

            // Random scale variation and z-axis rotation for dynamic shoot feel
            const randScale = (0.85 + Math.random() * 0.3) * sizeScale;
            flashGroup.scale.set(randScale, randScale, randScale);
            flashGroup.rotateZ(Math.random() * Math.PI * 2);

            flashGroup.position.copy(localBarrelPos);
            
            // Set all meshes in the flash group to layer 1 so they render strictly with the viewmodel camera pass
            flashGroup.traverse((child) => {
                child.layers.set(1);
            });
            globals.viewmodel.add(flashGroup);

            // Register muzzle flash instance for tick updates and proper disposal
            activeMuzzleFlashes.push({
                light: flashLight,
                mesh: flashGroup,
                life: 0.05, // very short lived (50ms)
                maxLife: 0.05
            });

            // 3. High-velocity muzzle spark particles
            for (let i = 0; i < 4; i++) {
                const sparkMat = new THREE.MeshBasicMaterial({
                    color: 0xffaa00,
                    transparent: true,
                    opacity: 0.9,
                    blending: THREE.AdditiveBlending
                });
                const sparkGeo = new THREE.BoxGeometry(0.015, 0.015, 0.04);
                const spark = new THREE.Mesh(sparkGeo, sparkMat);
                spark.position.copy(barrelPos);
                globals.scene.add(spark);

                const spreadVec = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.2
                );
                const sparkVel = camDir.clone().add(spreadVec).normalize().multiplyScalar(15 + Math.random() * 10);
                
                state.entities.particles.push({
                    mesh: spark,
                    velocity: sparkVel,
                    life: 0.12 + Math.random() * 0.08
                });
            }
        }

        const bulletAppearanceRadius = 0.6;

        spreadAngles.forEach(ang => {
            // 1. Calculate direction from camera (where player is aiming)
            const spreadDir = camDir.clone();
            spreadDir.add(right.clone().multiplyScalar(ang[0] + (Math.random()-0.5)*0.005));
            spreadDir.add(up.clone().multiplyScalar(ang[1] + (Math.random()-0.5)*0.005));
            spreadDir.normalize();

            // 2. Aim from barrel towards the point focused by camera
            globals.raycaster.set(cameraPos, spreadDir);
            const targetIntersects = globals.raycaster.intersectObjects(getHittableMeshes(true), true);
            let targetDist = 100;
            if (targetIntersects.length > 0) targetDist = targetIntersects[0].distance;
            const targetPoint = cameraPos.clone().addScaledVector(spreadDir, targetDist);
            
            // Parallax fix: If target is close, fire from camera center. If distant, converge from barrel.
            const effectiveBarrelPos = barrelPos.clone();
            if (targetDist < 4) {
                const factor = Math.max(0, (targetDist - 0.5) / 3.5); // 0.5m is min distance to start converging
                effectiveBarrelPos.lerp(cameraPos, 1 - factor);
            }
            const bDir = new THREE.Vector3().subVectors(targetPoint, effectiveBarrelPos).normalize();

            if (wStats.hitscan && wStats.cat !== 'sniper' && wStats.cat !== 'marksman') {
                globals.raycaster.set(effectiveBarrelPos, bDir);
                const intersections = globals.raycaster.intersectObjects(getHittableMeshes(true), true);
                
                let endPoint = barrelPos.clone().addScaledVector(bDir, 200); 
                let hits: any[] = []; let hitSet = new Set();

                for (let hit of intersections) {
                    let obj: any = hit.object; 
                    const isEnv = globals.environmentMeshes.some(m => m === obj || m === obj.parent || m === obj.parent?.parent);

                    if (obj && obj.userData && obj.userData.isPlayer) {
                        endPoint = hit.point;
                        createParticles(hit.point, 0xff0000, 5); // Blood effect on player hit
                        playSound('hit');
                        if (isMultiplayer && obj.userData.playerId) {
                            sendPlayerDamage(obj.userData.playerId, currentDamage, wStats.id);
                        }
                        break;
                    }

                    while(obj && !obj.userData.zombieData && obj.parent) obj = obj.parent;
                    if (obj && obj.userData && obj.userData.zombieData) {
                        const z = obj.userData.zombieData;
                        if (!hitSet.has(z) && !z.isDead) { hitSet.add(z); hits.push({ zombie: z, point: hit.point }); }
                    } else if (isEnv) {
                        endPoint = hit.point;
                        createParticles(hit.point, 0x888888, 3);
                        break;
                    }
                }

                let pierceCount = 0;
                let actualPierce = wStats.pierce;
                // @ts-ignore
                if (state.gameMode === 'survival' && wStats.pierceChance > 0) {
                    // @ts-ignore
                    if (Math.random() * 100 <= wStats.pierceChance) actualPierce++;
                }

                for (let h of hits) {
                    const z = h.zombie;
                    let isHeadshot = false;
                    if (z.type === 'purple' || z.type === 'tall' || (z.userData && z.height > 2)) {
                        if (h.point.y > z.mesh.position.y + z.height/6) isHeadshot = true;
                    }

                    const finalDmg = isHeadshot ? currentDamage * 1.2 : currentDamage;
                    
                    let finalDmgToSend = finalDmg;
                    if (wStats.id === 'kar98k') {
                        const initDmg = isHeadshot ? 375 : 250;
                        z.hp -= initDmg;
                        finalDmgToSend = initDmg;
                        if (!z.userData) z.userData = {};
                        if (!z.userData.burns) z.userData.burns = [];
                        const burnDmg = isHeadshot ? 125 : 72.5;
                        z.userData.burns.push({ 
                            ticksLeft: 5, 
                            damagePerTick: burnDmg / 5, 
                            lastTick: Date.now() 
                        });
                    } else {
                        z.hp -= finalDmg;
                    }

                    // Dim eyes based on health
                    const healthRatio = Math.max(0, z.hp / z.maxHp);
                    if (z.eyeMaterials) {
                        z.eyeMaterials.forEach((m: THREE.MeshStandardMaterial) => {
                            m.emissiveIntensity = healthRatio * 2.0;
                        });
                    }
                    updateZombieHealthHUD(z);
                    
                    createParticles(h.point, isHeadshot ? 0xff0000 : 0xffffff, isHeadshot ? 8 : 3);
                    z.mesh.traverse((c: any) => { if(c.isMesh && c.material.emissive) c.material.emissive.setHex(0x555555); });
                    setTimeout(() => { 
                        if(z.mesh) {
                            z.mesh.traverse((c: any) => { 
                                if(c.isMesh && c.material && c.material.emissive) {
                                    const isEye = z.eyeMaterials && z.eyeMaterials.includes(c.material);
                                    c.material.emissive.setHex(isEye ? 0xff0000 : 0x000000);
                                }
                            });
                        }
                    }, 50);

                    if (isMultiplayer) {
                        sendZombieDamage(z.id, finalDmgToSend, isHeadshot, h.point);
                    }
                    if (z.hp <= 0) {
                        z.isDead = true; playSound('die');
                        createParticles(z.mesh.position, z.mesh.material ? z.mesh.material.color.getHex() : 0xbf00ff, 15);
                        state.gameplay.lastZType = z.type; globals.scene.remove(z.mesh);
                        
                        const idx = state.entities.zombies.indexOf(z);
                        if (idx > -1) state.entities.zombies.splice(idx, 1);
                        
                        if (state.gameMode === 'survival') {
                            state.survival.money += z.userData.money; state.survival.zombiesKilledThisWave++;
                            state.survival.zombiesKilledThisPhase++; state.survival.activeZombies--;
                            updateSurvivalHUD(); createFloatingText(z.mesh.position, `+$${z.userData.money}`, 0x27ae60);
                        } else {
                            state.gameplay.kills++; 
                            const hzCount = document.getElementById('hudZombieCount');
                            if (hzCount) hzCount.innerText = state.gameplay.kills.toString();
                            if (state.gameplay.spawns) spawnZombies(Math.random() < state.gameplay.prob ? 2 : 1);
                        }
                    } else {
                        playSound('hit');
                    }

                    pierceCount++;
                    if (pierceCount >= actualPierce) { endPoint = h.point; break; }
                }
                const tracerColor = getWeaponTracerColor(wStats.id, wStats.cat);
                const trailStart = barrelPos.clone().addScaledVector(bDir, bulletAppearanceRadius);
                createHitscanTrail(trailStart, endPoint, tracerColor, wStats.id === 'mosquito' ? 0.21 : 0.045, 0.315);
                sendPlayerShoot(effectiveBarrelPos, bDir, wStats.id);
            } else {
                const isSniper = wStats.cat === 'sniper' || wStats.cat === 'marksman';
                const isPellet = wStats.id === 'krm262';
                const bProjSpeed = (wStats.cat === 'sniper') ? 340 : (wStats.cat === 'marksman' ? 260 : (wStats.speed || 120));
                const tracerColor = getWeaponTracerColor(wStats.id, wStats.cat);
                const bMesh = new THREE.Mesh(
                    new THREE.BoxGeometry(
                        isPellet ? 0.035 : (isSniper ? 0.065 : 0.055),
                        isPellet ? 0.035 : (isSniper ? 0.065 : 0.055),
                        isPellet ? 0.059 : (isSniper ? 0.54 : 0.39)
                    ),
                    new THREE.MeshBasicMaterial({ 
                        color: new THREE.Color(tracerColor), 
                        transparent: true,
                        opacity: 0.95,
                        toneMapped: false 
                    })
                );
                bMesh.position.copy(barrelPos).addScaledVector(bDir, bulletAppearanceRadius);
                bMesh.lookAt(bMesh.position.clone().add(bDir));
                globals.scene.add(bMesh);
                
                state.entities.bullets.push({ 
                    mesh: bMesh, 
                    dir: bDir.clone(), 
                    velocity: bDir.clone().multiplyScalar(bProjSpeed),
                    speed: bProjSpeed, 
                    damage: currentDamage, 
                    pierce: wStats.pierce, 
                    hits: [], 
                    life: 4.0, 
                    weaponId: wStats.id,
                    isPellet: isPellet,
                    tracerThickness: isPellet ? 0.025 : (isSniper ? 0.055 : 0.04),
                    tracerColor: tracerColor
                });
                sendPlayerShoot(effectiveBarrelPos, bDir, wStats.id);
            }
        });
    }
    
    state.mouseJustPressed = false;

    const r = state.recoil;
    r.targetCamPitch = THREE.MathUtils.lerp(r.targetCamPitch, 0, delta * 10); r.targetCamYaw = THREE.MathUtils.lerp(r.targetCamYaw, 0, delta * 10);
    r.targetWepZ = THREE.MathUtils.lerp(r.targetWepZ, 0, delta * 12); r.targetWepPitch = THREE.MathUtils.lerp(r.targetWepPitch, 0, delta * 12);

    r.camPitch = THREE.MathUtils.lerp(r.camPitch, r.targetCamPitch, delta * 25); r.camYaw = THREE.MathUtils.lerp(r.camYaw, r.targetCamYaw, delta * 25);
    r.wepZ = THREE.MathUtils.lerp(r.wepZ, r.targetWepZ, delta * 25); r.wepPitch = THREE.MathUtils.lerp(r.wepPitch, r.targetWepPitch, delta * 25);

    // Smoothly apply pending climb targets (camPitchVelocity / camYawVelocity) to physical look angles
    const climbStepPitch = r.camPitchVelocity * (1 - Math.exp(-22 * delta));
    const climbStepYaw = r.camYawVelocity * (1 - Math.exp(-22 * delta));

    globals.pitchObj.rotation.x += climbStepPitch;
    globals.yawObj.rotation.y += climbStepYaw;

    r.accumulatedClimbPitch += climbStepPitch;
    r.accumulatedClimbYaw += climbStepYaw;

    r.camPitchVelocity -= climbStepPitch;
    r.camYawVelocity -= climbStepYaw;

    // Limit extreme pitch angles safely
    const prevPitchVal = globals.pitchObj.rotation.x;
    globals.pitchObj.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, globals.pitchObj.rotation.x));
    const clampDiff = globals.pitchObj.rotation.x - prevPitchVal;
    if (clampDiff !== 0) {
        r.accumulatedClimbPitch = Math.max(0, r.accumulatedClimbPitch + clampDiff);
    }

    // Recoil Recovery if player stops shooting
    const updateRpm = wStats?.rpm || 600;
    const updateCooldown = 60000 / updateRpm;
    const lastShotDiff = Date.now() - state.player.lastShot;

    if (lastShotDiff > Math.max(150, updateCooldown * 1.5)) {
        // Smoothly and completely recover the uncompensated camera climb back to the original view angles
        const recoverPitch = r.accumulatedClimbPitch * (1 - Math.exp(-8 * delta));
        const recoverYaw = r.accumulatedClimbYaw * (1 - Math.exp(-8 * delta));

        globals.pitchObj.rotation.x -= recoverPitch;
        globals.yawObj.rotation.y -= recoverYaw;

        r.accumulatedClimbPitch -= recoverPitch;
        r.accumulatedClimbYaw -= recoverYaw;

        // Also decay any lingering target velocities
        r.camPitchVelocity = THREE.MathUtils.lerp(r.camPitchVelocity, 0, delta * 8);
        r.camYawVelocity = THREE.MathUtils.lerp(r.camYawVelocity, 0, delta * 8);
    }

    // Send player position over network (throttled properly to 45ms to avoid bufferbloat & massive lag spikes)
    const nowTimestamp = Date.now();
    const gAny = globals as any;
    if (!gAny.lastNetworkUpdate) gAny.lastNetworkUpdate = 0;
    if (nowTimestamp - gAny.lastNetworkUpdate >= 45) {
        sendPlayerUpdate();
        gAny.lastNetworkUpdate = nowTimestamp;
    }

    // Smoothly interpolate other players to make movement look buttery smooth at high frame rates
    otherPlayers.forEach((p) => {
        if (p.userData.targetPos) {
            p.position.lerp(p.userData.targetPos, delta * 18);
        }
        if (p.userData.targetRot !== undefined) {
            let diff = p.userData.targetRot - p.rotation.y;
            diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            p.rotation.y += diff * delta * 18;
        }

        const model = p.userData.playerModel;
        if (model && model.pivots) {
            // Smoothly lerp head and spine pitch tilt
            if (p.userData.targetPitch !== undefined) {
                model.pivots.head.rotation.x = THREE.MathUtils.lerp(model.pivots.head.rotation.x, p.userData.targetPitch * 0.6, delta * 12);
                model.pivots.body.rotation.x = THREE.MathUtils.lerp(model.pivots.body.rotation.x, p.userData.targetPitch * 0.4, delta * 12);
            }

            // Animate locomotion / idle breathing
            const isMoving = !!p.userData.isMoving;
            const isSprinting = !!p.userData.isSprinting;
            if (!p.userData.animTime) p.userData.animTime = 0;
            const animSpeed = isSprinting ? 14 : 9;

            if (isMoving) {
                p.userData.animTime += delta * animSpeed;
                const t = p.userData.animTime;
                const stride = isSprinting ? 0.75 : 0.55;
                model.pivots.leftLeg.rotation.x = Math.sin(t) * stride;
                model.pivots.rightLeg.rotation.x = -Math.sin(t) * stride;
                model.pivots.body.position.y = 0.95 + Math.abs(Math.sin(t * 2)) * 0.04;
                model.pivots.leftArm.rotation.x = -0.4 + Math.sin(t) * (stride * 0.3);
                model.pivots.rightArm.rotation.x = -0.4 - Math.sin(t) * (stride * 0.2);
            } else {
                p.userData.animTime += delta * 2;
                const t = p.userData.animTime;
                model.pivots.leftLeg.rotation.x = THREE.MathUtils.lerp(model.pivots.leftLeg.rotation.x, 0, delta * 8);
                model.pivots.rightLeg.rotation.x = THREE.MathUtils.lerp(model.pivots.rightLeg.rotation.x, 0, delta * 8);
                model.pivots.body.position.y = 0.95 + Math.sin(t) * 0.015;
                model.pivots.leftArm.rotation.x = -0.35 + Math.sin(t) * 0.03;
                model.pivots.rightArm.rotation.x = -0.35 + Math.sin(t) * 0.03;
            }

            // Face the overhead health bar toward local player camera
            if (model.healthBarGroup && globals.yawObj) {
                model.healthBarGroup.lookAt(globals.yawObj.position.x, model.healthBarGroup.position.y + p.position.y, globals.yawObj.position.z);
            }
        }
    });

    // Calculate real-time camera turning velocities for weapon sway
    const currentYaw = globals.yawObj.rotation.y;
    const currentPitch = globals.pitchObj.rotation.x;

    if (prevYaw === 0 && prevPitch === 0) {
        prevYaw = currentYaw;
        prevPitch = currentPitch;
    }

    let yawVelocity = currentYaw - prevYaw;
    let pitchVelocity = currentPitch - prevPitch;

    // Correct yaw overflow/wrapping
    if (yawVelocity > Math.PI) yawVelocity -= Math.PI * 2;
    if (yawVelocity < -Math.PI) yawVelocity += Math.PI * 2;

    // Safety clamps on sudden shifts (like pointerlock initialization)
    yawVelocity = Math.max(-0.25, Math.min(0.25, yawVelocity));
    pitchVelocity = Math.max(-0.25, Math.min(0.25, pitchVelocity));

    prevYaw = currentYaw;
    prevPitch = currentPitch;

    // Smooth weapon lag limits (shotgun swings 50% stronger/heavier, all weapons 20% more fluent except FAL and snipers)
    const isFluencyException = (activeId === 'fal' || activeId === 'dlq33' || activeId === 'lw3_tundra');
    const isShotgun = (activeId === 'krm262');
    const fluencyMultiplier = isFluencyException ? 1.0 : 1.20;
    const shotgunSwingMult = isShotgun ? 1.5 : 1.0;

    // Smooth crouch factor
    crouchFactor = THREE.MathUtils.lerp(crouchFactor, isCrouching ? 1.0 : 0.0, delta * 12 * fluencyMultiplier);

    const targetSwayX = -yawVelocity * 0.45 * shotgunSwingMult;
    const targetSwayY = pitchVelocity * 1.1 * shotgunSwingMult;
    const targetSwayRotZ = yawVelocity * 0.42 * shotgunSwingMult;

    const swayLerpSpeed = 12 * fluencyMultiplier;
    swayX = THREE.MathUtils.lerp(swayX, targetSwayX, delta * swayLerpSpeed);
    swayY = THREE.MathUtils.lerp(swayY, targetSwayY, delta * swayLerpSpeed);
    swayRotZ = THREE.MathUtils.lerp(swayRotZ, targetSwayRotZ, delta * swayLerpSpeed);

    // Calculate local lateral velocity for movement-induced gun sway (for strafing left-to-right)
    const worldVel = new THREE.Vector3(state.player.velocity.x, 0, state.player.velocity.z);
    const localVel = worldVel.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -globals.yawObj.rotation.y);

    const adsFactorScale = 1.0 - (state.player.adsFactor * 0.5); // reduced movement sway during ADS but still clearly visible
    const targetMoveSwayX = -localVel.x * 0.0035 * adsFactorScale * shotgunSwingMult * (isFluencyException ? 1.0 : 1.20);
    const targetMoveSwayRotZ = localVel.x * 0.012 * adsFactorScale * shotgunSwingMult * (isFluencyException ? 1.0 : 1.20);

    const moveSwayLerpSpeed = 10 * fluencyMultiplier;
    moveSwayX = THREE.MathUtils.lerp(moveSwayX, targetMoveSwayX, delta * moveSwayLerpSpeed);
    moveSwayRotZ = THREE.MathUtils.lerp(moveSwayRotZ, targetMoveSwayRotZ, delta * moveSwayLerpSpeed);

    // Realistic procedural bobbing
    const normSpeed = Math.sqrt(state.player.velocity.x * state.player.velocity.x + state.player.velocity.z * state.player.velocity.z);
    const isOnGround = globals.yawObj.position.y <= targetGroundHeight + 0.15;

    if (isOnGround && normSpeed > 0.1) {
        const bobCycleSpeed = (state.keys['shift'] ? 16 : 10) * (isFluencyException ? 1.0 : 1.20);
        bobTime += delta * bobCycleSpeed;
    } else {
        bobTime = THREE.MathUtils.lerp(bobTime, 0, delta * 6 * fluencyMultiplier);
    }

    // Passive breathing timing
    breathTime += delta * 1.8 * (isFluencyException ? 1.0 : 1.20);

    let bobF = 1.0 - state.player.adsFactor;
    if (state.player.sliding) {
        bobF *= 0.15; // Soft sliding bob scaling
    }

    const maxBobX = state.keys['shift'] ? 0.035 : 0.015;
    const maxBobY = state.keys['shift'] ? 0.025 : 0.012;

    const bobMult = isShotgun ? 1.5 : (isFluencyException ? 1.0 : 1.20);
    const bX = Math.sin(bobTime) * maxBobX * bobF * bobMult;
    const bY = -Math.abs(Math.sin(bobTime)) * maxBobY * bobF * bobMult;
    const bRotZ = Math.sin(bobTime) * 0.03 * bobF * bobMult;
    const bRotX = Math.cos(bobTime * 2) * 0.015 * bobF * bobMult;

    // Soft passive breathing
    const pBreathX = Math.cos(breathTime) * 0.003 * (state.player.ads ? 0.15 : 1.0);
    const pBreathY = Math.sin(breathTime * 2) * 0.002 * (state.player.ads ? 0.15 : 1.0);

    // Sniper scoping breathing drift (blandness fix)
    const isSniperWeapon = (activeId === 'dlq33' || activeId === 'lw3_tundra' || activeId === 'kar98k');
    if (isSniperWeapon && state.player.adsFactor > 0.3) {
        sniperBreathTime += delta * 1.2;
        // Float in figure-8 target pattern
        const targetScopeSwayX = Math.sin(sniperBreathTime) * 0.006 * state.player.adsFactor;
        const targetScopeSwayY = Math.cos(sniperBreathTime * 1.6) * 0.004 * state.player.adsFactor;

        scopeSwayX = THREE.MathUtils.lerp(scopeSwayX, targetScopeSwayX, delta * 4);
        scopeSwayY = THREE.MathUtils.lerp(scopeSwayY, targetScopeSwayY, delta * 4);
    } else {
        scopeSwayX = THREE.MathUtils.lerp(scopeSwayX, 0, delta * 8);
        scopeSwayY = THREE.MathUtils.lerp(scopeSwayY, 0, delta * 8);
    }

    // Apply breath and recoil adjustments to viewport orientation (climb is handled directly on pitch/yaw objects for realistic gun sync)
    globals.cameraRecoilObj.rotation.x = r.camPitch + scopeSwayY;
    globals.cameraRecoilObj.rotation.y = r.camYaw + scopeSwayX;

    if (globals.currentWeaponMesh) {
        const mOpts = !state.settings.disableRealisticGuns ? GUN_MODELS[activeId] : null;
        const isAds = state.player.ads;

        // Smooth Tactical Sprint Factor
        const isFiring = (Date.now() - state.player.lastShot < 400);
        let targetSprint = (isRunning && !state.player.ads && !state.player.sliding && !isFiring && activeId !== 'mosquito' && activeId !== 'kar98k') ? 1.0 : 0.0;
        sprintFactor = THREE.MathUtils.lerp(sprintFactor, targetSprint, delta * (isFiring ? 25 : 12));

        // Tactical Sprint position and rotation offsets
        let sprintOffX = 0;
        let sprintOffY = 0;
        let sprintOffZ = 0;
        let sprintRotOffX = 0;
        let sprintRotOffY = 0;
        let sprintRotOffZ = 0;
        let extraWobbleX = 0;
        let extraWobbleY = 0;
        let extraWobbleRotZ = 0;

        if (sprintFactor > 0.01) {
            let wobbleMult = 1.0;
            if (activeId === 'fal') wobbleMult = 0.25;
            if (activeId === 'swarm_killer_ar') wobbleMult = 0.65;
            if (activeId === 'uzi') wobbleMult = 0.1;

            if (mOpts && mOpts.sprintPos && mOpts.sprintRot) {
                sprintOffX = mOpts.sprintPos[0] * sprintFactor;
                sprintOffY = mOpts.sprintPos[1] * sprintFactor;
                sprintOffZ = mOpts.sprintPos[2] * sprintFactor;

                sprintRotOffX = mOpts.sprintRot[0] * sprintFactor;
                sprintRotOffY = mOpts.sprintRot[1] * sprintFactor;
                sprintRotOffZ = mOpts.sprintRot[2] * sprintFactor;

                const cat = wStats?.cat || '';
                const isUptiltSMG = cat === 'smg' || activeId === 'swarm_killer_ar' || activeId === 'swarm_killer_smg';
                if (isUptiltSMG) {
                    const wSpeed = bobTime * 1.6;
                    extraWobbleX = Math.sin(wSpeed) * 0.065 * sprintFactor * wobbleMult;
                    extraWobbleY = Math.cos(wSpeed * 2) * 0.045 * sprintFactor * wobbleMult;
                    extraWobbleRotZ = Math.sin(wSpeed) * 0.18 * sprintFactor * wobbleMult;
                } else {
                    const wSpeed = bobTime * 1.2;
                    extraWobbleX = Math.sin(wSpeed) * 0.03 * sprintFactor * wobbleMult;
                    extraWobbleY = Math.cos(wSpeed * 2) * 0.015 * sprintFactor * wobbleMult;
                    extraWobbleRotZ = Math.sin(wSpeed) * 0.06 * sprintFactor * wobbleMult;
                }
            } else {
                const cat = wStats?.cat || '';
                const isUptiltSMG = cat === 'smg' || activeId === 'swarm_killer_ar' || activeId === 'swarm_killer_smg';

                if (isUptiltSMG) {
                    // SMGs, MG42 (swarm_killer_ar), Swarm Killer SMG: point upwards
                    // Defaults
                    sprintOffX = 0.15 * sprintFactor;
                    sprintOffY = 0.22 * sprintFactor;
                    sprintOffZ = 0.05 * sprintFactor;

                    sprintRotOffX = 1.22 * sprintFactor; // Rotated upwards by 70 degrees in the X-axis
                    sprintRotOffY = 0;
                    sprintRotOffZ = 0;

                    // Specific SMG/Uptilt tuning
                    if (activeId === 'uzi') {
                        // Uzi SMG: brought way closer and much to the right side
                        sprintOffZ = 1.95 * sprintFactor;
                        sprintOffX = 1.35 * sprintFactor;
                        sprintOffY = 0.45 * sprintFactor;
                    } else if (activeId === 'mac10') {
                        // Mac-10: brought a little bit to the right side, closer, and up
                        sprintOffZ = 0.55 * sprintFactor;
                        sprintOffX = 0.58 * sprintFactor;
                        sprintOffY = 0.78 * sprintFactor;
                    } else if (activeId === 'swarm_killer_ar') {
                        // MG42: brought way to the right side but not so much that it's off screen
                        sprintOffZ = 0.35 * sprintFactor;
                        sprintOffX = 0.78 * sprintFactor;
                        sprintOffY = 0.22 * sprintFactor;
                    }

                    // Heavily increased procedural wobble to represent pointing up in the air
                    const wSpeed = bobTime * 1.6;
                    extraWobbleX = Math.sin(wSpeed) * 0.065 * sprintFactor * wobbleMult;
                    extraWobbleY = Math.cos(wSpeed * 2) * 0.045 * sprintFactor * wobbleMult;
                    extraWobbleRotZ = Math.sin(wSpeed) * 0.18 * sprintFactor * wobbleMult;
                } else {
                    // Sidearms, ARs, Marksman rifles, Snipers, and Special weapons (except MG42):
                    // Rotated about 70 degrees in the Y-axis (yaw)
                    // Defaults
                    sprintOffX = -0.16 * sprintFactor; // Negative to shift left towards center
                    sprintOffY = 0; // Not vertically
                    sprintOffZ = 0.05 * sprintFactor;

                    sprintRotOffX = 0;
                    sprintRotOffY = 1.22 * sprintFactor; // Rotated 70 degrees in the Y-axis (yaw)
                    sprintRotOffZ = 0;

                    // Specific Sideways tuning
                    if (activeId === 'pistol') {
                        // M1911 Pistol: brought down in Y axis a lot
                        sprintOffY = -0.25 * sprintFactor;
                    } else if (activeId === 'gs50') {
                        // .50 Cal: brought close a lot and brought down a lot
                        sprintOffZ = 0.32 * sprintFactor;
                        sprintOffY = -0.22 * sprintFactor;
                    } else if (activeId === 'ak47') {
                        // AK-47: brought way to the left side and much down
                        sprintOffZ = 0.50 * sprintFactor;
                        sprintOffX = -1.65 * sprintFactor;
                        sprintOffY = -0.75 * sprintFactor;
                    } else if (activeId === 'fal') {
                        // FAL: brought way to the left side when sprinting and slightly down (higher than before)
                        sprintOffZ = 0.45 * sprintFactor;
                        sprintOffX = -2.15 * sprintFactor;
                        sprintOffY = -0.45 * sprintFactor;
                    } else if (activeId === 'odin') {
                        // Odin: brought a very tiny bit towards the left side
                        sprintOffX = -0.28 * sprintFactor;
                    } else if (activeId === 'sks') {
                        // SKS: brought an extremely tiny bit towards the left side and then a bit down
                        sprintOffX = -0.24 * sprintFactor;
                        sprintOffY = -0.15 * sprintFactor;
                    } else if (activeId === 'grau556') {
                        // Grau 556: brought a bit closer to the body
                        sprintOffZ = 0.35 * sprintFactor;
                    } else if (activeId === 'dlq33') {
                        // DLQ 33: brought closer to the body, towards the left side, and a bit down
                        sprintOffZ = 0.46 * sprintFactor;
                        sprintOffX = -1.15 * sprintFactor;
                        sprintOffY = -0.42 * sprintFactor;
                    } else if (activeId === 'lw3_tundra') {
                        // LW3 Tundra: brought down a little
                        sprintOffY = -0.36 * sprintFactor;
                    }

                    const wSpeed = bobTime * 1.2;
                    extraWobbleX = Math.sin(wSpeed) * 0.03 * sprintFactor * wobbleMult;
                    extraWobbleY = Math.cos(wSpeed * 2) * 0.015 * sprintFactor * wobbleMult;
                    extraWobbleRotZ = Math.sin(wSpeed) * 0.06 * sprintFactor * wobbleMult;
                }
            }
        }

        // Dynamic viewmodel jump displacement and tilt
        let jumpOffsetY = 0;
        let jumpOffsetRotX = 0;
        if (!isOnGround) {
            const clampedYVel = Math.max(-20, Math.min(20, state.player.velocity.y));
            const adsScale = 1.0 - (state.player.adsFactor * 0.70);
            const jumpWeight = isShotgun ? 1.5 : (isFluencyException ? 1.0 : 1.20);
            jumpOffsetY = -clampedYVel * 0.005 * adsScale * jumpWeight;
            jumpOffsetRotX = clampedYVel * 0.004 * adsScale * jumpWeight;
        }

        // Crouch viewmodel offset (shotgun model weighs 50% more, other weapons 20% more fluent)
        const crouchWeight = isShotgun ? 1.5 : (isFluencyException ? 1.0 : 1.20);
        const crouchOffX = 0.012 * crouchFactor * crouchWeight;
        const crouchOffY = -0.032 * crouchFactor * crouchWeight;
        const crouchOffZ = -0.015 * crouchFactor * crouchWeight;
        const crouchRotX = -0.035 * crouchFactor * crouchWeight;
        const crouchRotZ = 0.02 * crouchFactor * crouchWeight;

        // Combine base position with dynamic sway, steps (bob), breathing, jump vertical offsets, tactical sprint offsets, crouch offsets, and wobble
        const finalPosX = targetViewX + swayX + moveSwayX + bX + pBreathX + sprintOffX + extraWobbleX + crouchOffX;
        const finalPosY = targetViewY + (r.wepZ * 0.1) + swayY + bY + pBreathY + jumpOffsetY + sprintOffY + extraWobbleY + crouchOffY;
        const finalPosZ = targetViewZ + r.wepZ + sprintOffZ + crouchOffZ;

        // Combine base orientation with recoil, procedural step rotational sway, turns, jump tilt, tactical sprint rotation, and crouch rotation
        const finalRotX = targetRotX + r.wepPitch + bRotX - (swayY * 0.25) + jumpOffsetRotX + sprintRotOffX + crouchRotX;
        const finalRotY = targetRotY + (swayX * 0.5) + sprintRotOffY;
        const finalRotZ = targetRotZ + swayRotZ + moveSwayRotZ + bRotZ + sprintRotOffZ + extraWobbleRotZ + crouchRotZ;

        // Multi-layered lerp smoothing transitions (20% more fluent for non-exception weapons)
        const effectiveLerpSpeed = adsLerpSpeed * fluencyMultiplier;
        globals.viewmodel.position.x = THREE.MathUtils.lerp(globals.viewmodel.position.x, finalPosX, delta * effectiveLerpSpeed);
        globals.viewmodel.position.y = THREE.MathUtils.lerp(globals.viewmodel.position.y, finalPosY, delta * effectiveLerpSpeed);
        globals.viewmodel.position.z = THREE.MathUtils.lerp(globals.viewmodel.position.z, finalPosZ, delta * effectiveLerpSpeed);

        globals.viewmodel.rotation.x = THREE.MathUtils.lerp(globals.viewmodel.rotation.x, finalRotX, delta * effectiveLerpSpeed);
        globals.viewmodel.rotation.y = THREE.MathUtils.lerp(globals.viewmodel.rotation.y, finalRotY, delta * effectiveLerpSpeed);
        globals.viewmodel.rotation.z = THREE.MathUtils.lerp(globals.viewmodel.rotation.z, finalRotZ, delta * effectiveLerpSpeed);
    }

    for (let i = state.entities.bullets.length - 1; i >= 0; i--) {
        const b = state.entities.bullets[i];
        b.life -= delta;
        let destroyed = b.life <= 0;

        if (!destroyed) {
            // Apply ballistic bullet drop gravity
            if (!b.velocity) {
                b.velocity = b.dir.clone().multiplyScalar(b.speed || 150);
            }
            const gravity = b.isPellet ? 12.0 : (b.weaponId === 'dlq33' || b.weaponId === 'lw3_tundra' ? 8.0 : (b.weaponId === 'kar98k' || b.weaponId === 'sks' ? 9.0 : 10.0));
            b.velocity.y -= gravity * delta;
            b.speed = b.velocity.length();
            b.dir.copy(b.velocity).normalize();

            const p0 = b.mesh.position.clone();
            const travelDist = b.speed * delta;
            
            // Continuous Collision Detection (CCD) raycasting
            const bulletRaycaster = new THREE.Raycaster(p0, b.dir, 0, travelDist);
            const intersections = bulletRaycaster.intersectObjects(getHittableMeshes(true), true);
            
            let finalTravelDistance = travelDist;

            // Stop visual bullets on local player if they strike the local player body
            if (b.isVisualOnly && globals.yawObj) {
                const localHeadY = globals.yawObj.position.y;
                const localBox = new THREE.Box3(
                    new THREE.Vector3(globals.yawObj.position.x - 0.45, localHeadY - 1.85, globals.yawObj.position.z - 0.45),
                    new THREE.Vector3(globals.yawObj.position.x + 0.45, localHeadY + 0.25, globals.yawObj.position.z + 0.45)
                );
                const localHitPt = new THREE.Vector3();
                if (bulletRaycaster.ray.intersectBox(localBox, localHitPt)) {
                    const hitDist = p0.distanceTo(localHitPt);
                    if (hitDist <= travelDist) {
                        destroyed = true;
                        finalTravelDistance = hitDist;
                        createParticles(localHitPt, 0xff0000, 6);
                        playSound('hit');
                    }
                }
            }
            
            for (const hit of intersections) {
                if (destroyed) break;
                
                let obj: any = hit.object;
                const isEnv = globals.environmentMeshes.some(m => m === obj || m === obj.parent || m === obj.parent?.parent);
                
                // 1. Process environment & barricade collision
                if (isEnv) {
                    destroyed = true;
                    finalTravelDistance = hit.distance;
                    createParticles(hit.point, 0x888888, 2);
                    break;
                }

                // Check if hit a stone barricade
                const hitBarricade = activeStoneBarricades.find(b => b.meshes.includes(obj) || b.meshes.includes(obj.parent));
                if (hitBarricade) {
                    destroyed = true;
                    finalTravelDistance = hit.distance;
                    createParticles(hit.point, 0x777777, 4);
                    hitBarricade.hp -= b.damage;
                    playSound('hit');
                    break;
                }
                
                // 2. Process other players collision (resolving root player model)
                let playerTarget: any = obj;
                while (playerTarget && (!playerTarget.userData || !playerTarget.userData.isPlayer) && playerTarget.parent) {
                    playerTarget = playerTarget.parent;
                }
                if (playerTarget && playerTarget.userData && playerTarget.userData.isPlayer) {
                    destroyed = true;
                    finalTravelDistance = hit.distance;
                    createParticles(hit.point, 0xff0000, 5); // Blood splash
                    playSound('hit');
                    if (playerTarget.userData.playerModel?.triggerHitFlash) {
                        playerTarget.userData.playerModel.triggerHitFlash();
                    }
                    if (isMultiplayer && !b.isVisualOnly && playerTarget.userData.playerId) {
                        sendPlayerDamage(playerTarget.userData.playerId, b.damage, b.weaponId, hit.point);
                    }
                    break;
                }
                
                // 3. Process zombies collision
                while (obj && !obj.userData.zombieData && obj.parent) obj = obj.parent;
                if (obj && obj.userData && obj.userData.zombieData) {
                    const z = obj.userData.zombieData;
                    if (!b.hits.includes(z) && !z.isDead) {
                        b.hits.push(z);
                        
                        let isHeadshot = (z.type === 'purple' || z.type === 'tall' || (z.userData && z.height > 2)) && hit.point.y > z.mesh.position.y + z.height/6;
                        const finalDmg = isHeadshot ? b.damage * 1.2 : b.damage;
                        let finalDmgToSend = finalDmg;
                        
                        if (!b.isVisualOnly) {
                            if (b.weaponId === 'kar98k') {
                                const initDmg = isHeadshot ? 375 : 250;
                                z.hp -= initDmg;
                                finalDmgToSend = initDmg;
                                if (!z.userData) z.userData = {};
                                if (!z.userData.burns) z.userData.burns = [];
                                const burnDmg = isHeadshot ? 125 : 72.5;
                                z.userData.burns.push({ 
                                    ticksLeft: 5, 
                                    damagePerTick: burnDmg / 5, 
                                    lastTick: Date.now() 
                                });
                            } else {
                                z.hp -= finalDmg;
                            }

                            // Dim eyes based on health
                            const healthRatio = Math.max(0, z.hp / z.maxHp);
                            if (z.eyeMaterials) {
                                z.eyeMaterials.forEach((m: THREE.MeshStandardMaterial) => {
                                    m.emissiveIntensity = healthRatio * 2.0;
                                });
                            }
                            updateZombieHealthHUD(z);
                        }

                        createParticles(hit.point, isHeadshot ? 0xff0000 : 0xffffff, isHeadshot ? 8 : 3);
                        
                        if (!b.isVisualOnly) {
                            z.mesh.traverse((c: any) => { if (c.isMesh && c.material.emissive) c.material.emissive.setHex(0x555555); });
                            setTimeout(() => { 
                                if (z.mesh) {
                                    z.mesh.traverse((c: any) => { 
                                        if (c.isMesh && c.material && c.material.emissive) {
                                            const isEye = z.eyeMaterials && z.eyeMaterials.includes(c.material);
                                            c.material.emissive.setHex(isEye ? 0xff0000 : 0x000000);
                                        }
                                    });
                                }
                            }, 50);

                            if (isMultiplayer) {
                                sendZombieDamage(z.id, finalDmgToSend, isHeadshot, hit.point);
                            }
                            if (z.hp <= 0) {
                                killZombie(z, true);
                            } else {
                                playSound('hit');
                            }
                        } else {
                            playSound('hit');
                        }

                        if (b.hits.length >= b.pierce) {
                            destroyed = true;
                            finalTravelDistance = hit.distance;
                            break;
                        }
                    }
                }
            }
            
            // Advance the bullet mesh and draw glowing tracer segment
            const p1 = p0.clone().addScaledVector(b.dir, finalTravelDistance);
            b.mesh.position.copy(p1);
            b.mesh.lookAt(p1.clone().add(b.dir));

            // Create persistent glowing yellow tracer streak (30% shorter for all tracers, compact for shotgun pellets)
            const segStart = b.isPellet ? p1.clone().addScaledVector(b.dir, -finalTravelDistance * 0.16) : p1.clone().addScaledVector(b.dir, -finalTravelDistance * 0.49);
            const tracerLife = b.isPellet ? 0.075 : 0.22;
            createBulletTracerSegment(segStart, p1, b.tracerColor || 0xffea33, b.tracerThickness || (b.isPellet ? 0.025 : 0.04), tracerLife);
            
            // Floor collision fallback
            if (!destroyed && b.mesh.position.y <= 0.05) {
                destroyed = true;
                createParticles(b.mesh.position, 0x888888, 2);
            }
        }

        if (destroyed) {
            globals.scene.remove(b.mesh);
            state.entities.bullets.splice(i, 1);
        }
    }

    for (let i = state.entities.trails.length - 1; i >= 0; i--) {
        const t = state.entities.trails[i]; 
        t.life -= delta; 
        const maxLife = t.maxLife || 0.45;
        t.mesh.material.opacity = Math.max(0, (t.life / maxLife) * 0.95);
        if (t.life <= 0) { 
            globals.scene.remove(t.mesh); 
            state.entities.trails.splice(i, 1); 
        }
    }

    if (state.gameMode === 'survival') {
        const surv = state.survival;
        if (surv.waveState === 'COUNTDOWN') {
            surv.countdownTimer -= delta;
            const wTxt = document.getElementById('survWaveText');
            const zTxt = document.getElementById('survZombiesLeftText');
            if (wTxt) wTxt.innerText = `Wave Starts in: ${Math.ceil(surv.countdownTimer)}`;
            if (zTxt) zTxt.innerText = '';
            if (surv.countdownTimer <= 0) {
                surv.waveState = 'PLAYING'; playSound('waveStart');
                spawnSurvivalZombies(WAVE_CONFIGS[surv.wave].initialSpawn);
            }
        } else if (surv.waveState === 'PLAYING') {
            const waveConf = WAVE_CONFIGS[surv.wave]; const rem = Math.max(0, waveConf.totalZombies - surv.zombiesKilledThisWave);
            const wTxt = document.getElementById('survWaveText');
            const zTxt = document.getElementById('survZombiesLeftText');
            if (wTxt) wTxt.innerText = `Wave: ${surv.wave}`;
            if (zTxt) zTxt.innerText = `Zombies Left: ${rem}/${waveConf.totalZombies}`;
            
            if (waveConf.phases && surv.currentPhase < waveConf.phases.length) {
                let pt = waveConf.phases[surv.currentPhase];
                if (surv.zombiesKilledThisPhase >= pt.triggerKills) { spawnSurvivalZombies(pt.spawn); surv.currentPhase++; surv.zombiesKilledThisPhase = 0; }
            }
            if (surv.zombiesKilledThisWave >= waveConf.totalZombies && surv.activeZombies <= 0) {
                if (surv.wave < Object.keys(WAVE_CONFIGS).length) {
                    playSound('waveEnd'); surv.wave++; surv.zombiesKilledThisWave = 0; surv.zombiesKilledThisPhase = 0;
                    surv.currentPhase = 0; surv.countdownTimer = 5; surv.waveState = 'COUNTDOWN';
                } else {
                    playSound('waveEnd'); surv.waveState = 'VICTORY'; document.exitPointerLock(); 
                    const v = document.getElementById('survivalVictory');
                    if (v) v.style.display = 'flex';
                }
            }
        }

        const survHud = document.getElementById('survivalHud');
        if (survHud) {
            if (surv.damageFlashTimer > 0) {
                surv.damageFlashTimer -= delta; 
                survHud.style.backgroundColor = `rgba(255, 0, 0, ${surv.damageFlashTimer * 2})`;
            } else {
                survHud.style.backgroundColor = 'transparent';
            }
        }

        const bulletVignette = document.getElementById('bulletDamageVignette');
        if (bulletVignette) {
            if (surv.playerDamageVignetteTimer > 0) {
                surv.playerDamageVignetteTimer -= delta;
                bulletVignette.style.display = 'block';
                bulletVignette.style.opacity = `${Math.min(1.0, surv.playerDamageVignetteTimer * 2.0)}`;
            } else {
                bulletVignette.style.opacity = '0';
                bulletVignette.style.display = 'none';
            }
        }
    }

    // Update active enemy zombie projectiles (arrows, boulders, fireballs, barricades)
    updateZombieProjectiles(delta);
    // Update dead bodies (11s corpse lifetime & falling animation)
    updateCorpses(delta);

    for (let i = state.entities.zombies.length - 1; i >= 0; i--) {
        const z = state.entities.zombies[i];
        
        // Clean up any remaining singleplayer or local ghost zombies that don't have a network ID during multiplayer
        if (isMultiplayer && !z.id) {
            if (z.mesh) globals.scene.remove(z.mesh);
            state.entities.zombies.splice(i, 1);
            continue;
        }

        // Subterranean rising spawn interpolation
        if (z.spawnProgress !== undefined && z.spawnProgress < 1.0) {
            z.spawnProgress += delta * 1.6;
            z.mesh.position.y = -1.6 * (1.0 - Math.min(1.0, z.spawnProgress));
            if (Math.random() < 0.2) {
                createParticles(new THREE.Vector3(z.mesh.position.x, 0.05, z.mesh.position.z), 0x3d2817, 1);
            }
            animateZombiePivots(z, delta, false);
            if (z.spawnProgress < 1.0) {
                continue; // Cannot move or attack while rising from ground
            }
        }
        
        // Afterburn ticks (multiple stacked burns support)
        let isBurning = false;
        if (z.userData?.burns && z.userData.burns.length > 0) {
            isBurning = true;
            let needsHealthUpdate = false;
            for (let bIdx = z.userData.burns.length - 1; bIdx >= 0; bIdx--) {
                const bd = z.userData.burns[bIdx];
                if (Date.now() - bd.lastTick >= 500) {
                    bd.lastTick = Date.now();
                    bd.ticksLeft--;
                    z.hp -= bd.damagePerTick;
                    needsHealthUpdate = true;

                    if (isMultiplayer) {
                        sendZombieDamage(z.id, bd.damagePerTick, false, null);
                    }

                    // Fire particles emitted from random points of zombie's torso/head
                    const offsetHeight = Math.random() * (z.height || 2);
                    const particlePos = z.mesh.position.clone();
                    particlePos.y += offsetHeight;
                    const colors = [0xff3300, 0xff7700, 0xffaa00, 0xffdd00];
                    const chosenColor = colors[Math.floor(Math.random() * colors.length)];
                    createParticles(particlePos, chosenColor, 2);

                    if (bd.ticksLeft <= 0) {
                        z.userData.burns.splice(bIdx, 1);
                    }
                }
            }
            if (needsHealthUpdate) {
                // Dim eyes based on health
                const healthRatio = Math.max(0, z.hp / z.maxHp);
                if (z.eyeMaterials) {
                    z.eyeMaterials.forEach((m: THREE.MeshStandardMaterial) => {
                        m.emissiveIntensity = healthRatio * 2.0;
                    });
                }
                updateZombieHealthHUD(z);
                
                if (z.hp <= 0 && !z.isDead) { 
                    killZombie(z, true);
                    continue;
                }
            }
        }

        // Apply ambient fire glow to standard materials of the zombie model while burning
        z.mesh.traverse((child: any) => {
            if (child.isMesh && child.material && child.material.emissive) {
                const hexColor = child.material.color ? child.material.color.getHex() : 0;
                if (hexColor !== 0x440000 && hexColor !== 0x220000 && hexColor !== 0x00ff33) {
                    if (isBurning && z.userData?.burns && z.userData.burns.length > 0) {
                        child.material.emissive.setHex(0xff3300);
                        child.material.emissiveIntensity = (Math.sin(Date.now() * 0.02) * 0.4 + 0.6) * Math.min(2.0, z.userData.burns.length * 0.5);
                    } else {
                        if (child.material.emissive.getHex() === 0xff3300) {
                            child.material.emissive.setHex(0x000000);
                            child.material.emissiveIntensity = 0.0;
                        }
                    }
                }
            }
        });

        // Dynamic eye glow intensity update - perfectly linear based on health
        if (z.eyeMaterials && z.eyeMaterials.length > 0) {
            const healthRatio = Math.max(0, z.hp / z.maxHp);
            const isFrenzied = z.userData?.frenzyUntil && Date.now() < z.userData.frenzyUntil;
            z.eyeMaterials.forEach((m: THREE.MeshStandardMaterial) => {
                m.emissiveIntensity = isFrenzied ? 3.5 : (healthRatio * 2.0);
            });
        }
        
        if (z.isDead) {
            state.entities.zombies.splice(i, 1);
            continue;
        }

        // Target and distance calculation
        const targetDir = new THREE.Vector3().subVectors(globals.yawObj.position, z.mesh.position);
        targetDir.y = 0; 
        const distToPlayer = targetDir.length();
        targetDir.normalize();

        // Boid Flocking / Separation to prevent clustering into a single point
        const sepForce = new THREE.Vector3();
        let neighborCount = 0;
        for (let j = 0; j < state.entities.zombies.length; j++) {
            if (i === j) continue;
            const other = state.entities.zombies[j];
            if (other.isDead) continue;
            const dx = z.mesh.position.x - other.mesh.position.x;
            const dz = z.mesh.position.z - other.mesh.position.z;
            const dSq = dx * dx + dz * dz;
            const minDist = (z.radius || 0.6) + (other.radius || 0.6) + 0.35;
            if (dSq < minDist * minDist && dSq > 0.001) {
                const d = Math.sqrt(dSq);
                const push = (minDist - d) / minDist;
                sepForce.x += (dx / d) * push;
                sepForce.z += (dz / d) * push;
                neighborCount++;
            }
        }
        if (neighborCount > 0) {
            sepForce.multiplyScalar(2.5);
        }

        if (isMultiplayer) {
            if (distToPlayer < (z.radius || 0.6) + 1.5) {
                if (!(z as any).interactionStartTime) (z as any).interactionStartTime = Date.now();
                const interactionMet = Date.now() - (z as any).interactionStartTime >= 300;
                
                if (interactionMet) {
                    if (!(z as any).lastHitTime) (z as any).lastHitTime = 0;
                    const cooldownMs = 1000;
                    if (Date.now() - (z as any).lastHitTime > cooldownMs) {
                        (z as any).lastHitTime = Date.now();
                        const dmg = z.archetype === 'brute' ? 35 : z.archetype === 'screamer' ? 20 : z.archetype === 'runner' ? 15 : 10;
                        state.survival.health -= dmg;
                        playSound('damage');
                        state.survival.damageFlashTimer = 0.25;
                        updateSurvivalHUD();
                        
                        if (state.survival.health <= 0) {
                            if ((globals as any).triggerPlayerDeath) {
                                (globals as any).triggerPlayerDeath();
                            } else {
                                state.survival.health = 0;
                                updateSurvivalHUD();
                            }
                        }
                    }
                }
            } else {
                (z as any).interactionStartTime = null;
            }
        }

        let canMove = !isMultiplayer;
        let isMoving = z.isMoving !== undefined ? z.isMoving : false;
        const isFrenzied = z.userData?.frenzyUntil && Date.now() < z.userData.frenzyUntil;
        const currentSpeed = (z.speed || 3.5) * (isFrenzied ? 1.45 : 1.0);

        if (z.userData) {
            if (Date.now() < z.userData.stunnedUntil) canMove = false;

            const arch = z.archetype || (z.userData.isRanged ? 'archer' : 'walker');

            // --- 1. BONE ARCHER AI (Sniper / Kiter) ---
            if (arch === 'archer' || z.userData.isRanged) {
                const idealDistMin = 13;
                const idealDistMax = 22;

                // Aiming & Shooting Routine
                const timeSinceLastShot = Date.now() - (z.userData.lastRangedShotTime || 0);
                if (timeSinceLastShot >= 2400 && distToPlayer <= 35) {
                    if (!z.userData.aimStartTime) {
                        z.userData.aimStartTime = Date.now();
                        z.userData.isAiming = true;
                    }

                    // Face player directly during aim
                    z.mesh.lookAt(globals.yawObj.position.x, z.mesh.position.y, globals.yawObj.position.z);

                    if (Date.now() - z.userData.aimStartTime >= 650) {
                        // Release arrow
                        const shootOrigin = z.mesh.position.clone();
                        shootOrigin.y += (z.height ? z.height * 0.6 : 1.3);
                        const isAcid = (z.type && z.type.includes('Three')) || Math.random() < 0.25;
                        spawnZombieProjectile(shootOrigin, globals.yawObj.position, 20, isAcid);
                        z.userData.lastRangedShotTime = Date.now();
                        z.userData.aimStartTime = 0;
                        z.userData.isAiming = false;
                    }
                } else if (!z.userData.aimStartTime) {
                    z.userData.isAiming = false;
                }

                // Tactical Kiting & Spacing
                if (canMove && !z.userData.isAiming) {
                    const moveDir = targetDir.clone();
                    if (distToPlayer < idealDistMin) {
                        // Backpedal and strafe away from player
                        moveDir.negate();
                        const strafe = new THREE.Vector3(-moveDir.z, 0, moveDir.x).multiplyScalar(Math.sin(z.animTime || 0) * 0.4);
                        moveDir.add(strafe).normalize();
                        z.mesh.position.addScaledVector(moveDir, currentSpeed * 1.15 * delta);
                        isMoving = true;
                    } else if (distToPlayer > idealDistMax) {
                        // Advance to shooting range
                        moveDir.add(sepForce).normalize();
                        z.mesh.position.addScaledVector(moveDir, currentSpeed * delta);
                        isMoving = true;
                    } else {
                        // Lateral circling in sweet spot
                        const strafe = new THREE.Vector3(-moveDir.z, 0, moveDir.x).multiplyScalar(Math.sin((z.animTime || 0) * 0.8) > 0 ? 1 : -1);
                        strafe.normalize();
                        z.mesh.position.addScaledVector(strafe, currentSpeed * 0.65 * delta);
                        isMoving = true;
                    }
                }
            }
            // --- 2. FIRE DEMON AI (Ranged Molten Artillery) ---
            else if (arch === 'firedemon') {
                const idealDistMin = 11;
                const idealDistMax = 20;

                // Fireball Barrage Routine
                const timeSinceFireball = Date.now() - (z.userData.lastFireballTime || 0);
                if (timeSinceFireball >= 3000 && distToPlayer <= 32) {
                    if (!z.userData.castStartTime) {
                        z.userData.castStartTime = Date.now();
                        z.userData.isCasting = true;
                    }

                    z.mesh.lookAt(globals.yawObj.position.x, z.mesh.position.y, globals.yawObj.position.z);

                    if (Date.now() - z.userData.castStartTime >= 550) {
                        const launchPos = z.mesh.position.clone();
                        launchPos.y += 2.0;
                        spawnFireball(launchPos, globals.yawObj.position, 28);
                        z.userData.lastFireballTime = Date.now();
                        z.userData.castStartTime = 0;
                        z.userData.isCasting = false;
                    }
                } else if (!z.userData.castStartTime) {
                    z.userData.isCasting = false;
                }

                // Artillery Spacing
                if (canMove && !z.userData.isCasting) {
                    const moveDir = targetDir.clone();
                    if (distToPlayer < idealDistMin) {
                        moveDir.negate();
                        z.mesh.position.addScaledVector(moveDir, currentSpeed * 0.95 * delta);
                        isMoving = true;
                    } else if (distToPlayer > idealDistMax) {
                        moveDir.add(sepForce).normalize();
                        z.mesh.position.addScaledVector(moveDir, currentSpeed * delta);
                        isMoving = true;
                    }
                }
            }
            // --- 3. FLYING PHANTOM AI (Aerial Specter) ---
            else if (arch === 'phantom') {
                // Maintain hovering altitude
                const targetAltitude = 3.8 + Math.sin((z.animTime || 0) * 1.6) * 0.45;
                z.mesh.position.y = THREE.MathUtils.lerp(z.mesh.position.y, targetAltitude, delta * 4.0);

                const idealDistMin = 12;
                const idealDistMax = 22;

                // Spectral Homing Orb Attack
                const timeSinceOrb = Date.now() - (z.userData.lastOrbTime || 0);
                if (timeSinceOrb >= 2800 && distToPlayer <= 35) {
                    if (!z.userData.castStartTime) {
                        z.userData.castStartTime = Date.now();
                        z.userData.isCastingOrb = true;
                    }

                    z.mesh.lookAt(globals.yawObj.position.x, z.mesh.position.y, globals.yawObj.position.z);

                    if (Date.now() - z.userData.castStartTime >= 450) {
                        const launchPos = z.mesh.position.clone();
                        launchPos.y += 1.2;
                        spawnSpectralHomingOrb(launchPos, 22);
                        z.userData.lastOrbTime = Date.now();
                        z.userData.castStartTime = 0;
                        z.userData.isCastingOrb = false;
                    }
                } else if (!z.userData.castStartTime) {
                    z.userData.isCastingOrb = false;
                }

                // Aerial gliding spacing
                if (canMove && !z.userData.isCastingOrb) {
                    const moveDir = targetDir.clone();
                    if (distToPlayer < idealDistMin) {
                        moveDir.negate();
                        z.mesh.position.addScaledVector(moveDir, currentSpeed * 1.05 * delta);
                        isMoving = true;
                    } else if (distToPlayer > idealDistMax) {
                        moveDir.add(sepForce).normalize();
                        z.mesh.position.addScaledVector(moveDir, currentSpeed * delta);
                        isMoving = true;
                    } else {
                        const strafe = new THREE.Vector3(-moveDir.z, 0, moveDir.x).multiplyScalar(Math.cos(z.animTime || 0) * 0.7);
                        z.mesh.position.addScaledVector(strafe, currentSpeed * 0.7 * delta);
                        isMoving = true;
                    }
                }
            }
            // --- 4. ORC SHAMAN AI (Earth Conjurer & Battle Shaman) ---
            else if (arch === 'orc') {
                const idealDistMin = 7;
                const idealDistMax = 18;

                // Ability A: Stone Barricade Wall Summon
                const timeSinceWall = Date.now() - (z.userData.lastWallTime || 0);
                if (timeSinceWall >= 7500 && distToPlayer >= 8.0 && distToPlayer <= 25.0) {
                    triggerOrcStoneWall(z, globals.yawObj.position);
                }

                // Ability B: Earthen Rock Throw
                const timeSinceRock = Date.now() - (z.userData.lastRangedShotTime || 0);
                if (timeSinceRock >= 3400 && distToPlayer >= 6.0 && distToPlayer <= 26.0 && !z.userData.isCastingWall) {
                    if (!z.userData.aimStartTime) {
                        z.userData.aimStartTime = Date.now();
                        z.userData.isAiming = true;
                    }

                    z.mesh.lookAt(globals.yawObj.position.x, z.mesh.position.y, globals.yawObj.position.z);

                    if (Date.now() - z.userData.aimStartTime >= 500) {
                        const launchPos = z.mesh.position.clone();
                        launchPos.y += 1.8;
                        spawnZombieProjectile(launchPos, globals.yawObj.position, 24, false);
                        z.userData.lastRangedShotTime = Date.now();
                        z.userData.aimStartTime = 0;
                        z.userData.isAiming = false;
                    }
                } else if (!z.userData.aimStartTime) {
                    z.userData.isAiming = false;
                }

                // Movement
                if (canMove && !z.userData.isCastingWall && !z.userData.isAiming) {
                    const moveDir = targetDir.clone();
                    if (distToPlayer < idealDistMin && distToPlayer > 3.0) {
                        moveDir.negate();
                        z.mesh.position.addScaledVector(moveDir, currentSpeed * 0.85 * delta);
                        isMoving = true;
                    } else if (distToPlayer > idealDistMax) {
                        moveDir.add(sepForce).normalize();
                        z.mesh.position.addScaledVector(moveDir, currentSpeed * delta);
                        isMoving = true;
                    } else if (distToPlayer <= 3.0) {
                        // Close in for heavy totem staff melee
                        moveDir.add(sepForce).normalize();
                        z.mesh.position.addScaledVector(moveDir, currentSpeed * delta);
                        isMoving = true;
                    }
                }
            }
            // --- 5. ARMORED BRUTE AI (Juggernaut & Boulder Hurler) ---
            else if (arch === 'brute' || z.userData.isBrute) {
                // Ability A: Close-range Earth Slam
                if (distToPlayer < 4.5 && Date.now() > (z.userData.slamCooldown || 0)) {
                    triggerBruteSlam(z);
                }
                // Ability B: Long-range Giant Boulder Toss
                else if (distToPlayer >= 6.5 && distToPlayer <= 32.0 && Date.now() - (z.userData.lastBoulderTime || 0) > 4200) {
                    triggerBruteBoulderToss(z, globals.yawObj.position);
                }

                if (canMove && !z.userData.isThrowing && !z.userData.isSlamming && distToPlayer > (z.radius || 0.8) + 0.6) {
                    const moveDir = targetDir.clone().add(sepForce).normalize();
                    z.mesh.position.addScaledVector(moveDir, currentSpeed * delta);
                    isMoving = true;
                }
            }
            // --- 6. SCREAMER AI ---
            else if (arch === 'screamer' || z.userData.isScreamer) {
                const timeSinceScream = Date.now() - (z.userData.lastScreamTime || 0);
                if (timeSinceScream > 7500 && distToPlayer < 24) {
                    triggerScreamerHowl(z);
                }

                if (canMove && !z.userData.isScreaming && distToPlayer > (z.radius || 0.6) + 0.8) {
                    const moveDir = targetDir.clone().add(sepForce).normalize();
                    z.mesh.position.addScaledVector(moveDir, currentSpeed * delta);
                    isMoving = true;
                }
            }
            // --- 7. BLOATER AI ---
            else if (arch === 'bloater' || z.userData.isBloater) {
                if (distToPlayer < 2.4) {
                    killZombie(z, false);
                    continue;
                }
                if (canMove) {
                    const moveDir = targetDir.clone().add(sepForce).normalize();
                    z.mesh.position.addScaledVector(moveDir, currentSpeed * delta);
                    isMoving = true;
                }
            }
            // --- 8. SLIME & MINI-SLIME AI ---
            else if (arch === 'slime' || arch === 'minislime') {
                if (canMove && distToPlayer > (z.radius || 0.5) + 0.4) {
                    const moveDir = targetDir.clone().add(sepForce).normalize();
                    z.mesh.position.addScaledVector(moveDir, currentSpeed * delta);
                    isMoving = true;
                }
            }
            // --- 9. STANDARD / RUNNER / LEAPER AI ---
            else {
                const minPlayerDist = z.userData.blitz ? -1 : ((z.radius || 0.6) + 0.8);
                if (distToPlayer > minPlayerDist && canMove) {
                    const moveDir = targetDir.clone().add(sepForce).normalize();
                    z.mesh.position.addScaledVector(moveDir, currentSpeed * delta);
                    isMoving = true;
                }
            }

            // Standard Melee Attack Check (only for non-ranged or when in melee range)
            const canMelee = arch !== 'archer' && arch !== 'firedemon' && arch !== 'phantom';
            if (canMelee && distToPlayer < (z.radius || 0.6) + 1.5 && canMove) {
                if (!z.userData.interactionStartTime) z.userData.interactionStartTime = Date.now();
                const interactionMet = Date.now() - z.userData.interactionStartTime >= 250;

                if (interactionMet) {
                    if (Date.now() - (z.userData.lastHitTime || 0) > (z.userData.cooldown || 1.0) * 1000) {
                        z.userData.lastHitTime = Date.now();
                        let dmg = z.userData.dmg || 15;
                        if (Math.random() * 100 <= (z.userData.dmgChance || 20)) dmg += (z.userData.bonusDmg || 5);
                        state.survival.health -= dmg;
                        playSound('damage');
                        state.survival.damageFlashTimer = 0.25;
                        updateSurvivalHUD();
                        
                        if (state.survival.health <= 0) {
                            if ((globals as any).triggerPlayerDeath) {
                                (globals as any).triggerPlayerDeath();
                            } else {
                                state.survival.health = 0;
                                updateSurvivalHUD();
                            }
                        }

                        if (z.userData.blitz) z.userData.stunnedUntil = Date.now() + 750;
                        else if (currentSpeed >= 18) z.userData.stunnedUntil = Date.now() + 900;
                    }
                }
            } else {
                z.userData.interactionStartTime = null;
            }
        } else {
            // Non-survival singleplayer zombie attack (e.g. Tester mode)
            if (distToPlayer < (z.radius || 0.6) + 1.5) {
                if (!(z as any).interactionStartTime) (z as any).interactionStartTime = Date.now();
                const interactionMet = Date.now() - (z as any).interactionStartTime >= 300;

                if (interactionMet) {
                    if (!(z as any).lastHitTime) (z as any).lastHitTime = 0;
                    const cooldownMs = 1000;
                    if (Date.now() - (z as any).lastHitTime > cooldownMs) {
                        (z as any).lastHitTime = Date.now();
                        const type = z.type || 'green';
                        const dmg = type === 'tall' || type === 'brute' ? 30 : type === 'purple' ? 20 : type === 'red' ? 15 : 10;
                        state.survival.health -= dmg;
                        playSound('damage');
                        state.survival.damageFlashTimer = 0.25;
                        updateSurvivalHUD();
                        
                        if (state.survival.health <= 0) {
                            if ((globals as any).triggerPlayerDeath) {
                                (globals as any).triggerPlayerDeath();
                            } else {
                                state.survival.health = 0;
                                updateSurvivalHUD();
                            }
                        }
                    }
                }
            } else {
                (z as any).interactionStartTime = null;
            }

            if (distToPlayer > (z.radius || 0.6) + 0.8 && canMove) {
                const moveDir = targetDir.clone().add(sepForce).normalize();
                z.mesh.position.addScaledVector(moveDir, currentSpeed * delta);
                isMoving = true;
            }
        }

        // Clamp inside survival boundary
        if (state.gameMode === 'survival') {
            z.mesh.position.x = Math.max(-98, Math.min(98, z.mesh.position.x));
            z.mesh.position.z = Math.max(-98, Math.min(98, z.mesh.position.z));
        }

        z.mesh.lookAt(globals.yawObj.position.x, z.mesh.position.y, globals.yawObj.position.z);
        animateZombiePivots(z, delta, isMoving);
    }

    for (let i = state.entities.particles.length - 1; i >= 0; i--) {
        const p = state.entities.particles[i]; p.mesh.position.addScaledVector(p.velocity, delta); p.velocity.y -= 20 * delta; p.life -= delta * 2; p.mesh.material.opacity = p.life;
        if (p.life <= 0 || p.mesh.position.y < 0) { globals.scene.remove(p.mesh); state.entities.particles.splice(i, 1); }
    }

    for (let i = state.entities.floatingTexts.length - 1; i >= 0; i--) {
        const ft = state.entities.floatingTexts[i]; ft.life -= delta * 0.8; ft.pos.y += delta * 2;
        if (ft.life <= 0) { ft.element.remove(); state.entities.floatingTexts.splice(i, 1); } 
        else {
            const screenPos = ft.pos.clone(); screenPos.project(globals.camera);
            if (screenPos.z > 1) ft.element.style.display = 'none';
            else {
                ft.element.style.display = 'block'; ft.element.style.left = `${(screenPos.x * 0.5 + 0.5) * window.innerWidth}px`;
                ft.element.style.top = `${(screenPos.y * -0.5 + 0.5) * window.innerHeight}px`; ft.element.style.opacity = ft.life;
            }
        }
    }

    // Dynamic animation and safe disposal of short-lived muzzle flashes
    for (let i = activeMuzzleFlashes.length - 1; i >= 0; i--) {
        const f = activeMuzzleFlashes[i];
        f.life -= delta;
        if (f.life <= 0) {
            if (f.light) {
                globals.scene.remove(f.light);
                globals.viewmodel.remove(f.light);
                f.light.dispose();
            }
            if (f.mesh) {
                globals.scene.remove(f.mesh);
                globals.viewmodel.remove(f.mesh);
                f.mesh.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach((m) => m.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
            }
            activeMuzzleFlashes.splice(i, 1);
        } else {
            const ratio = f.life / f.maxLife;
            if (f.mesh) {
                f.mesh.scale.set(ratio, ratio, ratio);
            }
            if (f.light) {
                f.light.intensity = ratio * 60.0; // gradual power decay matching our 60.0 flash intensity
            }
        }
    }
}

function createSkyGroundReflectionTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Create sky-to-ground vertical gradient (equirectangular projection)
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    
    // Beautiful sky blue to grass transition
    grad.addColorStop(0.0, '#0c2540');   // Deep space/high sky zenith
    grad.addColorStop(0.3, '#3a7bd5');   // Medium blue sky
    grad.addColorStop(0.46, '#a8c0ff');  // Horizon sky haze (bright sky dome reflection)
    grad.addColorStop(0.49, '#ffffff');  // Bright horizon line
    grad.addColorStop(0.51, '#1e3810');  // Under horizon grass line
    grad.addColorStop(0.65, '#2e6f40');  // Grass field reflection
    grad.addColorStop(1.0, '#091c0a');   // Soft ground shadow/earth
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    
    // Add realistic ambient outdoor clouds for texture variety in metallic reflections
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(120, 75, 30, 0, Math.PI * 2);
    ctx.arc(160, 65, 45, 0, Math.PI * 2);
    ctx.arc(200, 75, 25, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(360, 50, 25, 0, Math.PI * 2);
    ctx.arc(400, 45, 35, 0, Math.PI * 2);
    ctx.fill();
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

export function setupEngine(canvas: HTMLCanvasElement) {
    globals.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    globals.renderer.setSize(window.innerWidth, window.innerHeight);
    globals.renderer.setPixelRatio(state.settings.disableRealisticGuns ? 1.0 : window.devicePixelRatio);
    globals.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    globals.renderer.toneMappingExposure = 1.0;

    globals.scene = new THREE.Scene();
    globals.scene.fog = new THREE.FogExp2(0x111122, 0.0025);

    globals.camera = new THREE.PerspectiveCamera(95, window.innerWidth / window.innerHeight, 0.1, 1000);
    globals.cameraRecoilObj = new THREE.Object3D();
    globals.cameraRecoilObj.add(globals.camera);

    globals.pitchObj = new THREE.Object3D();
    globals.yawObj = new THREE.Object3D();
    globals.yawObj.position.y = 2; 
    globals.yawObj.add(globals.pitchObj);
    globals.pitchObj.add(globals.cameraRecoilObj);
    globals.scene.add(globals.yawObj);

    globals.viewmodel = new THREE.Group();
    globals.viewmodel.position.set(0.3, -0.25, -0.5); 
    globals.pitchObj.add(globals.viewmodel);

    globals.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    globals.ambientLight.layers.enableAll();
    globals.scene.add(globals.ambientLight);

    globals.gunAmbientLight = new THREE.AmbientLight(0xffffff, Math.max(0, state.settings.gunBrightness - 1));
    globals.gunAmbientLight.layers.set(1);
    globals.scene.add(globals.gunAmbientLight);

    globals.dirLight = new THREE.DirectionalLight(0xffddaa, 1.2);
    globals.dirLight.position.set(200, 300, 200);
    globals.dirLight.castShadow = true;
    globals.dirLight.layers.enableAll();
    globals.scene.add(globals.dirLight);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    
    // Massive Skydome
    const skyGeo = new THREE.SphereGeometry(400, 64, 64);
    const skyMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false });
    // Use an Unsplash photo with generous CORS for the sky
    textureLoader.load('https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?q=80&w=2500&auto=format&fit=crop', (tex) => {
        tex.wrapS = THREE.MirroredRepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.repeat.set(2, 1);
        tex.colorSpace = THREE.SRGBColorSpace;
        skyMat.map = tex;
        skyMat.needsUpdate = true;
    });
    globals.skySphere = new THREE.Mesh(skyGeo, skyMat);
    globals.scene.add(globals.skySphere);

    // Realistic Grass Floor
    const floorGeo = new THREE.PlaneGeometry(1000, 1000);
    const floorMat = new THREE.MeshStandardMaterial({ roughness: 1.0, metalness: 0.0 });
    // Use github's raw user content for standard threejs grass
    textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/terrain/grasslight-big.jpg', (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(50, 50);
        tex.colorSpace = THREE.SRGBColorSpace;
        floorMat.map = tex;
        floorMat.needsUpdate = true;
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    globals.scene.add(floor);
    globals.environmentMeshes.push(floor);

    const stationPos = globals.stationPos;
    const stationGeo = new THREE.BoxGeometry(3, 3, 3);
    const stationMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, wireframe: true, toneMapped: false });
    globals.stationMesh = new THREE.Mesh(stationGeo, stationMat);
    globals.stationMesh.position.copy(stationPos);
    globals.scene.add(globals.stationMesh);
    globals.environmentMeshes.push(globals.stationMesh);
    
    const stationCoreGeo = new THREE.BoxGeometry(2.8, 2.8, 2.8);
    const stationCoreMat = new THREE.MeshBasicMaterial({ color: 0x0044aa, transparent: true, opacity: 0.5, toneMapped: false });
    const stationCore = new THREE.Mesh(stationCoreGeo, stationCoreMat);
    globals.stationMesh.add(stationCore);

    globals.stationLight = new THREE.PointLight(0x00aaff, 0, 20);
    globals.stationLight.position.copy(stationPos);
    globals.scene.add(globals.stationLight);

    // Environment Mapping - Restore royal esplanade for surroundings
    new RGBELoader().load('https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/equirectangular/royal_esplanade_1k.hdr', function(texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        globals.scene.environment = texture;
        globals.envMapTexture = texture;
    }, undefined, function(err) {
        console.error("Engine env map failed:", err);
    });

    window.addEventListener('resize', () => {
        globals.camera.aspect = window.innerWidth / window.innerHeight; 
        globals.camera.updateProjectionMatrix();
        globals.renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

let running = false;
let lastFpsUpdateTime = 0;
let frameCount = 0;

export function startGameLoop() {
    if(running) return;
    running = true;
    
    globals.renderer.autoClear = false;

    lastFpsUpdateTime = performance.now();

    function loop() {
        requestAnimationFrame(loop);

        // Frame timing for FPS counter
        frameCount++;
        const now = performance.now();
        if (now - lastFpsUpdateTime >= 1000) {
            const fpsVal = Math.round((frameCount * 1000) / (now - lastFpsUpdateTime));
            const el = document.getElementById('fpsCounter');
            if (el) el.textContent = `${fpsVal} FPS`;
            frameCount = 0;
            lastFpsUpdateTime = now;
        }

        updateEngine();

        globals.renderer.clear();
        
        // Put viewmodel strictly on layer 1
        globals.viewmodel.traverse((child) => {
            child.layers.set(1);
        });

        // Pass 0: World (darkens beautifully based on current night/day cycle or forced mode)
        const effectiveRatio = getEffectiveDayTimerRatio();
        const { sunHeight } = getSunAngleAndHeight(effectiveRatio);
        const nightDimmer = THREE.MathUtils.lerp(0.08, 1.0, Math.max(0, sunHeight));
        globals.renderer.toneMappingExposure = state.settings.envBrightness * nightDimmer;
        globals.camera.layers.set(0);
        globals.renderer.render(globals.scene, globals.camera);

        // Pass 1: Viewmodel
        globals.renderer.clearDepth();
        const gunNightDimmer = THREE.MathUtils.lerp(0.12, 1.0, Math.max(0, sunHeight));
        globals.renderer.toneMappingExposure = state.settings.gunBrightness * gunNightDimmer;
        globals.camera.layers.set(1);
        globals.renderer.render(globals.scene, globals.camera);

        // Reset camera layer to 0 for next frame
        globals.camera.layers.set(0);
    }
    loop();
}
