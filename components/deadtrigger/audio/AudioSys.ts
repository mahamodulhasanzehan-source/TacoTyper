import * as THREE from 'three';
import { globals } from '../globals';
import { SOUND_THROTTLE, state } from '../state';
import { base64Gun, base64Sniper } from './base64Audio';
import { WEAPONS, SURVIVAL_WEAPONS } from '../config/weapons';

export async function decodeSounds() {
    if (!globals.audioCtx) return;
    try {
        const r1 = await fetch(base64Gun);
        const ab1 = await r1.arrayBuffer();
        globals.buffGun = await globals.audioCtx.decodeAudioData(ab1);
        
        const r2 = await fetch(base64Sniper);
        const ab2 = await r2.arrayBuffer();
        globals.buffSniper = await globals.audioCtx.decodeAudioData(ab2);
    } catch (e) {
        // Ignored for placeholder compatibility
    }
}

export function initAudio() {
    if (!globals.audioCtx) {
        const AudioContextCls = window.AudioContext || (window as any).webkitAudioContext;
        globals.audioCtx = new AudioContextCls();
        const comp = globals.audioCtx.createDynamicsCompressor();
        comp.threshold.value = -12; 
        comp.knee.value = 10;
        comp.ratio.value = 12; 
        comp.attack.value = 0.003; 
        comp.release.value = 0.25;
        comp.connect(globals.audioCtx.destination);
        globals.audioCtx.masterOut = comp;
    }
    if (globals.audioCtx.state === 'suspended') globals.audioCtx.resume();
}

