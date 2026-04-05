// Mobile Controls Logic
const mobileControls = document.getElementById('mobileControls');
const lookZone = document.getElementById('lookZone');
const joystickZone = document.getElementById('joystickZone');
const joystickKnob = document.getElementById('joystickKnob');
let isHudCustomizing = false;

// Make all UI buttons responsive to touch
document.addEventListener('touchstart', (e) => {
    if (isHudCustomizing) return;
    let target = e.target;
    while (target && target !== document.body) {
        if (target.tagName === 'BUTTON' || target.classList.contains('weapon-btn') || target.classList.contains('start-btn') || target.classList.contains('pause-btn') || target.id === 'btnSettings') {
            e.preventDefault();
            target.click();
            return;
        }
        target = target.parentElement;
    }
}, { passive: false });

let isMobile = false;
function checkMobile() {
    isMobile = window.matchMedia("(max-width: 1024px)").matches;
    if (isMobile && state.gameMode) {
        if (window.innerWidth > window.innerHeight) {
            mobileControls.style.display = 'block';
            document.getElementById('portraitWarning').style.display = 'none';
        } else {
            mobileControls.style.display = 'none';
            document.getElementById('portraitWarning').style.display = 'flex';
        }
    } else {
        mobileControls.style.display = 'none';
        document.getElementById('portraitWarning').style.display = 'none';
    }
}
window.addEventListener('resize', checkMobile);

// Joystick
let joyActive = false;
let joyId = null;
let joyCenter = { x: 0, y: 0 };

joystickZone.addEventListener('touchstart', e => {
    if (state.paused || isHudCustomizing) return;
    e.preventDefault();
    const touch = e.changedTouches[0];
    joyActive = true;
    joyId = touch.identifier;
    const rect = joystickZone.getBoundingClientRect();
    joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    updateJoystick(touch);
}, { passive: false });

joystickZone.addEventListener('touchmove', e => {
    if (!joyActive || state.paused || isHudCustomizing) return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joyId) {
            updateJoystick(e.changedTouches[i]);
            break;
        }
    }
}, { passive: false });

const endJoystick = (e) => {
    if (!joyActive) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joyId) {
            joyActive = false;
            joyId = null;
            joystickKnob.style.transform = `translate(-50%, -50%)`;
            state.joystick.x = 0;
            state.joystick.y = 0;
            state.keys['w'] = state.keys['s'] = state.keys['a'] = state.keys['d'] = false;
            state.keys['shift'] = false;
            break;
        }
    }
};
joystickZone.addEventListener('touchend', endJoystick);
joystickZone.addEventListener('touchcancel', endJoystick);

function updateJoystick(touch) {
    const dx = touch.clientX - joyCenter.x;
    const dy = touch.clientY - joyCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 75; // radius of zone
    
    const clampedDist = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);
    
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;
    
    joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    
    // Map to keys
    const normX = knobX / maxDist;
    const normY = knobY / maxDist;
    
    state.joystick.x = normX;
    state.joystick.y = normY;
    
    state.keys['w'] = normY < -0.3;
    state.keys['s'] = normY > 0.3;
    state.keys['a'] = normX < -0.3;
    state.keys['d'] = normX > 0.3;
    
    // Run if pushed far
    state.keys['shift'] = clampedDist > maxDist * 0.8;
}

// Look Zone
let lookId = null;
let lastLook = { x: 0, y: 0 };

lookZone.addEventListener('touchstart', e => {
    if (state.paused || isHudCustomizing) return;
    e.preventDefault();
    if (lookId !== null) return; // already looking
    const touch = e.changedTouches[0];
    lookId = touch.identifier;
    lastLook = { x: touch.clientX, y: touch.clientY };
}, { passive: false });

lookZone.addEventListener('touchmove', e => {
    if (lookId === null || state.paused || isHudCustomizing) return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookId) {
            const touch = e.changedTouches[i];
            const dx = touch.clientX - lastLook.x;
            const dy = touch.clientY - lastLook.y;
            
            let baseSens = 0.003;
            if (state.player.ads) baseSens = 0.0015;
            
            if (typeof yawObj !== 'undefined' && typeof pitchObj !== 'undefined') {
                yawObj.rotation.y -= dx * baseSens;
                pitchObj.rotation.x -= dy * baseSens;
                pitchObj.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitchObj.rotation.x));
            }
            
            lastLook = { x: touch.clientX, y: touch.clientY };
            break;
        }
    }
}, { passive: false });

const endLook = (e) => {
    if (lookId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookId) {
            lookId = null;
            break;
        }
    }
};
lookZone.addEventListener('touchend', endLook);
lookZone.addEventListener('touchcancel', endLook);

