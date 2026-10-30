import * as THREE from 'three';
import { globals } from './globals';
import { sendWebRTCSignal, myPlayerId, otherPlayers } from './network';
import { initAudio } from './audio/AudioSys';

export interface VoicePeer {
  id: string;
  pc: RTCPeerConnection;
  audioElement?: HTMLAudioElement;
  sourceNode?: MediaStreamAudioSourceNode | null;
  noiseFilterNode?: BiquadFilterNode | null;
  speechFilterNode?: BiquadFilterNode | null;
  gainNode?: GainNode | null;
  panNode?: StereoPannerNode | null;
  filterNode?: BiquadFilterNode | null;
}

export let proximityChatEnabled = false;

let onProximityToggleCallback: ((enabled: boolean) => void) | null = null;

export function setProximityToggleCallback(cb: (enabled: boolean) => void) {
  onProximityToggleCallback = cb;
  if (onProximityToggleCallback) onProximityToggleCallback(proximityChatEnabled);
}

export function setProximityChat(enabled: boolean) {
  proximityChatEnabled = enabled;
  if (onProximityToggleCallback) onProximityToggleCallback(proximityChatEnabled);
}

export function toggleProximityChatGlobal() {
  const targetState = !proximityChatEnabled;
  import('./network').then(({ sendToggleProximityChat }) => {
    sendToggleProximityChat(targetState);
  });
}

const peers = new Map<string, VoicePeer>();
let localStream: MediaStream | null = null;
let isMicMuted = true;

// Callbacks to notify UI state changes
let onStatusChangeCallback: ((status: 'OFF' | 'MUTED' | 'ACTIVE') => void) | null = null;

export function setVoiceStatusCallback(cb: (status: 'OFF' | 'MUTED' | 'ACTIVE') => void) {
  onStatusChangeCallback = cb;
  notifyStatus();
}

function notifyStatus() {
  if (!onStatusChangeCallback) return;
  if (!localStream) {
    onStatusChangeCallback('OFF');
  } else if (isMicMuted) {
    onStatusChangeCallback('MUTED');
  } else {
    onStatusChangeCallback('ACTIVE');
  }
}

export function getLocalStream() {
  return localStream;
}

export function isMuted() {
  return isMicMuted;
}

export function reconnectAllPeers() {
  // Connect with all other players
  for (const otherId of otherPlayers.keys()) {
    initiateCall(otherId);
  }
}

function optimizeAudioSDP(sdp?: string): string {
  if (!sdp) return '';
  return sdp.replace(/a=fmtp:(\d+)\s+([^ \r\n]+)/g, (match, pt, config) => {
    if (match.includes('opus')) {
      return `a=fmtp:${pt} ${config};stereo=0;useinbandfec=1;maxaveragebitrate=24000;ptime=20;minptime=10`;
    }
    return match;
  });
}

export async function initiateCall(targetId: string) {
  // Close existing peer connection to this target if any
  closePeer(targetId);

  const pc = createPeerConnection(targetId);
  if (!pc) return;

  // If we have a local stream, add its tracks regardless of temporary mute state to bypass negotiation lag
  if (localStream) {
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream!);
    });
  }

  try {
    const offer = await pc.createOffer({
      offerToReceiveAudio: true
    });
    const modifiedOffer = {
      type: offer.type,
      sdp: optimizeAudioSDP(offer.sdp)
    };
    await pc.setLocalDescription(modifiedOffer);
    
    sendWebRTCSignal(targetId, {
      type: 'offer',
      sdp: modifiedOffer
    });
  } catch (err) {
    console.error(`Error creating WebRTC offer for ${targetId}:`, err);
  }
}

