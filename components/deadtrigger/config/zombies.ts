export interface ZombieStats {
    hp: number;
    speed: number;
    color: number;
    height: number;
    scale: number;
    dmg?: number;
    dmgChance?: number;
    bonusDmg?: number;
    cooldown?: number;
    money?: number;
    blitz?: boolean;
    archetype?: string;
    isRanged?: boolean;
    isScreamer?: boolean;
    isBloater?: boolean;
    isBrute?: boolean;
    isOrc?: boolean;
    isPhantom?: boolean;
    isFireDemon?: boolean;
    isSlime?: boolean;
    isMiniSlime?: boolean;
    altitude?: number;
}

export const ZOMBIES: Record<string, ZombieStats> = {
    green:        { hp: 65,  speed: 3.6, color: 0x4a7a40, height: 2,   scale: 1.0,  archetype: 'walker' },
    red:          { hp: 75,  speed: 6.8, color: 0xc42b2b, height: 2,   scale: 0.95, archetype: 'runner' }, 
    archer:       { hp: 90,  speed: 4.1, color: 0x5a8bb8, height: 2.1, scale: 1.0,  archetype: 'archer', isRanged: true },
    purple:       { hp: 200, speed: 3.6, color: 0x8a2be2, height: 2.2, scale: 1.15, archetype: 'screamer', isScreamer: true }, 
    tall:         { hp: 450, speed: 2.9, color: 0x222233, height: 3.5, scale: 1.4,  archetype: 'brute', isBrute: true },
    brute:        { hp: 500, speed: 2.9, color: 0x1f1f28, height: 3.5, scale: 1.45, archetype: 'brute', isBrute: true },
    bloater:      { hp: 120, speed: 5.0, color: 0x55aa22, height: 2.0, scale: 1.1,  archetype: 'bloater', isBloater: true },
    screamer:     { hp: 220, speed: 3.8, color: 0x7b1fa2, height: 2.2, scale: 1.15, archetype: 'screamer', isScreamer: true },
    slime:        { hp: 80,  speed: 3.2, color: 0x22ff66, height: 1.2, scale: 1.0,  archetype: 'slime', isSlime: true },
    minislime:    { hp: 35,  speed: 4.8, color: 0x44ff88, height: 0.7, scale: 0.55, archetype: 'minislime', isMiniSlime: true },
    orc:          { hp: 280, speed: 2.9, color: 0x2e6930, height: 2.5, scale: 1.25, archetype: 'orc', isOrc: true },
    phantom:      { hp: 110, speed: 3.4, color: 0x8844ff, height: 2.2, scale: 1.1,  archetype: 'phantom', isPhantom: true, altitude: 4.2 },
    firedemon:    { hp: 200, speed: 3.2, color: 0xff4500, height: 2.4, scale: 1.2,  archetype: 'firedemon', isFireDemon: true }
};

