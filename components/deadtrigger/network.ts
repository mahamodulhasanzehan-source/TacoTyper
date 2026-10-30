import * as THREE from 'three';

export const otherPlayers = new Map<string, THREE.Group>();
export const isMultiplayer = false;
export const myPlayerId = 'solo_player';

export function initNetwork() {
  // Solo arena mode: No remote server or WebSocket needed
}

export function sendPlayerUpdate() {}
export function sendPlayerShoot(_origin: THREE.Vector3, _dir: THREE.Vector3, _weaponId?: string, _hitPoint?: THREE.Vector3) {}
export function sendPlayerDamage(_targetId: string, _damage: number, _weaponId: string, _hitPoint?: THREE.Vector3) {}
export function broadcastTimeMode(_timeMode: 'auto' | 'night' | 'day') {}
export function sendZombieDamage(_zombieId: string, _damage: number, _isHeadshot: boolean, _point: THREE.Vector3 | null) {}
export function sendToggleSpawns() {}
export function sendChatMessage(_text: string) {}
export function sendWebRTCSignal(_targetId: string, _signal: any) {}
export function sendToggleProximityChat(_enabled: boolean) {}
