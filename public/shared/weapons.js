const WEAPONS = {
    pistol: { id: 'pistol', cat: 'sidearms', name: "M1911 Pistol", type: 'semi', rpm: 240, damage: 12, pierce: 1, speed: 100, color: "#aaddff" },
    gs50: { id: 'gs50', cat: 'sidearms', name: ".50 GS (Deagle)", type: 'semi', rpm: 180, damage: 25, pierce: 3, hitscan: true, color: "#e0e0e0" },
    smg: { id: 'smg', cat: 'smg', name: "MP5 Submachine", type: 'auto', rpm: 780, damage: 8, pierce: 1, speed: 100, color: "#aaffaa" },
    cbr4: { id: 'cbr4', cat: 'smg', name: "CBR4 (P90)", type: 'auto', rpm: 900, damage: 7, pierce: 3, speed: 120, color: "#8899aa" },
    vector_smg: { id: 'vector_smg', cat: 'smg', name: "Vector .45", type: 'auto', rpm: 2400, damage: 11, pierce: 1, speed: 100, color: "#eeeeee" }, 
    mac10: { id: 'mac10', cat: 'smg', name: "MAC-10", type: 'auto', rpm: 1404, damage: 6, pierce: 1, speed: 100, color: "#cccccc" }, 
    ar: { id: 'ar', cat: 'ar', name: "M4A1 Carbine", type: 'auto', rpm: 780, damage: 14, pierce: 2, speed: 150, color: "#ffccaa" },
    ak47: { id: 'ak47', cat: 'ar', name: "AK-47", type: 'auto', rpm: 600, damage: 18, pierce: 3, speed: 160, color: "#d87f3d" },
    drh: { id: 'drh', cat: 'ar', name: "DR-H", type: 'auto', rpm: 600, damage: 22, pierce: 4, speed: 200, color: "#c2b280" },
    bp50: { id: 'bp50', cat: 'ar', name: "BP50 Bullpup", type: 'auto', rpm: 840, damage: 14, pierce: 2, speed: 150, color: "#bbbbaa" },
    
    sks: { id: 'sks', cat: 'marksman', name: "SKS Marksman", type: 'semi', rpm: 327, damage: 25, pierce: 3, hitscan: true, color: "#dcb484" },
    so14: { id: 'so14', cat: 'marksman', name: "SO-14", modes:[{type:'semi', rpm:415, damage:20}, {type:'auto', rpm:800, damage:20}], pierce: 3, hitscan: true, color: "#808080" },
    m8a1: { id: 'm8a1', cat: 'marksman', name: "M8A1", modes:[{type:'burst', rpm:600, damage:13, burst:4, delay:150}, {type:'auto', rpm:1000, damage:12}], pierce: 2, hitscan: true, color: "#a19d94" },
    odin: { id: 'odin', cat: 'ar', name: "Odin Heavy AR", type: 'auto', rpm: 200, damage: 80, pierce: 4, hitscan: true, color: "#998877" }, 
    
    dlq33: { id: 'dlq33', cat: 'sniper', name: "DL Q33 Sniper", type: 'semi', rpm: 48, damage: 79, pierce: 10, hitscan: true, color: "#5a6a50" },
    lw3_tundra: { id: 'lw3_tundra', cat: 'sniper', name: "LW3 Tundra Sniper", type: 'semi', rpm: 60, damage: 79, pierce: 7, hitscan: true, color: "#444444" },
    
    krm262: { id: 'krm262', cat: 'special', name: "KRM-262 Shotgun", type: 'semi', rpm: 90, damage: 30, pierce: 2, hitscan: false, speed: 50, color: "#bb3333", special: "shotgun_horizontal" },
    swarm_killer_smg: { id: 'swarm_killer_smg', cat: 'special', name: "Swarm Killer SMG", type: 'auto', rpm: 1980, damage: 4, pierce: 100, hitscan: true, color: "#ff00ff", special: "spread_horizontal" },
    swarm_killer_ar: { id: 'swarm_killer_ar', cat: 'special', name: "Swarm Killer AR", type: 'auto', rpm: 3000, damage: 30, pierce: 200, hitscan: true, color: "#00ffff" },
    mosquito: { id: 'mosquito', cat: 'special', name: "Mosquito", type: 'auto', rpm: 60000, damage: 999999, pierce: 999999, hitscan: true, color: "#eeff00" }
};

const SURVIVAL_WEAPONS = {
    pistol: { id: 'pistol', cat: 'sidearms', name: "Basic Pistol", type: 'semi', rpm: 240, damage: 2, pierce: 1, pierceChance: 0, mag: 15, reserve: 150, reload: 2, cost: 0, ammoCost: 5, color: "#aaddff", hitscan: false, speed: 100 },
    smg: { id: 'smg', cat: 'smg', name: "Basic SMG (MP5)", type: 'auto', rpm: 780, damage: 1.25, pierce: 1, pierceChance: 30, mag: 50, reserve: 500, reload: 2.5, cost: 100, ammoCost: 10, color: "#aaffaa", hitscan: false, speed: 100 },
    ak47: { id: 'ak47', cat: 'ar', name: "Basic AR (AK-47)", type: 'auto', rpm: 600, damage: 2.45, pierce: 2, pierceChance: 0, mag: 45, reserve: 450, reload: 3, cost: 300, ammoCost: 25, color: "#d87f3d", hitscan: false, speed: 160 },
    gs50: { id: 'gs50', cat: 'sidearms', name: ".50 Cal (Grekova)", type: 'semi', rpm: 180, damage: 5.35, pierce: 2, pierceChance: 0, mag: 20, reserve: 200, reload: 1, cost: 100, ammoCost: 5, color: "#e0e0e0", hitscan: true },
    vector_smg: { id: 'vector_smg', cat: 'smg', name: "Vector", type: 'auto', rpm: 960, damage: 2, pierce: 1, pierceChance: 70, mag: 50, reserve: 500, reload: 2, cost: 600, ammoCost: 15, color: "#eeeeee", hitscan: false, speed: 100 },
    odin: { id: 'odin', cat: 'ar', name: "Odin", type: 'auto', rpm: 200, damage: 11.97, pierce: 3, pierceChance: 100, mag: 50, reserve: 500, reload: 2, cost: 800, ammoCost: 35, color: "#998877", hitscan: true, speed: 200 }
};

function getActiveWeaponId() {
    if (state.gameMode === 'survival') {
        const inv = state.survival.inventory[state.survival.activeType];
        return inv ? inv.id : 'pistol';
    } else {
        return state.player.activeSlot === 1 ? state.player.primary : state.player.secondary;
    }
}

function getActiveWeaponStats() {
    if (state.gameMode === 'survival') {
        const inv = state.survival.inventory[state.survival.activeType];
        if (!inv) return SURVIVAL_WEAPONS['pistol'];
        return SURVIVAL_WEAPONS[Object.keys(SURVIVAL_WEAPONS).find(k => SURVIVAL_WEAPONS[k].id === inv.id)];
    } else {
        return WEAPONS[getActiveWeaponId()];
    }
}