export const SURVIVAL_ZOMBIES: Record<string, ZombieStats> = {
    "NormalZombie": { color: 0x4a7a40, height: 2, scale: 1, hp: 15, speed: 3.18, dmg: 1, dmgChance: 0, bonusDmg: 0, cooldown: 1.2, money: 10, archetype: 'walker' },
    "ThreeBlockGreenZombie": { color: 0x3a6632, height: 2.6, scale: 1.1, hp: 35, speed: 3.45, dmg: 1, dmgChance: 20, bonusDmg: 1, cooldown: 1.2, money: 25, archetype: 'walker' },
    "TwoBlockRedZombie": { color: 0xc42b2b, height: 2, scale: 0.95, hp: 40, speed: 8.18, dmg: 1, dmgChance: 50, bonusDmg: 1, cooldown: 1.1, money: 50, archetype: 'runner' },
    "ThreeBlockRedZombie": { color: 0x9b1b1b, height: 2.5, scale: 1.05, hp: 65, speed: 9.09, dmg: 2, dmgChance: 50, bonusDmg: 1, cooldown: 1.1, money: 75, archetype: 'runner' },
    "TwoBlockBlueZombie": { color: 0x3d7ea6, height: 2.1, scale: 1, hp: 50, speed: 5.0, dmg: 2, dmgChance: 30, bonusDmg: 1, cooldown: 1.8, money: 90, archetype: 'archer', isRanged: true },
    "ThreeBlockBlueZombie": { color: 0x24587a, height: 2.5, scale: 1.1, hp: 90, speed: 5.45, dmg: 3, dmgChance: 30, bonusDmg: 1, cooldown: 1.6, money: 120, archetype: 'archer', isRanged: true },
    "TwoBlockPurpleZombie": { color: 0x7b1fa2, height: 2.2, scale: 1.15, hp: 120, speed: 4.54, dmg: 3, dmgChance: 30, bonusDmg: 2, cooldown: 1.2, money: 150, archetype: 'screamer', isScreamer: true },
    "ThreeBlockPurpleZombie": { color: 0x4a148c, height: 2.8, scale: 1.25, hp: 180, speed: 5.0, dmg: 4, dmgChance: 30, bonusDmg: 2, cooldown: 1.2, money: 180, archetype: 'screamer', isScreamer: true },
    "BloaterZombie": { color: 0x55aa22, height: 2.0, scale: 1.15, hp: 90, speed: 5.9, dmg: 4, dmgChance: 50, bonusDmg: 2, cooldown: 1.2, money: 130, archetype: 'bloater', isBloater: true },
    "BruteZombie": { color: 0x1f1f28, height: 3.5, scale: 1.45, hp: 350, speed: 3.6, dmg: 5, dmgChance: 40, bonusDmg: 3, cooldown: 1.5, money: 220, archetype: 'brute', isBrute: true },
    "TwoBlockBlackZombie": { color: 0x151518, height: 2.1, scale: 1.05, hp: 200, speed: 20.0, dmg: 4, dmgChance: 30, bonusDmg: 3, cooldown: 1.1, money: 240, blitz: true, archetype: 'leaper' },
    "ThreeBlockBlackZombie": { color: 0x0c0c0f, height: 3.5, scale: 1.5, hp: 450, speed: 16.36, dmg: 6, dmgChance: 40, bonusDmg: 4, cooldown: 1.4, money: 320, blitz: true, archetype: 'brute', isBrute: true },
    
    // NEW CREATURE TYPES & ALIASES
    "GreenSlime": { color: 0x22ff66, height: 1.2, scale: 1.0, hp: 60, speed: 3.2, dmg: 2, dmgChance: 20, bonusDmg: 1, cooldown: 1.2, money: 40, archetype: 'slime', isSlime: true },
    "MiniGreenSlime": { color: 0x44ff88, height: 0.7, scale: 0.55, hp: 25, speed: 4.8, dmg: 1, dmgChance: 10, bonusDmg: 1, cooldown: 1.0, money: 15, archetype: 'minislime', isMiniSlime: true },
    "OrcShaman": { color: 0x2e6930, height: 2.5, scale: 1.25, hp: 280, speed: 2.9, dmg: 4, dmgChance: 35, bonusDmg: 2, cooldown: 1.3, money: 200, archetype: 'orc', isOrc: true },
    "FlyingPhantom": { color: 0x8844ff, height: 2.2, scale: 1.1, hp: 110, speed: 3.4, dmg: 3, dmgChance: 25, bonusDmg: 2, cooldown: 1.4, money: 160, archetype: 'phantom', isPhantom: true, altitude: 4.2 },
    "FireDemon": { color: 0xff4500, height: 2.4, scale: 1.2, hp: 210, speed: 3.2, dmg: 4, dmgChance: 40, bonusDmg: 3, cooldown: 1.4, money: 190, archetype: 'firedemon', isFireDemon: true },
    "archer": { color: 0x3d7ea6, height: 2.1, scale: 1.0, hp: 60, speed: 4.5, dmg: 2, dmgChance: 30, bonusDmg: 1, cooldown: 1.8, money: 90, archetype: 'archer', isRanged: true },
    "orc": { color: 0x2e6930, height: 2.5, scale: 1.25, hp: 280, speed: 2.9, dmg: 4, dmgChance: 35, bonusDmg: 2, cooldown: 1.3, money: 200, archetype: 'orc', isOrc: true },
    "phantom": { color: 0x8844ff, height: 2.2, scale: 1.1, hp: 110, speed: 3.4, dmg: 3, dmgChance: 25, bonusDmg: 2, cooldown: 1.4, money: 160, archetype: 'phantom', isPhantom: true, altitude: 4.2 },
    "firedemon": { color: 0xff4500, height: 2.4, scale: 1.2, hp: 210, speed: 3.2, dmg: 4, dmgChance: 40, bonusDmg: 3, cooldown: 1.4, money: 190, archetype: 'firedemon', isFireDemon: true },
    "brute": { color: 0x1f1f28, height: 3.5, scale: 1.45, hp: 350, speed: 3.6, dmg: 5, dmgChance: 40, bonusDmg: 3, cooldown: 1.5, money: 220, archetype: 'brute', isBrute: true },
    "slime": { color: 0x22ff66, height: 1.2, scale: 1.0, hp: 60, speed: 3.2, dmg: 2, dmgChance: 20, bonusDmg: 1, cooldown: 1.2, money: 40, archetype: 'slime', isSlime: true }
};

