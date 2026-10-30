import * as THREE from 'three';
import { ZombieStats } from '../config/zombies';

export interface ZombieModelResult {
    mesh: THREE.Group;
    eyeMaterials: THREE.MeshStandardMaterial[];
    pivots: {
        body: THREE.Group;
        head: THREE.Group;
        leftArm: THREE.Group;
        rightArm: THREE.Group;
        leftLeg: THREE.Group;
        rightLeg: THREE.Group;
    };
    specialMesh?: THREE.Object3D;
    pulsingMeshes?: THREE.Mesh[];
    archetype: string;
}

export function createZombieModel(zData: ZombieStats, type: string): ZombieModelResult {
    const root = new THREE.Group();
    const eyeMaterials: THREE.MeshStandardMaterial[] = [];
    const pulsingMeshes: THREE.Mesh[] = [];

    // Archetype categorization
    let archetype = zData.archetype || 'walker';
    const tLower = type.toLowerCase();
    if (!zData.archetype) {
        if (tLower.includes('orc')) {
            archetype = 'orc';
        } else if (tLower.includes('phantom') || tLower.includes('specter')) {
            archetype = 'phantom';
        } else if (tLower.includes('demon') || tLower.includes('fire')) {
            archetype = 'firedemon';
        } else if (tLower.includes('slime')) {
            archetype = tLower.includes('mini') ? 'minislime' : 'slime';
        } else if (tLower.includes('brute') || tLower.includes('tall') || (zData.height >= 3 && zData.hp >= 150)) {
            archetype = 'brute';
        } else if (tLower.includes('archer') || tLower.includes('blue') || tLower.includes('skeleton')) {
            archetype = 'archer';
        } else if (tLower.includes('screamer') || tLower.includes('purple')) {
            archetype = 'screamer';
        } else if (tLower.includes('bloater') || tLower.includes('bomb')) {
            archetype = 'bloater';
        } else if (tLower.includes('red') || tLower.includes('runner') || zData.speed >= 8) {
            archetype = 'runner';
        } else if (tLower.includes('black') || zData.blitz) {
            archetype = 'runner';
        }
    }

    const scale = zData.scale || 1.0;
    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    // Ground Contact Shadow Disk
    const shadowRadius = (archetype === 'brute' ? 1.1 : archetype === 'bloater' ? 0.85 : 0.6) * scale;
    const shadowGeo = new THREE.CircleGeometry(shadowRadius, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.55,
        depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.015;
    root.add(shadowMesh);

    // Shared Palette Materials
    const darkClothMat = new THREE.MeshLambertMaterial({ color: 0x1a1e24 });
    const boneMat = new THREE.MeshLambertMaterial({ color: 0xe8e2d5 });
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.45, metalness: 0.75 });
    const goreMat = new THREE.MeshLambertMaterial({ color: 0x8a1515 });

    // Eye Glow Setup
    let eyeColor = 0xff8800; // Walker: Glowing Amber
    if (archetype === 'runner') eyeColor = 0xff1100; // Runner: Neon Crimson
    else if (archetype === 'archer') eyeColor = 0x00ffff; // Archer: Cyan Spectral
    else if (archetype === 'screamer') eyeColor = 0xff00ea; // Screamer: Necrotic Magenta
    else if (archetype === 'bloater') eyeColor = 0x76ff03; // Bloater: Toxic Lime
    else if (archetype === 'brute') eyeColor = 0xff4500; // Brute: Molten Orange
    else if (archetype === 'slime' || archetype === 'minislime') eyeColor = 0x00ff88; // Slime: Bio Acid Emerald
    else if (archetype === 'orc') eyeColor = 0xffcc00; // Orc: Menacing Gold
    else if (archetype === 'phantom') eyeColor = 0xbb00ff; // Phantom: Ethereal Violet
    else if (archetype === 'firedemon') eyeColor = 0xff2200; // Fire Demon: Infernal Flame

    const eyeMat = new THREE.MeshStandardMaterial({
        color: 0x110000,
        emissive: eyeColor,
        emissiveIntensity: 3.0,
        toneMapped: false
    });
    eyeMaterials.push(eyeMat);

    // Pivots
    const headPivot = new THREE.Group();
    const leftArmPivot = new THREE.Group();
    const rightArmPivot = new THREE.Group();
    const leftLegPivot = new THREE.Group();
    const rightLegPivot = new THREE.Group();

    let specialMesh: THREE.Object3D | undefined;

    if (archetype === 'brute') {
        // ==========================================
        // 1. ARMORED BRUTE (Massive Behemoth)
        // ==========================================
        const bScale = scale * 1.35;
        const bruteSkinMat = new THREE.MeshLambertMaterial({ color: 0x2d3436 });
        const rustPlateMat = new THREE.MeshStandardMaterial({ color: 0x3d3028, roughness: 0.6, metalness: 0.6 });

        // Massive hunched upper torso
        const torsoGeo = new THREE.BoxGeometry(1.4 * bScale, 1.25 * bScale, 1.0 * bScale);
        const torso = new THREE.Mesh(torsoGeo, armorMat);
        torso.position.y = 1.35 * bScale;
        torso.castShadow = true;
        bodyGroup.add(torso);

        // Bolted iron breastplate
        const chestPlateGeo = new THREE.BoxGeometry(1.48 * bScale, 0.85 * bScale, 0.3 * bScale);
        const chestPlate = new THREE.Mesh(chestPlateGeo, rustPlateMat);
        chestPlate.position.set(0, 1.45 * bScale, 0.45 * bScale);
        chestPlate.castShadow = true;
        bodyGroup.add(chestPlate);

        // Spine Armor Ridge
        const spineGeo = new THREE.BoxGeometry(0.3 * bScale, 1.1 * bScale, 0.3 * bScale);
        const spine = new THREE.Mesh(spineGeo, rustPlateMat);
        spine.position.set(0, 1.4 * bScale, -0.48 * bScale);
        spine.castShadow = true;
        bodyGroup.add(spine);

        // Spiked Iron Pauldrons (Shoulders)
        const pauldronGeo = new THREE.BoxGeometry(0.75 * bScale, 0.65 * bScale, 0.85 * bScale);
        const leftPauldron = new THREE.Mesh(pauldronGeo, armorMat);
        leftPauldron.position.set(-0.95 * bScale, 1.85 * bScale, 0);
        leftPauldron.castShadow = true;
        bodyGroup.add(leftPauldron);

        const rightPauldron = new THREE.Mesh(pauldronGeo, armorMat);
        rightPauldron.position.set(0.95 * bScale, 1.85 * bScale, 0);
        rightPauldron.castShadow = true;
        bodyGroup.add(rightPauldron);

        // Shoulder Spikes
        const spikeGeo = new THREE.ConeGeometry(0.08 * bScale, 0.35 * bScale, 4);
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x111115, metalness: 0.9, roughness: 0.2 });
        const sp1 = new THREE.Mesh(spikeGeo, spikeMat);
        sp1.position.set(-0.95 * bScale, 2.25 * bScale, 0);
        bodyGroup.add(sp1);
        const sp2 = new THREE.Mesh(spikeGeo, spikeMat);
        sp2.position.set(0.95 * bScale, 2.25 * bScale, 0);
        bodyGroup.add(sp2);

        // Head (Armored with iron jaw cage)
        headPivot.position.set(0, 1.95 * bScale, 0.3 * bScale);
        const headGeo = new THREE.BoxGeometry(0.65 * bScale, 0.65 * bScale, 0.65 * bScale);
        const head = new THREE.Mesh(headGeo, bruteSkinMat);
        head.castShadow = true;
        headPivot.add(head);

        const jawCageGeo = new THREE.BoxGeometry(0.72 * bScale, 0.3 * bScale, 0.55 * bScale);
        const jawCage = new THREE.Mesh(jawCageGeo, armorMat);
        jawCage.position.set(0, -0.2 * bScale, 0.15 * bScale);
        jawCage.castShadow = true;
        headPivot.add(jawCage);

        // Glowing Molten Eyes
        const eyeGeo = new THREE.BoxGeometry(0.18 * bScale, 0.08 * bScale, 0.1 * bScale);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.18 * bScale, 0.05 * bScale, 0.34 * bScale);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.18 * bScale, 0.05 * bScale, 0.34 * bScale);
        headPivot.add(eyeL);
        headPivot.add(eyeR);
        bodyGroup.add(headPivot);

        // Crusher Left Arm (Giant mutated boulder fist)
        leftArmPivot.position.set(-1.05 * bScale, 1.65 * bScale, 0);
        const armLGeo = new THREE.BoxGeometry(0.55 * bScale, 1.0 * bScale, 0.55 * bScale);
        const armL = new THREE.Mesh(armLGeo, bruteSkinMat);
        armL.position.y = -0.45 * bScale;
        armL.castShadow = true;
        leftArmPivot.add(armL);

        // Giant Iron Fist
        const fistGeo = new THREE.BoxGeometry(0.85 * bScale, 0.85 * bScale, 0.85 * bScale);
        const fist = new THREE.Mesh(fistGeo, armorMat);
        fist.position.set(0, -1.15 * bScale, 0.1 * bScale);
        fist.castShadow = true;
        leftArmPivot.add(fist);
        bodyGroup.add(leftArmPivot);

        // Right Arm (Armored Stone Club Arm)
        rightArmPivot.position.set(1.05 * bScale, 1.65 * bScale, 0);
        const armRGeo = new THREE.BoxGeometry(0.48 * bScale, 1.0 * bScale, 0.48 * bScale);
        const armR = new THREE.Mesh(armRGeo, bruteSkinMat);
        armR.position.y = -0.45 * bScale;
        armR.castShadow = true;
        rightArmPivot.add(armR);

        // Stone Club Attachment
        const clubGeo = new THREE.CylinderGeometry(0.18 * bScale, 0.1 * bScale, 1.2 * bScale, 6);
        const club = new THREE.Mesh(clubGeo, rustPlateMat);
        club.position.set(0, -1.1 * bScale, 0.3 * bScale);
        club.rotation.x = Math.PI / 3;
        club.castShadow = true;
        rightArmPivot.add(club);
        bodyGroup.add(rightArmPivot);

        // Heavy Legs
        leftLegPivot.position.set(-0.45 * bScale, 0.85 * bScale, 0);
        const legLGeo = new THREE.BoxGeometry(0.52 * bScale, 0.85 * bScale, 0.55 * bScale);
        const legL = new THREE.Mesh(legLGeo, darkClothMat);
        legL.position.y = -0.425 * bScale;
        legL.castShadow = true;
        leftLegPivot.add(legL);
        bodyGroup.add(leftLegPivot);

        rightLegPivot.position.set(0.45 * bScale, 0.85 * bScale, 0);
        const legRGeo = new THREE.BoxGeometry(0.52 * bScale, 0.85 * bScale, 0.55 * bScale);
        const legR = new THREE.Mesh(legRGeo, darkClothMat);
        legR.position.y = -0.425 * bScale;
        legR.castShadow = true;
        rightLegPivot.add(legR);
        bodyGroup.add(rightLegPivot);

    } else if (archetype === 'archer') {
        // ==========================================
        // 2. BONE ARCHER (Ranged Sniper)
        // ==========================================
        const hoodMat = new THREE.MeshLambertMaterial({ color: 0x1f2c27 });
        const arrowShaftMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 });

        // Ribcage Torso
        const torsoGeo = new THREE.BoxGeometry(0.55 * scale, 0.85 * scale, 0.32 * scale);
        const torso = new THREE.Mesh(torsoGeo, boneMat);
        torso.position.y = 1.15 * scale;
        torso.castShadow = true;
        bodyGroup.add(torso);

        // Assassin Cowl / Tattered Cloth Mantle
        const cowlGeo = new THREE.BoxGeometry(0.68 * scale, 0.45 * scale, 0.42 * scale);
        const cowl = new THREE.Mesh(cowlGeo, hoodMat);
        cowl.position.set(0, 1.4 * scale, 0);
        cowl.castShadow = true;
        bodyGroup.add(cowl);

        // Arrow Quiver on Back
        const quiverGeo = new THREE.CylinderGeometry(0.12 * scale, 0.09 * scale, 0.8 * scale, 6);
        const quiver = new THREE.Mesh(quiverGeo, hoodMat);
        quiver.position.set(0.18 * scale, 1.25 * scale, -0.26 * scale);
        quiver.rotation.z = -0.28;
        quiver.castShadow = true;
        bodyGroup.add(quiver);

        // 3 Arrows inside Quiver
        for (let a = 0; a < 3; a++) {
            const arrowGeo = new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, 0.5 * scale, 4);
            const arrow = new THREE.Mesh(arrowGeo, arrowShaftMat);
            arrow.position.set((0.15 + a * 0.03) * scale, 1.65 * scale, -0.26 * scale);
            arrow.rotation.z = -0.28 + (a - 1) * 0.08;
            bodyGroup.add(arrow);
        }

        // Hooded Skull Head
        headPivot.position.set(0, 1.68 * scale, 0);
        const hoodGeo = new THREE.BoxGeometry(0.44 * scale, 0.48 * scale, 0.48 * scale);
        const hood = new THREE.Mesh(hoodGeo, hoodMat);
        hood.castShadow = true;
        headPivot.add(hood);

        const skullGeo = new THREE.BoxGeometry(0.34 * scale, 0.34 * scale, 0.26 * scale);
        const skull = new THREE.Mesh(skullGeo, boneMat);
        skull.position.set(0, -0.02 * scale, 0.14 * scale);
        skull.castShadow = true;
        headPivot.add(skull);

        // Glowing Cyan Eyes
        const eyeGeo = new THREE.BoxGeometry(0.09 * scale, 0.09 * scale, 0.08 * scale);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.1 * scale, 0.04 * scale, 0.28 * scale);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.1 * scale, 0.04 * scale, 0.28 * scale);
        headPivot.add(eyeL);
        headPivot.add(eyeR);
        bodyGroup.add(headPivot);

        // Left Arm Holding Recurve Bone Bow
        leftArmPivot.position.set(-0.4 * scale, 1.45 * scale, 0);
        const armLGeo = new THREE.BoxGeometry(0.16 * scale, 0.75 * scale, 0.16 * scale);
        const armL = new THREE.Mesh(armLGeo, boneMat);
        armL.position.y = -0.375 * scale;
        armL.castShadow = true;
        leftArmPivot.add(armL);

        // Recurve Bone Bow
        const bowGroup = new THREE.Group();
        const bowCurveGeo = new THREE.TorusGeometry(0.48 * scale, 0.035 * scale, 6, 14, Math.PI * 0.8);
        const bowMesh = new THREE.Mesh(bowCurveGeo, new THREE.MeshStandardMaterial({ color: 0xf5eedc, roughness: 0.5 }));
        bowMesh.rotation.z = Math.PI / 2;
        bowMesh.rotation.y = -Math.PI / 2;
        bowMesh.castShadow = true;
        bowGroup.add(bowMesh);

        // Glowing Bowstring
        const stringGeo = new THREE.CylinderGeometry(0.008 * scale, 0.008 * scale, 0.82 * scale, 4);
        const stringMesh = new THREE.Mesh(stringGeo, new THREE.MeshBasicMaterial({ color: 0x00ffff }));
        stringMesh.position.set(0, 0, -0.22 * scale);
        bowGroup.add(stringMesh);

        bowGroup.position.set(0, -0.72 * scale, 0.32 * scale);
        leftArmPivot.add(bowGroup);
        specialMesh = bowGroup;
        bodyGroup.add(leftArmPivot);

        // Right Arm (Drawing hand)
        rightArmPivot.position.set(0.4 * scale, 1.45 * scale, 0);
        const armRGeo = new THREE.BoxGeometry(0.16 * scale, 0.75 * scale, 0.16 * scale);
        const armR = new THREE.Mesh(armRGeo, boneMat);
        armR.position.y = -0.375 * scale;
        armR.castShadow = true;
        rightArmPivot.add(armR);
        bodyGroup.add(rightArmPivot);

        // Skeletal Legs
        leftLegPivot.position.set(-0.18 * scale, 0.75 * scale, 0);
        const legLGeo = new THREE.BoxGeometry(0.18 * scale, 0.75 * scale, 0.18 * scale);
        const legL = new THREE.Mesh(legLGeo, boneMat);
        legL.position.y = -0.375 * scale;
        legL.castShadow = true;
        leftLegPivot.add(legL);
        bodyGroup.add(leftLegPivot);

        rightLegPivot.position.set(0.18 * scale, 0.75 * scale, 0);
        const legRGeo = new THREE.BoxGeometry(0.18 * scale, 0.75 * scale, 0.18 * scale);
        const legR = new THREE.Mesh(legRGeo, boneMat);
        legR.position.y = -0.375 * scale;
        legR.castShadow = true;
        rightLegPivot.add(legR);
        bodyGroup.add(rightLegPivot);

    } else if (archetype === 'screamer') {
        // ==========================================
        // 3. SCREAMER / BANSHEE (Necrotic Commander)
        // ==========================================
        const robeMat = new THREE.MeshLambertMaterial({ color: 0x3b074d });
        const screamerSkinMat = new THREE.MeshLambertMaterial({ color: 0x1f192b });

        // Slender robed torso
        const torsoGeo = new THREE.BoxGeometry(0.65 * scale, 0.9 * scale, 0.4 * scale);
        const torso = new THREE.Mesh(torsoGeo, robeMat);
        torso.position.y = 1.2 * scale;
        torso.castShadow = true;
        bodyGroup.add(torso);

        // Pulsating Necrotic Sigil Core in chest
        const sigilGeo = new THREE.SphereGeometry(0.18 * scale, 8, 8);
        const sigilMat = new THREE.MeshStandardMaterial({
            color: 0x330033,
            emissive: 0xff00ea,
            emissiveIntensity: 3.5,
            toneMapped: false
        });
        const sigil = new THREE.Mesh(sigilGeo, sigilMat);
        sigil.position.set(0, 1.35 * scale, 0.22 * scale);
        bodyGroup.add(sigil);
        pulsingMeshes.push(sigil);

        // Crown / Horned Head
        headPivot.position.set(0, 1.75 * scale, 0);
        const headGeo = new THREE.BoxGeometry(0.46 * scale, 0.46 * scale, 0.46 * scale);
        const head = new THREE.Mesh(headGeo, screamerSkinMat);
        head.castShadow = true;
        headPivot.add(head);

        // Curved Twin Horns
        const hornGeo = new THREE.ConeGeometry(0.08 * scale, 0.48 * scale, 5);
        const hornMat = new THREE.MeshLambertMaterial({ color: 0x0f0b12 });
        const hornL = new THREE.Mesh(hornGeo, hornMat);
        hornL.position.set(-0.22 * scale, 0.42 * scale, -0.05 * scale);
        hornL.rotation.z = -0.42;
        hornL.rotation.x = -0.2;
        hornL.castShadow = true;
        headPivot.add(hornL);

        const hornR = new THREE.Mesh(hornGeo, hornMat);
        hornR.position.set(0.22 * scale, 0.42 * scale, -0.05 * scale);
        hornR.rotation.z = 0.42;
        hornR.rotation.x = -0.2;
        hornR.castShadow = true;
        headPivot.add(hornR);

        // Glowing Violet Eyes
        const eyeGeo = new THREE.BoxGeometry(0.12 * scale, 0.08 * scale, 0.1 * scale);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.13 * scale, 0.05 * scale, 0.24 * scale);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.13 * scale, 0.05 * scale, 0.24 * scale);
        headPivot.add(eyeL);
        headPivot.add(eyeR);
        bodyGroup.add(headPivot);

        // Long clawed arms
        leftArmPivot.position.set(-0.46 * scale, 1.55 * scale, 0);
        const armLGeo = new THREE.BoxGeometry(0.18 * scale, 0.9 * scale, 0.18 * scale);
        const armL = new THREE.Mesh(armLGeo, screamerSkinMat);
        armL.position.y = -0.45 * scale;
        armL.castShadow = true;
        leftArmPivot.add(armL);

        // Claws
        const clawGeo = new THREE.ConeGeometry(0.04 * scale, 0.2 * scale, 4);
        const clawL = new THREE.Mesh(clawGeo, hornMat);
        clawL.position.set(0, -0.98 * scale, 0.05 * scale);
        clawL.rotation.x = Math.PI;
        leftArmPivot.add(clawL);
        bodyGroup.add(leftArmPivot);

        rightArmPivot.position.set(0.46 * scale, 1.55 * scale, 0);
        const armRGeo = new THREE.BoxGeometry(0.18 * scale, 0.9 * scale, 0.18 * scale);
        const armR = new THREE.Mesh(armRGeo, screamerSkinMat);
        armR.position.y = -0.45 * scale;
        armR.castShadow = true;
        rightArmPivot.add(armR);

        const clawR = new THREE.Mesh(clawGeo, hornMat);
        clawR.position.set(0, -0.98 * scale, 0.05 * scale);
        clawR.rotation.x = Math.PI;
        rightArmPivot.add(clawR);
        bodyGroup.add(rightArmPivot);

        // Robed Lower Skirt/Legs
        leftLegPivot.position.set(-0.2 * scale, 0.75 * scale, 0);
        const legLGeo = new THREE.BoxGeometry(0.22 * scale, 0.75 * scale, 0.22 * scale);
        const legL = new THREE.Mesh(legLGeo, robeMat);
        legL.position.y = -0.375 * scale;
        legL.castShadow = true;
        leftLegPivot.add(legL);
        bodyGroup.add(leftLegPivot);

        rightLegPivot.position.set(0.2 * scale, 0.75 * scale, 0);
        const legRGeo = new THREE.BoxGeometry(0.22 * scale, 0.75 * scale, 0.22 * scale);
        const legR = new THREE.Mesh(legRGeo, robeMat);
        legR.position.y = -0.375 * scale;
        legR.castShadow = true;
        rightLegPivot.add(legR);
        bodyGroup.add(rightLegPivot);

    } else if (archetype === 'bloater') {
        // ==========================================
        // 4. BLOATER (Toxic Explosive Suicide Zombie)
        // ==========================================
        const bloatSkinMat = new THREE.MeshLambertMaterial({ color: 0x4a6e30 });
        const toxicPustuleMat = new THREE.MeshStandardMaterial({
            color: 0x336600,
            emissive: 0x76ff03,
            emissiveIntensity: 3.0,
            toneMapped: false
        });

        // Massive bulbous swollen torso
        const torsoGeo = new THREE.DodecahedronGeometry(0.72 * scale, 1);
        const torso = new THREE.Mesh(torsoGeo, bloatSkinMat);
        torso.position.y = 1.15 * scale;
        torso.scale.set(1.25, 1.05, 1.25);
        torso.castShadow = true;
        bodyGroup.add(torso);

        // Glowing Toxic Cysts / Pustules
        const cyst1Geo = new THREE.SphereGeometry(0.24 * scale, 6, 6);
        const cyst1 = new THREE.Mesh(cyst1Geo, toxicPustuleMat);
        cyst1.position.set(-0.4 * scale, 1.28 * scale, 0.48 * scale);
        bodyGroup.add(cyst1);
        pulsingMeshes.push(cyst1);

        const cyst2Geo = new THREE.SphereGeometry(0.2 * scale, 6, 6);
        const cyst2 = new THREE.Mesh(cyst2Geo, toxicPustuleMat);
        cyst2.position.set(0.42 * scale, 1.4 * scale, 0.4 * scale);
        bodyGroup.add(cyst2);
        pulsingMeshes.push(cyst2);

        const cyst3Geo = new THREE.SphereGeometry(0.18 * scale, 6, 6);
        const cyst3 = new THREE.Mesh(cyst3Geo, toxicPustuleMat);
        cyst3.position.set(0, 1.55 * scale, -0.45 * scale);
        bodyGroup.add(cyst3);
        pulsingMeshes.push(cyst3);

        // Sunken Head
        headPivot.position.set(0, 1.62 * scale, 0.18 * scale);
        const headGeo = new THREE.BoxGeometry(0.42 * scale, 0.42 * scale, 0.42 * scale);
        const head = new THREE.Mesh(headGeo, bloatSkinMat);
        head.castShadow = true;
        headPivot.add(head);

        // Glowing Toxic Eyes
        const eyeGeo = new THREE.BoxGeometry(0.12 * scale, 0.12 * scale, 0.08 * scale);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.11 * scale, 0.03 * scale, 0.22 * scale);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.11 * scale, 0.03 * scale, 0.22 * scale);
        headPivot.add(eyeL);
        headPivot.add(eyeR);
        bodyGroup.add(headPivot);

        // Heavy stumpy arms
        leftArmPivot.position.set(-0.68 * scale, 1.35 * scale, 0);
        const armLGeo = new THREE.BoxGeometry(0.32 * scale, 0.7 * scale, 0.32 * scale);
        const armL = new THREE.Mesh(armLGeo, bloatSkinMat);
        armL.position.y = -0.35 * scale;
        armL.castShadow = true;
        leftArmPivot.add(armL);
        bodyGroup.add(leftArmPivot);

        rightArmPivot.position.set(0.68 * scale, 1.35 * scale, 0);
        const armRGeo = new THREE.BoxGeometry(0.32 * scale, 0.7 * scale, 0.32 * scale);
        const armR = new THREE.Mesh(armRGeo, bloatSkinMat);
        armR.position.y = -0.35 * scale;
        armR.castShadow = true;
        rightArmPivot.add(armR);
        bodyGroup.add(rightArmPivot);

        // Short stumpy legs
        leftLegPivot.position.set(-0.32 * scale, 0.65 * scale, 0);
        const legLGeo = new THREE.BoxGeometry(0.3 * scale, 0.65 * scale, 0.3 * scale);
        const legL = new THREE.Mesh(legLGeo, darkClothMat);
        legL.position.y = -0.325 * scale;
        legL.castShadow = true;
        leftLegPivot.add(legL);
        bodyGroup.add(leftLegPivot);

        rightLegPivot.position.set(0.32 * scale, 0.65 * scale, 0);
        const legRGeo = new THREE.BoxGeometry(0.3 * scale, 0.65 * scale, 0.3 * scale);
        const legR = new THREE.Mesh(legRGeo, darkClothMat);
        legR.position.y = -0.325 * scale;
        legR.castShadow = true;
        rightLegPivot.add(legR);
        bodyGroup.add(rightLegPivot);

    } else if (archetype === 'runner') {
        // ==========================================
        // 5. RUNNER / SPRINTER (Agile Feral Beast)
        // ==========================================
        const runnerSkinMat = new THREE.MeshLambertMaterial({ color: 0x8a2020 });
        const spineRidgeMat = new THREE.MeshLambertMaterial({ color: 0x3d0b0b });

        // Athletic forward-hunched torso
        const torsoGeo = new THREE.BoxGeometry(0.62 * scale, 0.85 * scale, 0.38 * scale);
        const torso = new THREE.Mesh(torsoGeo, runnerSkinMat);
        torso.position.y = 1.15 * scale;
        torso.castShadow = true;
        bodyGroup.add(torso);

        // Ripped Shredded Chest / Blood Stains
        const bloodGeo = new THREE.BoxGeometry(0.66 * scale, 0.45 * scale, 0.42 * scale);
        const bloodMesh = new THREE.Mesh(bloodGeo, goreMat);
        bloodMesh.position.set(0, 1.25 * scale, 0);
        bloodMesh.castShadow = true;
        bodyGroup.add(bloodMesh);

        // Bone Spurs along Spine
        for (let s = 0; s < 4; s++) {
            const spurGeo = new THREE.ConeGeometry(0.04 * scale, 0.22 * scale, 4);
            const spur = new THREE.Mesh(spurGeo, spineRidgeMat);
            spur.position.set(0, (0.95 + s * 0.18) * scale, -0.24 * scale);
            spur.rotation.x = -Math.PI / 3;
            bodyGroup.add(spur);
        }

        // Feral Snarling Head
        headPivot.position.set(0, 1.68 * scale, 0.15 * scale);
        const headGeo = new THREE.BoxGeometry(0.44 * scale, 0.44 * scale, 0.44 * scale);
        const head = new THREE.Mesh(headGeo, runnerSkinMat);
        head.castShadow = true;
        headPivot.add(head);

        // Snarling Predator Jaw
        const jawGeo = new THREE.BoxGeometry(0.36 * scale, 0.18 * scale, 0.35 * scale);
        const jaw = new THREE.Mesh(jawGeo, spineRidgeMat);
        jaw.position.set(0, -0.18 * scale, 0.18 * scale);
        jaw.castShadow = true;
        headPivot.add(jaw);

        // Glowing Crimson Red Eyes
        const eyeGeo = new THREE.BoxGeometry(0.12 * scale, 0.09 * scale, 0.08 * scale);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.12 * scale, 0.06 * scale, 0.24 * scale);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.12 * scale, 0.06 * scale, 0.24 * scale);
        headPivot.add(eyeL);
        headPivot.add(eyeR);
        bodyGroup.add(headPivot);

        // Lean predatory arms with claw extensions
        leftArmPivot.position.set(-0.44 * scale, 1.48 * scale, 0);
        const armLGeo = new THREE.BoxGeometry(0.18 * scale, 0.85 * scale, 0.18 * scale);
        const armL = new THREE.Mesh(armLGeo, runnerSkinMat);
        armL.position.y = -0.425 * scale;
        armL.castShadow = true;
        leftArmPivot.add(armL);
        bodyGroup.add(leftArmPivot);

        rightArmPivot.position.set(0.44 * scale, 1.48 * scale, 0);
        const armRGeo = new THREE.BoxGeometry(0.18 * scale, 0.85 * scale, 0.18 * scale);
        const armR = new THREE.Mesh(armRGeo, runnerSkinMat);
        armR.position.y = -0.425 * scale;
        armR.castShadow = true;
        rightArmPivot.add(armR);
        bodyGroup.add(rightArmPivot);

        // Fast piston legs
        leftLegPivot.position.set(-0.2 * scale, 0.75 * scale, 0);
        const legLGeo = new THREE.BoxGeometry(0.2 * scale, 0.75 * scale, 0.2 * scale);
        const legL = new THREE.Mesh(legLGeo, darkClothMat);
        legL.position.y = -0.375 * scale;
        legL.castShadow = true;
        leftLegPivot.add(legL);
        bodyGroup.add(leftLegPivot);

        rightLegPivot.position.set(0.2 * scale, 0.75 * scale, 0);
        const legRGeo = new THREE.BoxGeometry(0.2 * scale, 0.75 * scale, 0.2 * scale);
        const legR = new THREE.Mesh(legRGeo, darkClothMat);
        legR.position.y = -0.375 * scale;
        legR.castShadow = true;
        rightLegPivot.add(legR);
        bodyGroup.add(rightLegPivot);

    } else if (archetype === 'walker' || archetype === 'leaper') {
        // ==========================================
        // 6. WALKER / SHAMBLER (Classic Decayed Zombie)
        // ==========================================
        const walkerSkinMat = new THREE.MeshLambertMaterial({ color: 0x3d6635 });
        const shirtMat = new THREE.MeshLambertMaterial({ color: 0x2b3842 });
        const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1f2326 });

        // Decayed torso with torn flannel shirt
        const torsoGeo = new THREE.BoxGeometry(0.68 * scale, 0.85 * scale, 0.38 * scale);
        const torso = new THREE.Mesh(torsoGeo, walkerSkinMat);
        torso.position.y = 1.15 * scale;
        torso.castShadow = true;
        bodyGroup.add(torso);

        // Torn vest / rags
        const vestGeo = new THREE.BoxGeometry(0.72 * scale, 0.6 * scale, 0.42 * scale);
        const vest = new THREE.Mesh(vestGeo, shirtMat);
        vest.position.set(0, 1.25 * scale, 0);
        vest.castShadow = true;
        bodyGroup.add(vest);

        // Exposed Ribs / Guts
        const gutsGeo = new THREE.BoxGeometry(0.3 * scale, 0.25 * scale, 0.1 * scale);
        const guts = new THREE.Mesh(gutsGeo, goreMat);
        guts.position.set(-0.1 * scale, 1.0 * scale, 0.2 * scale);
        bodyGroup.add(guts);

        // Head with crooked drooping jaw
        headPivot.position.set(0, 1.68 * scale, 0);
        const headGeo = new THREE.BoxGeometry(0.48 * scale, 0.48 * scale, 0.48 * scale);
        const head = new THREE.Mesh(headGeo, walkerSkinMat);
        head.castShadow = true;
        headPivot.add(head);

        // Gaping Rotting Jaw
        const jawGeo = new THREE.BoxGeometry(0.38 * scale, 0.16 * scale, 0.3 * scale);
        const jaw = new THREE.Mesh(jawGeo, goreMat);
        jaw.position.set(0.04 * scale, -0.2 * scale, 0.12 * scale);
        jaw.rotation.z = 0.08; // Crooked broken jaw
        jaw.castShadow = true;
        headPivot.add(jaw);

        // Glowing Amber Eyes
        const eyeGeo = new THREE.BoxGeometry(0.12 * scale, 0.1 * scale, 0.08 * scale);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.13 * scale, 0.06 * scale, 0.25 * scale);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.13 * scale, 0.06 * scale, 0.25 * scale);
        headPivot.add(eyeL);
        headPivot.add(eyeR);
        bodyGroup.add(headPivot);

        // Articulated Shambling Arms
        leftArmPivot.position.set(-0.46 * scale, 1.48 * scale, 0);
        const armLGeo = new THREE.BoxGeometry(0.2 * scale, 0.8 * scale, 0.2 * scale);
        const armL = new THREE.Mesh(armLGeo, walkerSkinMat);
        armL.position.y = -0.4 * scale;
        armL.castShadow = true;
        leftArmPivot.add(armL);
        bodyGroup.add(leftArmPivot);

        rightArmPivot.position.set(0.46 * scale, 1.48 * scale, 0);
        const armRGeo = new THREE.BoxGeometry(0.2 * scale, 0.8 * scale, 0.2 * scale);
        const armR = new THREE.Mesh(armRGeo, walkerSkinMat);
        armR.position.y = -0.4 * scale;
        armR.castShadow = true;
        rightArmPivot.add(armR);
        bodyGroup.add(rightArmPivot);

        // Articulated Legs
        leftLegPivot.position.set(-0.2 * scale, 0.75 * scale, 0);
        const legLGeo = new THREE.BoxGeometry(0.22 * scale, 0.75 * scale, 0.22 * scale);
        const legL = new THREE.Mesh(legLGeo, pantsMat);
        legL.position.y = -0.375 * scale;
        legL.castShadow = true;
        leftLegPivot.add(legL);
        bodyGroup.add(leftLegPivot);

        rightLegPivot.position.set(0.2 * scale, 0.75 * scale, 0);
        const legRGeo = new THREE.BoxGeometry(0.22 * scale, 0.75 * scale, 0.22 * scale);
        const legR = new THREE.Mesh(legRGeo, pantsMat);
        legR.position.y = -0.375 * scale;
        legR.castShadow = true;
        rightLegPivot.add(legR);
        bodyGroup.add(rightLegPivot);

    } else if (archetype === 'slime' || archetype === 'minislime') {
        // ==========================================
        // 7. SLIME / MINI-SLIME (Gelatinous Mutant)
        // ==========================================
        const isMini = archetype === 'minislime';
        const sSize = (isMini ? 0.65 : 1.15) * scale;
        
        // Translucent Outer Gelatinous Dome / Cube
        const gelMat = new THREE.MeshStandardMaterial({
            color: isMini ? 0x44ff88 : 0x22ff55,
            roughness: 0.1,
            metalness: 0.1,
            transparent: true,
            opacity: 0.72,
            emissive: 0x053311,
            emissiveIntensity: 0.4
        });

        const gelGeo = new THREE.BoxGeometry(sSize, sSize * 0.85, sSize);
        const gelMesh = new THREE.Mesh(gelGeo, gelMat);
        gelMesh.position.y = (sSize * 0.85) / 2;
        gelMesh.castShadow = true;
        bodyGroup.add(gelMesh);

        // Glowing Pulsating Core Nucleus
        const coreGeo = new THREE.SphereGeometry(sSize * 0.28, 8, 8);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0x003311,
            emissive: 0x00ff88,
            emissiveIntensity: 3.5,
            toneMapped: false
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.position.y = (sSize * 0.85) / 2;
        bodyGroup.add(coreMesh);
        pulsingMeshes.push(coreMesh);

        // Floating Glossy Eyes inside the gel
        headPivot.position.set(0, (sSize * 0.85) / 2, sSize * 0.35);
        const eyePupilGeo = new THREE.SphereGeometry(sSize * 0.09, 6, 6);
        const eyeL = new THREE.Mesh(eyePupilGeo, eyeMat);
        eyeL.position.set(-sSize * 0.22, sSize * 0.08, 0);
        const eyeR = new THREE.Mesh(eyePupilGeo, eyeMat);
        eyeR.position.set(sSize * 0.22, sSize * 0.08, 0);
        headPivot.add(eyeL);
        headPivot.add(eyeR);
        bodyGroup.add(headPivot);

    } else if (archetype === 'orc') {
        // ==========================================
        // 8. ORC SHAMAN / WARLORD (Heavy Earthen Caster)
        // ==========================================
        const orcSkinMat = new THREE.MeshLambertMaterial({ color: 0x2e6930 });
        const orcArmorMat = new THREE.MeshStandardMaterial({ color: 0x4a3c31, roughness: 0.7, metalness: 0.4 });
        const ironMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.3, metalness: 0.8 });
        const furMat = new THREE.MeshLambertMaterial({ color: 0x1f1710 });

        // Muscular heavy Torso
        const torsoGeo = new THREE.BoxGeometry(1.0 * scale, 1.0 * scale, 0.6 * scale);
        const torso = new THREE.Mesh(torsoGeo, orcSkinMat);
        torso.position.y = 1.25 * scale;
        torso.castShadow = true;
        bodyGroup.add(torso);

        // Leather & Iron Chest Harness
        const harnessGeo = new THREE.BoxGeometry(1.05 * scale, 0.4 * scale, 0.65 * scale);
        const harness = new THREE.Mesh(harnessGeo, orcArmorMat);
        harness.position.set(0, 1.35 * scale, 0);
        bodyGroup.add(harness);

        // Fur Mantle
        const furGeo = new THREE.BoxGeometry(1.15 * scale, 0.3 * scale, 0.7 * scale);
        const fur = new THREE.Mesh(furGeo, furMat);
        fur.position.set(0, 1.7 * scale, 0);
        bodyGroup.add(fur);

        // Spiked Iron Pauldron (Left Shoulder)
        const pauldronGeo = new THREE.BoxGeometry(0.55 * scale, 0.4 * scale, 0.6 * scale);
        const pauldron = new THREE.Mesh(pauldronGeo, ironMat);
        pauldron.position.set(-0.65 * scale, 1.7 * scale, 0);
        pauldron.castShadow = true;
        bodyGroup.add(pauldron);

        // Head with Horned Barbarian Helm & Tusks
        headPivot.position.set(0, 1.85 * scale, 0.1 * scale);
        const headGeo = new THREE.BoxGeometry(0.52 * scale, 0.52 * scale, 0.52 * scale);
        const head = new THREE.Mesh(headGeo, orcSkinMat);
        head.castShadow = true;
        headPivot.add(head);

        // Horned Iron Helmet
        const helmGeo = new THREE.BoxGeometry(0.58 * scale, 0.3 * scale, 0.58 * scale);
        const helm = new THREE.Mesh(helmGeo, ironMat);
        helm.position.y = 0.18 * scale;
        headPivot.add(helm);

        // Curved Horns
        const hornGeo = new THREE.ConeGeometry(0.08 * scale, 0.4 * scale, 5);
        const hornMat = new THREE.MeshStandardMaterial({ color: 0xd4c8a5, roughness: 0.5 });
        const hornL = new THREE.Mesh(hornGeo, hornMat);
        hornL.position.set(-0.28 * scale, 0.35 * scale, 0);
        hornL.rotation.z = -0.6;
        headPivot.add(hornL);

        const hornR = new THREE.Mesh(hornGeo, hornMat);
        hornR.position.set(0.28 * scale, 0.35 * scale, 0);
        hornR.rotation.z = 0.6;
        headPivot.add(hornR);

        // Jutting Tusks
        const tuskGeo = new THREE.ConeGeometry(0.04 * scale, 0.22 * scale, 4);
        const tuskL = new THREE.Mesh(tuskGeo, hornMat);
        tuskL.position.set(-0.16 * scale, -0.15 * scale, 0.28 * scale);
        tuskL.rotation.x = -0.3;
        headPivot.add(tuskL);

        const tuskR = new THREE.Mesh(tuskGeo, hornMat);
        tuskR.position.set(0.16 * scale, -0.15 * scale, 0.28 * scale);
        tuskR.rotation.x = -0.3;
        headPivot.add(tuskR);

        // Glowing Golden Orc Eyes
        const eyeGeo = new THREE.BoxGeometry(0.1 * scale, 0.08 * scale, 0.08 * scale);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.14 * scale, 0.05 * scale, 0.28 * scale);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.14 * scale, 0.05 * scale, 0.28 * scale);
        headPivot.add(eyeL);
        headPivot.add(eyeR);
        bodyGroup.add(headPivot);

        // Arms & Shaman Earth Totem Staff
        leftArmPivot.position.set(-0.65 * scale, 1.55 * scale, 0);
        const armLGeo = new THREE.BoxGeometry(0.28 * scale, 0.85 * scale, 0.28 * scale);
        const armL = new THREE.Mesh(armLGeo, orcSkinMat);
        armL.position.y = -0.425 * scale;
        armL.castShadow = true;
        leftArmPivot.add(armL);
        bodyGroup.add(leftArmPivot);

        rightArmPivot.position.set(0.65 * scale, 1.55 * scale, 0);
        const armRGeo = new THREE.BoxGeometry(0.28 * scale, 0.85 * scale, 0.28 * scale);
        const armR = new THREE.Mesh(armRGeo, orcSkinMat);
        armR.position.y = -0.425 * scale;
        armR.castShadow = true;
        rightArmPivot.add(armR);

        // Shaman Earth Totem Staff
        const totemStaffGeo = new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 1.8 * scale, 6);
        const totemStaffMat = new THREE.MeshLambertMaterial({ color: 0x3d2716 });
        const totemStaff = new THREE.Mesh(totemStaffGeo, totemStaffMat);
        totemStaff.position.set(0, -0.4 * scale, 0.4 * scale);
        totemStaff.rotation.x = Math.PI / 4;
        rightArmPivot.add(totemStaff);

        // Glowing Runed Totem Head
        const totemHeadGeo = new THREE.BoxGeometry(0.3 * scale, 0.35 * scale, 0.3 * scale);
        const totemHeadMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            emissive: 0x33ff66,
            emissiveIntensity: 2.0
        });
        const totemHead = new THREE.Mesh(totemHeadGeo, totemHeadMat);
        totemHead.position.set(0, 0.8 * scale, 0);
        totemStaff.add(totemHead);
        bodyGroup.add(rightArmPivot);

        // Legs
        leftLegPivot.position.set(-0.28 * scale, 0.75 * scale, 0);
        const legLGeo = new THREE.BoxGeometry(0.32 * scale, 0.75 * scale, 0.32 * scale);
        const legL = new THREE.Mesh(legLGeo, orcArmorMat);
        legL.position.y = -0.375 * scale;
        legL.castShadow = true;
        leftLegPivot.add(legL);
        bodyGroup.add(leftLegPivot);

        rightLegPivot.position.set(0.28 * scale, 0.75 * scale, 0);
        const legRGeo = new THREE.BoxGeometry(0.32 * scale, 0.75 * scale, 0.32 * scale);
        const legR = new THREE.Mesh(legRGeo, orcArmorMat);
        legR.position.y = -0.375 * scale;
        legR.castShadow = true;
        rightLegPivot.add(legR);
        bodyGroup.add(rightLegPivot);

    } else if (archetype === 'phantom') {
        // ==========================================
        // 9. FLYING PHANTOM / SPECTER (Ethereal Sky Entity)
        // ==========================================
        const shroudMat = new THREE.MeshStandardMaterial({
            color: 0x1f1430,
            roughness: 0.8,
            metalness: 0.2,
            transparent: true,
            opacity: 0.88
        });

        // Floating Spectral Hooded Shroud
        const shroudGeo = new THREE.ConeGeometry(0.65 * scale, 1.4 * scale, 8);
        const shroud = new THREE.Mesh(shroudGeo, shroudMat);
        shroud.position.y = 1.0 * scale;
        shroud.rotation.x = Math.PI; // Pointing downwards like a flowing ghostly trail
        shroud.castShadow = true;
        bodyGroup.add(shroud);

        // Pulsating Void Soul Core inside
        const soulGeo = new THREE.SphereGeometry(0.25 * scale, 8, 8);
        const soulMat = new THREE.MeshStandardMaterial({
            color: 0x220033,
            emissive: 0xaa00ff,
            emissiveIntensity: 3.5,
            toneMapped: false
        });
        const soulMesh = new THREE.Mesh(soulGeo, soulMat);
        soulMesh.position.y = 1.1 * scale;
        bodyGroup.add(soulMesh);
        pulsingMeshes.push(soulMesh);

        // Spectral Head / Cowl
        headPivot.position.set(0, 1.65 * scale, 0);
        const cowlGeo = new THREE.BoxGeometry(0.48 * scale, 0.5 * scale, 0.5 * scale);
        const cowl = new THREE.Mesh(cowlGeo, shroudMat);
        cowl.castShadow = true;
        headPivot.add(cowl);

        // Hollow Void Face with Glowing Violet Eyes
        const eyeGeo = new THREE.BoxGeometry(0.12 * scale, 0.08 * scale, 0.08 * scale);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.13 * scale, 0.05 * scale, 0.26 * scale);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.13 * scale, 0.05 * scale, 0.26 * scale);
        headPivot.add(eyeL);
        headPivot.add(eyeR);
        bodyGroup.add(headPivot);

        // Ethereal Floating Ghost Wisps (Arms)
        leftArmPivot.position.set(-0.48 * scale, 1.35 * scale, 0);
        const wispLGeo = new THREE.ConeGeometry(0.12 * scale, 0.9 * scale, 5);
        const wispL = new THREE.Mesh(wispLGeo, shroudMat);
        wispL.position.y = -0.45 * scale;
        wispL.rotation.z = -0.3;
        leftArmPivot.add(wispL);
        bodyGroup.add(leftArmPivot);

        rightArmPivot.position.set(0.48 * scale, 1.35 * scale, 0);
        const wispR = new THREE.Mesh(wispLGeo, shroudMat);
        wispR.position.y = -0.45 * scale;
        wispR.rotation.z = 0.3;
        rightArmPivot.add(wispR);
        bodyGroup.add(rightArmPivot);

    } else if (archetype === 'firedemon') {
        // ==========================================
        // 10. FIRE DEMON / HELL FIEND (Molten Pyromancer)
        // ==========================================
        const obsidianSkinMat = new THREE.MeshStandardMaterial({ color: 0x141010, roughness: 0.6, metalness: 0.3 });
        const magmaVeinMat = new THREE.MeshStandardMaterial({
            color: 0x440000,
            emissive: 0xff3300,
            emissiveIntensity: 3.2,
            toneMapped: false
        });

        // Fiery Torso
        const torsoGeo = new THREE.BoxGeometry(0.85 * scale, 1.0 * scale, 0.5 * scale);
        const torso = new THREE.Mesh(torsoGeo, obsidianSkinMat);
        torso.position.y = 1.25 * scale;
        torso.castShadow = true;
        bodyGroup.add(torso);

        // Magma Core in chest
        const magmaCoreGeo = new THREE.BoxGeometry(0.4 * scale, 0.5 * scale, 0.2 * scale);
        const magmaCore = new THREE.Mesh(magmaCoreGeo, magmaVeinMat);
        magmaCore.position.set(0, 1.35 * scale, 0.2 * scale);
        bodyGroup.add(magmaCore);
        pulsingMeshes.push(magmaCore);

        // Horned Demonic Head
        headPivot.position.set(0, 1.8 * scale, 0);
        const headGeo = new THREE.BoxGeometry(0.48 * scale, 0.48 * scale, 0.48 * scale);
        const head = new THREE.Mesh(headGeo, obsidianSkinMat);
        head.castShadow = true;
        headPivot.add(head);

        // Curved Demon Horns
        const hornGeo = new THREE.ConeGeometry(0.08 * scale, 0.5 * scale, 5);
        const hornL = new THREE.Mesh(hornGeo, magmaVeinMat);
        hornL.position.set(-0.24 * scale, 0.45 * scale, -0.05 * scale);
        hornL.rotation.z = -0.5;
        hornL.rotation.x = -0.2;
        headPivot.add(hornL);

        const hornR = new THREE.Mesh(hornGeo, magmaVeinMat);
        hornR.position.set(0.24 * scale, 0.45 * scale, -0.05 * scale);
        hornR.rotation.z = 0.5;
        hornR.rotation.x = -0.2;
        headPivot.add(hornR);

        // Flaming Demonic Eyes
        const eyeGeo = new THREE.BoxGeometry(0.12 * scale, 0.08 * scale, 0.08 * scale);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.13 * scale, 0.05 * scale, 0.25 * scale);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.13 * scale, 0.05 * scale, 0.25 * scale);
        headPivot.add(eyeL);
        headPivot.add(eyeR);
        bodyGroup.add(headPivot);

        // Flaming Claw Arms
        leftArmPivot.position.set(-0.55 * scale, 1.55 * scale, 0);
        const armLGeo = new THREE.BoxGeometry(0.22 * scale, 0.85 * scale, 0.22 * scale);
        const armL = new THREE.Mesh(armLGeo, obsidianSkinMat);
        armL.position.y = -0.425 * scale;
        armL.castShadow = true;
        leftArmPivot.add(armL);

        // Flaming Hand
        const handL = new THREE.Mesh(new THREE.BoxGeometry(0.2 * scale, 0.25 * scale, 0.2 * scale), magmaVeinMat);
        handL.position.set(0, -0.9 * scale, 0);
        leftArmPivot.add(handL);
        bodyGroup.add(leftArmPivot);

        rightArmPivot.position.set(0.55 * scale, 1.55 * scale, 0);
        const armRGeo = new THREE.BoxGeometry(0.22 * scale, 0.85 * scale, 0.22 * scale);
        const armR = new THREE.Mesh(armRGeo, obsidianSkinMat);
        armR.position.y = -0.425 * scale;
        armR.castShadow = true;
        rightArmPivot.add(armR);

        const handR = new THREE.Mesh(new THREE.BoxGeometry(0.2 * scale, 0.25 * scale, 0.2 * scale), magmaVeinMat);
        handR.position.set(0, -0.9 * scale, 0);
        rightArmPivot.add(handR);
        bodyGroup.add(rightArmPivot);

        // Obsidian Legs
        leftLegPivot.position.set(-0.24 * scale, 0.75 * scale, 0);
        const legLGeo = new THREE.BoxGeometry(0.24 * scale, 0.75 * scale, 0.24 * scale);
        const legL = new THREE.Mesh(legLGeo, obsidianSkinMat);
        legL.position.y = -0.375 * scale;
        legL.castShadow = true;
        leftLegPivot.add(legL);
        bodyGroup.add(leftLegPivot);

        rightLegPivot.position.set(0.24 * scale, 0.75 * scale, 0);
        const legRGeo = new THREE.BoxGeometry(0.24 * scale, 0.75 * scale, 0.24 * scale);
        const legR = new THREE.Mesh(legRGeo, obsidianSkinMat);
        legR.position.y = -0.375 * scale;
        legR.castShadow = true;
        rightLegPivot.add(legR);
        bodyGroup.add(rightLegPivot);
    } else {
        // Fallback default humanoid mesh
        const defMat = new THREE.MeshLambertMaterial({ color: 0x3d6635 });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6 * scale, 0.8 * scale, 0.3 * scale), defMat);
        torso.position.y = 1.15 * scale;
        bodyGroup.add(torso);

        headPivot.position.set(0, 1.65 * scale, 0);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4 * scale, 0.4 * scale, 0.4 * scale), defMat);
        headPivot.add(head);
        bodyGroup.add(headPivot);

        leftArmPivot.position.set(-0.4 * scale, 1.4 * scale, 0);
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.7 * scale, 0.18 * scale), defMat);
        armL.position.y = -0.35 * scale;
        leftArmPivot.add(armL);
        bodyGroup.add(leftArmPivot);

        rightArmPivot.position.set(0.4 * scale, 1.4 * scale, 0);
        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.7 * scale, 0.18 * scale), defMat);
        armR.position.y = -0.35 * scale;
        rightArmPivot.add(armR);
        bodyGroup.add(rightArmPivot);

        leftLegPivot.position.set(-0.18 * scale, 0.7 * scale, 0);
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2 * scale, 0.7 * scale, 0.2 * scale), defMat);
        legL.position.y = -0.35 * scale;
        leftLegPivot.add(legL);
        bodyGroup.add(leftLegPivot);

        rightLegPivot.position.set(0.18 * scale, 0.7 * scale, 0);
        const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2 * scale, 0.7 * scale, 0.2 * scale), defMat);
        legR.position.y = -0.35 * scale;
        rightLegPivot.add(legR);
        bodyGroup.add(rightLegPivot);
    }

    return {
        mesh: root,
        eyeMaterials,
        pulsingMeshes,
        pivots: {
            body: bodyGroup,
            head: headPivot,
            leftArm: leftArmPivot,
            rightArm: rightArmPivot,
            leftLeg: leftLegPivot,
            rightLeg: rightLegPivot
        },
        specialMesh,
        archetype
    };
}