export function playSound(type: string, weaponId: string | null = null) {
    if (!globals.audioCtx) return;
    const nowMs = Date.now();
    
    if (type === 'shoot_fast' && nowMs - SOUND_THROTTLE.shoot < 20) return;
    if (type === 'shoot' && nowMs - SOUND_THROTTLE.shoot < 50) return;
    if (type === 'hit' && nowMs - SOUND_THROTTLE.hit < 40) return;
    if (type === 'die' && nowMs - SOUND_THROTTLE.die < 40) return;

    if (type.startsWith('shoot')) SOUND_THROTTLE.shoot = nowMs;
    if (type === 'hit') SOUND_THROTTLE.hit = nowMs;
    if (type === 'die') SOUND_THROTTLE.die = nowMs;

    const now = globals.audioCtx.currentTime;

    if ((type === 'shoot' || type === 'shoot_fast') && weaponId) {
        const w = WEAPONS[weaponId] || SURVIVAL_WEAPONS[Object.keys(SURVIVAL_WEAPONS).find(k=>SURVIVAL_WEAPONS[k].id===weaponId)!];
        if (w && (w.cat !== 'special' || w.id === 'swarm_killer_ar' || w.id === 'krm262')) {
            let bufferToUse = null;
            let rate = 1.0;
            let vol = 1.0;

            if (w.id === 'krm262') {
                bufferToUse = globals.buffGun || globals.buffSniper;
                rate = 0.72;
                vol = 4.2;
            } else if (w.id === 'swarm_killer_ar') {
                bufferToUse = globals.buffGun; rate = 1.7; vol = 0.33; // 70% reduction from 110%
            } else if (w.cat === 'sidearms') {
                bufferToUse = globals.buffGun;
                if (w.id === 'gs50') { rate = 1.25; vol = 1.2; } else { rate = 1.4; vol = 0.6; }
            } else if (w.cat === 'smg') {
                bufferToUse = globals.buffGun;
                if (w.id === 'mac10') {
                    rate = 1.45;
                    vol = 0.64; // 20% quieter than standard 0.8
                } else if (w.id === 'uzi') {
                    rate = 0.85; // Deep mechanical weight, but preserves the original high-quality gun buffer details
                    vol = 5.8; // Doubled volume from 2.9 to make it twice as loud
                } else {
                    rate = 1.35;
                    vol = 0.8;
                }
            } else if (w.cat === 'ar' || w.cat === 'marksman' || w.cat === 'sniper') {
                if (w.cat === 'sniper' || w.id === 'kar98k') {
                    bufferToUse = globals.buffSniper;
                    rate = 1.0;
                    if (w.id === 'lw3_tundra') vol = 0.7;
                } 
                else if (w.id === 'sks') { bufferToUse = globals.buffSniper; rate = 0.85; vol = 0.6; } 
                else if (w.id === 'grau556') { 
                    bufferToUse = globals.buffSniper; 
                    rate = 1.1; 
                    const modeIdx = state.player.weaponMode || 0;
                    const isAuto = w.modes && w.modes[modeIdx] && w.modes[modeIdx].type === 'auto';
                    vol = isAuto ? 0.26 : 0.4; // 35% reduction in full-auto mode
                } 
                else if (w.id === 'odin') { bufferToUse = globals.buffGun; rate = 0.45; vol = 1.8; } 
                else if (w.id === 'as_val') { bufferToUse = globals.buffGun; rate = 0.9; vol = 0.4; }
                else if (w.id === 'm13') { bufferToUse = globals.buffGun; rate = 1.6; vol = 0.5; }
                else if (w.id === 'swarm_killer_ar') { bufferToUse = globals.buffGun; rate = 1.15; vol = 0.15; } // 70% reduction from 0.5
                else { bufferToUse = globals.buffGun; rate = 1.15; }
            }

            if (bufferToUse) {
                const src = globals.audioCtx.createBufferSource();
                src.buffer = bufferToUse;
                
                // --- Audio Random Container Logic ---
                // Randomly vary pitch (playback rate) from -8% to +3% (prevents thin glassy sounds)
                const pitchVariance = 0.92 + Math.random() * 0.11;
                src.playbackRate.setValueAtTime(rate * pitchVariance, now);
                
                const customGain = globals.audioCtx.createGain();
                
                // Randomly vary volume by +/- 10%
                const volVariance = 0.9 + Math.random() * 0.2;
                const finalVolume = vol * volVariance * state.settings.gunVolume;
                
                if (w.id === 'krm262') {
                    // Massive explosive 12-gauge shotgun blast with authoritative concussive impact
                    customGain.gain.setValueAtTime(finalVolume * 2.8, now);
                    customGain.gain.exponentialRampToValueAtTime(finalVolume * 1.2, now + 0.04);
                    customGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

                    // 1. Heavy low-frequency sub thump for visceral physical punch
                    const subOsc = globals.audioCtx.createOscillator();
                    const subGain = globals.audioCtx.createGain();
                    subOsc.type = 'triangle';
                    subOsc.frequency.setValueAtTime(170, now);
                    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.22);
                    subGain.gain.setValueAtTime(2.2 * state.settings.gunVolume, now);
                    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
                    subOsc.connect(subGain);
                    subGain.connect(globals.audioCtx.masterOut);
                    subOsc.start(now);
                    subOsc.stop(now + 0.25);

                    // 2. Explosive muzzle blast powder combustion burst
                    const noiseLen = 0.32;
                    const noiseBuf = globals.audioCtx.createBuffer(1, Math.floor(globals.audioCtx.sampleRate * noiseLen), globals.audioCtx.sampleRate);
                    const noiseData = noiseBuf.getChannelData(0);
                    for (let i = 0; i < noiseData.length; i++) {
                        noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (globals.audioCtx.sampleRate * 0.06));
                    }
                    const noiseSrc = globals.audioCtx.createBufferSource();
                    noiseSrc.buffer = noiseBuf;
                    const noiseFilter = globals.audioCtx.createBiquadFilter();
                    noiseFilter.type = 'lowpass';
                    noiseFilter.frequency.setValueAtTime(4500, now);
                    noiseFilter.Q.setValueAtTime(1.0, now);
                    const noiseGain = globals.audioCtx.createGain();
                    noiseGain.gain.setValueAtTime(1.8 * state.settings.gunVolume, now);
                    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLen);
                    noiseSrc.connect(noiseFilter);
                    noiseFilter.connect(noiseGain);
                    noiseGain.connect(globals.audioCtx.masterOut);
                    noiseSrc.start(now);

                    // 3. Crisp tactile shotgun pump-action slide rack ("chick-clack")
                    const pump1 = now + 0.24;
                    const rack1 = globals.audioCtx.createOscillator();
                    const rackG1 = globals.audioCtx.createGain();
                    rack1.type = 'sawtooth';
                    rack1.frequency.setValueAtTime(540, pump1);
                    rack1.frequency.exponentialRampToValueAtTime(180, pump1 + 0.05);
                    rackG1.gain.setValueAtTime(0.35 * state.settings.gunVolume, pump1);
                    rackG1.gain.exponentialRampToValueAtTime(0.001, pump1 + 0.06);
                    rack1.connect(rackG1);
                    rackG1.connect(globals.audioCtx.masterOut);
                    rack1.start(pump1);
                    rack1.stop(pump1 + 0.065);

                    const pump2 = now + 0.34;
                    const rack2 = globals.audioCtx.createOscillator();
                    const rackG2 = globals.audioCtx.createGain();
                    rack2.type = 'triangle';
                    rack2.frequency.setValueAtTime(320, pump2);
                    rack2.frequency.exponentialRampToValueAtTime(720, pump2 + 0.05);
                    rackG2.gain.setValueAtTime(0.4 * state.settings.gunVolume, pump2);
                    rackG2.gain.exponentialRampToValueAtTime(0.001, pump2 + 0.06);
                    rack2.connect(rackG2);
                    rackG2.connect(globals.audioCtx.masterOut);
                    rack2.start(pump2);
                    rack2.stop(pump2 + 0.065);
                } else if (w.id === 'uzi') {
                    // Shape a massive thunderous mechanical action: heavy transient peak, solid sustain body, pristine tail decay
                    customGain.gain.setValueAtTime(finalVolume * 2.0, now);
                    customGain.gain.exponentialRampToValueAtTime(finalVolume * 0.8, now + 0.05);
                    customGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
                    
                    // Procedural sub-frequency punch reinforcement
                    const subOsc = globals.audioCtx.createOscillator();
                    const subGain = globals.audioCtx.createGain();
                    subOsc.type = 'triangle'; // triangle is warmer and punchier than pure sine
                    subOsc.frequency.setValueAtTime(110, now);
                    subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
                    
                    subGain.gain.setValueAtTime(0.85 * state.settings.gunVolume, now);
                    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                    
                    subOsc.connect(subGain);
                    subGain.connect(globals.audioCtx.masterOut);
                    subOsc.start(now);
                    subOsc.stop(now + 0.13);
                } else {
                    customGain.gain.setValueAtTime(finalVolume, now);
                    if (w.id === 'gs50') {
                        customGain.gain.setTargetAtTime(0.001, now + 1, 0.1); 
                    }
                }

                // Randomly vary microphone perspective (slight panning + frequency filter damping)
                const panNode = globals.audioCtx.createStereoPanner ? globals.audioCtx.createStereoPanner() : null;
                if (panNode) {
                    panNode.pan.setValueAtTime((Math.random() - 0.5) * 0.16, now); // randomized left/right mic drift
                }

                const micFilter = globals.audioCtx.createBiquadFilter();
                micFilter.type = 'lowpass';
                if (w.id === 'krm262') {
                    micFilter.frequency.setValueAtTime(3200 + Math.random() * 400, now);
                    micFilter.Q.setValueAtTime(0.85, now);
                } else if (w.id === 'uzi') {
                    // High enough for rich crack & metallic transient details, low enough to completely damp high sizzly tail reverb
                    micFilter.frequency.setValueAtTime(2600 + Math.random() * 500, now);
                    micFilter.Q.setValueAtTime(0.7, now); // Butterworth standard flat passband
                } else {
                    // Standard mic perspective filter variation
                    micFilter.frequency.setValueAtTime(6000 + Math.random() * 8000, now);
                    micFilter.Q.setValueAtTime(0.5 + Math.random() * 1.0, now);
                }

                // Node routing
                src.connect(micFilter);
                let lastNode: AudioNode = micFilter;
                if (panNode) {
                    micFilter.connect(panNode);
                    lastNode = panNode;
                }
                lastNode.connect(customGain);
                customGain.connect(globals.audioCtx.masterOut);

                // Call of Duty style dynamic environmental echo effect disabled
                if (false) {
                    const delayTime = state.player.envEchoDelay || 0.18;
                    const feedbackDecay = state.player.envEchoDecay || 0.3;

                    try {
                        const delayNode = globals.audioCtx.createDelay(1.0);
                        delayNode.delayTime.setValueAtTime(delayTime, now);

                        const feedbackGain = globals.audioCtx.createGain();
                        feedbackGain.gain.setValueAtTime(feedbackDecay, now);

                        const echoFilter = globals.audioCtx.createBiquadFilter();
                        echoFilter.type = 'lowpass';
                        echoFilter.frequency.setValueAtTime(1800, now);

                        delayNode.connect(echoFilter);
                        echoFilter.connect(feedbackGain);
                        feedbackGain.connect(delayNode);

                        const echoOutGain = globals.audioCtx.createGain();
                        const echoVol = 1.6;
                        echoOutGain.gain.setValueAtTime(echoVol, now);

                        customGain.connect(delayNode);
                        feedbackGain.connect(echoOutGain);
                        echoOutGain.connect(globals.audioCtx.masterOut);
                    } catch (e) {
                        // Fallback safety
                    }
                }

                src.start(0);
                return;
            }
        }
    }

    const osc = globals.audioCtx.createOscillator();
    const gain = globals.audioCtx.createGain();
    osc.connect(gain); gain.connect(globals.audioCtx.masterOut);

    if (type === 'shoot') {
        osc.type = 'square'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'shoot_fast') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
        gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'hit') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
        gain.gain.setValueAtTime(0.03, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'die') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(120, now); osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
        gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'jump') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(400, now + 0.15);
        gain.gain.setValueAtTime(0.03, now); gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'damage') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
        gain.gain.setValueAtTime(0.8, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'waveStart') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'waveEnd') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
        gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
    } else if (type === 'empty_mag') {
        osc.type = 'square'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'zombie_howl') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(260, now); osc.frequency.linearRampToValueAtTime(540, now + 0.25); osc.frequency.exponentialRampToValueAtTime(140, now + 0.7);
        gain.gain.setValueAtTime(0.35, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.start(now); osc.stop(now + 0.7);
    } else if (type === 'zombie_slam') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(90, now); osc.frequency.exponentialRampToValueAtTime(25, now + 0.4);
        gain.gain.setValueAtTime(0.6, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'zombie_arrow') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(700, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        gain.gain.setValueAtTime(0.18, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'zombie_rise') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(60, now); osc.frequency.linearRampToValueAtTime(160, now + 0.35);
        gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now); osc.stop(now + 0.35);
    } else if (type === 'zombie_explode') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(180, now); osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
        gain.gain.setValueAtTime(0.7, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
    }
}