function createPeerConnection(targetId: string): RTCPeerConnection {
  const config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  const pc = new RTCPeerConnection(config);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendWebRTCSignal(targetId, {
        type: 'candidate',
        candidate: event.candidate
      });
    }
  };

  pc.ontrack = (event) => {
    console.log(`Received remote track from player ${targetId}`);
    const remoteStream = event.streams[0];
    
    // Ensure peer is created and registered
    let peer = peers.get(targetId);
    if (!peer) {
      peer = { id: targetId, pc };
      peers.set(targetId, peer);
    }

    if (peer) {
      // 1. Maintain Chromium/browser connection pipe by playing track natively but muted
      if (peer.audioElement) {
        peer.audioElement.srcObject = remoteStream;
      } else {
        const audio = document.createElement('audio');
        audio.id = `voice-audio-${targetId}`;
        audio.style.display = 'none';
        audio.srcObject = remoteStream;
        audio.muted = true; // Mute element to prevent raw duplicated unspatial noise
        audio.autoplay = true;
        document.body.appendChild(audio);
        peer.audioElement = audio;

        // Force autoplay permission bypass
        audio.play().catch(err => {
          console.warn(`Autoplay blocked for player ${targetId}:`, err);
          const runUnlock = () => {
            audio.play().then(() => {
              document.removeEventListener('click', runUnlock);
            }).catch(e => console.error(e));
          };
          document.addEventListener('click', runUnlock);
        });
      }

      // 2. Set up high-quality spatialized Web Audio API node routing
      // Initialize Context if it doesn't exist
      initAudio();

      if (globals.audioCtx) {
        const audioCtx = globals.audioCtx;
        try {
          if (peer.sourceNode) {
            peer.sourceNode.disconnect();
          }
          if (peer.noiseFilterNode) {
            peer.noiseFilterNode.disconnect();
          }
          if (peer.speechFilterNode) {
            peer.speechFilterNode.disconnect();
          }
          
          const sourceNode = audioCtx.createMediaStreamSource(remoteStream);

          // Real-time voice isolation clean-up (highpass @ 150Hz cuts out sub-bass room rumble/laptop fan noise)
          const noiseFilterNode = audioCtx.createBiquadFilter();
          noiseFilterNode.type = 'highpass';
          noiseFilterNode.frequency.setValueAtTime(150, audioCtx.currentTime);
          
          // Dedicated voice bandpass filter (300Hz - 3400Hz) to filter background hiss and noise, isolating clean human vocals
          const speechFilterNode = audioCtx.createBiquadFilter();
          speechFilterNode.type = 'bandpass';
          speechFilterNode.frequency.setValueAtTime(1850, audioCtx.currentTime);
          speechFilterNode.Q.setValueAtTime(0.55, audioCtx.currentTime);

          const filterNode = audioCtx.createBiquadFilter();
          filterNode.type = 'lowpass';
          filterNode.frequency.setValueAtTime(20000, audioCtx.currentTime);
          
          const panNode = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
          if (panNode) {
            panNode.pan.setValueAtTime(0.0, audioCtx.currentTime);
          }

          const gainNode = audioCtx.createGain();
          gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);

          // Route: StreamSource -> NoiseFilter (highpass) -> SpeechFilter (bandpass) -> Distance filter -> Panner -> Gain -> MasterCompressor
          sourceNode.connect(noiseFilterNode);
          noiseFilterNode.connect(speechFilterNode);
          speechFilterNode.connect(filterNode);
          
          let lastNode: AudioNode = filterNode;
          if (panNode) {
            filterNode.connect(panNode);
            lastNode = panNode;
          }
          lastNode.connect(gainNode);
          
          const dest = audioCtx.masterOut || audioCtx.destination;
          gainNode.connect(dest);

          peer.sourceNode = sourceNode;
          peer.noiseFilterNode = noiseFilterNode;
          peer.speechFilterNode = speechFilterNode;
          peer.gainNode = gainNode;
          peer.panNode = panNode;
          peer.filterNode = filterNode;

          console.log(`Clean spatialized speech channel established for player ${targetId}`);
        } catch (audioErr) {
          console.error(`Failed to build Web Audio layout for player ${targetId}:`, audioErr);
        }
      }
    }
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
      console.warn(`WebRTC connection to ${targetId} lost.`);
    }
  };

  peers.set(targetId, { id: targetId, pc });
  return pc;
}

export async function handleIncomingSignal(senderId: string, signal: any) {
  let peer = peers.get(senderId);

  if (signal.type === 'offer') {
    closePeer(senderId);

    const pc = createPeerConnection(senderId);
    if (!pc) return;

    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream!);
      });
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await pc.createAnswer();
      const modifiedAnswer = {
        type: answer.type,
        sdp: optimizeAudioSDP(answer.sdp)
      };
      await pc.setLocalDescription(modifiedAnswer);

      sendWebRTCSignal(senderId, {
        type: 'answer',
        sdp: modifiedAnswer
      });
    } catch (err) {
      console.error(`Error handling offer from ${senderId}:`, err);
    }
  } else if (signal.type === 'answer') {
    if (peer && peer.pc) {
      try {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } catch (err) {
        console.error(`Error setting remote description from ${senderId}:`, err);
      }
    }
  } else if (signal.type === 'candidate') {
    if (peer && peer.pc && signal.candidate) {
      try {
        await peer.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } catch (err) {
        console.error(`Error adding ICE candidate from ${senderId}:`, err);
      }
    }
  }
}

