import { state } from './state';
import { globals } from './globals';
import * as THREE from 'three';
import { WEAPONS, getWeaponTracerColor } from './config/weapons';
import { spawnSyncedZombie } from './entities/ZombieManager';
import { createHitscanTrail, createParticles } from './entities/Particles';
import { playSound, playSpatialSound } from './audio/AudioSys';
import { updateSurvivalHUD } from './ui/UIUtils';
import { updateEnvironmentLighting } from './core/Engine';
import { createPlayerModel, PlayerModelResult } from './entities/PlayerModelFactory';

let ws: WebSocket | null = null;
export const otherPlayers = new Map<string, THREE.Group>();
export let isMultiplayer = false;
export let myPlayerId = '';

export function initNetwork() {
  isMultiplayer = false;
  myPlayerId = 'player-solo';
}

export function sendPlayerUpdate() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    if (globals.yawObj) {
      const isDead = (globals as any).isDead;
      const k = state.keys || {};
      const isMoving = !!(k['KeyW'] || k['KeyS'] || k['KeyA'] || k['KeyD'] || (state.player && Math.hypot(state.player.velocity.x, state.player.velocity.z) > 0.05));
      const isSprinting = !!(k['ShiftLeft'] || k['ShiftRight']);
      
      let weaponId = 'pistol';
      if (state.player) {
        weaponId = state.player.activeSlot === 1 ? state.player.primary : state.player.secondary;
      }
      if (state.gameMode === 'survival' && state.survival?.activeType && state.survival.inventory[state.survival.activeType]) {
        weaponId = state.survival.inventory[state.survival.activeType].id || weaponId;
      }

      ws.send(JSON.stringify({
        type: 'update',
        x: globals.yawObj.position.x,
        y: isDead ? -999 : globals.yawObj.position.y,
        z: globals.yawObj.position.z,
        rot: globals.yawObj.rotation.y,
        pitch: globals.pitchObj ? globals.pitchObj.rotation.x : 0,
        weaponId: weaponId,
        health: state.survival?.health !== undefined ? state.survival.health : 1000,
        maxHealth: state.survival?.maxHealth !== undefined ? state.survival.maxHealth : 1000,
        isMoving,
        isSprinting
      }));
    }
  }
}

export function sendPlayerShoot(origin: THREE.Vector3, dir: THREE.Vector3, weaponId?: string, hitPoint?: THREE.Vector3) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'shoot',
      origin: { x: origin.x, y: origin.y, z: origin.z },
      dir: { x: dir.x, y: dir.y, z: dir.z },
      weaponId: weaponId || 'pistol',
      hitPoint: hitPoint ? { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z } : undefined
    }));
  }
}

export function sendPlayerDamage(targetId: string, damage: number, weaponId: string, hitPoint?: THREE.Vector3) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'damagePlayer',
      targetId,
      damage,
      weaponId,
      hitPoint: hitPoint ? { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z } : undefined
    }));
  }
}

export function broadcastTimeMode(timeMode: 'auto' | 'night' | 'day') {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'setTimeMode',
      timeMode
    }));
  }
}

export function sendZombieDamage(zombieId: string, damage: number, isHeadshot: boolean, point: THREE.Vector3 | null) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'damageZombie',
      id: zombieId,
      damage,
      isHeadshot,
      point: point ? { x: point.x, y: point.y, z: point.z } : null
    }));
  }
}

export function sendToggleSpawns() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'toggleSpawns' }));
  }
}

export function sendChatMessage(text: string) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'chat', text }));
  }
}

export function sendWebRTCSignal(targetId: string, signal: any) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'webrtc_signal', targetId, signal }));
  }
}

export function sendToggleProximityChat(enabled: boolean) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'toggleProximityChat', enabled }));
  }
}

