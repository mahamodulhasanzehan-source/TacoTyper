import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { WEAPONS, SURVIVAL_WEAPONS } from '../config/weapons';
import { GUN_MODELS } from '../config/Gunposition';
import { globals } from '../globals';
import { buildProceduralWeapon } from './ProceduralWeapons';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/gltf/');

export function createGLTFLoader(): GLTFLoader {
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    return loader;
}

let lastRequestedId = '';
const modelCache: Record<string, THREE.Group | undefined> = {};
const loadingPromises: Record<string, Promise<THREE.Group> | undefined> = {};

const checkedUrls: Record<string, boolean> = {};

async function isUrlValidGlb(url: string): Promise<boolean> {
    if (checkedUrls[url] !== undefined) return checkedUrls[url];
    try {
        const response = await fetch(url);
        if (!response.ok) {
            checkedUrls[url] = false;
            return false;
        }
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength < 4) {
            checkedUrls[url] = false;
            return false;
        }
        const view = new DataView(buffer);
        const magic = view.getUint32(0, false);
        const isValid = magic === 0x676C5446; // "glTF" magic number
        checkedUrls[url] = isValid;
        return isValid;
    } catch {
        checkedUrls[url] = false;
        return false;
    }
}

export async function preloadAllWeapons() {
    const allWeapons = { ...WEAPONS, ...SURVIVAL_WEAPONS };
    const loader = createGLTFLoader();
    
    // Find unique weapons that require a modelUrl and prevent duplicate preloads
    const uniqueWeapons = Object.values(allWeapons).filter((w, index, self) => 
        w.modelUrl && self.findIndex(x => x.id === w.id) === index
    );

    // Stagger loading sequentially in the background to avoid connection saturation
    for (const w of uniqueWeapons) {
        if (loadingPromises[w.id]) continue;
        
        // Fast skip of known corrupted models, and perform header verification
        const isValid = await isUrlValidGlb(w.modelUrl!);
        if (!isValid) {
            console.warn(`Skipped loading corrupted or invalid model for ${w.id}: ${w.modelUrl}`);
            const fallback = buildProceduralWeapon(w);
            modelCache[w.id] = fallback;
            loadingPromises[w.id] = Promise.resolve(fallback);
            continue;
        }

        const promise = new Promise<THREE.Group>((resolve) => {
            loader.load(w.modelUrl!, (gltf) => {
                modelCache[w.id] = gltf.scene;
                resolve(gltf.scene);
            }, undefined, (err) => {
                console.error(`Failed to preload model for ${w.id}:`, err);
                const fallback = buildProceduralWeapon(w);
                modelCache[w.id] = fallback;
                resolve(fallback);
            });
        });
        loadingPromises[w.id] = promise;
        
        // Wait for this specific gltf to load before initiating the next HTTP request
        await promise;
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
            // Immediately show the backup procedural model with no custom position/offsets applied
            const backupMesh = buildProceduralWeapon(w);
            globals.currentWeaponMesh = backupMesh;
            globals.viewmodel.add(backupMesh);

            isUrlValidGlb(w.modelUrl!).then((isValid) => {
                if (lastRequestedId !== id) return;
                if (!isValid) {
                    console.warn(`Using procedural backup for invalid model of ${id}`);
                    return;
                }

                if (loadingPromises[id]) {
                    loadingPromises[id].then((scene) => {
                        if (lastRequestedId !== id) return;
                        globals.viewmodel.clear();
                        applyModelToViewmodel(id, scene);
                    });
                } else {
                    const loader = createGLTFLoader();
                    const promise = new Promise<THREE.Group>((resolve) => {
                        loader.load(w.modelUrl!, (gltf) => {
                            modelCache[id] = gltf.scene;
                            if (lastRequestedId === id) {
                                globals.viewmodel.clear();
                                applyModelToViewmodel(id, gltf.scene);
                            }
                            resolve(gltf.scene);
                        }, undefined, (err) => {
                            console.error(`Failed to load model for ${id}:`, err);
                            const fallback = buildProceduralWeapon(w);
                            resolve(fallback);
                        });
                    });
                    loadingPromises[id] = promise;
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
