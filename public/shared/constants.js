

        const WAVE_CONFIGS = {
            1: { initialSpawn: {"NormalZombie": 5}, totalZombies: 5, phases:[] },
            2: { initialSpawn: {"NormalZombie": 5, "ThreeBlockGreenZombie": 2}, totalZombies: 7, phases:[] },
            3: { initialSpawn: {"NormalZombie": 5, "ThreeBlockGreenZombie": 1}, totalZombies: 7, phases:[ {triggerKills: 5, spawn: {"TwoBlockRedZombie": 1}} ] },
            4: { initialSpawn: {"NormalZombie": 5, "ThreeBlockGreenZombie": 1}, totalZombies: 8, phases:[ {triggerKills: 5, spawn: {"TwoBlockRedZombie": 1, "ThreeBlockRedZombie": 1}} ] },
            5: { initialSpawn: {"NormalZombie": 5, "ThreeBlockGreenZombie": 1}, totalZombies: 9, phases:[ {triggerKills: 5, spawn: {"TwoBlockRedZombie": 1}}, {triggerKills: 1, spawn: {"TwoBlockBlueZombie": 1, "ThreeBlockRedZombie": 1}} ] },
            6: { initialSpawn: {"NormalZombie": 10}, totalZombies: 16, phases:[ {triggerKills: 5, spawn: {"ThreeBlockGreenZombie": 3}}, {triggerKills: 3, spawn: {"ThreeBlockBlueZombie": 1, "ThreeBlockRedZombie": 2}} ] },
            7: { initialSpawn: {"NormalZombie": 10}, totalZombies: 17, phases:[ {triggerKills: 5, spawn: {"ThreeBlockGreenZombie": 3}}, {triggerKills: 3, spawn: {"ThreeBlockRedZombie": 2, "ThreeBlockBlueZombie": 1}}, {triggerKills: 2, spawn: {"TwoBlockPurpleZombie": 1}} ] },
            8: { initialSpawn: {"NormalZombie": 10}, totalZombies: 16, phases:[ {triggerKills: 5, spawn: {"ThreeBlockGreenZombie": 3}}, {triggerKills: 3, spawn: {"ThreeBlockBlueZombie": 2, "ThreeBlockPurpleZombie": 1}} ] },
            9: { initialSpawn: {"NormalZombie": 10}, totalZombies: 46, phases:[ {triggerKills: 5, spawn: {"ThreeBlockGreenZombie": 3}}, {triggerKills: 3, spawn: {"ThreeBlockBlueZombie": 1, "ThreeBlockRedZombie": 2}}, {triggerKills: 3, spawn: {"NormalZombie": 20, "ThreeBlockGreenZombie": 10}} ] },
            10: { initialSpawn: {"TwoBlockRedZombie": 5, "ThreeBlockBlueZombie": 1}, totalZombies: 7, phases:[ {triggerKills: 6, spawn: {"TwoBlockBlackZombie": 1}} ] },
            11: { initialSpawn: {"TwoBlockPurpleZombie": 2, "ThreeBlockPurpleZombie": 1}, totalZombies: 4, phases:[ {triggerKills: 3, spawn: {"ThreeBlockBlackZombie": 1}} ] }
        };

        const state = {
            joystick: { x: 0, y: 0 },
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

        