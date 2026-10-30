import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { WEAPONS, SURVIVAL_WEAPONS } from '../config/weapons';
import { GUN_MODELS } from '../config/Gunposition';
import { globals } from '../globals';
import { buildProceduralWeapon } from './ProceduralWeapons';

let lastRequestedId = '';
const modelCache: Record<string, THREE.Group> = {};
const loadingPromises: Record<string, Promise<THREE.Group>> = {};

const loader = new GLTFLoader();

function loadWeaponModel(w: { id: string; modelUrl?: string }): Promise<THREE.Group> {
    if (!w.modelUrl) {
        const fallback = buildProceduralWeapon(w as any);
        modelCache[w.id] = fallback;
        return Promise.resolve(fallback);
    }
    if (w.id in loadingPromises) return loadingPromises[w.id];

    const safeUrl = encodeURI(w.modelUrl);
    const promise = new Promise<THREE.Group>((resolve) => {
        loader.load(
            safeUrl,
            (gltf) => {
                modelCache[w.id] = gltf.scene;
                resolve(gltf.scene);
            },
            undefined,
            (err) => {
                console.warn(`Fallback to procedural for ${w.id}:`, err);
                const fallback = buildProceduralWeapon(w as any);
                modelCache[w.id] = fallback;
                resolve(fallback);
            }
        );
    });

    loadingPromises[w.id] = promise;
    return promise;
}

export async function preloadAllWeapons() {
    // Preload immediate starter guns first so game start is instantaneous
    const priorityGuns = ['pistol', 'ak47', 'smg'];
    for (const id of priorityGuns) {
        const w = WEAPONS[id] || SURVIVAL_WEAPONS[id];
        if (w?.modelUrl) {
            loadWeaponModel(w);
        }
    }
}

export function buildWeaponMesh(id: string) {
    lastRequestedId = id;
    
    // Clear existing meshes immediately to prevent 'tangling' while loading
    globals.viewmodel.clear();
    globals.currentWeaponMesh = null;
    
    let w = WEAPONS[id];
    if (!w) {
        const survKey = Object.keys(SURVIVAL_WEAPONS).find(k => SURVIVAL_WEAPONS[k].id === id);
        if (survKey) w = SURVIVAL_WEAPONS[survKey];
    }
    if (!w) return;

    if (w.modelUrl && !state.settings.disableRealisticGuns) {
        if (modelCache[id]) {
            applyModelToViewmodel(id, modelCache[id]);
        } else {
            // Immediately display the lightweight procedural model so shooting/aiming works with zero delay
            const backupMesh = buildProceduralWeapon(w);
            globals.currentWeaponMesh = backupMesh;
            globals.viewmodel.add(backupMesh);

            // Fetch GLB in parallel and seamlessly swap when ready
            loadWeaponModel(w).then((scene) => {
                if (lastRequestedId === id) {
                    globals.viewmodel.clear();
                    applyModelToViewmodel(id, scene);
                }
            });
        }
    } else {
        const mesh = buildProceduralWeapon(w);
        globals.currentWeaponMesh = mesh;
        globals.viewmodel.add(mesh);
    }
}

function applyModelToViewmodel(id: string, originalMesh: THREE.Group) {
    const mesh = SkeletonUtils.clone(originalMesh);
    const modelOptions = GUN_MODELS[id];
    
    if (modelOptions) {
        if (modelOptions.scale !== undefined) {
            mesh.scale.set(modelOptions.scale, modelOptions.scale, modelOptions.scale);
        }
        if (modelOptions.modelPos) {
            mesh.position.set(modelOptions.modelPos[0], modelOptions.modelPos[1], modelOptions.modelPos[2]);
        }
        if (modelOptions.modelRot) {
            mesh.rotation.set(
                modelOptions.modelRot[0],
                modelOptions.modelRot[1],
                modelOptions.modelRot[2]
            );
        }
    } else {
        mesh.scale.set(0.1, 0.1, 0.1);
        mesh.rotation.y = Math.PI;
    }
    
    globals.currentWeaponMesh = mesh;
    
    // Enhance materials for realism
    const envInt = modelOptions?.envMapIntensity !== undefined ? modelOptions.envMapIntensity : 1.5;
    mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            const m = (child as THREE.Mesh).material;
            if (Array.isArray(m)) {
                m.forEach(mat => enhanceMaterial(mat, envInt, id));
            } else {
                enhanceMaterial(m, envInt, id);
            }
        }
    });

    globals.viewmodel.add(mesh);
}

import { state } from '../state';

function enhanceMaterial(mat: THREE.Material, envInt: number, id: string) {
    if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        if (id === 'mosquito') {
            mat.color.setHex(0xffaa00);
            mat.metalness = 1.0;
            mat.roughness = 0.1;
        } else {
            mat.metalness = state.settings.gunMetalness !== undefined ? state.settings.gunMetalness : 0.97;
            mat.roughness = 0.2;
        }
        mat.envMapIntensity = envInt;
        mat.envMap = null;
        mat.needsUpdate = true;
    }
}