export function closePeer(targetId: string) {
  const peer = peers.get(targetId);
  if (peer) {
    try {
      if (peer.pc) {
        peer.pc.close();
      }
    } catch (e) {
      console.error(e);
    }
    if (peer.audioElement) {
      try {
        peer.audioElement.remove();
      } catch (e) {
        console.error(e);
      }
    }
    try {
      if (peer.sourceNode) peer.sourceNode.disconnect();
      if (peer.noiseFilterNode) peer.noiseFilterNode.disconnect();
      if (peer.speechFilterNode) peer.speechFilterNode.disconnect();
      if (peer.gainNode) peer.gainNode.disconnect();
      if (peer.panNode) peer.panNode.disconnect();
      if (peer.filterNode) peer.filterNode.disconnect();
    } catch (e) {
      console.error(e);
    }
    peers.delete(targetId);
  }
}

export function cleanupAllVoice() {
  for (const pId of peers.keys()) {
    closePeer(pId);
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  isMicMuted = true;
  notifyStatus();
}

export async function toggleMicrophone() {
  if (!localStream) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          latency: 0.01
        } as any,
        video: false
      });
      isMicMuted = false;
      notifyStatus();
      reconnectAllPeers();
    } catch (err) {
      console.error('Failed to get microphone stream:', err);
      notifyStatus();
      throw err;
    }
  } else {
    isMicMuted = !isMicMuted;
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !isMicMuted;
    });
    notifyStatus();
    reconnectAllPeers();
  }
}

export function updateProximityAudio() {
  if (!globals.audioCtx) return;
  const audioCtx = globals.audioCtx;
  const now = audioCtx.currentTime;

  peers.forEach((peer, targetId) => {
    // If proximity chat is severed or toggled off, reset everything instantly to flat 2D full volume
    if (!proximityChatEnabled) {
      if (peer.gainNode) {
        peer.gainNode.gain.setValueAtTime(1.0, now);
      }
      if (peer.panNode) {
        peer.panNode.pan.setValueAtTime(0.0, now);
      }
      if (peer.filterNode) {
        peer.filterNode.frequency.setValueAtTime(20000, now);
      }
      return;
    }

    const peerMesh = otherPlayers.get(targetId);
    if (!peerMesh || !globals.yawObj || !globals.camera) {
      // If we cannot locate this peer, mute their channel to prevent infinite floating noise
      if (peer.gainNode) {
        peer.gainNode.gain.setValueAtTime(0.0, now);
      }
      return;
    }

    // 1. Precise 3D distance calculations
    const localPos = globals.yawObj.position;
    const peerPos = peerMesh.position;
    const dist = localPos.distanceTo(peerPos);

    // Gentler volume roll-off attenuation (volume reduction decreased by 70%)
    const minD = 4.0;
    const maxD = 60.0;
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

    // 2. Relative positioning transformation using local Camera space
    const relativePos = peerPos.clone().sub(globals.camera.position);
    relativePos.applyQuaternion(globals.camera.quaternion.clone().invert());

    // relativePos.x: Left (-) / Right (+)
    // relativePos.z: Front (-) / Back (+)
    const horizontalDist = Math.sqrt(relativePos.x * relativePos.x + relativePos.z * relativePos.z);
    let targetPan = 0;
    if (horizontalDist > 0.1) {
      targetPan = relativePos.x / horizontalDist;
    }
    // Boost spatial panning separation slightly for richer spatial sensation
    targetPan = Math.max(-1.0, Math.min(1.0, targetPan * 1.25));

    // 3. Realistic Head-Shadow Filter (acoustical muffling when speaking from behind head)
    let targetFilterFreq = 20000;
    if (relativePos.z > 0) {
      const angleBehind = relativePos.z / Math.max(1.0, horizontalDist); // 0 to 1
      targetFilterFreq = THREE.MathUtils.lerp(20000, 1600, angleBehind);
    }

    // Atmospheric frequency absorption (distant voices lose high frequencies first)
    if (dist > 12) {
      const airDamping = Math.min(0.85, (dist - 12) / 28);
      const distDampFreq = THREE.MathUtils.lerp(targetFilterFreq, 1100, airDamping);
      targetFilterFreq = Math.min(targetFilterFreq, distDampFreq);
    }

    // Apply properties smoothly
    if (peer.gainNode) {
      peer.gainNode.gain.setTargetAtTime(targetVolume, now, 0.1);
    }
    if (peer.panNode) {
      peer.panNode.pan.setTargetAtTime(targetPan, now, 0.1);
    }
    if (peer.filterNode) {
      peer.filterNode.frequency.setTargetAtTime(targetFilterFreq, now, 0.1);
    }
  });
}
