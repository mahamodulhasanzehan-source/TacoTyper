import * as THREE from 'three';
import { globals } from '../globals';
import { state } from '../state';
import { createParticles } from './Particles';
import { playSound } from '../audio/AudioSys';
import { updateSurvivalHUD } from '../ui/UIUtils';

export type ZombieProjectileType = 'arrow' | 'acid' | 'boulder' | 'fireball' | 'spectral';

export interface ZombieProjectile {
    mesh: THREE.Object3D;
    dir: THREE.Vector3;
    speed: number;
    damage: number;
    life: number;
    maxLife: number;
    color: number;
    type: ZombieProjectileType;
    rotSpeed?: THREE.Vector3;
    target?: THREE.Vector3;
    isHoming?: boolean;
    aoeRadius?: number;
}

export interface StoneBarricade {
    group: THREE.Group;
    colliders: THREE.Box3[];
    meshes: THREE.Mesh[];
    hp: number;
    maxHp: number;
    life: number;
    maxLife: number;
}

export interface GroundFirePatch {
    mesh: THREE.Mesh;
    pos: THREE.Vector3;
    radius: number;
    life: number;
    damageTimer: number;
}

export const activeZombieProjectiles: ZombieProjectile[] = [];
export const activeStoneBarricades: StoneBarricade[] = [];
export const activeGroundFirePatches: GroundFirePatch[] = [];

// ==========================================
// 1. PROJECTILE SPAWNERS
// ==========================================

export function spawnZombieProjectile(
    origin: THREE.Vector3,
    target: THREE.Vector3,
    damage: number = 15,
    isAcid: boolean = false
) {
    if (isAcid) {
        spawnAcidSpit(origin, target, damage);
    } else {
        spawnBoneArrow(origin, target, damage);
    }
}

export function spawnBoneArrow(origin: THREE.Vector3, target: THREE.Vector3, damage: number = 20) {
    if (!globals.scene) return;

    const dir = new THREE.Vector3().subVectors(target, origin);
    dir.y += 0.5;
    dir.normalize();

    const group = new THREE.Group();
    const shaftGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.75, 6);
    const shaftMat = new THREE.MeshLambertMaterial({ color: 0xddddbb });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.rotation.x = Math.PI / 2;
    group.add(shaft);

    const tipGeo = new THREE.ConeGeometry(0.06, 0.22, 6);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.z = -0.4;
    tip.rotation.x = -Math.PI / 2;
    group.add(tip);

    const fletchGeo = new THREE.BoxGeometry(0.14, 0.02, 0.16);
    const fletchMat = new THREE.MeshBasicMaterial({ color: 0x334455 });
    const fletch = new THREE.Mesh(fletchGeo, fletchMat);
    fletch.position.z = 0.35;
    group.add(fletch);

    group.position.copy(origin);
    group.lookAt(origin.clone().add(dir));
    globals.scene.add(group);

    playSound('zombie_arrow');

    activeZombieProjectiles.push({
        mesh: group,
        dir,
        speed: 28,
        damage,
        life: 3.5,
        maxLife: 3.5,
        color: 0x00e5ff,
        type: 'arrow'
    });
}

export function spawnAcidSpit(origin: THREE.Vector3, target: THREE.Vector3, damage: number = 18) {
    if (!globals.scene) return;

    const dir = new THREE.Vector3().subVectors(target, origin);
    dir.y += 0.6;
    dir.normalize();

    const group = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.2, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x39ff14 });
    const orb = new THREE.Mesh(geo, mat);
    group.add(orb);

    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0x76ff03, transparent: true, opacity: 0.45 })
    );
    group.add(glow);

    group.position.copy(origin);
    globals.scene.add(group);

    playSound('zombie_arrow');

    activeZombieProjectiles.push({
        mesh: group,
        dir,
        speed: 18,
        damage,
        life: 3.5,
        maxLife: 3.5,
        color: 0x39ff14,
        type: 'acid'
    });
}

