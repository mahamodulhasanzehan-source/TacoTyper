import { setupEngine, startGameLoop } from './core/Engine';
import { setupInput } from './core/Input';
import { buildWeaponMesh, preloadAllWeapons } from './weapons/WeaponBuilder';
import { updateArmoryHighlights, updateBrightness, updateSurvivalHUD } from './ui/UIUtils';
export function initGame(canvas: HTMLCanvasElement) {
    setupEngine(canvas);
    setupInput();
    updateArmoryHighlights();
    updateBrightness();
    preloadAllWeapons(); // Start preloading in the background
    buildWeaponMesh('pistol');
    updateSurvivalHUD(); // Render initial 1000 HP
    startGameLoop();
}

export * from './state';
export * from './audio/AudioSys';
export * from './ui/UIUtils';
export * from './core/Input';
export * from './config/weapons';
export { stopGameLoop } from './core/Engine';