// Buttons
function bindMobileBtn(id, downFn, upFn) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', e => {
        if (isHudCustomizing) return;
        e.preventDefault();
        downFn();
    }, { passive: false });
    btn.addEventListener('touchend', e => {
        if (isHudCustomizing) return;
        e.preventDefault();
        if (upFn) upFn();
    }, { passive: false });
    btn.addEventListener('touchcancel', e => {
        if (isHudCustomizing) return;
        e.preventDefault();
        if (upFn) upFn();
    }, { passive: false });
}

bindMobileBtn('btnFire', () => { state.mouse = true; state.mouseJustPressed = true; }, () => { state.mouse = false; });
bindMobileBtn('btnADS', () => { state.player.ads = !state.player.ads; }); // Toggle ADS on mobile
bindMobileBtn('btnJump', () => { state.keys[' '] = true; }, () => { state.keys[' '] = false; });
bindMobileBtn('btnSlide', () => { state.keys['c'] = true; }, () => { state.keys['c'] = false; });
bindMobileBtn('btnInteract', () => { state.keys['f'] = true; }, () => { state.keys['f'] = false; });
bindMobileBtn('btnSwap', () => {
    // Simulate scroll wheel
    const activeId = getActiveWeaponId();
    const wStats = getActiveWeaponStats();
    if (state.gameMode === 'tester') {
        if (wStats.modes && wStats.modes.length > 1) {
            state.player.weaponMode = (state.player.weaponMode + 1) % wStats.modes.length;
            state.player.burstsRemaining = 0;
            document.getElementById('hudWeaponName').innerText = wStats.name + " (" + wStats.modes[state.player.weaponMode].type.toUpperCase() + ")";
        }
    } else {
        if (state.survival.inventory['Pistol'] && state.survival.inventory['SMG']) {
            if (typeof switchSurvivalGun === 'function') {
                switchSurvivalGun(state.survival.activeType === 'Pistol' ? 'SMG' : 'Pistol');
            }
        }
    }
});
bindMobileBtn('btnReload', () => { if (typeof startReload === 'function') startReload(); });
bindMobileBtn('btnPause', () => {
    if (!state.paused) {
        state.paused = true;
        document.getElementById('mobilePauseMenu').style.display = 'block';
        if (state.gameMode === 'tester') {
            document.getElementById('btnSpawnZombiesMobile').style.display = 'block';
            document.getElementById('mobileProbContainer').style.display = 'block';
        } else {
            document.getElementById('btnSpawnZombiesMobile').style.display = 'none';
            document.getElementById('mobileProbContainer').style.display = 'none';
        }
    }
});

document.getElementById('btnResumeMobile')?.addEventListener('click', () => {
    state.paused = false;
    document.getElementById('mobilePauseMenu').style.display = 'none';
    document.getElementById('pauseMenuSettings').style.display = 'none';
    document.getElementById('pauseMenuMain').style.display = 'block';
});

document.getElementById('btnSpawnZombiesMobile')?.addEventListener('click', () => {
    state.gameplay.spawns = !state.gameplay.spawns;
    if(state.gameplay.spawns) {
        if (typeof spawnZombies === 'function') spawnZombies(3);
    } else {
        if (typeof scene !== 'undefined') {
            state.entities.zombies.forEach(z => scene.remove(z.mesh));
        }
        state.entities.zombies = [];
    }
});

document.getElementById('btnSettings')?.addEventListener('click', () => {
    document.getElementById('pauseMenuMain').style.display = 'none';
    document.getElementById('pauseMenuSettings').style.display = 'block';
});
document.getElementById('btnSettingsBack')?.addEventListener('click', () => {
    document.getElementById('pauseMenuSettings').style.display = 'none';
    document.getElementById('pauseMenuMain').style.display = 'block';
});

document.getElementById('mobileBrightness')?.addEventListener('input', e => {
    document.getElementById('brightSlider').value = e.target.value;
    if (typeof updateBrightness === 'function') updateBrightness();
});
document.getElementById('mobileVolume')?.addEventListener('input', e => {
    state.settings.gunVolume = (e.target.value / 100) * 0.2;
    document.getElementById('volSlider').value = e.target.value;
});
document.getElementById('mobileProb')?.addEventListener('input', e => {
    state.gameplay.prob = e.target.value / 100;
    document.getElementById('probSlider').value = e.target.value;
});

// HUD Customization
let dragTarget = null;
let dragOffset = { x: 0, y: 0 };
let selectedHudElement = null;

function selectHudElement(el) {
    if (selectedHudElement) selectedHudElement.classList.remove('hud-selected');
    selectedHudElement = el;
    if (el) {
        el.classList.add('hud-selected');
        document.getElementById('hudSize').value = (el.dataset.customScale || 1) * 100;
        document.getElementById('hudOpacity').value = (el.dataset.customOpacity || 1) * 100;
    } else {
        document.getElementById('hudSize').value = 100;
        document.getElementById('hudOpacity').value = 100;
    }
}