export function spawnBruteBoulder(origin: THREE.Vector3, target: THREE.Vector3, damage: number = 38) {
    if (!globals.scene) return;

    const dir = new THREE.Vector3().subVectors(target, origin);
    dir.y += 2.0; // Higher arc
    dir.normalize();

    const group = new THREE.Group();

    // Giant rough polygonal boulder
    const boulderGeo = new THREE.DodecahedronGeometry(0.7, 1);
    const boulderMat = new THREE.MeshStandardMaterial({
        color: 0x3d352e,
        roughness: 0.9,
        metalness: 0.1
    });
    const boulder = new THREE.Mesh(boulderGeo, boulderMat);
    boulder.castShadow = true;
    group.add(boulder);

    // Glowing magma / stress cracks on boulder
    const crackMat = new THREE.MeshBasicMaterial({ color: 0xff4500, wireframe: true });
    const crackMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 1), crackMat);
    group.add(crackMesh);

    group.position.copy(origin);
    globals.scene.add(group);

    playSound('zombie_slam');

    activeZombieProjectiles.push({
        mesh: group,
        dir,
        speed: 19,
        damage,
        life: 4.0,
        maxLife: 4.0,
        color: 0x8b5a2b,
        type: 'boulder',
        rotSpeed: new THREE.Vector3(Math.random() * 5 + 3, Math.random() * 4, Math.random() * 3),
        aoeRadius: 4.5
    });
}

export function spawnFireball(origin: THREE.Vector3, target: THREE.Vector3, damage: number = 26) {
    if (!globals.scene) return;

    const dir = new THREE.Vector3().subVectors(target, origin);
    dir.y += 0.4;
    dir.normalize();

    const group = new THREE.Group();

    // Molten core
    const coreGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Fiery outer sphere
    const outerGeo = new THREE.SphereGeometry(0.55, 8, 8);
    const outerMat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.75 });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    group.add(outer);

    // Fire corona
    const coronaGeo = new THREE.SphereGeometry(0.75, 6, 6);
    const coronaMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.35 });
    const corona = new THREE.Mesh(coronaGeo, coronaMat);
    group.add(corona);

    group.position.copy(origin);
    globals.scene.add(group);

    playSound('zombie_howl');

    activeZombieProjectiles.push({
        mesh: group,
        dir,
        speed: 21,
        damage,
        life: 3.5,
        maxLife: 3.5,
        color: 0xff4500,
        type: 'fireball',
        aoeRadius: 3.8
    });
}

export function spawnSpectralHomingOrb(origin: THREE.Vector3, damage: number = 22) {
    if (!globals.scene || !globals.yawObj) return;

    const targetPos = globals.yawObj.position.clone();
    const dir = new THREE.Vector3().subVectors(targetPos, origin).normalize();

    const group = new THREE.Group();

    // Violet Soul Orb
    const orbGeo = new THREE.SphereGeometry(0.32, 8, 8);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xdd55ff });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    group.add(orb);

    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0x8800ff, transparent: true, opacity: 0.45 })
    );
    group.add(glow);

    group.position.copy(origin);
    globals.scene.add(group);

    playSound('zombie_arrow');

    activeZombieProjectiles.push({
        mesh: group,
        dir,
        speed: 15,
        damage,
        life: 4.5,
        maxLife: 4.5,
        color: 0xaa00ff,
        type: 'spectral',
        isHoming: true,
        aoeRadius: 2.5
    });
}

// ==========================================
// 2. STONE BARRICADE / WALL SYSTEM
// ==========================================

export function spawnStoneBarricade(orcPos: THREE.Vector3, playerPos: THREE.Vector3) {
    if (!globals.scene) return;

    // Position wall between Orc and player
    const midPoint = new THREE.Vector3().lerpVectors(orcPos, playerPos, 0.45);
    midPoint.y = 0;

    const wallGroup = new THREE.Group();
    const colliders: THREE.Box3[] = [];
    const meshes: THREE.Mesh[] = [];

    const stoneMat = new THREE.MeshStandardMaterial({
        color: 0x4a443b,
        roughness: 0.95,
        metalness: 0.1
    });

    const runeMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        emissive: 0x33ff66,
        emissiveIntensity: 2.2
    });

    // Vector perpendicular to line between Orc & player for wall width
    const forward = new THREE.Vector3().subVectors(playerPos, orcPos);
    forward.y = 0;
    forward.normalize();
    const tangent = new THREE.Vector3(-forward.z, 0, forward.x);

    // 3 interlocking stone monolith pillars
    const pillarWidth = 1.3;
    const offsets = [-pillarWidth, 0, pillarWidth];

    offsets.forEach((offset, idx) => {
        const pHeight = 2.4 + (idx === 1 ? 0.4 : 0);
        const pGeo = new THREE.BoxGeometry(1.2, pHeight, 0.8);
        const pillar = new THREE.Mesh(pGeo, stoneMat);
        pillar.castShadow = true;
        pillar.receiveShadow = true;

        const pos = midPoint.clone().addScaledVector(tangent, offset);
        pos.y = pHeight / 2;
        pillar.position.copy(pos);

        // Slight natural rotation
        pillar.rotation.y = (idx - 1) * 0.15;
        wallGroup.add(pillar);
        meshes.push(pillar);

        // Glowing earth rune on central pillar
        if (idx === 1) {
            const rune = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.85), runeMat);
            rune.position.copy(pos);
            wallGroup.add(rune);
            meshes.push(rune);
        }

        // Add bounding box collider
        const bbox = new THREE.Box3().setFromObject(pillar);
        colliders.push(bbox);

        // Ground burst dust
        createParticles(pos, 0x8b7355, 12);
        createParticles(pos, 0x33ff66, 6);
    });

    globals.scene.add(wallGroup);
    playSound('zombie_slam');

    activeStoneBarricades.push({
        group: wallGroup,
        colliders,
        meshes,
        hp: 120,
        maxHp: 120,
        life: 8.0,
        maxLife: 8.0
    });
}

