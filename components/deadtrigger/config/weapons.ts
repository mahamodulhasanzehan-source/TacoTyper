export interface WeaponStats {
    id: string;
    cat: string;
    name: string;
    type?: string;
    rpm?: number;
    damage?: number;
    pierce: number;
    speed?: number;
    color: string;
    hitscan?: boolean;
    special?: string;
    mag?: number;
    reload?: number;
    burst?: number;
    delay?: number;
    pierceChance?: number;
    modes?: { type: string; rpm: number; damage: number; burst?: number; delay?: number }[];
    // Users can define a custom 3D model URL here (GLTF/GLB). Without it, the procedural fallback logic is used.
    modelUrl?: string;
}

export interface SurvivalWeaponStats extends WeaponStats {
    pierceChance: number;
    mag: number;
    reserve: number;
    reload: number;
    cost: number;
    ammoCost: number;
}

export const WEAPONS: Record<string, WeaponStats> = {
    pistol: { id: 'pistol', cat: 'sidearms', name: "M1911 Pistol", type: 'semi', rpm: 240, damage: 12, pierce: 1, speed: 100, color: "#aaddff", modelUrl: '/models/M1911/M1911.glb' },
    gs50: { id: 'gs50', cat: 'sidearms', name: ".50 GS (Deagle)", type: 'semi', rpm: 180, damage: 25, pierce: 3, hitscan: true, color: "#e0e0e0", modelUrl: '/models/50. GS/50. GS.glb' },
    smg: { id: 'smg', cat: 'smg', name: "MP5 Submachine", type: 'auto', rpm: 780, damage: 8, pierce: 1, speed: 100, color: "#aaffaa", modelUrl: '/models/MP5/MP5.glb' },
    uzi: { id: 'uzi', cat: 'smg', name: "UZI", type: 'auto', rpm: 520, damage: 19.44, pierce: 1, speed: 120, color: "#8899aa", modelUrl: '/models/Uzi/Uzi.glb' },
    vector_smg: { id: 'vector_smg', cat: 'smg', name: "FENNEC", type: 'auto', rpm: 2400, damage: 11, pierce: 1, speed: 100, color: "#eeeeee", modelUrl: '/models/Fennec/Fennec.glb' }, 
    mac10: { id: 'mac10', cat: 'smg', name: "MAC-10", type: 'auto', rpm: 1404, damage: 6, pierce: 1, speed: 100, color: "#cccccc", modelUrl: '/models/Mac-10/Mac-10.glb' }, 
    as_val: { id: 'as_val', cat: 'ar', name: "AS VAL", type: 'auto', rpm: 858, damage: 11.33, pierce: 2, speed: 150, color: "#ffccaa", modelUrl: '/models/AS VAL/AS VAL.glb' },
    ak47: { id: 'ak47', cat: 'ar', name: "AK-47", type: 'auto', rpm: 600, damage: 18, pierce: 3, speed: 160, color: "#d87f3d", modelUrl: '/models/ak47/AK47.glb' },
    m13: { id: 'm13', cat: 'ar', name: "M13", type: 'auto', rpm: 1500, damage: 8.8, pierce: 4, speed: 200, color: "#c2b280", modelUrl: '/models/M13/M13.glb' },
    fal: { id: 'fal', cat: 'ar', name: "FAL", type: 'auto', rpm: 260, damage: 45.23, pierce: 2, speed: 150, color: "#bbbbaa", modelUrl: '/models/FAL/FAL.glb' },
    
    sks: { id: 'sks', cat: 'marksman', name: "SKS Marksman", type: 'semi', rpm: 327, damage: 96, pierce: 3, hitscan: true, color: "#dcb484", modelUrl: '/models/SKS/SKS.glb' },
    grau556: { id: 'grau556', cat: 'marksman', name: "Grau 556", modes:[{type:'semi', rpm:415, damage:26}, {type:'auto', rpm:800, damage:26}], pierce: 3, hitscan: true, color: "#808080", modelUrl: '/models/Grau 556/Grau 556.glb' },
    kar98k: { id: 'kar98k', cat: 'marksman', name: "Kar98k", type: 'semi', rpm: 60, damage: 322.5, pierce: 3, hitscan: true, color: "#8b5a2b", modelUrl: '/models/Kar98k/Kar98k.glb' },
    odin: { id: 'odin', cat: 'ar', name: "Odin Heavy AR", type: 'auto', rpm: 200, damage: 80, pierce: 4, hitscan: true, color: "#998877", modelUrl: '/models/ODIN/Odin.glb' }, 
    
    dlq33: { id: 'dlq33', cat: 'sniper', name: "DL Q33 Sniper", type: 'semi', rpm: 48, damage: 250, pierce: 10, hitscan: true, color: "#5a6a50", modelUrl: '/models/dlq33/DLQ.glb' },
    lw3_tundra: { id: 'lw3_tundra', cat: 'sniper', name: "LW3 Tundra Sniper", type: 'semi', rpm: 60, damage: 215, pierce: 7, hitscan: true, color: "#444444", modelUrl: '/models/LW3 Tundra/Tundra.glb' },
    
    krm262: { id: 'krm262', cat: 'special', name: "KRM-262 Shotgun", type: 'semi', rpm: 90, damage: 3.7037, pierce: 2, hitscan: false, speed: 120, color: "#ffee44", special: "shotgun_horizontal", modelUrl: '/models/KRM/KRM.glb' },
    swarm_killer_smg: { id: 'swarm_killer_smg', cat: 'special', name: "Swarm Killer SMG", type: 'auto', rpm: 1980, damage: 4, pierce: 100, hitscan: true, color: "#ff00ff", special: "spread_horizontal", modelUrl: '/models/Swarm Killer SMG/Swarm killer SMG.glb' },
    swarm_killer_ar: { id: 'swarm_killer_ar', cat: 'special', name: "MG42", type: 'auto', rpm: 3000, damage: 30, pierce: 200, hitscan: false, speed: 200, color: "#00ffff", modelUrl: '/models/MG42/MG42.glb' },
    mosquito: { id: 'mosquito', cat: 'special', name: "Mosquito", type: 'auto', rpm: 60000, damage: 999999, pierce: 999999, hitscan: true, color: "#eeff00", modelUrl: '/models/Mosquito/Mosquito.glb' }

};

