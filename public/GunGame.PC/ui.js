// --- MODE SELECTION ---
        document.getElementById('btnTester').addEventListener('click', () => {
            state.gameMode = 'tester';
            document.getElementById('modeSelectScreen').style.display = 'none';
            document.getElementById('startScreen').style.display = 'flex';
            
            // Globally apply brightness to Gun Tester mode too
            updateBrightness();
        });

        document.getElementById('btnSurvival').addEventListener('click', () => {
            state.gameMode = 'survival';
            document.getElementById('modeSelectScreen').style.display = 'none';
            
            document.getElementById('startScreen').style.display = 'flex';
            document.getElementById('startScreen').querySelector('h1').innerText = "SURVIVAL MODE";
            document.getElementById('startScreen').querySelector('p').innerText = "Infinite Zig-Zag World 3D";
            
            document.querySelector('.hud-container').style.display = 'none';
            document.getElementById('survivalHud').style.display = 'block';
            
            document.querySelector('.controls-help').innerHTML = "[W,A,S,D]: Move | [SPACE]: Jump | [SHIFT]: Run<br>[C]: Slide |[SCROLL WHEEL] or[1,2,3]: Swap Weapons<br>[LEFT CLICK]: Shoot | [RIGHT CLICK]: ADS (Aim)<br>[R]: Reload | [F]: Buy Station | [B]: Quick Band-Aid<br>[P]: Brightness Settings | [M] / [N]: Cheat Codes<br>[ESC] or[CTRL]: Pause Game";
            
            // Globally apply default brightness from the slider (default 40%)
            updateBrightness();

            currentWeaponMesh = buildWeaponMesh(getActiveWeaponId(), currentWeaponMesh, viewmodel);
        });

        document.getElementById('startBtn').addEventListener('click', () => {
            document.getElementById('startScreen').style.display = 'none';
            initAudio();
            decodeSounds();
            if (!isMobile) {
                document.body.requestPointerLock();
            } else {
                state.paused = false;
                checkMobile(); // Ensure mobile controls are shown
            }
            if (state.gameMode === 'survival') updateSurvivalHUD();
        });

        document.addEventListener('pointerlockchange', () => {
            if (isMobile) return; // Ignore pointer lock on mobile
            const isEndgame = state.gameMode === 'survival' && (state.survival.waveState === 'GAMEOVER' || state.survival.waveState === 'VICTORY');
            
            const isLocked = document.pointerLockElement === document.body;
            window.parent.postMessage({ type: 'pointer_lock_change', isLocked }, '*');

            if (!isLocked && state.menuOpen === null && !isEndgame && state.gameMode !== null) {
                document.getElementById('startScreen').style.display = 'flex';
                document.getElementById('startScreen').querySelector('h1').innerText = "PAUSED";
                document.getElementById('startBtn').innerText = "Resume";
                state.paused = true; 
            } else if (isLocked && !isEndgame) {
                state.paused = false;
                document.getElementById('startScreen').style.display = 'none';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.body && !state.paused) {
                let baseSens = 0.002;
                const activeId = getActiveWeaponId();
                if (state.gameMode === 'tester') {
                    const wStats = WEAPONS[activeId];
                    const isSniperOrMarksman =['dlq33', 'lw3_tundra', 'sks'].includes(wStats.id);
                    if (state.player.ads && isSniperOrMarksman) baseSens = 0.001; 
                } else {
                    if (state.player.ads) baseSens = 0.0012;
                }

                yawObj.rotation.y -= e.movementX * baseSens;
                pitchObj.rotation.x -= e.movementY * baseSens;
                pitchObj.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitchObj.rotation.x));
            }
        });

        window.addEventListener('contextmenu', e => e.preventDefault());

        function switchSurvivalGun(type) {
            state.survival.activeType = type;
            state.player.ads = false;
            document.getElementById('scopeOverlay').style.display = 'none';
            document.getElementById('crosshair').style.display = 'block';
            state.survival.reloading = false;
            
            const inv = state.survival.inventory[type];
            currentWeaponMesh = buildWeaponMesh(inv.id, currentWeaponMesh, viewmodel);
            updateSurvivalHUD();
        }

        document.addEventListener('wheel', (e) => {
            if (state.menuOpen || state.paused || document.pointerLockElement !== document.body) return;
            if (e.deltaY !== 0) {
                if (state.gameMode === 'survival') {
                    const types =['Pistol', 'SMG', 'AR'];
                    let idx = types.indexOf(state.survival.activeType);
                    let attempts = 0;
                    while(!state.survival.inventory[types[idx]] || attempts === 0) {
                        if (e.deltaY > 0) idx = (idx + 1) % 3;
                        else idx = (idx - 1 + 3) % 3;
                        attempts++;
                        if (state.survival.inventory[types[idx]]) break;
                        if (attempts > 3) break;
                    }
                    if (state.survival.inventory[types[idx]]) switchSurvivalGun(types[idx]);
                } else {
                    state.player.activeSlot = state.player.activeSlot === 1 ? 2 : 1;
                    state.player.ads = false;
                    state.player.weaponMode = 0;
                    state.player.burstsRemaining = 0;
                    document.getElementById('scopeOverlay').style.display = 'none';
                    document.getElementById('crosshair').style.display = 'block';
                    const activeId = getActiveWeaponId();
                    const w = WEAPONS[activeId];
                    let modeText = w.modes ? ` (${w.modes[0].type.toUpperCase()})` : '';
                    document.getElementById('hudWeaponName').innerText = w.name + modeText;
                    currentWeaponMesh = buildWeaponMesh(activeId, currentWeaponMesh, viewmodel);
                    updateArmoryHighlights();
                }
            }
        });

        function startReload() {
            const inv = state.survival.inventory[state.survival.activeType];
            const wStats = getActiveWeaponStats();
            if (inv.mag < wStats.mag && inv.reserve > 0 && !state.survival.reloading) {
                state.survival.reloading = true;
                state.survival.reloadTimer = Date.now() + wStats.reload * 1000;
                updateSurvivalHUD();
            }
        }

        document.addEventListener('keydown', e => {
            if (!state.gameMode) return;
            const k = e.key.toLowerCase();
            state.keys[k] = true;

            if (k === 'control' || e.key === 'Escape') {
                if (document.pointerLockElement === document.body) document.exitPointerLock(); 
            }

            if (state.gameMode === 'tester') {
                if (k === 'b') {
                    const activeId = getActiveWeaponId();
                    const w = WEAPONS[activeId];
                    if (w.modes && w.modes.length > 1) {
                        state.player.weaponMode = (state.player.weaponMode + 1) % w.modes.length;
                        state.player.burstsRemaining = 0;
                        document.getElementById('hudWeaponName').innerText = w.name + " (" + w.modes[state.player.weaponMode].type.toUpperCase() + ")";
                    }
                }
                if (k === 't') {
                    state.gameplay.spawns = !state.gameplay.spawns;
                    if(state.gameplay.spawns) spawnZombies(3);
                    else {
                        state.entities.zombies.forEach(z => scene.remove(z.mesh));
                        state.entities.zombies =[];
                    }
                }
                if (k === 'p' && state.menuOpen !== 'shop' && state.menuOpen !== 'vol') {
                    if (state.menuOpen === 'prob') toggleMenu(null); else toggleMenu('prob');
                }
            } else if (state.gameMode === 'survival') {
                if (k === '1' && state.survival.inventory['Pistol']) switchSurvivalGun('Pistol');
                if (k === '2' && state.survival.inventory['SMG']) switchSurvivalGun('SMG');
                if (k === '3' && state.survival.inventory['AR']) switchSurvivalGun('AR');
                if (k === 'r') startReload();
                if (k === 'b') {
                    const nowMs = Date.now();
                    if (nowMs - state.survival.lastBPressTime < 300) { buyBandAid(); state.survival.lastBPressTime = 0; } 
                    else state.survival.lastBPressTime = nowMs;
                }
                if (k === 'p' && state.menuOpen !== 'shop' && state.menuOpen !== 'vol' && state.menuOpen !== 'survivalShop') {
                    if (state.menuOpen === 'bright') toggleMenu(null); else toggleMenu('bright');
                }
                if (k === 'm') {
                    if (document.pointerLockElement) document.exitPointerLock();
                    setTimeout(() => {
                        let amt = prompt("CHEAT: Enter Money Amount:");
                        if (amt !== null && !isNaN(parseInt(amt))) {
                            state.survival.money += parseInt(amt);
                            updateSurvivalHUD(); updateSurvivalShop();
                        }
                        if (!isMobile) document.body.requestPointerLock();
                        else { state.paused = false; checkMobile(); }
                    }, 100);
                }
                if (k === 'n') {
                    if (document.pointerLockElement) document.exitPointerLock();
                    setTimeout(() => {
                        let wave = prompt("CHEAT: Enter Wave (1-11):");
                        if (wave !== null && !isNaN(parseInt(wave))) {
                            let w = parseInt(wave);
                            if (w >= 1 && w <= Object.keys(WAVE_CONFIGS).length) {
                                state.survival.wave = w; state.survival.zombiesKilledThisWave = 0; state.survival.zombiesKilledThisPhase = 0;
                                state.survival.currentPhase = 0; state.survival.waveState = 'COUNTDOWN'; state.survival.countdownTimer = 5;
                                state.entities.zombies.forEach(z => scene.remove(z.mesh)); state.entities.zombies =[]; state.survival.activeZombies = 0;
                                updateSurvivalHUD();
                            }
                        }
                        if (!isMobile) document.body.requestPointerLock();
                        else { state.paused = false; checkMobile(); }
                    }, 100);
                }
            }

            if (k === 'f') {
                const dist = yawObj.position.distanceTo(stationPos);
                if (dist < 5 && state.menuOpen !== 'prob' && state.menuOpen !== 'vol' && state.menuOpen !== 'bright') {
                    if (state.gameMode === 'survival') {
                        if (state.menuOpen === 'survivalShop') toggleMenu(null); else toggleMenu('survivalShop');
                    } else {
                        if (state.menuOpen === 'shop') toggleMenu(null); else toggleMenu('shop');
                    }
                }
            }
            if (k === 'v' && state.menuOpen !== 'shop' && state.menuOpen !== 'prob' && state.menuOpen !== 'survivalShop' && state.menuOpen !== 'bright') {
                if (state.menuOpen === 'vol') toggleMenu(null); else toggleMenu('vol');
            }
        });

        document.addEventListener('keyup', e => state.keys[e.key.toLowerCase()] = false);
        
        document.addEventListener('mousedown', (e) => {
            if(document.pointerLockElement === document.body && !state.paused) {
                if (e.button === 0) { state.mouse = true; state.mouseJustPressed = true; }
                if (e.button === 2) state.player.ads = true;
            }
        });
        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) state.mouse = false;
            if (e.button === 2) state.player.ads = false;
        });

        document.getElementById('probSlider').addEventListener('input', (e) => {
            state.gameplay.prob = e.target.value / 100;
            document.getElementById('probValueDisplay').innerText = e.target.value + "%";
        });
        
        document.getElementById('brightSlider').addEventListener('input', (e) => {
            document.getElementById('brightValueDisplay').innerText = e.target.value + "%";
            updateBrightness();
        });

        document.getElementById('volSlider').addEventListener('input', (e) => {
            state.settings.gunVolume = (e.target.value / 100) * 0.2;
            document.getElementById('volValueDisplay').innerText = e.target.value + "%";
        });

        function toggleMenu(menuType) {
            const shop = document.getElementById('shopModal');
            const prob = document.getElementById('probModal');
            const vol = document.getElementById('volModal');
            const survShop = document.getElementById('survivalShopModal');
            const bright = document.getElementById('brightModal');

            shop.style.display = 'none'; prob.style.display = 'none'; vol.style.display = 'none'; survShop.style.display = 'none'; bright.style.display = 'none';
            state.menuOpen = menuType;

            if (menuType === 'shop' || menuType === 'prob' || menuType === 'vol' || menuType === 'survivalShop' || menuType === 'bright') {
                document.exitPointerLock();
                state.mouse = false; state.player.ads = false; state.paused = true;
                if (menuType === 'shop') { shop.style.display = 'flex'; updateArmoryHighlights(); }
                if (menuType === 'survivalShop') { survShop.style.display = 'flex'; updateSurvivalShop(); }
                if (menuType === 'prob') prob.style.display = 'flex';
                if (menuType === 'vol') vol.style.display = 'flex';
                if (menuType === 'bright') bright.style.display = 'flex';
            } else {
                if (!isMobile) document.body.requestPointerLock();
                else { state.paused = false; checkMobile(); }
            }
        }

        // --- Tester Armory Population ---
        const cols = { 
            sidearms: document.getElementById('col-sidearms'), smg: document.getElementById('col-smg'), 
            ar: document.getElementById('col-ar'), marksman: document.getElementById('col-marksman'), 
            sniper: document.getElementById('col-sniper'), special: document.getElementById('col-special') 
        };
        const weaponsArr = Object.values(WEAPONS).map(w => {
            let rpm, dmg;
            if (w.modes) { const autoMode = w.modes.find(m => m.type === 'auto') || w.modes[0]; rpm = autoMode.rpm; dmg = autoMode.damage; } 
            else { rpm = w.rpm; dmg = w.damage; }
            return { ...w, displayRpm: rpm, displayDmg: dmg, dps: (rpm / 60) * dmg };
        }).sort((a, b) => a.dps - b.dps);

        weaponsArr.forEach(w => {
            if(cols[w.cat]) {
                const btn = document.createElement('div'); btn.className = 'weapon-btn'; btn.dataset.id = w.id; 
                const dpsText = w.dps > 10000 ? 'INF' : w.dps.toFixed(0);
                btn.innerHTML = `<span class="weapon-btn-name">${w.name}</span><span class="weapon-btn-stats">DMG: ${w.displayDmg} | RPM: ${w.displayRpm} | DPS: ${dpsText}</span>`;
                btn.onclick = () => {
                    if (w.cat === 'sidearms') { state.player.secondary = w.id; state.player.activeSlot = 2; } 
                    else { state.player.primary = w.id; state.player.activeSlot = 1; }
                    state.player.weaponMode = 0; state.player.burstsRemaining = 0;
                    const activeId = getActiveWeaponId(); const activeW = WEAPONS[activeId];
                    let modeText = activeW.modes ? ` (${activeW.modes[0].type.toUpperCase()})` : '';
                    document.getElementById('hudWeaponName').innerText = activeW.name + modeText;
                    currentWeaponMesh = buildWeaponMesh(activeId, currentWeaponMesh, viewmodel); toggleMenu(null);
                };
                cols[w.cat].appendChild(btn);
            }
        });

        function updateArmoryHighlights() {
            if (state.gameMode === 'survival') return;
            document.querySelectorAll('.weapon-btn').forEach(b => {
                b.classList.remove('active', 'active-equipped');
                if (b.dataset.id === state.player.primary || b.dataset.id === state.player.secondary) b.classList.add('active'); 
                if (b.dataset.id === getActiveWeaponId()) b.classList.add('active-equipped'); 
            });
        }
        updateArmoryHighlights();

        // --- Survival Logic & Shop ---
        function updateSurvivalShop() {
            const inv = state.survival.inventory;
            document.getElementById('survMoneyText').innerText = `$${state.survival.money}`;
            
            const pistolUpgraded = inv['Pistol'] && inv['Pistol'].id === 'gs50';
            const smgUpgraded = inv['SMG'] && inv['SMG'].id === 'vector_smg';
            const arUpgraded = inv['AR'] && inv['AR'].id === 'odin';

            // Hide basic guns if their upgraded version is owned
            document.getElementById('btnBuyPistol').style.display = pistolUpgraded ? 'none' : 'block';
            document.getElementById('btnBuySMG').style.display = smgUpgraded ? 'none' : 'block';
            document.getElementById('btnBuyAR').style.display = arUpgraded ? 'none' : 'block';

            // If all 3 are upgraded, hide the entire column so 'Upgrades' shifts to the middle
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

        function buySurvivalGun(id) {
            const gunDef = SURVIVAL_WEAPONS[Object.keys(SURVIVAL_WEAPONS).find(k => SURVIVAL_WEAPONS[k].id === id)];
            let slot = 'Pistol'; if (gunDef.cat === 'smg') slot = 'SMG'; if (gunDef.cat === 'ar') slot = 'AR';
            const inv = state.survival.inventory;
            
            if (!inv[slot] || inv[slot].id !== id) {
                if (state.survival.money >= gunDef.cost) {
                    state.survival.money -= gunDef.cost;
                    inv[slot] = { id: id, mag: gunDef.mag, reserve: gunDef.mag * 2 };
                    if (state.survival.activeType !== slot) switchSurvivalGun(slot);
                    else { currentWeaponMesh = buildWeaponMesh(id, currentWeaponMesh, viewmodel); updateSurvivalHUD(); }
                }
            } else {
                if (state.survival.money >= gunDef.ammoCost * 2) {
                    state.survival.money -= gunDef.ammoCost * 2;
                    inv[slot].reserve = Math.min(inv[slot].reserve + gunDef.mag * 2, gunDef.reserve);
                }
            }
            updateSurvivalShop(); updateSurvivalHUD();
        }

        function buyBandAid() {
            if (state.survival.money >= 50 && state.survival.health < state.survival.maxHealth) {
                state.survival.money -= 50; state.survival.health = state.survival.maxHealth;
                updateSurvivalShop(); updateSurvivalHUD();
            }
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

        function restartSurvival() {
            document.getElementById('survivalGameOver').style.display = 'none'; document.getElementById('survivalVictory').style.display = 'none';
            state.survival = {
                health: 50, maxHealth: 50, money: 0, wave: 1,
                zombiesKilledThisWave: 0, zombiesKilledThisPhase: 0, currentPhase: 0, activeZombies: 0,
                waveState: 'COUNTDOWN', countdownTimer: 5, lastTime: 0,
                inventory: { 'Pistol': { id: 'pistol', mag: 15, reserve: 45 }, 'SMG': null, 'AR': null },
                activeType: 'Pistol', reloading: false, reloadTimer: 0, damageFlashTimer: 0, lastBPressTime: 0
            };
            state.entities.zombies.forEach(z => scene.remove(z.mesh)); state.entities.zombies =[];
            state.entities.floatingTexts.forEach(ft => ft.element.remove()); state.entities.floatingTexts =[];
            
            updateSurvivalHUD(); switchSurvivalGun('Pistol'); 
            if (!isMobile) document.body.requestPointerLock();
            else { state.paused = false; checkMobile(); }
        }

        // --- ZOMBIES ---
        