export const WAVE_CONFIGS: Record<number, any> = {
    1: { initialSpawn: { "NormalZombie": 3, "TwoBlockBlueZombie": 2, "GreenSlime": 2, "OrcShaman": 1 }, totalZombies: 8, phases: [] },
    2: { initialSpawn: { "NormalZombie": 3, "TwoBlockRedZombie": 2, "FlyingPhantom": 1, "TwoBlockBlueZombie": 1 }, totalZombies: 10, phases: [{ triggerKills: 4, spawn: { "BruteZombie": 1, "GreenSlime": 2 } }] },
    3: { initialSpawn: { "TwoBlockBlueZombie": 2, "OrcShaman": 1, "FireDemon": 1, "FlyingPhantom": 1 }, totalZombies: 12, phases: [{ triggerKills: 3, spawn: { "BruteZombie": 1, "TwoBlockRedZombie": 3 } }] },
    4: { initialSpawn: { "NormalZombie": 4, "TwoBlockRedZombie": 2, "FlyingPhantom": 2, "FireDemon": 1 }, totalZombies: 15, phases: [{ triggerKills: 5, spawn: { "OrcShaman": 1, "BloaterZombie": 2, "BruteZombie": 1 } }] },
    5: { initialSpawn: { "BruteZombie": 2, "OrcShaman": 2, "TwoBlockBlueZombie": 3 }, totalZombies: 18, phases: [{ triggerKills: 5, spawn: { "FireDemon": 2, "FlyingPhantom": 2 } }, { triggerKills: 3, spawn: { "TwoBlockRedZombie": 3 } }] },
    6: { initialSpawn: { "FireDemon": 2, "BloaterZombie": 3, "GreenSlime": 4, "FlyingPhantom": 2 }, totalZombies: 22, phases: [{ triggerKills: 6, spawn: { "OrcShaman": 2, "BruteZombie": 1 } }, { triggerKills: 4, spawn: { "ThreeBlockBlueZombie": 2, "FlyingPhantom": 2 } }] },
    7: { initialSpawn: { "TwoBlockRedZombie": 5, "OrcShaman": 2, "TwoBlockPurpleZombie": 1, "FireDemon": 2 }, totalZombies: 25, phases: [{ triggerKills: 6, spawn: { "BruteZombie": 2, "ThreeBlockBlueZombie": 3 } }, { triggerKills: 4, spawn: { "BloaterZombie": 3, "FlyingPhantom": 3 } }] },
    8: { initialSpawn: { "NormalZombie": 6, "ThreeBlockRedZombie": 4, "FireDemon": 3, "BruteZombie": 2 }, totalZombies: 28, phases: [{ triggerKills: 6, spawn: { "OrcShaman": 2, "FlyingPhantom": 3 } }, { triggerKills: 4, spawn: { "ThreeBlockBlueZombie": 4 } }] },
    9: { initialSpawn: { "BruteZombie": 3, "TwoBlockBlueZombie": 5, "OrcShaman": 3, "FireDemon": 3 }, totalZombies: 40, phases: [{ triggerKills: 8, spawn: { "TwoBlockBlackZombie": 3, "BloaterZombie": 4 } }, { triggerKills: 6, spawn: { "ThreeBlockRedZombie": 6, "FlyingPhantom": 4 } }] },
    10: { initialSpawn: { "BruteZombie": 3, "ThreeBlockPurpleZombie": 2, "FireDemon": 3, "OrcShaman": 3, "FlyingPhantom": 3 }, totalZombies: 20, phases: [{ triggerKills: 6, spawn: { "TwoBlockBlackZombie": 4, "FlyingPhantom": 3 } }] },
    11: { initialSpawn: { "ThreeBlockBlackZombie": 2, "ThreeBlockPurpleZombie": 3, "ThreeBlockBlueZombie": 5, "FireDemon": 4, "OrcShaman": 3 }, totalZombies: 25, phases: [{ triggerKills: 5, spawn: { "TwoBlockBlackZombie": 4, "BruteZombie": 3 } }] }
};
