// World Logic
function createParticles(scene, pos, color, count) {
    for(let i=0; i<count; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: color, transparent: true }));
        p.position.copy(pos); scene.add(p);
        const velocity = new THREE.Vector3((Math.random() - 0.5) * 10, Math.random() * 10, (Math.random() - 0.5) * 10);
        state.entities.particles.push({ mesh: p, velocity, life: 1.0 });
    }
}

function createHitscanTrail(scene, start, end, colorHex, thickness) {
    const dist = start.distanceTo(end);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, dist), new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.8 }));
    mesh.position.copy(start).lerp(end, 0.5); mesh.lookAt(end); scene.add(mesh);
    state.entities.trails.push({ mesh, life: 1.0 });
}

function spawnZombies(scene, yawObj, count, forceType = null) {
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

        if(type === 'purple' && Math.random() < 0.70) spawnZombies(scene, yawObj, 1, 'tall'); 
    }
}

function spawnSurvivalZombies(scene, yawObj, zombieData) {
    if (!zombieData) return;
    for (const[type, count] of Object.entries(zombieData)) {
        for (let i = 0; i < count; i++) {
            const zData = SURVIVAL_ZOMBIES[type];
            const angle = Math.random() * Math.PI * 2; const dist = 30 + Math.random() * 20;
            let px = yawObj.position.x + Math.cos(angle) * dist; let pz = yawObj.position.z + Math.sin(angle) * dist;

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

function updateWorldEntities(scene, delta, yawObj, camera) {
    for (let i = state.entities.particles.length - 1; i >= 0; i--) {
        const p = state.entities.particles[i];
        p.mesh.position.addScaledVector(p.velocity, delta);
        p.velocity.y -= 20 * delta;
        p.life -= delta * 2;
        p.mesh.material.opacity = p.life;
        if (p.life <= 0 || p.mesh.position.y < 0) { scene.remove(p.mesh); state.entities.particles.splice(i, 1); }
    }

    for (let i = state.entities.trails.length - 1; i >= 0; i--) {
        const t = state.entities.trails[i]; t.life -= delta * 10; t.mesh.material.opacity = t.life;
        if (t.life <= 0) { scene.remove(t.mesh); state.entities.trails.splice(i, 1); }
    }

    state.entities.zombies.forEach(z => {
        const targetDir = new THREE.Vector3().subVectors(yawObj.position, z.mesh.position); targetDir.y = 0; 
        const distToPlayer = targetDir.length(); targetDir.normalize();

        let canMove = true;
        if (state.gameMode === 'survival' && z.userData) {
            if (Date.now() < z.userData.stunnedUntil) canMove = false;
            
            if (distToPlayer < z.radius + 1.5 && canMove) {
                if (Date.now() - z.userData.lastHitTime > z.userData.cooldown * 1000) {
                    z.userData.lastHitTime = Date.now();
                    let dmg = z.userData.dmg; if (Math.random() * 100 <= z.userData.dmgChance) dmg += z.userData.bonusDmg;
                    state.survival.health -= dmg; playSound('damage'); state.survival.damageFlashTimer = 0.25; updateSurvivalHUD();
                    
                    if (state.survival.health <= 0) {
                        state.survival.health = 0; updateSurvivalHUD(); state.survival.waveState = 'GAMEOVER';
                        document.exitPointerLock(); document.getElementById('survivalGameOver').style.display = 'flex'; playSound('die');
                    }
                    
                    if (z.userData.blitz) z.userData.stunnedUntil = Date.now() + 1300;
                    else if (z.speed >= 20) z.userData.stunnedUntil = Date.now() + 1000;
                }
            }
        }

        if (distToPlayer > z.radius + 0.8 && canMove) {
            z.mesh.position.addScaledVector(targetDir, z.speed * delta);
            
            // Clamp zombies to boundary forcefully if in Survival Mode
            if (state.gameMode === 'survival') {
                z.mesh.position.x = Math.max(-98, Math.min(98, z.mesh.position.x));
                z.mesh.position.z = Math.max(-98, Math.min(98, z.mesh.position.z));
            }
        }
        z.mesh.lookAt(yawObj.position.x, z.mesh.position.y, yawObj.position.z);
    });

    for (let i = state.entities.floatingTexts.length - 1; i >= 0; i--) {
        const ft = state.entities.floatingTexts[i]; ft.life -= delta * 0.8; ft.pos.y += delta * 2;
        if (ft.life <= 0) { ft.element.remove(); state.entities.floatingTexts.splice(i, 1); } 
        else {
            const screenPos = ft.pos.clone(); screenPos.project(camera);
            if (screenPos.z > 1) ft.element.style.display = 'none';
            else {
                ft.element.style.display = 'block'; ft.element.style.left = `${(screenPos.x * 0.5 + 0.5) * window.innerWidth}px`;
                ft.element.style.top = `${(screenPos.y * -0.5 + 0.5) * window.innerHeight}px`; ft.element.style.opacity = ft.life;
            }
        }
    }
}
