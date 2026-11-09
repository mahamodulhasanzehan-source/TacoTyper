import * as THREE from 'three';
import { globals } from '../globals';
import { state } from '../state';
import { createParticles, createFloatingText } from './Particles';
import { playSound } from '../audio/AudioSys';
import { updateSurvivalHUD, updateZombieHealthHUD } from '../ui/UIUtils';
import {
    spawnZombieProjectile,
    spawnBruteBoulder,
    spawnFireball,
    spawnSpectralHomingOrb,
    spawnStoneBarricade
} from './ZombieProjectiles';
import { spawnZombies } from './ZombieManager';
import { SURVIVAL_ZOMBIES } from '../config/zombies';

export interface ZombieCorpse {
    mesh: THREE.Group;
    pivots: any;
    eyeMaterials?: THREE.MeshStandardMaterial[];
    fallAnimTime: number;
    fallDir: number; // 1 for fall forward, -1 for fall backward
    life: number;
    maxLife: number;
    scale: number;
    initialY: number;
}

export const activeCorpses: ZombieCorpse[] = [];

// ==========================================
// 1. ZOMBIE DEATH & CORPSE MANAGEMENT
// ==========================================

export function killZombie(z: any, killerIsPlayer: boolean = true) {
    if (z.isDead) return;
    z.isDead = true;

    playSound('die');

    // 1. Immediately hide and detach health bar HUD so it NEVER floats over corpses
    if (z.hpGroup) {
        z.hpGroup.visible = false;
        if (z.mesh) {
            z.mesh.remove(z.hpGroup);
        }
    }

    const deathPos = z.mesh.position.clone();
    deathPos.y += 1.0;

    // Archetype specific death effects
    if (z.userData?.isBloater || z.archetype === 'bloater') {
        triggerBloaterExplosion(deathPos, z);
    } else if (z.userData?.isBrute || z.archetype === 'brute') {
        createParticles(deathPos, 0xff4400, 25);
        createParticles(deathPos, 0x222222, 15);
    } else if (z.archetype === 'firedemon') {
        createParticles(deathPos, 0xff2200, 25);
        createParticles(deathPos, 0xffaa00, 20);
    } else if (z.archetype === 'phantom') {
        createParticles(deathPos, 0xaa00ff, 25);
        createParticles(deathPos, 0x330066, 15);
    } else if (z.archetype === 'slime' || z.archetype === 'minislime') {
        createParticles(deathPos, 0x22ff66, 20);
        createParticles(deathPos, 0x88ffaa, 15);
        // Slime split into 2 mini-slimes on death!
        if (z.archetype === 'slime' && state.gameMode === 'survival') {
            spawnMiniSlimesOnDeath(z.mesh.position);
        }
    } else {
        createParticles(deathPos, z.mesh.material ? z.mesh.material.color.getHex() : 0x4a7a40, 15);
    }

    state.gameplay.lastZType = z.type;

    // Turn off eye glows on death immediately
    if (z.eyeMaterials) {
        z.eyeMaterials.forEach((m: THREE.MeshStandardMaterial) => {
            m.emissiveIntensity = 0;
            m.emissive.setHex(0x000000);
        });
    }

    // Convert to Dead Body (lies on ground for 11 seconds with falling animation)
    if (z.mesh && z.pivots && z.archetype !== 'bloater') {
        activeCorpses.push({
            mesh: z.mesh,
            pivots: z.pivots,
            eyeMaterials: z.eyeMaterials,
            fallAnimTime: 0,
            fallDir: Math.random() < 0.5 ? 1 : -1,
            life: 11.0, // Exactly 11 seconds requirement
            maxLife: 11.0,
            scale: z.scale || 1.0,
            initialY: z.mesh.position.y
        });
    } else {
        // Bloaters explode into bits
        if (z.mesh && globals.scene) globals.scene.remove(z.mesh);
    }

    // Remove from active targetable zombies array
    const zIdx = state.entities.zombies.indexOf(z);
    if (zIdx > -1) {
        state.entities.zombies.splice(zIdx, 1);
    }

    if (state.gameMode === 'survival') {
        const moneyEarned = z.userData?.money || 15;
        state.survival.money += moneyEarned;
        state.survival.zombiesKilledThisWave++;
        state.survival.zombiesKilledThisPhase++;
        state.survival.activeZombies--;
        updateSurvivalHUD();
        createFloatingText(deathPos, `+$${moneyEarned}`, 0x27ae60);
    } else {
        state.gameplay.kills++;
        const hudZ = document.getElementById('hudZombieCount');
        if (hudZ) hudZ.innerText = state.gameplay.kills.toString();
        if (state.gameplay.spawns) {
            spawnZombies(Math.random() < state.gameplay.prob ? 2 : 1);
        }
    }
}

