const state = {
    gameMode: null, // 'tester' or 'survival'
    menuOpen: null, // 'shop', 'prob', 'vol', 'survivalShop', 'bright'
    paused: true,
    mouse: false,
    mouseJustPressed: false,
    keys: {},
    joystick: { x: 0, y: 0 },
    player: {
        velocity: new THREE.Vector3(),
        direction: new THREE.Vector3(),
        lastShot: 0,
        primary: 'ar',
        secondary: 'pistol',
        activeSlot: 1,
        ads: false,
        sliding: false,
        slideTime: 0,
        slideDir: new THREE.Vector3(),
        slideLock: false,
        weaponMode: 0,
        burstsRemaining: 0,
        burstNextShotTime: 0,
        burstCooldownEnd: 0
    },
    recoil: {
        camPitch: 0, camYaw: 0, targetCamPitch: 0, targetCamYaw: 0,
        wepPitch: 0, wepZ: 0, targetWepPitch: 0, targetWepZ: 0
    },
    gameplay: {
        kills: 0,
        prob: 0.1,
        spawns: true,
        lastZType: null
    },
    survival: {
        health: 50,
        maxHealth: 50,
        money: 0,
        wave: 1,
        zombiesKilledThisWave: 0,
        zombiesKilledThisPhase: 0,
        currentPhase: 0,
        activeZombies: 0,
        waveState: 'COUNTDOWN', // 'COUNTDOWN', 'PLAYING', 'GAMEOVER', 'VICTORY'
        countdownTimer: 5,
        lastTime: 0,
        inventory: {
            'Pistol': { id: 'pistol', mag: 15, reserve: 45 },
            'SMG': null,
            'AR': null
        },
        activeType: 'Pistol',
        reloading: false,
        reloadTimer: 0,
        damageFlashTimer: 0,
        lastBPressTime: 0
    },
    settings: {
        gunVolume: 0.1,
        brightness: 0.4 // Default 40%
    },
    entities: {
        zombies: [],
        bullets: [],
        particles: [],
        trails: [],
        floatingTexts: []
    }
};

function getActiveWeaponId() {
    if (state.gameMode === 'survival') {
        const inv = state.survival.inventory[state.survival.activeType];
        return inv ? inv.id : 'pistol';
    }
    return state.player.activeSlot === 1 ? state.player.primary : state.player.secondary;
}

function getActiveWeaponStats() {
    const id = getActiveWeaponId();
    return WEAPONS[id] || SURVIVAL_WEAPONS[Object.keys(SURVIVAL_WEAPONS).find(k => SURVIVAL_WEAPONS[k].id === id)];
}
