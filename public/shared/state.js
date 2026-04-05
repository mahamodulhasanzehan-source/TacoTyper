const state = {
    gameMode: null, 
    keys: {}, mouse: false, mouseJustPressed: false, menuOpen: null, paused: false,
    settings: { gunVolume: 0.1 }, 
    player: { 
        primary: 'ar', secondary: 'pistol', activeSlot: 2, weaponMode: 0, 
        burstsRemaining: 0, burstNextShotTime: 0, burstCooldownEnd: 0,
        velocity: new THREE.Vector3(), direction: new THREE.Vector3(), ads: false, lastShot: 0,
        sliding: false, slideTime: 0, slideDir: new THREE.Vector3(), slideLock: false
    },
    recoil: { camPitch: 0, camYaw: 0, targetCamPitch: 0, targetCamYaw: 0, wepZ: 0, wepPitch: 0, targetWepZ: 0, targetWepPitch: 0 },
    gameplay: { spawns: false, prob: 0.1, kills: 0, lastZType: null },
    survival: {
        health: 50, maxHealth: 50, money: 0, wave: 1,
        zombiesKilledThisWave: 0, zombiesKilledThisPhase: 0, currentPhase: 0, activeZombies: 0,
        waveState: 'COUNTDOWN', countdownTimer: 5, lastTime: 0,
        inventory: { 'Pistol': { id: 'pistol', mag: 15, reserve: 45 }, 'SMG': null, 'AR': null },
        activeType: 'Pistol', reloading: false, reloadTimer: 0, damageFlashTimer: 0, lastBPressTime: 0
    },
    entities: { zombies: [], bullets:[], particles:[], trails:[], floatingTexts:[] }
};
