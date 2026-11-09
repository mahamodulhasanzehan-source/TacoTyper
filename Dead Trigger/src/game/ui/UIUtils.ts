import { state } from '../state';
import { globals } from '../globals';
import { getActiveWeaponId, getActiveWeaponStats } from '../Utils';
import { WEAPONS, SURVIVAL_WEAPONS } from '../config/weapons';

export function updateBrightness() {
    const slider = document.getElementById('brightSlider') as HTMLInputElement;
    if (!slider) return;
    const val = parseInt(slider.value);
    const overlay = document.getElementById('brightnessOverlay');
    if (!overlay) return;
    if (val <= 30) {
        overlay.style.backgroundColor = 'black';
        overlay.style.opacity = ((30 - val) / 30).toString(); 
    } else {
        overlay.style.backgroundColor = 'white';
        overlay.style.opacity = (((val - 30) / 70) * 0.4).toString(); 
    }
}

export function updateSurvivalShop() {
    const inv = state.survival.inventory;
    const moneyEl = document.getElementById('survMoneyText');
    if (moneyEl) moneyEl.innerText = `$${state.survival.money}`;
    
    const pistolUpgraded = inv['Pistol'] && inv['Pistol'].id === 'gs50';
    const smgUpgraded = inv['SMG'] && inv['SMG'].id === 'uzi';
    const arUpgraded = inv['AR'] && inv['AR'].id === 'odin';

    const btnBuyPistol = document.getElementById('btnBuyPistol');
    const btnBuySMG = document.getElementById('btnBuySMG');
    const btnBuyAR = document.getElementById('btnBuyAR');
    
    if (btnBuyPistol) btnBuyPistol.style.display = pistolUpgraded ? 'none' : 'block';
    if (btnBuySMG) btnBuySMG.style.display = smgUpgraded ? 'none' : 'block';
    if (btnBuyAR) btnBuyAR.style.display = arUpgraded ? 'none' : 'block';

    const colBasicGuns = document.getElementById('col-basic-guns');
    if (colBasicGuns) {
        if (pistolUpgraded && smgUpgraded && arUpgraded) {
            colBasicGuns.style.display = 'none';
        } else {
            colBasicGuns.style.display = 'flex';
        }
    }

    if (!pistolUpgraded) {
        const c = document.getElementById('costPistol');
        if (c) c.innerText = `Ammo $10`;
    }
    const cGs50 = document.getElementById('costGs50');
    if (cGs50) cGs50.innerText = pistolUpgraded ? `Ammo $10` : `Buy $100`;
    
    if (!smgUpgraded) {
        const c = document.getElementById('costSMG');
        if (c) {
            if (inv['SMG'] && inv['SMG'].id === 'smg') c.innerText = `Ammo $20`;
            else c.innerText = `Buy $100`;
        }
    }
    const cVec = document.getElementById('costVector');
    if (cVec) cVec.innerText = smgUpgraded ? `Ammo $30` : `Buy $600`;
    
    if (!arUpgraded) {
        const c = document.getElementById('costAR');
        if (c) {
            if (inv['AR'] && inv['AR'].id === 'ak47') c.innerText = `Ammo $30`;
            else c.innerText = `Buy $200`;
        }
    }
    const cOdin = document.getElementById('costOdin');
    if (cOdin) cOdin.innerText = arUpgraded ? `Ammo $70` : `Buy $800`;
}

export function updateSurvivalHUD() {
    const surv = state.survival;
    const ht = document.getElementById('survHealthText');
    const hb = document.getElementById('survHealthBar');
    const mt = document.getElementById('survMoneyText');
    
    if (ht) ht.innerText = `${Math.ceil(surv.health)} / ${surv.maxHealth} HP`;
    if (hb) hb.style.width = `${(surv.health / surv.maxHealth) * 100}%`;
    if (mt) mt.innerText = `$${surv.money}`;
    
    // Update main HUD vitality overlay
    const hht = document.getElementById('hudPlayerHealthText');
    const hhb = document.getElementById('hudPlayerHealthBar');
    if (hht) hht.innerText = `${Math.ceil(surv.health)} / ${surv.maxHealth} HP`;
    if (hhb) hhb.style.width = `${(surv.health / surv.maxHealth) * 100}%`;
    
    const at = document.getElementById('survAmmoText');
    const gt = document.getElementById('survGunNameText');
    
    if (surv.reloading) {
        if (at) at.innerText = `Reloading...`;
    } else {
        const inv = surv.inventory[surv.activeType];
        if (inv) {
            if (at) at.innerText = `${inv.mag} / ${inv.reserve}`;
            const gunDefArray = Object.values(SURVIVAL_WEAPONS);
            const gunDef = gunDefArray.find(k => k.id === inv.id);
            if (gt && gunDef) gt.innerText = gunDef.name;
        }
    }
}

export function updateArmoryHighlights() {
    if (state.gameMode === 'survival') return;
    document.querySelectorAll('.weapon-btn').forEach(b => {
        b.classList.remove('active', 'active-equipped');
        const htmlB = b as HTMLElement;
        if (htmlB.dataset.id === state.player.primary || htmlB.dataset.id === state.player.secondary) htmlB.classList.add('active'); 
        if (htmlB.dataset.id === getActiveWeaponId()) htmlB.classList.add('active-equipped'); 
    });
}

export function updateZombieHealthHUD(z: any) {
    if (!z || z.isDead || z.hp <= 0) {
        if (z && z.hpGroup) z.hpGroup.visible = false;
        return;
    }
    if (state.gameMode === 'survival' && z.hpGroup) {
        const healthRatio = Math.max(0, z.hp / z.maxHp);
        z.hpGroup.visible = healthRatio < 1 && healthRatio > 0;
        if (z.hpGroup.visible && z.fgMesh) {
            z.fgMesh.scale.x = healthRatio;
            z.fgMesh.position.x = - (1.0 - healthRatio) * z.barWidth / 2;
        }
    }
}

export function toggleMenu(menuType: string | null) {
    const shop = document.getElementById('shopModal');
    const prob = document.getElementById('probModal');
    const survShop = document.getElementById('survivalShopModal');
    const bright = document.getElementById('brightModal');
    const startScreen = document.getElementById('startScreen');

    if (shop) shop.style.display = 'none'; 
    if (prob) prob.style.display = 'none'; 
    if (survShop) survShop.style.display = 'none'; 
    if (bright) bright.style.display = 'none';
    
    state.menuOpen = menuType;

    if (menuType === 'shop' || menuType === 'prob' || menuType === 'survivalShop' || menuType === 'bright') {
        if (startScreen) startScreen.style.display = 'none';
        document.exitPointerLock();
        state.mouse = false; 
        state.player.ads = false; 
        state.paused = true;
        if (menuType === 'shop' && shop) { 
            shop.style.display = 'flex'; 
            shop.style.opacity = '1';
            shop.style.pointerEvents = 'auto';
            updateArmoryHighlights(); 
        }
        if (menuType === 'survivalShop' && survShop) { 
            survShop.style.display = 'flex'; 
            survShop.style.opacity = '1';
            survShop.style.pointerEvents = 'auto';
            updateSurvivalShop(); 
        }
        if (menuType === 'prob' && prob) {
            prob.style.display = 'flex';
            prob.style.opacity = '1';
            prob.style.pointerEvents = 'auto';
        }
        if (menuType === 'bright' && bright) {
            bright.style.display = 'flex';
            bright.style.opacity = '1';
            bright.style.pointerEvents = 'auto';
        }
    } else {
        state.paused = false;
        if (state.gameMode !== 'tinkerer') {
            document.body.requestPointerLock();
        }
    }
}
