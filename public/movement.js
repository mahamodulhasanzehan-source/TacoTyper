// Player Movement Logic
function updateMovement(delta, yawObj, camera, isMobile, isHudCustomizing) {
    if (!state.gameMode || state.menuOpen || state.paused) return;

    let inputDir = new THREE.Vector3();
    if (state.joystick.x !== 0 || state.joystick.y !== 0) {
        inputDir.x = state.joystick.x;
        inputDir.z = state.joystick.y;
        if (inputDir.lengthSq() > 1) inputDir.normalize();
    } else {
        inputDir.z = Number(state.keys['s'] || 0) - Number(state.keys['w'] || 0);
        inputDir.x = Number(state.keys['d'] || 0) - Number(state.keys['a'] || 0);
        inputDir.normalize();
    }

    let isRunning = state.keys['shift'] && inputDir.lengthSq() > 0;
    
    if (!state.keys['c']) {
        state.player.slideLock = false; 
    }

    if (state.keys['c'] && isRunning && !state.player.sliding && state.player.velocity.y === 0 && !state.player.slideLock) {
        state.player.sliding = true;
        state.player.slideTime = state.gameMode === 'survival' ? 0.75 : 3.0;
        state.player.slideDir = inputDir.clone();
    }

    let speedMultiplier = state.player.ads ? 5 : (state.keys['shift'] ? 20 : 10);
    
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

    if (state.player.direction.z !== 0 || state.player.direction.x !== 0) {
        const dir = state.player.direction.clone(); dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yawObj.rotation.y);
        state.player.velocity.x = THREE.MathUtils.lerp(state.player.velocity.x, dir.x * speedMultiplier, delta * 15);
        state.player.velocity.z = THREE.MathUtils.lerp(state.player.velocity.z, dir.z * speedMultiplier, delta * 15);
    } else { 
        state.player.velocity.x *= 0.8; 
        state.player.velocity.z *= 0.8; 
    }

    const targetGroundHeight = state.player.sliding ? 1.0 : 2.0;

    if (state.keys[' '] && yawObj.position.y <= targetGroundHeight + 0.05 && !state.player.sliding) {
        state.player.velocity.y = 15; 
        if (typeof playSound === 'function') playSound('jump');
    }

    state.player.velocity.y -= 40 * delta; 
    yawObj.position.x += state.player.velocity.x * delta; 
    yawObj.position.z += state.player.velocity.z * delta; 
    yawObj.position.y += state.player.velocity.y * delta;

    if (yawObj.position.y < targetGroundHeight) {
        yawObj.position.y = THREE.MathUtils.lerp(yawObj.position.y, targetGroundHeight, delta * 15);
        if (targetGroundHeight - yawObj.position.y < 0.05) yawObj.position.y = targetGroundHeight;
        if (state.player.velocity.y < 0) state.player.velocity.y = 0;
    }

    // Invisible Map Barrier Logic - Floor grid is exactly -100 to 100 
    if (state.gameMode === 'survival') {
        yawObj.position.x = Math.max(-99.5, Math.min(99.5, yawObj.position.x));
        yawObj.position.z = Math.max(-99.5, Math.min(99.5, yawObj.position.z));
    }
}

function updateRecoilAndCamera(delta, yawObj, pitchObj, camera, cameraRecoilObj, viewmodel, currentWeaponMesh) {
    if (!state.gameMode || state.menuOpen || state.paused) return;

    const activeId = getActiveWeaponId();
    const isSniper = state.gameMode === 'tester' && (activeId === 'dlq33' || activeId === 'lw3_tundra');
    
    let targetFov = 75;
    if (state.player.ads) {
        if (isSniper) targetFov = 20; else if (activeId === 'sks') targetFov = 40; else targetFov = 60;
    }
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, delta * 15); 
    camera.updateProjectionMatrix();

    const targetViewX = state.player.ads && !isSniper ? 0 : 0.3;
    let targetViewY = state.player.ads && !isSniper ? -0.2 : -0.25;
    if (state.player.ads && activeId === 'm8a1') targetViewY = -0.31; 
    const targetViewZ = state.player.ads && !isSniper ? -0.4 : -0.5;

    const r = state.recoil;
    r.targetCamPitch = THREE.MathUtils.lerp(r.targetCamPitch, 0, delta * 10); 
    r.targetCamYaw = THREE.MathUtils.lerp(r.targetCamYaw, 0, delta * 10);
    r.targetWepZ = THREE.MathUtils.lerp(r.targetWepZ, 0, delta * 12); 
    r.targetWepPitch = THREE.MathUtils.lerp(r.targetWepPitch, 0, delta * 12);

    r.camPitch = THREE.MathUtils.lerp(r.camPitch, r.targetCamPitch, delta * 25); 
    r.camYaw = THREE.MathUtils.lerp(r.camYaw, r.targetCamYaw, delta * 25);
    r.wepZ = THREE.MathUtils.lerp(r.wepZ, r.targetWepZ, delta * 25); 
    r.wepPitch = THREE.MathUtils.lerp(r.wepPitch, r.targetWepPitch, delta * 25);

    cameraRecoilObj.rotation.x = r.camPitch; 
    cameraRecoilObj.rotation.y = r.camYaw;
    
    if (currentWeaponMesh) {
        viewmodel.position.x = THREE.MathUtils.lerp(viewmodel.position.x, targetViewX, delta * 15);
        viewmodel.position.y = THREE.MathUtils.lerp(viewmodel.position.y, targetViewY + (r.wepZ * 0.1), delta * 15);
        viewmodel.position.z = THREE.MathUtils.lerp(viewmodel.position.z, targetViewZ + r.wepZ, delta * 15);
        viewmodel.rotation.x = r.wepPitch;
    }
}
