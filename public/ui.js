// UI Logic
function updateBrightness() {
    const brightSlider = document.getElementById('brightSlider');
    const overlay = document.getElementById('brightnessOverlay');
    const val = parseInt(brightSlider.value);
    
    if (val < 50) {
        overlay.style.background = 'black';
        overlay.style.opacity = 1 - (val / 50);
    } else {
        overlay.style.background = 'white';
        overlay.style.opacity = (val - 50) / 50 * 0.5; 
    }
}

function updateArmoryHighlights() {
    if (state.gameMode === 'survival') return;
    document.querySelectorAll('.weapon-btn').forEach(b => {
        b.classList.remove('active', 'active-equipped');
        if (b.dataset.id === state.player.primary || b.dataset.id === state.player.secondary) b.classList.add('active'); 
        if (b.dataset.id === getActiveWeaponId()) b.classList.add('active-equipped'); 
    });
}

function updateSurvivalShop() {
    const inv = state.survival.inventory;
    document.getElementById('survMoneyText').innerText = `$${state.survival.money}`;
    
    const pistolUpgraded = inv['Pistol'] && inv['Pistol'].id === 'gs50';
    const smgUpgraded = inv['SMG'] && inv['SMG'].id === 'vector_smg';
    const arUpgraded = inv['AR'] && inv['AR'].id === 'odin';

    document.getElementById('btnBuyPistol').style.display = pistolUpgraded ? 'none' : 'block';
    document.getElementById('btnBuySMG').style.display = smgUpgraded ? 'none' : 'block';
    document.getElementById('btnBuyAR').style.display = arUpgraded ? 'none' : 'block';

    if (pistolUpgraded && smgUpgraded && arUpgraded) {
        document.getElementById('col-basic-guns').style.display = 'none';
    } else {
        document.getElementById('col-basic-guns').style.display = 'flex';
    }

    if (!pistolUpgraded) document.getElementById('costPistol').innerText = `Ammo $10`;
    document.getElementById('costGs50').innerText = pistolUpgraded ? `Ammo $10` : `Buy $100`;
    
    if (!smgUpgraded) {
        if (inv['SMG'] && inv['SMG'].id === 'smg') document.getElementById('costSMG').innerText = `Ammo $20`;
        else document.getElementById('costSMG').innerText = `Buy $100`;
    }
    document.getElementById('costVector').innerText = smgUpgraded ? `Ammo $30` : `Buy $600`;
    
    if (!arUpgraded) {
        if (inv['AR'] && inv['AR'].id === 'ak47') document.getElementById('costAR').innerText = `Ammo $50`;
        else document.getElementById('costAR').innerText = `Buy $300`;
    }
    document.getElementById('costOdin').innerText = arUpgraded ? `Ammo $70` : `Buy $800`;
}

function updateSurvivalHUD() {
    const surv = state.survival;
    document.getElementById('survHealthText').innerText = `${surv.health} / ${surv.maxHealth} HP`;
    document.getElementById('survHealthBar').style.width = `${(surv.health / surv.maxHealth) * 100}%`;
    document.getElementById('survMoneyText').innerText = `$${surv.money}`;
    
    if (surv.reloading) {
        document.getElementById('survAmmoText').innerText = `Reloading...`;
    } else {
        const inv = surv.inventory[surv.activeType];
        if (inv) {
            document.getElementById('survAmmoText').innerText = `${inv.mag} / ${inv.reserve}`;
            const gunDef = SURVIVAL_WEAPONS[Object.keys(SURVIVAL_WEAPONS).find(k => SURVIVAL_WEAPONS[k].id === inv.id)];
            document.getElementById('survGunNameText').innerText = gunDef.name;
        }
    }
}

function createFloatingText(pos, textStr, colorHex) {
    const div = document.createElement('div');
    div.innerText = textStr;
    div.style.position = 'absolute'; div.style.color = '#' + colorHex.toString(16).padStart(6, '0');
    div.style.fontWeight = 'bold'; div.style.fontSize = '24px'; div.style.pointerEvents = 'none';
    div.style.textShadow = '2px 2px 4px black'; div.style.zIndex = '100';
    document.body.appendChild(div);
    const worldPos = pos.clone(); worldPos.y += 2.5; 
    state.entities.floatingTexts.push({ element: div, pos: worldPos, life: 1.0 });
}

function updateFloatingTexts(camera, windowInnerWidth, windowInnerHeight, delta) {
    for (let i = state.entities.floatingTexts.length - 1; i >= 0; i--) {
        const ft = state.entities.floatingTexts[i];
        ft.life -= delta;
        if (ft.life <= 0) {
            ft.element.remove();
            state.entities.floatingTexts.splice(i, 1);
            continue;
        }
        ft.pos.y += delta * 2;
        const screenPos = ft.pos.clone();
        screenPos.project(camera);
        if (screenPos.z > 1) {
            ft.element.style.display = 'none';
        } else {
            ft.element.style.display = 'block';
            const x = (screenPos.x * .5 + .5) * windowInnerWidth;
            const y = (screenPos.y * -.5 + .5) * windowInnerHeight;
            ft.element.style.left = `${x}px`;
            ft.element.style.top = `${y}px`;
            ft.element.style.opacity = ft.life;
        }
    }
}
