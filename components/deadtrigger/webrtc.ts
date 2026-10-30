export let proximityChatEnabled = false;

export function setProximityToggleCallback(cb: (enabled: boolean) => void) {
  cb(false);
}

export function setProximityChat(enabled: boolean) {
  proximityChatEnabled = enabled;
}

export function toggleProximityChatGlobal() {}

export function setVoiceStatusCallback(cb: (status: 'OFF' | 'MUTED' | 'ACTIVE') => void) {
  cb('OFF');
}

export function getLocalStream() {
  return null;
}

export function isMuted() {
  return true;
}

export function reconnectAllPeers() {}

export async function initiateCall(_targetId: string) {}

export async function handleIncomingSignal(_senderId: string, _signal: any) {}

export function closePeer(_targetId: string) {}

export function cleanupAllVoice() {}

export async function toggleMicrophone() {}

export function updateProximityAudio() {}