function saveHudLayout() {
    const layout = [];
    document.querySelectorAll('.mobile-btn, #joystickZone').forEach(el => {
        layout.push({
            id: el.id,
            left: el.style.left,
            top: el.style.top,
            right: el.style.right,
            bottom: el.style.bottom,
            width: el.style.width,
            height: el.style.height,
            fontSize: el.style.fontSize,
            opacity: el.style.opacity,
            customScale: el.dataset.customScale,
            customOpacity: el.dataset.customOpacity,
            origWidth: el.dataset.origWidth,
            origHeight: el.dataset.origHeight,
            origFontSize: el.dataset.origFontSize,
        });
    });
    localStorage.setItem('gunGameHudLayout', JSON.stringify(layout));
}

function loadHudLayout() {
    const saved = localStorage.getItem('gunGameHudLayout');
    if (saved) {
        try {
            const layout = JSON.parse(saved);
            layout.forEach(item => {
                const el = document.getElementById(item.id);
                if (el) {
                    if (item.left) el.style.left = item.left;
                    if (item.top) el.style.top = item.top;
                    if (item.right) el.style.right = item.right;
                    if (item.bottom) el.style.bottom = item.bottom;
                    if (item.width) el.style.width = item.width;
                    if (item.height) el.style.height = item.height;
                    if (item.fontSize) el.style.fontSize = item.fontSize;
                    if (item.opacity) el.style.opacity = item.opacity;
                    if (item.customScale) el.dataset.customScale = item.customScale;
                    if (item.customOpacity) el.dataset.customOpacity = item.customOpacity;
                    if (item.origWidth) el.dataset.origWidth = item.origWidth;
                    if (item.origHeight) el.dataset.origHeight = item.origHeight;
                    if (item.origFontSize) el.dataset.origFontSize = item.origFontSize;
                }
            });
        } catch (e) {
            console.error("Failed to load HUD layout", e);
        }
    }
}

// Load HUD layout on startup
window.addEventListener('load', loadHudLayout);

document.getElementById('btnHudCustomize')?.addEventListener('click', () => {
    isHudCustomizing = true;
    document.getElementById('mobilePauseMenu').style.display = 'none';
    document.getElementById('hudCustomizeMenu').style.display = 'block';
    document.getElementById('mobileControls').classList.add('hud-customizing');
    document.getElementById('btnInteract').style.display = 'flex'; // show to customize
    selectHudElement(null);
});

document.getElementById('btnSaveHud')?.addEventListener('click', () => {
    isHudCustomizing = false;
    document.getElementById('hudCustomizeMenu').style.display = 'none';
    document.getElementById('mobileControls').classList.remove('hud-customizing');
    document.getElementById('btnInteract').style.display = 'none'; // hide again
    selectHudElement(null);
    saveHudLayout();
    state.paused = false; // resume
});

document.getElementById('hudSize')?.addEventListener('input', e => {
    const scale = e.target.value / 100;
    const targets = selectedHudElement ? [selectedHudElement] : document.querySelectorAll('.mobile-btn, #joystickZone');
    targets.forEach(el => {
        if (!el.dataset.origWidth) {
            el.dataset.origWidth = el.offsetWidth;
            el.dataset.origHeight = el.offsetHeight;
            el.dataset.origFontSize = window.getComputedStyle(el).fontSize;
        }
        el.dataset.customScale = scale;
        el.style.width = (el.dataset.origWidth * scale) + 'px';
        el.style.height = (el.dataset.origHeight * scale) + 'px';
        if (el.classList.contains('mobile-btn')) {
            el.style.fontSize = (parseFloat(el.dataset.origFontSize) * scale) + 'px';
        }
    });
});

document.getElementById('hudOpacity')?.addEventListener('input', e => {
    const opacity = e.target.value / 100;
    const targets = selectedHudElement ? [selectedHudElement] : document.querySelectorAll('.mobile-btn, #joystickZone');
    targets.forEach(el => {
        el.dataset.customOpacity = opacity;
        el.style.opacity = opacity;
    });
});

// Dragging logic for HUD customization
const mobileControlsEl = document.getElementById('mobileControls');
if (mobileControlsEl) {
    mobileControlsEl.addEventListener('touchstart', e => {
        if (!isHudCustomizing) return;
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && (target.classList.contains('mobile-btn') || target.id === 'joystickZone')) {
            dragTarget = target;
            selectHudElement(target);
            const rect = target.getBoundingClientRect();
            dragOffset = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        } else {
            selectHudElement(null);
        }
    }, { passive: false });

    mobileControlsEl.addEventListener('touchmove', e => {
        if (!isHudCustomizing || !dragTarget) return;
        e.preventDefault();
        const touch = e.touches[0];
        dragTarget.style.left = (touch.clientX - dragOffset.x) + 'px';
        dragTarget.style.top = (touch.clientY - dragOffset.y) + 'px';
        dragTarget.style.right = 'auto';
        dragTarget.style.bottom = 'auto';
    }, { passive: false });

    mobileControlsEl.addEventListener('touchend', () => {
        dragTarget = null;
    });
}
