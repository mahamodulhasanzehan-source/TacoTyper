function spawnZombies(state, scene, yawObj, count, forceType = null) {
    if (state.gameMode === 'survival') return;
    for(let i=0; i<count; i++) {
        let type = forceType;
        if(!forceType) {
            let r = Math.random();
            if (state.gameplay.lastZType === 'purple') type = 'purple'; 
            else if (state.gameplay.lastZType === 'red' && r < 0.40) type = 'purple'; 
            else { if (Math.random() < 0.40) type = 'red'; else type = 'green'; }
        }

        const zData = ZOMBIES[type];
        const angle = Math.random() * Math.PI * 2; const dist = 30 + Math.random() * 20;
        const px = yawObj.position.x + Math.cos(angle) * dist; const pz = yawObj.position.z + Math.sin(angle) * dist;

        let mesh;
        if (type === 'purple' || type === 'tall') {
            mesh = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: zData.color });
            const legGeo = new THREE.BoxGeometry(1 * zData.scale, zData.height/3, 1 * zData.scale); const legs = new THREE.Mesh(legGeo, mat); legs.position.y = -zData.height/3; mesh.add(legs);
            const torsoGeo = new THREE.BoxGeometry(1 * zData.scale, zData.height/3, 1 * zData.scale); const torso = new THREE.Mesh(torsoGeo, mat); torso.position.y = 0; mesh.add(torso);
            const headGeo = new THREE.BoxGeometry(1 * zData.scale, zData.height/3, 1 * zData.scale); const head = new THREE.Mesh(headGeo, mat); head.position.y = zData.height/3; mesh.add(head);
            const eyeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1); const eyeMat = new THREE.MeshBasicMaterial({color: 0x000000});
            const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.3, 0, 0.51 * zData.scale); const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.3, 0, 0.51 * zData.scale);
            head.add(eyeL); head.add(eyeR);
        } else {
            mesh = new THREE.Mesh(new THREE.BoxGeometry(1 * zData.scale, zData.height, 1 * zData.scale), new THREE.MeshLambertMaterial({ color: zData.color }));
            const eyeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1); const eyeMat = new THREE.MeshBasicMaterial({color: 0x000000});
            const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.3, zData.height/2 - 0.4, 0.51 * zData.scale);
            const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.3, zData.height/2 - 0.4, 0.51 * zData.scale);
            mesh.add(eyeL); mesh.add(eyeR);
        }

        mesh.position.set(px, zData.height/2, pz); scene.add(mesh);
        const zObj = { mesh, type, hp: zData.hp, maxHp: zData.hp, speed: zData.speed, height: zData.height, radius: 0.5 * zData.scale, isDead: false };
        mesh.userData.zombieData = zObj; mesh.children.forEach(c => { c.userData.zombieData = zObj; if(c.children) c.children.forEach(cc => cc.userData.zombieData = zObj); });
        state.entities.zombies.push(zObj);

        if(type === 'purple' && Math.random() < 0.70) spawnZombies(state, scene, yawObj, 1, 'tall'); 
    }
}

function spawnSurvivalZombies(state, scene, yawObj, zombieData) {
    if (!zombieData) return;
    for (const[type, count] of Object.entries(zombieData)) {
        for (let i = 0; i < count; i++) {
            const zData = SURVIVAL_ZOMBIES[type];
            const angle = Math.random() * Math.PI * 2; const dist = 30 + Math.random() * 20;
            let px = yawObj.position.x + Math.cos(angle) * dist; let pz = yawObj.position.z + Math.sin(angle) * dist;

            // Strictly clamp zombie spawns to inside the floor grid boundaries
            px = Math.max(-98, Math.min(98, px));
            pz = Math.max(-98, Math.min(98, pz));

            let mesh;
            if (zData.height > 2) {
                mesh = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: zData.color });
                const legGeo = new THREE.BoxGeometry(1 * zData.scale, zData.height/3, 1 * zData.scale); const legs = new THREE.Mesh(legGeo, mat); legs.position.y = -zData.height/3; mesh.add(legs);
                const torsoGeo = new THREE.BoxGeometry(1 * zData.scale, zData.height/3, 1 * zData.scale); const torso = new THREE.Mesh(torsoGeo, mat); torso.position.y = 0; mesh.add(torso);
                const headGeo = new THREE.BoxGeometry(1 * zData.scale, zData.height/3, 1 * zData.scale); const head = new THREE.Mesh(headGeo, mat); head.position.y = zData.height/3; mesh.add(head);
                const eyeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1); const eyeMat = new THREE.MeshBasicMaterial({color: 0x000000});
                const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.3, 0, 0.51 * zData.scale); const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.3, 0, 0.51 * zData.scale);
                head.add(eyeL); head.add(eyeR);
            } else {
                mesh = new THREE.Mesh(new THREE.BoxGeometry(1 * zData.scale, zData.height, 1 * zData.scale), new THREE.MeshLambertMaterial({ color: zData.color }));
                const eyeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1); const eyeMat = new THREE.MeshBasicMaterial({color: 0x000000});
                const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.3, zData.height/2 - 0.4, 0.51 * zData.scale);
                const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.3, zData.height/2 - 0.4, 0.51 * zData.scale);
                mesh.add(eyeL); mesh.add(eyeR);
            }

            mesh.position.set(px, zData.height/2, pz); scene.add(mesh);
            const zObj = { 
                mesh, type, hp: zData.hp, maxHp: zData.hp, speed: zData.speed, height: zData.height, radius: 0.5 * zData.scale, isDead: false,
                userData: { lastHitTime: 0, dmg: zData.dmg, dmgChance: zData.dmgChance, bonusDmg: zData.bonusDmg, cooldown: zData.cooldown, money: zData.money, blitz: zData.blitz, stunnedUntil: 0 }
            };
            mesh.userData.zombieData = zObj; mesh.children.forEach(c => { c.userData.zombieData = zObj; if(c.children) c.children.forEach(cc => cc.userData.zombieData = zObj); });
            state.entities.zombies.push(zObj); state.survival.activeZombies++;
        }
    }
}