export function updateCorpses(delta: number) {
    if (!globals.scene) return;

    for (let i = activeCorpses.length - 1; i >= 0; i--) {
        const corpse = activeCorpses[i];
        corpse.life -= delta;
        corpse.fallAnimTime += delta;

        // If dead entity was in air (like flying phantom), drop to ground floor level
        if (corpse.mesh.position.y > 0.08) {
            corpse.mesh.position.y = THREE.MathUtils.lerp(corpse.mesh.position.y, 0.08, delta * 5.0);
        } else {
            corpse.mesh.position.y = 0.08; // Rest firmly above the double-layer floor surface
        }

        // Fall Down Ragdoll Animation (0 to 0.45s)
        if (corpse.fallAnimTime <= 0.45) {
            const progress = corpse.fallAnimTime / 0.45;
            const easeOut = Math.sin((progress * Math.PI) / 2);

            const body = corpse.pivots.body;
            const head = corpse.pivots.head;
            const leftArm = corpse.pivots.leftArm;
            const rightArm = corpse.pivots.rightArm;
            const leftLeg = corpse.pivots.leftLeg;
            const rightLeg = corpse.pivots.rightLeg;

            // Pitch torso down flat to the ground (90 deg)
            if (body) {
                body.rotation.x = (corpse.fallDir * Math.PI * 0.48) * easeOut;
                body.rotation.z = (Math.sin(corpse.fallAnimTime * 8) * 0.15) * easeOut;
                // Elevate body center slightly so torso/head never graze or clip into the floor
                body.position.y = (0.24 * corpse.scale) * easeOut;
            }

            // Head drops limp
            if (head) {
                head.rotation.x = (corpse.fallDir * -0.3) * easeOut;
                head.rotation.y = 0.3 * easeOut;
            }

            // Arms splay outward onto floor
            if (leftArm && rightArm) {
                leftArm.rotation.set(-1.1 * easeOut, 0.3 * easeOut, 0.7 * easeOut);
                rightArm.rotation.set(-1.1 * easeOut, -0.3 * easeOut, -0.7 * easeOut);
            }

            // Legs rest flat along the floor
            if (leftLeg && rightLeg) {
                leftLeg.rotation.set(0.08 * easeOut, 0, 0.12 * easeOut);
                rightLeg.rotation.set(0.08 * easeOut, 0, -0.12 * easeOut);
            }
        }

        // Final 1.5 seconds of the 11-second duration: smoothly dissolve/fade out
        if (corpse.life < 1.5) {
            const fade = Math.max(0, corpse.life / 1.5);
            corpse.mesh.traverse((c) => {
                if (c instanceof THREE.Mesh && c.material) {
                    c.material.transparent = true;
                    c.material.opacity = fade;
                }
            });
        }

        // Disappear after 11 seconds
        if (corpse.life <= 0) {
            globals.scene.remove(corpse.mesh);
            corpse.mesh.traverse((c) => {
                if (c instanceof THREE.Mesh) {
                    if (c.geometry) c.geometry.dispose();
                    if (c.material) {
                        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                        else c.material.dispose();
                    }
                }
            });
            activeCorpses.splice(i, 1);
        }
    }
}