export function playSpatialSound(type: string, origin: THREE.Vector3, weaponId: string | null = null) {
    if (!globals.audioCtx) return;
    const now = globals.audioCtx.currentTime;

    // 1. Precise 3D distance and panning calculations relative to the player
    const localPos = new THREE.Vector3();
    const cameraQuat = new THREE.Quaternion();

    if (globals.yawObj) {
        localPos.copy(globals.yawObj.position);
    } else if (globals.camera) {
        localPos.copy(globals.camera.position);
    }

    if (globals.camera) {
        cameraQuat.copy(globals.camera.quaternion);
    }

    const dist = localPos.distanceTo(origin);

    // Gentler volume roll-off attenuation (70% reduced volume fading scale)
    const minD = 4.0;
    const maxD = 90.0; // Guns are extremely loud, allow travel up to 90m
    let targetVolume = 0;
    if (dist <= minD) {
        targetVolume = 1.0;
    } else if (dist >= maxD) {
        targetVolume = 0.0;
    } else {
        const ratio = (dist - minD) / (maxD - minD);
        const baseReduction = ratio * 0.3; // lose only 30% volume over most of the range (70% reduction in volume loss)
        if (ratio > 0.85) {
            const fadeRatio = (ratio - 0.85) / 0.15;
            targetVolume = (1.0 - baseReduction) * (1.0 - fadeRatio);
        } else {
            targetVolume = 1.0 - baseReduction;
        }
    }

    // Directional spatial panning
    const relativePos = origin.clone().sub(localPos);
    relativePos.applyQuaternion(cameraQuat.clone().invert());

    const horizontalDist = Math.sqrt(relativePos.x * relativePos.x + relativePos.z * relativePos.z);
    let targetPan = 0;
    if (horizontalDist > 0.1) {
        targetPan = relativePos.x / horizontalDist;
    }
    targetPan = Math.max(-1.0, Math.min(1.0, targetPan * 1.25));

    // Distant high frequency atmospheric damping (sounds muffled based on direction and range)
    let targetFilterFreq = 20000;
    if (relativePos.z > 0) {
         const angleBehind = relativePos.z / Math.max(1.0, horizontalDist);
         targetFilterFreq = THREE.MathUtils.lerp(20000, 2500, angleBehind);
    }
    if (dist > 15) {
         const airDamping = Math.min(0.85, (dist - 15) / 45);
         const distDampFreq = THREE.MathUtils.lerp(targetFilterFreq, 1200, airDamping);
         targetFilterFreq = Math.min(targetFilterFreq, distDampFreq);
    }

    // Play gunshoot but routed through our panning and distance-attenuation pipeline
    if ((type === 'shoot' || type === 'shoot_fast') && weaponId) {
        const w = WEAPONS[weaponId] || SURVIVAL_WEAPONS[Object.keys(SURVIVAL_WEAPONS).find(k=>SURVIVAL_WEAPONS[k].id===weaponId)!];
        if (w && (w.cat !== 'special' || w.id === 'swarm_killer_ar' || w.id === 'krm262')) {
            let bufferToUse = null;
            let rate = 1.0;
            let vol = 1.0;

            if (w.id === 'krm262') {
                bufferToUse = globals.buffGun || globals.buffSniper; rate = 0.72; vol = 4.2;
            } else if (w.id === 'swarm_killer_ar') {
                bufferToUse = globals.buffGun; rate = 1.7; vol = 0.33;
            } else if (w.cat === 'sidearms') {
                bufferToUse = globals.buffGun;
                if (w.id === 'gs50') { rate = 1.25; vol = 1.2; } else { rate = 1.4; vol = 0.6; }
            } else if (w.cat === 'smg') {
                bufferToUse = globals.buffGun;
                if (w.id === 'mac10') {
                    rate = 1.45; vol = 0.64;
                } else if (w.id === 'uzi') {
                    rate = 0.85; vol = 5.8;
                } else {
                    rate = 1.35; vol = 0.8;
                }
            } else if (w.cat === 'ar' || w.cat === 'marksman' || w.cat === 'sniper') {
                if (w.cat === 'sniper' || w.id === 'kar98k') {
                    bufferToUse = globals.buffSniper;
                    rate = 1.0;
                    if (w.id === 'lw3_tundra') vol = 0.7;
                } 
                else if (w.id === 'sks') { bufferToUse = globals.buffSniper; rate = 0.85; vol = 0.6; } 
                else if (w.id === 'grau556') { 
                    bufferToUse = globals.buffSniper; rate = 1.1; vol = 0.33; 
                } 
                else if (w.id === 'odin') { bufferToUse = globals.buffGun; rate = 0.45; vol = 1.8; } 
                else if (w.id === 'as_val') { bufferToUse = globals.buffGun; rate = 0.9; vol = 0.4; }
                else if (w.id === 'm13') { bufferToUse = globals.buffGun; rate = 1.6; vol = 0.5; }
                else if (w.id === 'swarm_killer_ar') { bufferToUse = globals.buffGun; rate = 1.15; vol = 0.15; }
                else { bufferToUse = globals.buffGun; rate = 1.15; }
            }

            if (bufferToUse) {
                const src = globals.audioCtx.createBufferSource();
                src.buffer = bufferToUse;

                const pitchVariance = 0.92 + Math.random() * 0.11;
                src.playbackRate.setValueAtTime(rate * pitchVariance, now);

                const customGain = globals.audioCtx.createGain();
                const volVariance = 0.9 + Math.random() * 0.2;
                const finalVolume = vol * volVariance * state.settings.gunVolume * targetVolume;
                customGain.gain.setValueAtTime(finalVolume, now);

                const panNode = globals.audioCtx.createStereoPanner ? globals.audioCtx.createStereoPanner() : null;
                if (panNode) {
                    panNode.pan.setValueAtTime(targetPan, now);
                }

                const filterNode = globals.audioCtx.createBiquadFilter();
                filterNode.type = 'lowpass';
                filterNode.frequency.setValueAtTime(targetFilterFreq, now);

                src.connect(filterNode);
                let lastNode: AudioNode = filterNode;
                if (panNode) {
                    filterNode.connect(panNode);
                    lastNode = panNode;
                }
                lastNode.connect(customGain);
                customGain.connect(globals.audioCtx.masterOut || globals.audioCtx.destination);

                // Spatial Gunshot Echo Loop (Call of Duty Style) disabled
                if (false) {
                    const delayTime = state.player.envEchoDelay || 0.18;
                    const feedbackDecay = state.player.envEchoDecay || 0.3;

                    try {
                        const delayNode = globals.audioCtx.createDelay(1.0);
                        delayNode.delayTime.setValueAtTime(delayTime, now);

                        const feedbackGain = globals.audioCtx.createGain();
                        feedbackGain.gain.setValueAtTime(feedbackDecay, now);

                        const echoFilter = globals.audioCtx.createBiquadFilter();
                        echoFilter.type = 'lowpass';
                        echoFilter.frequency.setValueAtTime(Math.min(targetFilterFreq, 1800), now); // atmospheric absorption

                        delayNode.connect(echoFilter);
                        echoFilter.connect(feedbackGain);
                        feedbackGain.connect(delayNode);

                        const echoOutGain = globals.audioCtx.createGain();
                        const echoVol = 1.6;
                        echoOutGain.gain.setValueAtTime(echoVol, now);

                        customGain.connect(delayNode);
                        feedbackGain.connect(echoOutGain);
                        echoOutGain.connect(globals.audioCtx.masterOut || globals.audioCtx.destination);
                    } catch (e) {
                        // Fallback safety
                    }
                }

                src.start(0);
                return;
            }
        }
    }

    // Default synth sound if no weapon buffer decoded yet
    const osc = globals.audioCtx.createOscillator();
    const gain = globals.audioCtx.createGain();
    const panNode = globals.audioCtx.createStereoPanner ? globals.audioCtx.createStereoPanner() : null;
    
    osc.connect(gain);
    let lastNode: AudioNode = gain;
    if (panNode) {
        gain.connect(panNode);
        panNode.pan.setValueAtTime(targetPan, now);
        lastNode = panNode;
    }
    lastNode.connect(globals.audioCtx.masterOut || globals.audioCtx.destination);

    const finalVolume = 0.05 * targetVolume;
    if (type === 'shoot') {
        osc.type = 'square'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(finalVolume, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'shoot_fast') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
        gain.gain.setValueAtTime(finalVolume, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
    }
}