// ==========================================
// 3. GROUND FIRE PATCHES
// ==========================================

export function spawnGroundFirePatch(pos: THREE.Vector3, radius: number = 2.8, duration: number = 4.0) {
    if (!globals.scene) return;

    const fireGeo = new THREE.CircleGeometry(radius, 16);
    const fireMat = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
    });
    const mesh = new THREE.Mesh(fireGeo, fireMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, 0.04, pos.z);
    globals.scene.add(mesh);

    activeGroundFirePatches.push({
        mesh,
        pos: pos.clone(),
        radius,
        life: duration,
        damageTimer: 0
    });
}

// ==========================================
// 4. MAIN PROJECTILE & HAZARD UPDATE LOOP
// ==========================================

export function updateZombieProjectiles(delta: number) {
    if (!globals.scene || !globals.yawObj) return;
    const playerPos = globals.yawObj.position.clone();
    playerPos.y = Math.max(0.5, playerPos.y);

    // Update Projectiles
    for (let i = activeZombieProjectiles.length - 1; i >= 0; i--) {
        const p = activeZombieProjectiles[i];
        p.life -= delta;

        // Type-specific motion
        if (p.type === 'boulder') {
            p.dir.y -= 1.8 * delta; // Heavy gravity arc
            p.dir.normalize();
            if (p.rotSpeed) {
                p.mesh.rotation.x += p.rotSpeed.x * delta;
                p.mesh.rotation.y += p.rotSpeed.y * delta;
                p.mesh.rotation.z += p.rotSpeed.z * delta;
            }
        } else if (p.type === 'arrow') {
            p.dir.y -= 0.6 * delta;
            p.dir.normalize();
            p.mesh.lookAt(p.mesh.position.clone().add(p.dir));
        } else if (p.type === 'spectral' && p.isHoming) {
            // Smooth homing towards player
            const toPlayer = new THREE.Vector3().subVectors(playerPos, p.mesh.position).normalize();
            p.dir.lerp(toPlayer, delta * 3.2).normalize();
            p.mesh.lookAt(p.mesh.position.clone().add(p.dir));
        }

        const moveStep = p.speed * delta;
        p.mesh.position.addScaledVector(p.dir, moveStep);

        // Particle trail
        if (Math.random() < 0.65) {
            createParticles(p.mesh.position, p.color, 1);
        }

        let hit = false;

        // Collision against Stone Barricades
        for (let bIdx = activeStoneBarricades.length - 1; bIdx >= 0; bIdx--) {
            const bar = activeStoneBarricades[bIdx];
            for (const col of bar.colliders) {
                if (col.containsPoint(p.mesh.position)) {
                    hit = true;
                    bar.hp -= p.damage;
                    createParticles(p.mesh.position, 0x888888, 8);
                    if (bar.hp <= 0) {
                        destroyBarricade(bIdx);
                    }
                    break;
                }
            }
            if (hit) break;
        }

        // Collision against player
        const distToPlayer = p.mesh.position.distanceTo(playerPos);
        const hitDist = p.aoeRadius ? p.aoeRadius * 0.6 : 1.3;

        if (!hit && distToPlayer < hitDist) {
            hit = true;
            state.survival.health -= p.damage;
            playSound('damage');
            state.survival.damageFlashTimer = 0.28;
            state.survival.playerDamageVignetteTimer = 0.45;
            updateSurvivalHUD();

            if (state.survival.health <= 0) {
                if ((globals as any).triggerPlayerDeath) {
                    (globals as any).triggerPlayerDeath();
                } else {
                    state.survival.health = 0;
                    updateSurvivalHUD();
                }
            }

            createParticles(p.mesh.position, 0xff0000, 10);

            // Trigger Fireball ground patch
            if (p.type === 'fireball') {
                spawnGroundFirePatch(p.mesh.position, 3.0, 4.0);
            }
        }

        // Floor collision
        if (!hit && p.mesh.position.y <= 0.1) {
            hit = true;
            createParticles(p.mesh.position, p.color, p.type === 'boulder' ? 18 : 6);
            if (p.type === 'boulder') {
                playSound('zombie_slam');
                // AoE splash damage to player if close to impact
                if (distToPlayer < 4.5) {
                    const aoeDmg = Math.round(p.damage * (1 - distToPlayer / 4.5));
                    state.survival.health -= aoeDmg;
                    playSound('damage');
                    state.survival.damageFlashTimer = 0.25;
                    updateSurvivalHUD();
                }
            } else if (p.type === 'fireball') {
                spawnGroundFirePatch(p.mesh.position, 2.8, 4.0);
            }
        }

        // Expiry or collision cleanup
        if (hit || p.life <= 0) {
            globals.scene.remove(p.mesh);
            p.mesh.traverse((c) => {
                if (c instanceof THREE.Mesh) {
                    if (c.geometry) c.geometry.dispose();
                    if (c.material) {
                        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                        else c.material.dispose();
                    }
                }
            });
            activeZombieProjectiles.splice(i, 1);
        }
    }

    // Update Ground Fire Patches
    for (let i = activeGroundFirePatches.length - 1; i >= 0; i--) {
        const patch = activeGroundFirePatches[i];
        patch.life -= delta;
        patch.damageTimer += delta;

        // Flicker fire opacity & emit flame particles
        if (patch.mesh.material instanceof THREE.Material) {
            patch.mesh.material.opacity = 0.4 + Math.sin(Date.now() * 0.01) * 0.2;
        }
        if (Math.random() < 0.35) {
            const pX = patch.pos.x + (Math.random() - 0.5) * patch.radius;
            const pZ = patch.pos.z + (Math.random() - 0.5) * patch.radius;
            createParticles(new THREE.Vector3(pX, 0.2, pZ), 0xff4500, 1);
        }

        // Player step-in damage (burn per 0.5s)
        const dist = new THREE.Vector2(playerPos.x - patch.pos.x, playerPos.z - patch.pos.z).length();
        if (dist <= patch.radius && patch.damageTimer >= 0.5) {
            patch.damageTimer = 0;
            state.survival.health -= 8;
            playSound('damage');
            state.survival.damageFlashTimer = 0.15;
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

        if (patch.life <= 0) {
            globals.scene.remove(patch.mesh);
            if (patch.mesh.geometry) patch.mesh.geometry.dispose();
            if (patch.mesh.material) (patch.mesh.material as THREE.Material).dispose();
            activeGroundFirePatches.splice(i, 1);
        }
    }

    // Update Stone Barricades (timer & crumbling)
    for (let i = activeStoneBarricades.length - 1; i >= 0; i--) {
        const bar = activeStoneBarricades[i];
        bar.life -= delta;

        // Update bounding boxes
        bar.colliders = [];
        bar.meshes.forEach(m => {
            bar.colliders.push(new THREE.Box3().setFromObject(m));
        });

        if (bar.life <= 0) {
            destroyBarricade(i);
        }
    }
}

function destroyBarricade(index: number) {
    const bar = activeStoneBarricades[index];
    if (!bar) return;

    bar.meshes.forEach(m => {
        createParticles(m.position, 0x888888, 12);
        createParticles(m.position, 0x4a443b, 8);
    });
    globals.scene.remove(bar.group);
    bar.group.traverse((c) => {
        if (c instanceof THREE.Mesh) {
            if (c.geometry) c.geometry.dispose();
            if (c.material) {
                if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                else c.material.dispose();
            }
        }
    });
    playSound('zombie_slam');
    activeStoneBarricades.splice(index, 1);
}
