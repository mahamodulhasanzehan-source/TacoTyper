import * as THREE from 'three';
import { globals } from '../globals';
import { state } from '../state';
import { ZOMBIES, SURVIVAL_ZOMBIES, ZombieStats } from '../config/zombies';
import { createZombieModel } from './ZombieModelFactory';
import { createParticles } from './Particles';
import { playSound } from '../audio/AudioSys';

export function spawnZombies(count: number, forceType: string | null = null) {
    if (state.gameMode === 'survival') return;

    for (let i = 0; i < count; i++) {
        let type = forceType;
        if (!forceType) {
            const types = ['green', 'red', 'archer', 'orc', 'phantom', 'firedemon', 'brute', 'slime', 'bloater', 'purple'];
            const weights = [0.15, 0.15, 0.14, 0.12, 0.10, 0.10, 0.08, 0.06, 0.05, 0.05];
            const r = Math.random();
            let sum = 0;
            for (let w = 0; w < types.length; w++) {
                sum += weights[w];
                if (r <= sum) {
                    type = types[w];
                    break;
                }
            }
            if (!type) type = 'green';
        }

        const zData = ZOMBIES[type!] || ZOMBIES.green;
        const angle = Math.random() * Math.PI * 2;
        const dist = 28 + Math.random() * 22;
        const px = globals.yawObj.position.x + Math.cos(angle) * dist;
        const pz = globals.yawObj.position.z + Math.sin(angle) * dist;

        createZombieMesh(zData, type!, px, pz, false);

        // Screamer squad bonus
        if ((type === 'purple' || type === 'screamer') && Math.random() < 0.6) {
            setTimeout(() => {
                if (globals.scene && state.gameMode !== 'survival') {
                    spawnZombies(1, 'red');
                }
            }, 300);
        }
    }
}

export function spawnSurvivalZombies(zombieData: Record<string, number> | null) {
    if (!zombieData) return;
    for (const [type, count] of Object.entries(zombieData)) {
        for (let i = 0; i < count; i++) {
            const zData = SURVIVAL_ZOMBIES[type] || ZOMBIES[type] || SURVIVAL_ZOMBIES.NormalZombie;
            const angle = Math.random() * Math.PI * 2;
            const dist = 28 + Math.random() * 22;
            let px = globals.yawObj.position.x + Math.cos(angle) * dist;
            let pz = globals.yawObj.position.z + Math.sin(angle) * dist;

            // Strictly clamp zombie spawns to inside the arena floor boundaries
            px = Math.max(-96, Math.min(96, px));
            pz = Math.max(-96, Math.min(96, pz));

            createZombieMesh(zData, type, px, pz, true);
        }
    }
}

function createZombieMesh(zData: ZombieStats, type: string, px: number, pz: number, isSurvival: boolean) {
    const modelResult = createZombieModel(zData, type);
    const mesh = modelResult.mesh;
    const archetype = modelResult.archetype || zData.archetype || 'walker';

    // Start slightly subterranean for the rising spawn animation
    const targetY = 0;
    mesh.position.set(px, targetY - 1.6, pz);
    globals.scene.add(mesh);

    // Spawn rupture effects
    createParticles(new THREE.Vector3(px, 0.1, pz), 0x3d2817, 10);
    createParticles(new THREE.Vector3(px, 0.1, pz), 0x111111, 6);
    playSound('zombie_rise');

    let hpGroup: THREE.Group | undefined;
    let fgMesh: THREE.Mesh | undefined;
    const barWidth = 1.2 * (zData.scale || 1.0);

    if (isSurvival) {
        hpGroup = new THREE.Group();
        const hpY = zData.height + 0.35;
        hpGroup.position.set(0, hpY, 0);
        hpGroup.visible = false; // Only visible once damaged

        const barHeight = 0.09;
        const barDepth = 0.05;

        // Dark background
        const bgGeo = new THREE.BoxGeometry(barWidth, barHeight, barDepth);
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x1a0505 });
        const bgMesh = new THREE.Mesh(bgGeo, bgMat);
        hpGroup.add(bgMesh);

        // Health fill
        const fgGeo = new THREE.BoxGeometry(barWidth, barHeight, barDepth + 0.01);
        const fgMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
        fgMesh = new THREE.Mesh(fgGeo, fgMat);
        hpGroup.add(fgMesh);

        mesh.add(hpGroup);
    }
    
    const zObj = {
        mesh,
        type,
        archetype,
        pivots: modelResult.pivots,
        specialMesh: modelResult.specialMesh,
        hp: (!isSurvival) ? zData.hp * 2 : zData.hp,
        maxHp: (!isSurvival) ? zData.hp * 2 : zData.hp,
        speed: (isSurvival && type !== 'black') ? zData.speed * 1.25 : zData.speed,
        height: zData.height,
        radius: 0.55 * (zData.scale || 1.0),
        isDead: false,
        eyeMaterials: modelResult.eyeMaterials,
        pulsingMeshes: modelResult.pulsingMeshes,
        animTime: Math.random() * 10,
        spawnProgress: 0.0, // Rising spawn interpolation
        targetY: 0,
        userData: {
            lastHitTime: 0,
            dmg: zData.dmg || (archetype === 'brute' ? 35 : archetype === 'screamer' ? 22 : archetype === 'runner' ? 16 : 12),
            dmgChance: zData.dmgChance || 20,
            bonusDmg: zData.bonusDmg || 5,
            cooldown: zData.cooldown || 1.0,
            money: zData.money || 15,
            blitz: zData.blitz || false,
            stunnedUntil: 0,
            frenzyUntil: 0,
            isRanged: zData.isRanged || archetype === 'archer',
            isScreamer: zData.isScreamer || archetype === 'screamer',
            isBloater: zData.isBloater || archetype === 'bloater',
            isBrute: zData.isBrute || archetype === 'brute',
            lastRangedShotTime: 0,
            lastBoulderTime: 0,
            lastFireballTime: 0,
            lastWallTime: 0,
            lastOrbTime: 0,
            lastScreamTime: 0,
            aimStartTime: 0,
            slamCooldown: 0,
            flockVelocity: new THREE.Vector3()
        },
        hpGroup,
        fgMesh,
        barWidth
    };
    
    mesh.userData.zombieData = zObj;
    mesh.traverse((c) => {
        c.userData.zombieData = zObj;
    });
    
    state.entities.zombies.push(zObj);
    if (isSurvival) {
        state.survival.activeZombies++;
    }
    return zObj;
}