// Slime splits into 2 mini slimes that jump out
function spawnMiniSlimesOnDeath(origin: THREE.Vector3) {
    if (!globals.scene) return;
    const miniStats = SURVIVAL_ZOMBIES["MiniGreenSlime"] || {
        color: 0x44ff88, height: 0.7, scale: 0.55, hp: 25, speed: 4.8, dmg: 1, dmgChance: 10, bonusDmg: 1, cooldown: 0.8, money: 15, archetype: 'minislime', isMiniSlime: true
    };

    for (let s = 0; s < 2; s++) {
        const offsetAngle = Math.random() * Math.PI * 2;
        const spawnPos = origin.clone();
        spawnPos.x += Math.cos(offsetAngle) * 1.2;
        spawnPos.z += Math.sin(offsetAngle) * 1.2;
        spawnPos.y = 0;

        // Trigger spawn
        const { createZombieModel } = require('./ZombieModelFactory');
        const modelRes = createZombieModel(miniStats, 'minislime');
        modelRes.mesh.position.copy(spawnPos);
        globals.scene.add(modelRes.mesh);

        const miniZ: any = {
            mesh: modelRes.mesh,
            pivots: modelRes.pivots,
            eyeMaterials: modelRes.eyeMaterials,
            pulsingMeshes: modelRes.pulsingMeshes,
            archetype: 'minislime',
            hp: miniStats.hp,
            maxHp: miniStats.hp,
            speed: miniStats.speed,
            radius: 0.4,
            height: 0.7,
            scale: 0.55,
            isDead: false,
            animTime: Math.random() * 5,
            userData: {
                ...miniStats,
                lastHitTime: Date.now(),
                stunnedUntil: 0
            }
        };
        state.entities.zombies.push(miniZ);
        state.survival.activeZombies++;
        createParticles(spawnPos, 0x22ff66, 12);
    }
}

// ==========================================
// 2. CREATURE ABILITIES
// ==========================================

