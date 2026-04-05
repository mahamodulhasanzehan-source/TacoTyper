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
            
            let sensMultiplier = 1;
            const sensInput = document.getElementById('mobileSensitivity');
            if (sensInput) sensMultiplier = parseFloat(sensInput.value);
            
            let baseSens = 0.006 * sensMultiplier;
            if (state.player.ads) baseSens = 0.003 * sensMultiplier;
            
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
bindMobileBtn('btnSwap', () => {
    // Simulate scroll wheel
    const activeId = getActiveWeaponId();
    const wStats = WEAPONS[activeId];
    if (state.gameMode === 'tester') {
        if (wStats.modes && wStats.modes.length > 1) {
            state.player.weaponMode = (state.player.weaponMode + 1) % wStats.modes.length;
            state.player.burstsRemaining = 0;
            document.getElementById('hudWeaponName').innerText = wStats.name + " (" + wStats.modes[state.player.weaponMode].type.toUpperCase() + ")";
        }
    } else {
        if (state.survival.inventory['Pistol'] && state.survival.inventory['SMG']) {
            if (typeof switchSurvivalGun === 'function') {
                switchSurvivalGun(state.survival.currentGun === 'Pistol' ? 'SMG' : 'Pistol');
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

document.getElementById('btnResumeMobile').addEventListener('click', () => {
    state.paused = false;
    document.getElementById('mobilePauseMenu').style.display = 'none';
    document.getElementById('pauseMenuSettings').style.display = 'none';
    document.getElementById('pauseMenuMain').style.display = 'block';
});

document.getElementById('btnSpawnZombiesMobile').addEventListener('click', () => {
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

document.getElementById('btnSettings').addEventListener('click', () => {
    document.getElementById('pauseMenuMain').style.display = 'none';
    document.getElementById('pauseMenuSettings').style.display = 'block';
});
document.getElementById('btnSettingsBack').addEventListener('click', () => {
    document.getElementById('pauseMenuSettings').style.display = 'none';
    document.getElementById('pauseMenuMain').style.display = 'block';
    saveMobileSettings();
});

document.getElementById('mobileBrightness').addEventListener('input', e => {
    document.getElementById('brightSlider').value = e.target.value;
    if (typeof updateBrightness === 'function') updateBrightness();
    saveMobileSettings();
});
document.getElementById('mobileVolume').addEventListener('input', e => {
    state.settings.gunVolume = (e.target.value / 100) * 0.2;
    document.getElementById('volSlider').value = e.target.value;
    saveMobileSettings();
});
document.getElementById('mobileSensitivity').addEventListener('input', e => {
    saveMobileSettings();
});
document.getElementById('mobileProb').addEventListener('input', e => {
    state.gameplay.prob = e.target.value / 100;
    document.getElementById('probSlider').value = e.target.value;
});

// HUD Customization
let dragTarget = null;
let dragOffset = { x: 0, y: 0 };

document.getElementById('btnHudCustomize').addEventListener('click', () => {
    isHudCustomizing = true;
    document.getElementById('mobilePauseMenu').style.display = 'none';
    document.getElementById('hudCustomizeMenu').style.display = 'block';
    document.getElementById('mobileControls').classList.add('hud-customizing');
});

document.getElementById('btnSaveHud').addEventListener('click', () => {
    isHudCustomizing = false;
    document.getElementById('hudCustomizeMenu').style.display = 'none';
    document.getElementById('mobileControls').classList.remove('hud-customizing');
    state.paused = false; // resume
    saveMobileSettings();
});

document.getElementById('hudSize').addEventListener('input', e => {
    const scale = e.target.value / 100;
    document.querySelectorAll('.mobile-btn, #joystickZone').forEach(el => {
        if (!el.dataset.origWidth) {
            el.dataset.origWidth = el.offsetWidth;
            el.dataset.origHeight = el.offsetHeight;
            el.dataset.origFontSize = window.getComputedStyle(el).fontSize;
        }
        el.style.width = (el.dataset.origWidth * scale) + 'px';
        el.style.height = (el.dataset.origHeight * scale) + 'px';
        if (el.classList.contains('mobile-btn')) {
            el.style.fontSize = (parseFloat(el.dataset.origFontSize) * scale) + 'px';
        }
    });
});

document.getElementById('hudOpacity').addEventListener('input', e => {
    const opacity = e.target.value / 100;
    document.querySelectorAll('.mobile-btn, #joystickZone').forEach(el => {
        el.style.opacity = opacity;
    });
});

// Dragging logic for HUD customization
document.getElementById('mobileControls').addEventListener('touchstart', e => {
    if (!isHudCustomizing) return;
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target && (target.classList.contains('mobile-btn') || target.id === 'joystickZone')) {
        dragTarget = target;
        const rect = target.getBoundingClientRect();
        dragOffset = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
}, { passive: false });

document.getElementById('mobileControls').addEventListener('touchmove', e => {
    if (!isHudCustomizing || !dragTarget) return;
    e.preventDefault();
    const touch = e.touches[0];
    dragTarget.style.left = (touch.clientX - dragOffset.x) + 'px';
    dragTarget.style.top = (touch.clientY - dragOffset.y) + 'px';
    dragTarget.style.right = 'auto';
    dragTarget.style.bottom = 'auto';
}, { passive: false });

document.getElementById('mobileControls').addEventListener('touchend', () => {
    dragTarget = null;
});

document.getElementById('interactionPrompt').addEventListener('touchstart', (e) => {
    e.preventDefault();
    state.keys['f'] = true;
    setTimeout(() => { state.keys['f'] = false; }, 100);
});

function saveMobileSettings() {
    const settings = {
        brightness: document.getElementById('mobileBrightness').value,
        volume: document.getElementById('mobileVolume').value,
        sensitivity: document.getElementById('mobileSensitivity').value,
        hudSize: document.getElementById('hudSize').value,
        hudOpacity: document.getElementById('hudOpacity').value,
        buttons: {}
    };
    document.querySelectorAll('.mobile-btn, #joystickZone').forEach(el => {
        settings.buttons[el.id] = {
            left: el.style.left,
            top: el.style.top,
            right: el.style.right,
            bottom: el.style.bottom,
            width: el.style.width,
            height: el.style.height,
            fontSize: el.style.fontSize,
            opacity: el.style.opacity
        };
    });
    localStorage.setItem('gunGameMobileSettings', JSON.stringify(settings));
}

function loadMobileSettings() {
    const saved = localStorage.getItem('gunGameMobileSettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            if (settings.brightness) {
                document.getElementById('mobileBrightness').value = settings.brightness;
                document.getElementById('brightSlider').value = settings.brightness;
                if (typeof updateBrightness === 'function') updateBrightness();
            }
            if (settings.volume) {
                document.getElementById('mobileVolume').value = settings.volume;
                state.settings.gunVolume = (settings.volume / 100) * 0.2;
                document.getElementById('volSlider').value = settings.volume;
            }
            if (settings.sensitivity) {
                document.getElementById('mobileSensitivity').value = settings.sensitivity;
            }
            if (settings.hudSize) {
                document.getElementById('hudSize').value = settings.hudSize;
            }
            if (settings.hudOpacity) {
                document.getElementById('hudOpacity').value = settings.hudOpacity;
            }
            if (settings.buttons) {
                document.querySelectorAll('.mobile-btn, #joystickZone').forEach(el => {
                    if (settings.buttons[el.id]) {
                        const b = settings.buttons[el.id];
                        if (b.left) el.style.left = b.left;
                        if (b.top) el.style.top = b.top;
                        if (b.right) el.style.right = b.right;
                        if (b.bottom) el.style.bottom = b.bottom;
                        if (b.width) el.style.width = b.width;
                        if (b.height) el.style.height = b.height;
                        if (b.fontSize) el.style.fontSize = b.fontSize;
                        if (b.opacity) el.style.opacity = b.opacity;
                    }
                });
            }
        } catch (e) {
            console.error("Error loading settings", e);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadMobileSettings, 500);
});