export function spawnSyncedZombie(id: string, type: string, px: number, pz: number, hp: number, maxHp: number) {
    if (!globals.scene) return null;
    const zData = ZOMBIES[type] || SURVIVAL_ZOMBIES[type] || ZOMBIES.green;

    const modelResult = createZombieModel(zData, type);
    const mesh = modelResult.mesh;
    const archetype = modelResult.archetype || zData.archetype || 'walker';

    mesh.position.set(px, 0, pz);
    globals.scene.add(mesh);

    const barWidth = 1.2 * (zData.scale || 1.0);
    const hpGroup = new THREE.Group();
    const hpY = zData.height + 0.35;
    hpGroup.position.set(0, hpY, 0);
    hpGroup.visible = false;

    const barHeight = 0.09;
    const barDepth = 0.05;

    const bgGeo = new THREE.BoxGeometry(barWidth, barHeight, barDepth);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x1a0505 });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    hpGroup.add(bgMesh);

    const fgGeo = new THREE.BoxGeometry(barWidth, barHeight, barDepth + 0.01);
    const fgMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
    const fgMesh = new THREE.Mesh(fgGeo, fgMat);
    hpGroup.add(fgMesh);

    mesh.add(hpGroup);

    const zObj = {
        id,
        mesh,
        type,
        archetype,
        pivots: modelResult.pivots,
        specialMesh: modelResult.specialMesh,
        hp,
        maxHp,
        speed: zData.speed,
        height: zData.height,
        radius: 0.55 * (zData.scale || 1.0),
        isDead: false,
        eyeMaterials: modelResult.eyeMaterials,
        pulsingMeshes: modelResult.pulsingMeshes,
        animTime: Math.random() * 10,
        spawnProgress: 1.0,
        targetY: 0,
        userData: {
            lastHitTime: 0,
            dmg: zData.dmg || 15,
            dmgChance: 20,
            bonusDmg: 5,
            cooldown: 1.0,
            money: 15,
            blitz: false,
            stunnedUntil: 0,
            frenzyUntil: 0,
            isRanged: zData.isRanged || archetype === 'archer',
            isScreamer: zData.isScreamer || archetype === 'screamer',
            isBloater: zData.isBloater || archetype === 'bloater',
            isBrute: zData.isBrute || archetype === 'brute',
            lastRangedShotTime: 0,
            lastScreamTime: 0,
            aimStartTime: 0,
            slamCooldown: 0,
            flockVelocity: new THREE.Vector3()
        },
        hpGroup,
        fgMesh,
        barWidth
    };

    mesh.userData.zombieData = zObj;
    mesh.traverse((c) => {
        c.userData.zombieData = zObj;
    });

    state.entities.zombies.push(zObj);
    return zObj;
}