export function triggerBloaterExplosion(origin: THREE.Vector3, sourceZ: any) {
    playSound('zombie_explode');
    createParticles(origin, 0x55ff00, 32);
    createParticles(origin, 0xffaa00, 22);
    createParticles(origin, 0x225500, 18);

    // Blast damage to player
    const distToPlayer = globals.yawObj.position.distanceTo(origin);
    if (distToPlayer < 7.0) {
        const dmg = Math.round(40 * (1 - distToPlayer / 7.0) + 12);
        state.survival.health -= dmg;
        playSound('damage');
        state.survival.damageFlashTimer = 0.35;
        state.survival.playerDamageVignetteTimer = 0.5;
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

    // Chain damage to nearby zombies
    for (let i = state.entities.zombies.length - 1; i >= 0; i--) {
        const other = state.entities.zombies[i];
        if (other === sourceZ || other.isDead) continue;

        const d = other.mesh.position.distanceTo(origin);
        if (d < 7.5) {
            const chainDmg = Math.round(110 * (1 - d / 7.5));
            other.hp -= chainDmg;
            updateZombieHealthHUD(other);
            createParticles(other.mesh.position, 0x55ff00, 5);

            if (other.hp <= 0) {
                killZombie(other, false);
            }
        }
    }
}

export function triggerScreamerHowl(screamer: any) {
    screamer.userData.lastScreamTime = Date.now();
    screamer.userData.isScreaming = true;
    setTimeout(() => {
        if (screamer.userData) screamer.userData.isScreaming = false;
    }, 1200);
    
    playSound('zombie_howl');

    const howlPos = screamer.mesh.position.clone();
    howlPos.y += 1.8;
    createParticles(howlPos, 0xff00ea, 30);
    createParticles(howlPos, 0xffffff, 12);

    // Buff nearby allies
    const buffRadius = 24;
    state.entities.zombies.forEach((ally: any) => {
        if (ally === screamer || ally.isDead) return;
        if (ally.mesh.position.distanceTo(screamer.mesh.position) <= buffRadius) {
            if (ally.userData) {
                ally.userData.frenzyUntil = Date.now() + 6500;
            }
            createParticles(ally.mesh.position, 0xff0055, 6);
        }
    });
}

export function triggerBruteSlam(brute: any) {
    brute.userData.slamCooldown = Date.now() + 4500;
    brute.userData.lastHitTime = Date.now() + 1500;
    brute.userData.isSlamming = true;
    brute.userData.stunnedUntil = Date.now() + 1000;
    setTimeout(() => {
        if (brute.userData) brute.userData.isSlamming = false;
    }, 800);

    playSound('zombie_slam');

    const slamPos = brute.mesh.position.clone();
    slamPos.y = 0.1;
    createParticles(slamPos, 0xff5500, 24);
    createParticles(slamPos, 0x444444, 20);

    const distToPlayer = globals.yawObj.position.distanceTo(brute.mesh.position);
    if (distToPlayer < 5.5) {
        state.survival.health -= 30;
        playSound('damage');
        state.survival.damageFlashTimer = 0.3;
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

export function triggerBruteBoulderToss(brute: any, targetPos: THREE.Vector3) {
    brute.userData.lastBoulderTime = Date.now();
    brute.userData.isThrowing = true;

    // Raise arms high during throw windup
    if (brute.pivots?.leftArm && brute.pivots?.rightArm) {
        brute.pivots.leftArm.rotation.set(-Math.PI * 0.85, 0.2, 0.1);
        brute.pivots.rightArm.rotation.set(-Math.PI * 0.85, -0.2, -0.1);
    }

    setTimeout(() => {
        if (brute.userData) brute.userData.isThrowing = false;
        if (!brute.isDead && brute.mesh) {
            const launchPos = brute.mesh.position.clone();
            launchPos.y += 3.2;
            spawnBruteBoulder(launchPos, targetPos, 38);
        }
    }, 600);
}

export function triggerFireDemonFireball(demon: any, targetPos: THREE.Vector3) {
    demon.userData.lastFireballTime = Date.now();
    demon.userData.isCasting = true;

    setTimeout(() => {
        if (demon.userData) demon.userData.isCasting = false;
        if (!demon.isDead && demon.mesh) {
            const launchPos = demon.mesh.position.clone();
            launchPos.y += 2.0;
            spawnFireball(launchPos, targetPos, 26);
        }
    }, 450);
}

export function triggerOrcStoneWall(orc: any, targetPos: THREE.Vector3) {
    orc.userData.lastWallTime = Date.now();
    orc.userData.isCastingWall = true;

    // Raise totem staff
    if (orc.pivots?.rightArm) {
        orc.pivots.rightArm.rotation.set(-Math.PI * 0.75, 0, 0.2);
    }

    setTimeout(() => {
        if (orc.userData) orc.userData.isCastingWall = false;
        if (!orc.isDead && orc.mesh) {
            spawnStoneBarricade(orc.mesh.position, targetPos);
        }
    }, 600);
}

export function triggerPhantomSpectralOrb(phantom: any) {
    phantom.userData.lastOrbTime = Date.now();
    phantom.userData.isCastingOrb = true;

    setTimeout(() => {
        if (phantom.userData) phantom.userData.isCastingOrb = false;
        if (!phantom.isDead && phantom.mesh) {
            const launchPos = phantom.mesh.position.clone();
            launchPos.y += 1.2;
            spawnSpectralHomingOrb(launchPos, 22);
        }
    }, 400);
}

// ==========================================
// 3. COMPLETE MODEL ANIMATION ENGINE
// ==========================================

export function animateZombiePivots(z: any, delta: number, isMoving: boolean) {
    if (!z.pivots) return;

    const scale = z.scale || (z.height ? z.height / 2.0 : 1.0);
    const archetype = z.archetype || 'walker';
    const isFrenzied = z.userData?.frenzyUntil && Date.now() < z.userData.frenzyUntil;
    const isAiming = z.userData?.isAiming;
    const isScreaming = z.userData?.isScreaming;
    const isSlamming = z.userData?.isSlamming;
    const isThrowing = z.userData?.isThrowing;
    const isCasting = z.userData?.isCasting || z.userData?.isCastingWall || z.userData?.isCastingOrb;

    // Advance animation clock
    const speedMult = isFrenzied ? 1.4 : (archetype === 'runner' ? 1.6 : archetype === 'brute' ? 0.75 : archetype === 'slime' ? 1.3 : 1.0);
    const animRate = (isMoving ? 8.5 : 2.5) * speedMult;
    z.animTime = (z.animTime || 0) + delta * animRate;
    const t = z.animTime;

    const body = z.pivots.body;
    const head = z.pivots.head;
    const leftArm = z.pivots.leftArm;
    const rightArm = z.pivots.rightArm;
    const leftLeg = z.pivots.leftLeg;
    const rightLeg = z.pivots.rightLeg;

    // --- PULSING MESHES (Cores, Slimes, Cysts) ---
    if (z.pulsingMeshes && z.pulsingMeshes.length > 0) {
        const pulseScale = 1.0 + Math.sin(t * 3.5) * 0.14;
        z.pulsingMeshes.forEach((pm: THREE.Mesh) => {
            pm.scale.set(pulseScale, pulseScale, pulseScale);
        });
    }

    // ==========================================
    // SPECIAL ARCHETYPE ANIMATION: SLIME
    // ==========================================
    if (archetype === 'slime' || archetype === 'minislime') {
        const jumpCycle = (t * 0.8) % Math.PI;
        const jumpHeight = Math.sin(jumpCycle);
        
        if (isMoving) {
            // Squash on ground, stretch in air
            const stretch = 1.0 + (jumpHeight - 0.5) * 0.6;
            const squash = 1.0 - (jumpHeight - 0.5) * 0.3;
            body.scale.set(squash, stretch, squash);
            body.position.y = Math.max(0, jumpHeight * 0.8 * scale);
        } else {
            // Idle gelatin jiggling
            const jiggle = 1.0 + Math.sin(t * 2.0) * 0.06;
            body.scale.set(jiggle, 1.0 / jiggle, jiggle);
            body.position.y = 0;
        }
        return;
    }

    // ==========================================
    // SPECIAL ARCHETYPE ANIMATION: FLYING PHANTOM
    // ==========================================
    if (archetype === 'phantom') {
        // Floating hover motion
        const hoverY = Math.sin(t * 1.8) * 0.35;
        body.position.y = hoverY;
        body.rotation.z = Math.sin(t * 1.2) * 0.08;
        body.rotation.x = isMoving ? 0.25 : Math.sin(t * 0.9) * 0.06;

        if (leftArm && rightArm) {
            // Ethereal ghostly wisp flapping
            leftArm.rotation.z = -0.3 + Math.sin(t * 2.0) * 0.2;
            rightArm.rotation.z = 0.3 - Math.sin(t * 2.0) * 0.2;
            leftArm.rotation.x = isCasting ? -Math.PI * 0.6 : Math.sin(t * 1.5) * 0.15;
            rightArm.rotation.x = isCasting ? -Math.PI * 0.6 : -Math.sin(t * 1.5) * 0.15;
        }
        return;
    }

    // ==========================================
    // BIPEDAL LOCOMOTION & IDLE
    // ==========================================
    if (isMoving) {
        // 1. Legs Stride Cycle
        const strideAmp = archetype === 'runner' ? 0.85 : archetype === 'brute' ? 0.6 : archetype === 'orc' ? 0.65 : 0.7;
        const legSwing = Math.sin(t) * strideAmp;
        if (leftLeg && rightLeg) {
            leftLeg.rotation.x = legSwing;
            rightLeg.rotation.x = -legSwing;
        }

        // 2. Vertical Pelvic Step-Bobbing
        const stepBob = -Math.abs(Math.sin(t)) * 0.08 * scale;
        body.position.y = stepBob;

        // 3. Torso Forward Tilt
        const fwdTilt = archetype === 'runner' ? 0.35 : archetype === 'brute' ? 0.18 : archetype === 'orc' ? 0.22 : 0.14;
        body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, fwdTilt, delta * 8);
        body.rotation.y = Math.sin(t) * 0.08;
        body.rotation.z = Math.sin(t) * 0.04;

        // 4. Head Focus
        if (head) {
            head.rotation.x = -fwdTilt * 0.6 + Math.sin(t * 2) * 0.04;
            head.rotation.y = -Math.sin(t) * 0.06;
        }

        // 5. Arm Poses
        if (leftArm && rightArm) {
            if (isAiming) {
                leftArm.rotation.set(-Math.PI * 0.48, 0.2, -0.05);
                rightArm.rotation.set(-Math.PI * 0.46, -0.35, 0.1);
            } else if (isThrowing || isSlamming) {
                leftArm.rotation.set(-Math.PI * 0.8, 0.1, 0.1);
                rightArm.rotation.set(-Math.PI * 0.8, -0.1, -0.1);
            } else if (isCasting) {
                leftArm.rotation.set(-Math.PI * 0.6, 0.2, 0);
                rightArm.rotation.set(-Math.PI * 0.6, -0.2, 0);
            } else if (isScreaming) {
                leftArm.rotation.set(-Math.PI * 0.85, 0.3, 0.25);
                rightArm.rotation.set(-Math.PI * 0.85, -0.3, -0.25);
            } else if (archetype === 'orc') {
                leftArm.rotation.x = -Math.sin(t) * 0.6 - 0.2;
                rightArm.rotation.x = Math.sin(t) * 0.4 - 0.3; // Holding totem
                leftArm.rotation.z = 0.2;
                rightArm.rotation.z = -0.2;
            } else if (archetype === 'firedemon') {
                leftArm.rotation.x = -0.7 - Math.sin(t) * 0.4;
                rightArm.rotation.x = -0.7 + Math.sin(t) * 0.4;
                leftArm.rotation.z = 0.25;
                rightArm.rotation.z = -0.25;
            } else if (archetype === 'brute') {
                leftArm.rotation.x = -Math.sin(t) * 0.55 - 0.2;
                rightArm.rotation.x = Math.sin(t) * 0.55 - 0.2;
                leftArm.rotation.z = 0.15;
                rightArm.rotation.z = -0.15;
            } else if (archetype === 'archer') {
                leftArm.rotation.x = -0.6 + Math.sin(t) * 0.2;
                rightArm.rotation.x = Math.sin(t) * 0.5;
                leftArm.rotation.z = 0.1;
            } else if (archetype === 'bloater') {
                leftArm.rotation.x = Math.sin(t) * 0.4 - 0.15;
                rightArm.rotation.x = -Math.sin(t) * 0.4 - 0.15;
                leftArm.rotation.z = 0.35;
                rightArm.rotation.z = -0.35;
                const bloatPulse = 1.0 + Math.sin(t * 2.5) * 0.06;
                body.scale.set(bloatPulse, 1.0 / bloatPulse, bloatPulse);
            } else if (archetype === 'runner') {
                leftArm.rotation.x = -Math.sin(t) * 0.9 - 0.5;
                rightArm.rotation.x = Math.sin(t) * 0.9 - 0.5;
                leftArm.rotation.z = 0.15;
                rightArm.rotation.z = -0.15;
            } else {
                leftArm.rotation.x = -0.65 - Math.sin(t) * 0.4;
                rightArm.rotation.x = -0.65 + Math.sin(t) * 0.4;
                leftArm.rotation.z = 0.1;
                rightArm.rotation.z = -0.1;
            }
        }

    } else {
        // IDLE STATE
        if (leftLeg && rightLeg) {
            leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, delta * 6);
            rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, delta * 6);
        }
        body.position.y = THREE.MathUtils.lerp(body.position.y, 0, delta * 6);
        body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0.05, delta * 4);
        body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, 0, delta * 4);

        const breath = Math.sin(t * 1.5) * 0.03;
        body.scale.set(1.0 + breath, 1.0 + breath, 1.0 + breath);

        if (head) {
            head.rotation.y = Math.sin(t * 0.8) * 0.15;
            head.rotation.x = Math.sin(t * 1.2) * 0.05;
        }

        if (leftArm && rightArm) {
            if (isAiming) {
                leftArm.rotation.set(-Math.PI * 0.48, 0.2, -0.05);
                rightArm.rotation.set(-Math.PI * 0.46, -0.35, 0.1);
            } else if (isThrowing || isSlamming) {
                leftArm.rotation.set(-Math.PI * 0.8, 0.1, 0.1);
                rightArm.rotation.set(-Math.PI * 0.8, -0.1, -0.1);
            } else if (isCasting) {
                leftArm.rotation.set(-Math.PI * 0.6, 0.2, 0);
                rightArm.rotation.set(-Math.PI * 0.6, -0.2, 0);
            } else if (isScreaming) {
                leftArm.rotation.set(-Math.PI * 0.85, 0.3, 0.25);
                rightArm.rotation.set(-Math.PI * 0.85, -0.3, -0.25);
            } else if (archetype === 'archer') {
                leftArm.rotation.set(-0.5, 0.1, 0);
                rightArm.rotation.set(-0.2, -0.1, 0);
            } else if (archetype === 'orc') {
                leftArm.rotation.set(-0.3, 0.2, 0);
                rightArm.rotation.set(-0.5, -0.1, 0); // Holding totem staff
            } else if (archetype === 'firedemon') {
                leftArm.rotation.set(-0.6, 0.25, 0);
                rightArm.rotation.set(-0.6, -0.25, 0);
            } else {
                leftArm.rotation.x = -0.35 + Math.sin(t) * 0.08;
                rightArm.rotation.x = -0.35 + Math.sin(t) * 0.08;
            }
        }
    }
}

