import * as THREE from 'three';

export interface PlayerModelResult {
    root: THREE.Group;
    pivots: {
        body: THREE.Group;
        head: THREE.Group;
        leftArm: THREE.Group;
        rightArm: THREE.Group;
        leftLeg: THREE.Group;
        rightLeg: THREE.Group;
    };
    weaponMesh?: THREE.Group;
    muzzleFlash?: THREE.PointLight;
    healthBarGroup: THREE.Group;
    healthFillMesh: THREE.Mesh;
    nameTextSprite: THREE.Sprite;
    armorMaterials: THREE.MeshStandardMaterial[];
    setWeapon: (weaponId: string) => void;
    setHealth: (currentHp: number, maxHp: number) => void;
    triggerHitFlash: () => void;
    triggerShootFlash: () => void;
}

export function createPlayerModel(playerId: string): PlayerModelResult {
    const root = new THREE.Group();
    root.userData.isPlayer = true;
    root.userData.playerId = playerId;

    const armorMaterials: THREE.MeshStandardMaterial[] = [];

    // Materials Palette
    const skinMat = new THREE.MeshStandardMaterial({
        color: 0xd4a373,
        roughness: 0.7,
        metalness: 0.1
    });

    const camoMat = new THREE.MeshStandardMaterial({
        color: 0x2e3d30, // Tactical Ranger Olive
        roughness: 0.65,
        metalness: 0.2
    });
    armorMaterials.push(camoMat);

    const vestMat = new THREE.MeshStandardMaterial({
        color: 0x1c211f, // Tactical Carbon Black Plate Carrier
        roughness: 0.5,
        metalness: 0.35
    });
    armorMaterials.push(vestMat);

    const gearMat = new THREE.MeshStandardMaterial({
        color: 0x111312,
        roughness: 0.4,
        metalness: 0.6
    });

    const visorMat = new THREE.MeshStandardMaterial({
        color: 0x00e5ff, // Glowing Cyan HUD Visor
        emissive: 0x00b4d8,
        emissiveIntensity: 1.8,
        roughness: 0.1,
        metalness: 0.9,
        toneMapped: false
    });

    const bootMat = new THREE.MeshStandardMaterial({
        color: 0x141414,
        roughness: 0.8,
        metalness: 0.2
    });

    // Shadow Disk
    const shadowGeo = new THREE.CircleGeometry(0.55, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    root.add(shadow);

    // Main Pivots
    const bodyPivot = new THREE.Group();
    bodyPivot.position.y = 0.95; // Center of torso
    root.add(bodyPivot);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.45, 0);
    bodyPivot.add(headPivot);

    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.35, 0.32, 0);
    bodyPivot.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.35, 0.32, 0);
    bodyPivot.add(rightArmPivot);

    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.18, 0, 0);
    bodyPivot.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.18, 0, 0);
    bodyPivot.add(rightLegPivot);

    // ==========================================
    // 1. TORSO & TACTICAL PLATE CARRIER
    // ==========================================
    // Combat Undershirt
    const torsoGeo = new THREE.BoxGeometry(0.48, 0.55, 0.28);
    const torsoMesh = new THREE.Mesh(torsoGeo, camoMat);
    bodyPivot.add(torsoMesh);

    // Tactical Vest (Plate Carrier)
    const vestGeo = new THREE.BoxGeometry(0.52, 0.48, 0.32);
    const vestMesh = new THREE.Mesh(vestGeo, vestMat);
    bodyPivot.add(vestMesh);

    // Chest Mag Pouches
    for (let i = -1; i <= 1; i++) {
        const pouchGeo = new THREE.BoxGeometry(0.1, 0.16, 0.08);
        const pouchMesh = new THREE.Mesh(pouchGeo, gearMat);
        pouchMesh.position.set(i * 0.13, -0.08, 0.18);
        bodyPivot.add(pouchMesh);
    }

    // Shoulder Radio Transceiver on Left Collar
    const radioGeo = new THREE.BoxGeometry(0.08, 0.14, 0.06);
    const radioMesh = new THREE.Mesh(radioGeo, gearMat);
    radioMesh.position.set(-0.2, 0.26, 0.12);
    bodyPivot.add(radioMesh);

    const antennaGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6);
    const antennaMesh = new THREE.Mesh(antennaGeo, gearMat);
    antennaMesh.position.set(-0.2, 0.36, 0.12);
    bodyPivot.add(antennaMesh);

    // Utility Belt & Holster
    const beltGeo = new THREE.BoxGeometry(0.5, 0.09, 0.3);
    const beltMesh = new THREE.Mesh(beltGeo, gearMat);
    beltMesh.position.y = -0.26;
    bodyPivot.add(beltMesh);

    const holsterGeo = new THREE.BoxGeometry(0.1, 0.18, 0.1);
    const holsterMesh = new THREE.Mesh(holsterGeo, gearMat);
    holsterMesh.position.set(0.28, -0.32, 0);
    bodyPivot.add(holsterMesh);

    // Small Tactical Assault Pack on Back
    const packGeo = new THREE.BoxGeometry(0.36, 0.42, 0.16);
    const packMesh = new THREE.Mesh(packGeo, camoMat);
    packMesh.position.set(0, 0.04, -0.2);
    bodyPivot.add(packMesh);

    // ==========================================
    // 2. HEAD & COMBAT HELMET
    // ==========================================
    // Balaclava Head Base
    const headGeo = new THREE.BoxGeometry(0.26, 0.28, 0.26);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.y = 0.14;
    headPivot.add(headMesh);

    // Tactical Fast Helmet
    const helmetGeo = new THREE.BoxGeometry(0.31, 0.18, 0.31);
    const helmetMesh = new THREE.Mesh(helmetGeo, vestMat);
    helmetMesh.position.set(0, 0.22, -0.01);
    headPivot.add(helmetMesh);

    // NVG Mount Brow
    const nvgGeo = new THREE.BoxGeometry(0.1, 0.08, 0.04);
    const nvgMesh = new THREE.Mesh(nvgGeo, gearMat);
    nvgMesh.position.set(0, 0.22, 0.16);
    headPivot.add(nvgMesh);

    // Tactical Visor / Goggles
    const visorGeo = new THREE.BoxGeometry(0.24, 0.08, 0.06);
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 0.14, 0.14);
    headPivot.add(visorMesh);

    // Comms Headset & Mic
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.08), gearMat);
    earL.position.set(-0.15, 0.14, 0);
    const earR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.08), gearMat);
    earR.position.set(0.15, 0.14, 0);
    headPivot.add(earL);
    headPivot.add(earR);

    const mic = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.12), gearMat);
    mic.position.set(-0.13, 0.1, 0.08);
    headPivot.add(mic);

    // ==========================================
    // 3. ARMS & COMBAT GLOVES
    // ==========================================
    // Left Arm
    const lUpperGeo = new THREE.BoxGeometry(0.16, 0.32, 0.16);
    const lUpper = new THREE.Mesh(lUpperGeo, camoMat);
    lUpper.position.y = -0.16;
    leftArmPivot.add(lUpper);

    const lForeGeo = new THREE.BoxGeometry(0.14, 0.28, 0.14);
    const lFore = new THREE.Mesh(lForeGeo, gearMat); // Glove / forearm
    lFore.position.y = -0.42;
    leftArmPivot.add(lFore);

    // Right Arm
    const rUpperGeo = new THREE.BoxGeometry(0.16, 0.32, 0.16);
    const rUpper = new THREE.Mesh(rUpperGeo, camoMat);
    rUpper.position.y = -0.16;
    rightArmPivot.add(rUpper);

    const rForeGeo = new THREE.BoxGeometry(0.14, 0.28, 0.14);
    const rFore = new THREE.Mesh(rForeGeo, gearMat); // Glove / forearm
    rFore.position.y = -0.42;
    rightArmPivot.add(rFore);

    // Weapon Container attached to right arm
    const weaponGroup = new THREE.Group();
    weaponGroup.position.set(0, -0.48, 0.15);
    rightArmPivot.add(weaponGroup);

    // ==========================================
    // 4. LEGS & COMBAT BOOTS
    // ==========================================
    // Left Leg
    const lThighGeo = new THREE.BoxGeometry(0.19, 0.42, 0.2);
    const lThigh = new THREE.Mesh(lThighGeo, camoMat);
    lThigh.position.y = -0.21;
    leftLegPivot.add(lThigh);

    // Knee Pad
    const lKneeGeo = new THREE.BoxGeometry(0.18, 0.12, 0.06);
    const lKnee = new THREE.Mesh(lKneeGeo, gearMat);
    lKnee.position.set(0, -0.42, 0.11);
    leftLegPivot.add(lKnee);

    // Shin & Boot
    const lBootGeo = new THREE.BoxGeometry(0.18, 0.45, 0.24);
    const lBoot = new THREE.Mesh(lBootGeo, bootMat);
    lBoot.position.set(0, -0.65, 0.02);
    leftLegPivot.add(lBoot);

    // Right Leg
    const rThighGeo = new THREE.BoxGeometry(0.19, 0.42, 0.2);
    const rThigh = new THREE.Mesh(rThighGeo, camoMat);
    rThigh.position.y = -0.21;
    rightLegPivot.add(rThigh);

    const rKneeGeo = new THREE.BoxGeometry(0.18, 0.12, 0.06);
    const rKnee = new THREE.Mesh(rKneeGeo, gearMat);
    rKnee.position.set(0, -0.42, 0.11);
    rightLegPivot.add(rKnee);

    const rBootGeo = new THREE.BoxGeometry(0.18, 0.45, 0.24);
    const rBoot = new THREE.Mesh(rBootGeo, bootMat);
    rBoot.position.set(0, -0.65, 0.02);
    rightLegPivot.add(rBoot);

    // ==========================================
    // 5. 3D FIREARM GENERATOR
    // ==========================================
    function buildWeaponModel(weaponId: string): THREE.Group {
        const wGroup = new THREE.Group();
        const gunMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1c,
            roughness: 0.35,
            metalness: 0.8
        });
        const accentMat = new THREE.MeshStandardMaterial({
            color: 0x3d352e, // Tan/polymer furniture
            roughness: 0.6,
            metalness: 0.2
        });

        const wid = weaponId.toLowerCase();

        if (wid.includes('sniper') || wid.includes('kar98') || wid.includes('l115')) {
            // Long Sniper Rifle
            const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.45), gunMat);
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.65, 8), gunMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.03, 0.48);
            const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.3), accentMat);
            stock.position.set(0, -0.04, -0.3);
            const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 8), gunMat);
            scope.rotation.x = Math.PI / 2;
            scope.position.set(0, 0.11, 0.05);
            wGroup.add(receiver, barrel, stock, scope);
        } else if (wid.includes('shotgun') || wid.includes('aa12')) {
            // Tactical Shotgun
            const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.4), gunMat);
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 8), gunMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.04, 0.35);
            const pump = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.18), accentMat);
            pump.position.set(0, -0.02, 0.28);
            wGroup.add(receiver, barrel, pump);
        } else if (wid.includes('pistol') || wid.includes('revolver') || wid.includes('glock')) {
            // Sidearm Pistol
            const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.24), gunMat);
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.08), accentMat);
            grip.rotation.x = -0.2;
            grip.position.set(0, -0.09, -0.04);
            wGroup.add(slide, grip);
        } else {
            // Standard Assault Rifle / Carbine (M4 / AK)
            const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.38), gunMat);
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.4, 8), gunMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.02, 0.35);
            const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.1), gunMat);
            mag.rotation.x = 0.2;
            mag.position.set(0, -0.14, 0.06);
            const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.24), accentMat);
            handguard.position.set(0, 0.02, 0.24);
            const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.22), accentMat);
            stock.position.set(0, -0.02, -0.24);
            const optic = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.12), gunMat);
            optic.position.set(0, 0.09, 0.02);
            wGroup.add(receiver, barrel, mag, handguard, stock, optic);
        }

        wGroup.rotation.x = -Math.PI / 2;
        wGroup.position.set(0, 0.05, 0.15);
        return wGroup;
    }

    // Default weapon
    let currentWeaponMesh = buildWeaponModel('ak47');
    weaponGroup.add(currentWeaponMesh);

    // Muzzle Flash PointLight
    const muzzleFlash = new THREE.PointLight(0xffaa22, 0, 8);
    muzzleFlash.position.set(0, 0, 0.6);
    weaponGroup.add(muzzleFlash);

    // ==========================================
    // 6. OVERHEAD 3D STATUS HUD
    // ==========================================
    const hudGroup = new THREE.Group();
    hudGroup.position.set(0, 1.4, 0); // Floats directly above helmet
    root.add(hudGroup);

    // Health Bar Background Plane
    const hpBgGeo = new THREE.PlaneGeometry(0.8, 0.09);
    const hpBgMat = new THREE.MeshBasicMaterial({
        color: 0x111111,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
    });
    const hpBg = new THREE.Mesh(hpBgGeo, hpBgMat);
    hudGroup.add(hpBg);

    // Health Bar Fill Plane
    const hpFillGeo = new THREE.PlaneGeometry(0.76, 0.06);
    const hpFillMat = new THREE.MeshBasicMaterial({
        color: 0x00ff66,
        side: THREE.DoubleSide
    });
    const hpFill = new THREE.Mesh(hpFillGeo, hpFillMat);
    hpFill.position.z = 0.005;
    hudGroup.add(hpFill);

    // Player Callout Billboard Text Sprite
    function createTextSprite(text: string): THREE.Sprite {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, 256, 64);
            ctx.fillStyle = 'rgba(10, 15, 20, 0.75)';
            ctx.roundRect ? ctx.roundRect(8, 8, 240, 48, 8) : ctx.fillRect(8, 8, 240, 48);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#00e5ff';
            ctx.stroke();

            ctx.font = 'bold 24px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, 128, 32);
        }
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(0.9, 0.25, 1.0);
        sprite.position.y = 0.18;
        return sprite;
    }

    const shortId = playerId.length > 6 ? playerId.substring(0, 6).toUpperCase() : playerId.toUpperCase();
    const nameSprite = createTextSprite(`OPERATIVE #${shortId}`);
    hudGroup.add(nameSprite);

    // ==========================================
    // 7. PUBLIC CONTROLLER API
    // ==========================================
    const setWeapon = (weaponId: string) => {
        if (currentWeaponMesh) {
            weaponGroup.remove(currentWeaponMesh);
        }
        currentWeaponMesh = buildWeaponModel(weaponId);
        weaponGroup.add(currentWeaponMesh);
    };

    const setHealth = (currentHp: number, maxHp: number) => {
        const ratio = Math.max(0, Math.min(1.0, currentHp / (maxHp || 1000)));
        hpFill.scale.x = ratio;
        hpFill.position.x = -0.38 * (1.0 - ratio);

        // Dynamic Color: Green -> Yellow -> Red
        if (ratio > 0.5) {
            hpFillMat.color.setHex(0x00ff66);
        } else if (ratio > 0.25) {
            hpFillMat.color.setHex(0xffbb00);
        } else {
            hpFillMat.color.setHex(0xff2222);
        }
    };

    const triggerHitFlash = () => {
        armorMaterials.forEach(m => {
            m.emissive.setHex(0xff0000);
            m.emissiveIntensity = 1.5;
        });
        setTimeout(() => {
            armorMaterials.forEach(m => {
                m.emissive.setHex(0x000000);
                m.emissiveIntensity = 0;
            });
        }, 80);
    };

    const triggerShootFlash = () => {
        muzzleFlash.intensity = 4.0;
        setTimeout(() => {
            muzzleFlash.intensity = 0;
        }, 50);
    };

    return {
        root,
        pivots: {
            body: bodyPivot,
            head: headPivot,
            leftArm: leftArmPivot,
            rightArm: rightArmPivot,
            leftLeg: leftLegPivot,
            rightLeg: rightLegPivot
        },
        weaponMesh: weaponGroup,
        muzzleFlash,
        healthBarGroup: hudGroup,
        healthFillMesh: hpFill,
        nameTextSprite: nameSprite,
        armorMaterials,
        setWeapon,
        setHealth,
        triggerHitFlash,
        triggerShootFlash
    };
}
