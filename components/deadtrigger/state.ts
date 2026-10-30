import * as THREE from 'three';

export interface GameState {
    gameMode: 'tester' | 'survival' | 'tinkerer' | null;
    keys: Record<string, boolean>;
    mouse: boolean;
    mouseJustPressed: boolean;
    menuOpen: string | null;
    paused: boolean;
    settings: { gunVolume: number; gunBrightness: number; gunMetalness: number; envBrightness: number; timeMode: 'auto' | 'night' | 'day'; disableRealisticGuns: boolean; };
    player: {
        primary: string;
        secondary: string;
        activeSlot: number;
        weaponMode: number;
        burstsRemaining: number;
        burstNextShotTime: number;
        burstCooldownEnd: number;
        velocity: THREE.Vector3;
        direction: THREE.Vector3;
        ads: boolean;
        adsFactor: number;
        lastShot: number;
        sliding: boolean;
        slideTime: number;
        slideDir: THREE.Vector3;
        slideLock: boolean;
        envEchoDecay?: number;
        envEchoDelay?: number;
        extraZoomActive?: boolean;
        dlqExtraZoom?: boolean;
    };
    recoil: {
        camPitch: number;
        camYaw: number;
        targetCamPitch: number;
        targetCamYaw: number;
        wepZ: number;
        wepPitch: number;
        targetWepZ: number;
        targetWepPitch: number;
        camPitchVelocity: number;
        camYawVelocity: number;
        accumulatedClimbPitch: number;
        accumulatedClimbYaw: number;
    };
    gameplay: {
        spawns: boolean;
        prob: number;
        kills: number;
        lastZType: string | null;
    };
    survival: {
        health: number;
        maxHealth: number;
        money: number;
        wave: number;
        zombiesKilledThisWave: number;
        zombiesKilledThisPhase: number;
        currentPhase: number;
        activeZombies: number;
        waveState: string;
        countdownTimer: number;
        lastTime: number;
        inventory: {
            Pistol?: { id: string; mag: number; reserve: number } | null;
            SMG?: { id: string; mag: number; reserve: number } | null;
            AR?: { id: string; mag: number; reserve: number } | null;
            [key: string]: any;
        };
        activeType: string;
        reloading: boolean;
        reloadTimer: number;
        damageFlashTimer: number;
        playerDamageVignetteTimer: number;
        lastBPressTime: number;
    };
    entities: {
        zombies: any[];
        bullets: any[];
        particles: any[];
        trails: any[];
        floatingTexts: any[];
    };
}

export const state: GameState = {
    gameMode: null, 
    keys: {}, mouse: false, mouseJustPressed: false, menuOpen: null, paused: false,
    settings: { gunVolume: 0.1, gunBrightness: 2.0, gunMetalness: 0.97, envBrightness: 0.4, timeMode: 'auto', disableRealisticGuns: false }, 
    player: { 
        primary: 'pistol', secondary: 'pistol', activeSlot: 1, weaponMode: 0, 
        burstsRemaining: 0, burstNextShotTime: 0, burstCooldownEnd: 0,
        velocity: new THREE.Vector3(), direction: new THREE.Vector3(), ads: false, adsFactor: 0, lastShot: 0,
        sliding: false, slideTime: 0, slideDir: new THREE.Vector3(), slideLock: false,
        envEchoDecay: 0.3, envEchoDelay: 0.18, extraZoomActive: false, dlqExtraZoom: false
    },
    recoil: { camPitch: 0, camYaw: 0, targetCamPitch: 0, targetCamYaw: 0, wepZ: 0, wepPitch: 0, targetWepZ: 0, targetWepPitch: 0, camPitchVelocity: 0, camYawVelocity: 0, accumulatedClimbPitch: 0, accumulatedClimbYaw: 0 },
    gameplay: { spawns: false, prob: 0.1, kills: 0, lastZType: null },
    survival: {
        health: 1000, maxHealth: 1000, money: 0, wave: 1,
        zombiesKilledThisWave: 0, zombiesKilledThisPhase: 0, currentPhase: 0, activeZombies: 0,
        waveState: 'COUNTDOWN', countdownTimer: 5, lastTime: 0,
        inventory: { 'Pistol': { id: 'pistol', mag: 15, reserve: 45 }, 'SMG': null, 'AR': null },
        activeType: 'Pistol', reloading: false, reloadTimer: 0, damageFlashTimer: 0, playerDamageVignetteTimer: 0, lastBPressTime: 0
    },
    entities: { zombies: [], bullets:[], particles:[], trails:[], floatingTexts:[] }
};

export const SOUND_THROTTLE = { shoot: 0, hit: 0, die: 0 };