function syncZombiesFromServer(szArray: any[]) {
  if (!globals.scene || !globals.yawObj) return;
  const serverIds = new Set(szArray.map((sz: any) => sz.id));
  
  // 1. Remove local zombies that are no longer on the server
  for (let i = state.entities.zombies.length - 1; i >= 0; i--) {
    const lz = state.entities.zombies[i];
    if (lz.id && !serverIds.has(lz.id)) {
      globals.scene.remove(lz.mesh);
      state.entities.zombies.splice(i, 1);
    }
  }

  // 2. Add or update zombie positions
  szArray.forEach((sz: any) => {
    let lz = state.entities.zombies.find(z => z.id === sz.id);
    if (!lz) {
      lz = spawnSyncedZombie(sz.id, sz.type, sz.x, sz.z, sz.hp, sz.maxHp);
    }
    
    if (lz) {
      const prevX = lz.lastX !== undefined ? lz.lastX : sz.x;
      const prevZ = lz.lastZ !== undefined ? lz.lastZ : sz.z;
      const distMoved = Math.hypot(sz.x - prevX, sz.z - prevZ);
      lz.isMoving = distMoved > 0.005;
      lz.lastX = sz.x;
      lz.lastZ = sz.z;

      lz.mesh.position.set(sz.x, 0, sz.z);
      
      let targetX = globals.yawObj ? globals.yawObj.position.x : sz.x;
      let targetZ = globals.yawObj ? globals.yawObj.position.z : sz.z;
      if (globals.yawObj) {
        let minDist = Math.sqrt((globals.yawObj.position.x - sz.x)**2 + (globals.yawObj.position.z - sz.z)**2);
        otherPlayers.forEach((pMesh) => {
          const dist = Math.sqrt((pMesh.position.x - sz.x)**2 + (pMesh.position.z - sz.z)**2);
          if (dist < minDist) {
            minDist = dist;
            targetX = pMesh.position.x;
            targetZ = pMesh.position.z;
          }
        });
      }
      lz.mesh.lookAt(targetX, 0, targetZ);
      
      lz.hp = sz.hp;
      lz.maxHp = sz.maxHp;
      
      const healthRatio = Math.max(0, lz.hp / lz.maxHp);
      if (lz.eyeMaterials) {
        lz.eyeMaterials.forEach((mat: THREE.MeshStandardMaterial) => {
          mat.emissiveIntensity = healthRatio * 2.0;
        });
      }
      
      if (lz.hp < lz.maxHp) {
        if (lz.hpGroup) lz.hpGroup.visible = true;
        if (lz.fgMesh && lz.barWidth) {
          const ratio = Math.max(0, lz.hp / lz.maxHp);
          lz.fgMesh.scale.x = ratio;
          lz.fgMesh.position.x = -lz.barWidth * (1 - ratio) * 0.5;
        }
      } else {
        if (lz.hpGroup) lz.hpGroup.visible = false;
      }
    }
  });
}

function addPlayer(id: string, x: number, y: number, z: number, rot: number, pitch = 0, weaponId = 'pistol', health = 1000, maxHealth = 1000) {
  if (!globals.scene || otherPlayers.has(id)) return;
  const playerRes = createPlayerModel(id);
  const group = playerRes.root;
  group.position.set(x, y - 1, z); // Adjust from camera eye level to ground base
  group.rotation.y = rot;
  group.userData.isPlayer = true;
  group.userData.playerId = id;
  group.userData.targetPos = group.position.clone();
  group.userData.targetRot = rot;
  group.userData.targetPitch = pitch;
  group.userData.playerModel = playerRes;
  group.userData.isMoving = false;
  group.userData.isSprinting = false;
  group.userData.animTime = 0;

  playerRes.setWeapon(weaponId);
  playerRes.setHealth(health, maxHealth);

  globals.scene.add(group);
  otherPlayers.set(id, group);
}

function updatePlayer(
  id: string, 
  x: number, 
  y: number, 
  z: number, 
  rot: number, 
  pitch?: number, 
  weaponId?: string, 
  health?: number, 
  maxHealth?: number, 
  isMoving?: boolean, 
  isSprinting?: boolean
) {
  const group = otherPlayers.get(id);
  if (group) {
    group.userData.targetPos = new THREE.Vector3(x, y - 1, z);
    group.userData.targetRot = rot;
    if (pitch !== undefined) group.userData.targetPitch = pitch;
    if (isMoving !== undefined) group.userData.isMoving = isMoving;
    if (isSprinting !== undefined) group.userData.isSprinting = isSprinting;

    const model = group.userData.playerModel as PlayerModelResult | undefined;
    if (model) {
      if (weaponId) model.setWeapon(weaponId);
      if (health !== undefined) model.setHealth(health, maxHealth || 1000);
    }
  }
}

function removePlayer(id: string) {
  const mesh = otherPlayers.get(id);
  if (mesh && globals.scene) {
    globals.scene.remove(mesh);
    otherPlayers.delete(id);
  }
}
