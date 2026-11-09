import { state } from './state';
import { WEAPONS, SURVIVAL_WEAPONS } from './config/weapons';

export function getActiveWeaponId() {
    if (state.gameMode === 'survival') {
        const inv = state.survival.inventory[state.survival.activeType];
        return inv ? inv.id : 'pistol';
    } else {
        return state.player.activeSlot === 1 ? state.player.primary : state.player.secondary;
    }
}

export function getActiveWeaponStats() {
    if (state.gameMode === 'survival') {
        const inv = state.survival.inventory[state.survival.activeType];
        if (!inv) return SURVIVAL_WEAPONS['pistol'];
        return SURVIVAL_WEAPONS[Object.keys(SURVIVAL_WEAPONS).find(k => SURVIVAL_WEAPONS[k as keyof typeof SURVIVAL_WEAPONS].id === inv.id)!];
    } else {
        return WEAPONS[getActiveWeaponId()];
    }
}