export const SURVIVAL_WEAPONS: Record<string, SurvivalWeaponStats> = {
    pistol: { id: 'pistol', cat: 'sidearms', name: "M1911", type: 'semi', rpm: 240, damage: 2, pierce: 1, pierceChance: 0, mag: 15, reserve: 150, reload: 2, cost: 0, ammoCost: 5, color: "#aaddff", hitscan: false, speed: 100, modelUrl: '/models/M1911/M1911.glb' },
    smg: { id: 'smg', cat: 'smg', name: "MP5", type: 'auto', rpm: 780, damage: 1.25, pierce: 1, pierceChance: 30, mag: 50, reserve: 500, reload: 2.5, cost: 100, ammoCost: 10, color: "#aaddff", hitscan: false, speed: 100, modelUrl: '/models/MP5/MP5.glb' },
    ak47: { id: 'ak47', cat: 'ar', name: "AK-47", type: 'auto', rpm: 600, damage: 2.2022, pierce: 1, pierceChance: 50, mag: 30, reserve: 300, reload: 2.2, cost: 200, ammoCost: 15, color: "#d87f3d", hitscan: false, speed: 160, modelUrl: '/models/ak47/AK47.glb' },
    gs50: { id: 'gs50', cat: 'sidearms', name: ".50 Cal", type: 'semi', rpm: 180, damage: 5.35, pierce: 2, pierceChance: 0, mag: 20, reserve: 200, reload: 1, cost: 100, ammoCost: 5, color: "#e0e0e0", hitscan: true, modelUrl: '/models/50. GS/50. GS.glb' },
    uzi: { id: 'uzi', cat: 'smg', name: "UZI", type: 'auto', rpm: 520, damage: 4.15, pierce: 1, pierceChance: 70, mag: 50, reserve: 500, reload: 2, cost: 600, ammoCost: 15, color: "#eeeeee", hitscan: false, speed: 120, modelUrl: '/models/Uzi/Uzi.glb' },
    odin: { id: 'odin', cat: 'ar', name: "Odin", type: 'auto', rpm: 200, damage: 11.97, pierce: 3, pierceChance: 100, mag: 50, reserve: 500, reload: 2, cost: 800, ammoCost: 35, color: "#998877", hitscan: true, speed: 200, modelUrl: '/models/ODIN/Odin.glb' }
};

export function getWeaponTracerColor(weaponId: string, category?: string): number {
    if (weaponId === 'krm262') return 0xffa000; // Shotgun: Deep warm amber honey yellow
    if (weaponId === 'mosquito') return 0xffff00; // Pure electric laser yellow
    if (weaponId === 'swarm_killer_smg') return 0xf4ff40; // High-volt chartreuse lemon yellow
    if (weaponId === 'swarm_killer_ar') return 0xffcc00; // Blazing fiery MG42 yellow
    if (category === 'smg') return 0xffea00; // SMGs: Vibrant bright lemon yellow
    if (category === 'ar') return 0xffc107; // Assault Rifles: Warm rich golden amber yellow
    if (category === 'sniper') return 0xfff9a6; // Snipers: High-caliber radiant pale gold yellow
    if (category === 'marksman') return 0xffd54f; // Marksman: Sunfire gold yellow
    if (category === 'sidearms' || category === 'pistol') return 0xffee58; // Pistols/Sidearms: Light canary yellow
    return 0xffea33; // Default radiant yellow
}

