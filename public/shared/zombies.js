const ZOMBIES = {
    green:  { hp: 31.25, speed: 4, color: 0x00ff00, height: 2, scale: 1 },
    red:    { hp: 37.5, speed: 6, color: 0xff3333, height: 2, scale: 0.9 }, 
    purple: { hp: 125, speed: 3, color: 0xbf00ff, height: 2, scale: 1.2 }, 
    tall:   { hp: 187.5, speed: 3.5, color: 0x660066, height: 3.5, scale: 1.1 } 
};

const SURVIVAL_ZOMBIES = {
    "NormalZombie": { color: 0x32c832, height: 2, scale: 1, hp: 10, speed: 2, dmg: 1, dmgChance: 0, bonusDmg: 0, cooldown: 1, money: 10 },
    "ThreeBlockGreenZombie": { color: 0x32c832, height: 3, scale: 1, hp: 20, speed: 2, dmg: 1, dmgChance: 0, bonusDmg: 0, cooldown: 1, money: 20 },
    "TwoBlockRedZombie": { color: 0xdc1414, height: 2, scale: 1, hp: 30, speed: 10, dmg: 1, dmgChance: 50, bonusDmg: 1, cooldown: 1, money: 50 },
    "ThreeBlockRedZombie": { color: 0xdc1414, height: 3, scale: 1, hp: 50, speed: 10, dmg: 1, dmgChance: 50, bonusDmg: 1, cooldown: 1, money: 70 },
    "TwoBlockBlueZombie": { color: 0x0000b4, height: 2, scale: 1, hp: 40, speed: 15, dmg: 2, dmgChance: 30, bonusDmg: 1, cooldown: 0.7, money: 90 },
    "ThreeBlockBlueZombie": { color: 0x0000b4, height: 3, scale: 1, hp: 70, speed: 15, dmg: 2, dmgChance: 30, bonusDmg: 1, cooldown: 0.7, money: 100 },
    "TwoBlockPurpleZombie": { color: 0x800080, height: 2, scale: 1, hp: 60, speed: 20, dmg: 3, dmgChance: 20, bonusDmg: 3, cooldown: 0.5, money: 140 },
    "ThreeBlockPurpleZombie": { color: 0x800080, height: 3, scale: 1, hp: 100, speed: 20, dmg: 3, dmgChance: 20, bonusDmg: 3, cooldown: 0.5, money: 160 },
    "TwoBlockBlackZombie": { color: 0x111111, height: 2, scale: 1, hp: 200, speed: 14.28, dmg: 4, dmgChance: 30, bonusDmg: 3, cooldown: 0.1, money: 200, blitz: true },
    "ThreeBlockBlackZombie": { color: 0x111111, height: 3, scale: 1, hp: 250, speed: 14.28, dmg: 4, dmgChance: 30, bonusDmg: 3, cooldown: 0.1, money: 250, blitz: true }
};


