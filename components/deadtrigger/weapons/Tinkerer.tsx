import { useState, useRef, useEffect, CSSProperties } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { WEAPONS, SURVIVAL_WEAPONS } from '../config/weapons';
import { GUN_MODELS, GunModelConfig } from '../config/Gunposition';
import { state } from '../state';
import { getActiveWeaponId } from '../Utils';

export function getSprintDefaults(activeId: string, cat: string): { pos: [number, number, number], rot: [number, number, number] } {
    if (activeId === 'mosquito' || activeId === 'kar98k') {
        return { pos: [0, 0, 0], rot: [0, 0, 0] };
    }
    const isUptiltSMG = cat === 'smg' || activeId === 'swarm_killer_ar' || activeId === 'swarm_killer_smg';
    if (isUptiltSMG) {
        let pos: [number, number, number] = [0.15, 0.22, 0.05];
        let rot: [number, number, number] = [1.22, 0, 0];
        if (activeId === 'uzi') {
            pos = [1.35, 0.45, 1.95];
        } else if (activeId === 'mac10') {
            pos = [0.58, 0.78, 0.55];
        } else if (activeId === 'swarm_killer_ar') {
            pos = [0.78, 0.22, 0.35];
        }
        return { pos, rot };
    } else {
        let pos: [number, number, number] = [-0.16, 0, 0.05];
        let rot: [number, number, number] = [0, 1.22, 0];
        if (activeId === 'pistol') {
            pos = [-0.16, -0.25, 0.05];
        } else if (activeId === 'gs50') {
            pos = [-0.16, -0.22, 0.32];
        } else if (activeId === 'ak47') {
            pos = [-1.65, -0.75, 0.50];
        } else if (activeId === 'fal') {
            pos = [-2.15, -0.45, 0.45];
        } else if (activeId === 'odin') {
            pos = [-0.28, 0, 0.05];
        } else if (activeId === 'sks') {
            pos = [-0.24, -0.15, 0.05];
        } else if (activeId === 'grau556') {
            pos = [-0.16, 0, 0.35];
        } else if (activeId === 'dlq33') {
            pos = [-1.15, -0.42, 0.46];
        } else if (activeId === 'lw3_tundra') {
            pos = [-0.16, -0.36, 0.05];
        }
        return { pos, rot };
    }
}

export function TinkererMode({ onExit, onSelectGun }: { onExit: () => void, onSelectGun: () => void }) {
    const initialWeaponId = getActiveWeaponId() || 'smg';
    const [selectedGunId, setSelectedGunId] = useState<string>(initialWeaponId);
    const [config, setConfig] = useState<GunModelConfig>(() => {
        const raw = GUN_MODELS[initialWeaponId] || {
            scale: 1, modelPos: [0,0,0], modelRot: [0,0,0], hipPos: [0.3, -0.25, -0.5], hipRot: [0,0,0], adsPos: [0, 0.08, -0.4], adsRot: [0,0,0]
        };
        const initialConfig = JSON.parse(JSON.stringify(raw)) as GunModelConfig;
        const weaponObj = Object.values(WEAPONS).find((x: any) => x.id === initialWeaponId) || Object.values(SURVIVAL_WEAPONS).find((x: any) => x.id === initialWeaponId);
        const sDefaults = getSprintDefaults(initialWeaponId, weaponObj?.cat || '');
        if (!initialConfig.sprintPos) initialConfig.sprintPos = sDefaults.pos;
        if (!initialConfig.sprintRot) initialConfig.sprintRot = sDefaults.rot;
        return initialConfig;
    });
    const [isPreviewSprinting, setIsPreviewSprinting] = useState<boolean>(false);
    const [brightness, setBrightness] = useState<number>(2.0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [envMapLoaded, setEnvMapLoaded] = useState<boolean>(false);
    const [modelLoadedToggle, setModelLoadedToggle] = useState<boolean>(false);

    const normalCanvas = useRef<HTMLCanvasElement>(null);
    const adsCanvas = useRef<HTMLCanvasElement>(null);

    const sceneNormalRef = useRef<THREE.Scene | null>(null);
    const sceneAdsRef = useRef<THREE.Scene | null>(null);
    const ambientNormalRef = useRef<THREE.AmbientLight | null>(null);
    const ambientAdsRef = useRef<THREE.AmbientLight | null>(null);
    const viewmodelNormalRef = useRef<THREE.Group | null>(null);
    const viewmodelAdsRef = useRef<THREE.Group | null>(null);
    const rendererNormalRef = useRef<THREE.WebGLRenderer | null>(null);
    const rendererAdsRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraNormalRef = useRef<THREE.PerspectiveCamera | null>(null);
    const cameraAdsRef = useRef<THREE.PerspectiveCamera | null>(null);
    const envTextureRef = useRef<THREE.Texture | null>(null);

    const rightContainerRef = useRef<HTMLDivElement>(null);

    const configRef = useRef(config);
    const isPreviewSprintingRef = useRef(isPreviewSprinting);
    const selectedGunIdRef = useRef(selectedGunId);

    const w = Object.values(WEAPONS).find((x: any) => x.id === selectedGunId) || Object.values(SURVIVAL_WEAPONS).find((x: any) => x.id === selectedGunId);
    const wStatsRef = useRef(w);

    configRef.current = config;
    isPreviewSprintingRef.current = isPreviewSprinting;
    selectedGunIdRef.current = selectedGunId;
    wStatsRef.current = w;

    // Initialize scenes
    useEffect(() => {
        const handleSelect = (e: any) => {
            const wId = e.detail;
            const w = Object.values(WEAPONS).find((x: any) => x.id === wId) || Object.values(SURVIVAL_WEAPONS).find((x: any) => x.id === wId);
            if (w && !w.modelUrl) {
                setErrorMsg(`Editing is not available for this gun (${w.name}): It has no custom model.`);
                return;
            }
            setErrorMsg(null);
            setSelectedGunId(wId);
        };
        window.addEventListener('tinkererSelect', handleSelect);

        const handleKey = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'f') onSelectGun();
            if (e.key === 'Escape') onExit();
        };
        window.addEventListener('keydown', handleKey);

        const createPreview = (canvas: HTMLCanvasElement, isAds: boolean) => {
            const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = brightness;
            
            const scene = new THREE.Scene();
            // Match the aspect ratio of a typical 16:9 view
            const camera = new THREE.PerspectiveCamera(isAds ? 60 : 75, 16 / 9, 0.01, 100); 
            
            const viewmodel = new THREE.Group();
            scene.add(viewmodel);
            
            const ambient = new THREE.AmbientLight(0xffffff, brightness);
            const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
            dirLight.position.set(5, 5, 5);
            scene.add(ambient, dirLight);

            scene.add(camera);
            camera.add(viewmodel);

            let reqId: number;
            let bobTime = 0;
            let breathTime = 0;
            const clock = new THREE.Clock();

            const render = () => {
                const delta = Math.min(0.03, clock.getDelta());
                
                if (viewmodel) {
                    const currentConf = configRef.current;
                    if (!isAds) {
                        const currentSprinting = isPreviewSprintingRef.current;
                        const wStats = wStatsRef.current;
                        const activeId = selectedGunIdRef.current;
                        
                        if (currentSprinting) {
                            const sPos = currentConf.sprintPos || [0, 0, 0];
                            const sRot = currentConf.sprintRot || [0, 0, 0];
                            const hipPos = currentConf.hipPos || [0.3, -0.25, -0.5];
                            const hipRot = currentConf.hipRot || [0, 0, 0];
                            
                            const bobCycleSpeed = 16;
                            bobTime += delta * bobCycleSpeed;
                            breathTime += delta * 1.8;
                            
                            const maxBobX = 0.035;
                            const maxBobY = 0.025;
                            
                            const bX = Math.sin(bobTime) * maxBobX;
                            const bY = -Math.abs(Math.sin(bobTime)) * maxBobY;
                            const bRotZ = Math.sin(bobTime) * 0.03;
                            const bRotX = Math.cos(bobTime * 2) * 0.015;
                            
                            const pBreathX = Math.cos(breathTime) * 0.003;
                            const pBreathY = Math.sin(breathTime * 2) * 0.002;
                            
                            const cat = wStats?.cat || '';
                            const isUptiltSMG = cat === 'smg' || activeId === 'swarm_killer_ar' || activeId === 'swarm_killer_smg';
                            
                            let extraWobbleX = 0;
                            let extraWobbleY = 0;
                            let extraWobbleRotZ = 0;
                            
                            if (isUptiltSMG) {
                                const wSpeed = bobTime * 1.6;
                                extraWobbleX = Math.sin(wSpeed) * 0.065;
                                extraWobbleY = Math.cos(wSpeed * 2) * 0.045;
                                extraWobbleRotZ = Math.sin(wSpeed) * 0.18;
                            } else {
                                const wSpeed = bobTime * 1.2;
                                extraWobbleX = Math.sin(wSpeed) * 0.03;
                                extraWobbleY = Math.cos(wSpeed * 2) * 0.015;
                                extraWobbleRotZ = Math.sin(wSpeed) * 0.06;
                            }
                            
                            const finalPosX = hipPos[0] + bX + pBreathX + sPos[0] + extraWobbleX;
                            const finalPosY = hipPos[1] + bY + pBreathY + sPos[1] + extraWobbleY;
                            const finalPosZ = hipPos[2] + sPos[2];
                            
                            const finalRotX = hipRot[0] + bRotX + sRot[0];
                            const finalRotY = hipRot[1] + sRot[1];
                            const finalRotZ = hipRot[2] + bRotZ + sRot[2] + extraWobbleRotZ;
                            
                            viewmodel.position.set(finalPosX, finalPosY, finalPosZ);
                            viewmodel.rotation.set(finalRotX, finalRotY, finalRotZ);
                        } else {
                            const hipPos = currentConf.hipPos || [0.3, -0.25, -0.5];
                            const hipRot = currentConf.hipRot || [0, 0, 0];
                            viewmodel.position.set(hipPos[0], hipPos[1], hipPos[2]);
                            viewmodel.rotation.set(hipRot[0], hipRot[1], hipRot[2]);
                        }
                    } else {
                        const adsPos = currentConf.adsPos || [0, 0.08, -0.4];
                        const adsRot = currentConf.adsRot || [0, 0, 0];
                        viewmodel.position.set(adsPos[0], adsPos[1], adsPos[2]);
                        viewmodel.rotation.set(adsRot[0], adsRot[1], adsRot[2]);
                    }
                }
                
                renderer.render(scene, camera);
                reqId = requestAnimationFrame(render);
            };
            render();

            return { renderer, scene, ambient, viewmodel, camera, cleanup: () => { cancelAnimationFrame(reqId); renderer.dispose(); } };
        };

        let normalCtx: any, adsCtx: any;
        if (normalCanvas.current && adsCanvas.current) {
            normalCtx = createPreview(normalCanvas.current, false);
            adsCtx = createPreview(adsCanvas.current, true);
            
            new RGBELoader().load('https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/equirectangular/royal_esplanade_1k.hdr', function(texture) {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                normalCtx.scene.environment = texture;
                adsCtx.scene.environment = texture;
                envTextureRef.current = texture;
                setEnvMapLoaded(true);
            }, undefined, function(err) {
                console.error("Failed to load environment map:", err);
            });

            sceneNormalRef.current = normalCtx.scene;
            sceneAdsRef.current = adsCtx.scene;
            ambientNormalRef.current = normalCtx.ambient;
            ambientAdsRef.current = adsCtx.ambient;
            viewmodelNormalRef.current = normalCtx.viewmodel;
            viewmodelAdsRef.current = adsCtx.viewmodel;
            rendererNormalRef.current = normalCtx.renderer;
            rendererAdsRef.current = adsCtx.renderer;
            cameraNormalRef.current = normalCtx.camera;
            cameraAdsRef.current = adsCtx.camera;
        }

        const handleResize = () => {
            if (normalCanvas.current && adsCanvas.current) {
                const parentNormal = normalCanvas.current.parentElement;
                const parentAds = adsCanvas.current.parentElement;
                
                if (parentNormal && rendererNormalRef.current && cameraNormalRef.current) {
                    const w = parentNormal.clientWidth;
                    const h = parentNormal.clientHeight;
                    rendererNormalRef.current.setSize(w, h, false);
                    cameraNormalRef.current.aspect = w / h;
                    cameraNormalRef.current.updateProjectionMatrix();
                }
                
                if (parentAds && rendererAdsRef.current && cameraAdsRef.current) {
                    const w = parentAds.clientWidth;
                    const h = parentAds.clientHeight;
                    rendererAdsRef.current.setSize(w, h, false);
                    cameraAdsRef.current.aspect = w / h;
                    cameraAdsRef.current.updateProjectionMatrix();
                }
            }
        };

        window.addEventListener('resize', handleResize);
        setTimeout(handleResize, 100);

        return () => {
            window.removeEventListener('tinkererSelect', handleSelect);
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('resize', handleResize);
            normalCtx?.cleanup();
            adsCtx?.cleanup();
        };
    }, []);

    // Load model
    useEffect(() => {
        const w = Object.values(WEAPONS).find((x: any) => x.id === selectedGunId) || Object.values(SURVIVAL_WEAPONS).find((x: any) => x.id === selectedGunId);
        if (!w || !w.modelUrl) return;

        const loader = new GLTFLoader();
        
        // Deep copy raw config to avoid reference sharing & state rendering bailouts
        const rawConfig = GUN_MODELS[selectedGunId] || {
            scale: 1.0, modelPos: [0,0,0], modelRot: [0,0,0], hipPos: [0.3, -0.25, -0.5], hipRot: [0,0,0], adsPos: [0, 0.08, -0.4], adsRot: [0,0,0]
        };
        const initialConfig = JSON.parse(JSON.stringify(rawConfig)) as GunModelConfig;
        const sDefaults = getSprintDefaults(selectedGunId, w.cat || '');
        if (!initialConfig.sprintPos) initialConfig.sprintPos = sDefaults.pos;
        if (!initialConfig.sprintRot) initialConfig.sprintRot = sDefaults.rot;

        if (initialConfig.envMapIntensity === undefined) {
            initialConfig.envMapIntensity = 1.5;
        }
        setConfig(initialConfig);

        loader.load(w.modelUrl, (gltf) => {
            // Guard: Ignore if we have switched to another gun already
            if (selectedGunId !== w.id) return;

            // Enhance materials for realism
            gltf.scene.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const m = (child as THREE.Mesh).material;
                    if (Array.isArray(m)) {
                        m.forEach(mat => {
                            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                                mat.metalness = state.settings.gunMetalness !== undefined ? state.settings.gunMetalness : 0.97;
                                mat.roughness = 0.2;
                                mat.envMapIntensity = initialConfig.envMapIntensity !== undefined ? initialConfig.envMapIntensity : 1.5;
                            }
                        });
                    } else {
                        if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
                            m.metalness = state.settings.gunMetalness !== undefined ? state.settings.gunMetalness : 0.97;
                            m.roughness = 0.2;
                            m.envMapIntensity = initialConfig.envMapIntensity !== undefined ? initialConfig.envMapIntensity : 1.5;
                        }
                    }
                }
            });

            const applyToMesh = (m: THREE.Object3D) => {
                m.scale.set(initialConfig.scale, initialConfig.scale, initialConfig.scale);
                m.position.set(initialConfig.modelPos[0], initialConfig.modelPos[1], initialConfig.modelPos[2]);
                m.rotation.set(initialConfig.modelRot[0], initialConfig.modelRot[1], initialConfig.modelRot[2]);
            };

            if (viewmodelNormalRef.current) {
                viewmodelNormalRef.current.clear();
                const meshNorm = SkeletonUtils.clone(gltf.scene);
                applyToMesh(meshNorm);
                viewmodelNormalRef.current.add(meshNorm);
            }
            if (viewmodelAdsRef.current) {
                viewmodelAdsRef.current.clear();
                const meshAds = SkeletonUtils.clone(gltf.scene);
                applyToMesh(meshAds);
                viewmodelAdsRef.current.add(meshAds);
            }
            setModelLoadedToggle(prev => !prev);
        });
    }, [selectedGunId]);

    // Apply config
    useEffect(() => {
        if (!viewmodelNormalRef.current || !viewmodelAdsRef.current) return;

        // 2. Position Meshes inside viewmodels
        const normMesh = viewmodelNormalRef.current.children[0];
        const adsMesh = viewmodelAdsRef.current.children[0];
        
        const applyMesh = (m: THREE.Object3D) => {
            m.scale.set(config.scale, config.scale, config.scale);
            m.position.set(config.modelPos[0], config.modelPos[1], config.modelPos[2]);
            m.rotation.set(config.modelRot[0], config.modelRot[1], config.modelRot[2]);
            
            const envInt = config.envMapIntensity !== undefined ? config.envMapIntensity : 1.5;
            m.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mat = (child as THREE.Mesh).material;
                    if (Array.isArray(mat)) {
                        mat.forEach(mt => {
                            if (mt instanceof THREE.MeshStandardMaterial || mt instanceof THREE.MeshPhysicalMaterial) {
                                mt.envMapIntensity = envInt;
                                if (envTextureRef.current) mt.envMap = envTextureRef.current;
                                mt.needsUpdate = true;
                            }
                        });
                    } else if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                        mat.envMapIntensity = envInt;
                        if (envTextureRef.current) mat.envMap = envTextureRef.current;
                        mat.needsUpdate = true;
                    }
                }
            });
        };

        if (normMesh) applyMesh(normMesh);
        if (adsMesh) applyMesh(adsMesh);
        
        GUN_MODELS[selectedGunId] = { ...config };
    }, [config, selectedGunId, envMapLoaded, modelLoadedToggle, isPreviewSprinting]);

    const handleAutoCenter = () => {
        const mesh = viewmodelNormalRef.current?.children[0];
        if (!mesh) return;
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        console.log("Auto-centering model. Center:", center, "Size:", size);
        
        setConfig(prev => ({
            ...prev,
            modelPos: [prev.modelPos[0] - center.x, prev.modelPos[1] - center.y, prev.modelPos[2] - center.z],
        }));
    };

    // Apply brightness
    useEffect(() => {
        if (ambientNormalRef.current) ambientNormalRef.current.intensity = brightness;
        if (ambientAdsRef.current) ambientAdsRef.current.intensity = brightness;
        if (rendererNormalRef.current) rendererNormalRef.current.toneMappingExposure = brightness;
        if (rendererAdsRef.current) rendererAdsRef.current.toneMappingExposure = brightness;
    }, [brightness]);

    const handleChange = (key: keyof GunModelConfig, idx: number, val: number) => {
        setConfig(prev => {
            const next = {...prev};
            if (key === 'scale') {
                next.scale = val;
            } else {
                const currentArr = prev[key] as [number, number, number] | undefined;
                const arr: [number, number, number] = currentArr ? [...currentArr] : [0, 0, 0];
                arr[idx] = val;
                // @ts-ignore
                next[key] = arr;
            }
            return next;
        });
    };

    const handleCopy = () => {
        const fileContent = `export interface GunModelConfig {
    scale: number;
    modelPos: [number, number, number];
    modelRot: [number, number, number];
    hipPos: [number, number, number];
    hipRot: [number, number, number];
    adsPos: [number, number, number];
    adsRot: [number, number, number];
    sprintPos?: [number, number, number];
    sprintRot?: [number, number, number];
    envMapIntensity?: number;
}

export const GUN_MODELS: Record<string, GunModelConfig> = ${JSON.stringify(GUN_MODELS, null, 4)};`;
        navigator.clipboard.writeText(fileContent);
        alert('Copied entire Gunposition.ts content to clipboard!');
    };

    const handleDownload = () => {
        const fileContent = `export interface GunModelConfig {
    scale: number;
    modelPos: [number, number, number];
    modelRot: [number, number, number];
    hipPos: [number, number, number];
    hipRot: [number, number, number];
    adsPos: [number, number, number];
    adsRot: [number, number, number];
    sprintPos?: [number, number, number];
    sprintRot?: [number, number, number];
    envMapIntensity?: number;
}

export const GUN_MODELS: Record<string, GunModelConfig> = ${JSON.stringify(GUN_MODELS, null, 4)};`;
        const blob = new Blob([fileContent], { type: 'text/typescript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Gunposition.ts`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const inputStyle = { width: '85px', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', color: 'white', borderRadius: '4px', fontSize: '12px' };
    const groupStyle: CSSProperties = { background: '#1c1c1f', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #27272a' };
    const labelRowStyle: CSSProperties = { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' };
    
    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', background: '#09090b', color: '#f4f4f5', zIndex: 50, display: 'flex', overflow: 'hidden' }}>
            
            {/* Left side: Settings (fills remaining space) */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#121214', borderRight: '1px solid #27272a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#c084fc', margin: 0 }}>G-Tinkerer</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={onSelectGun} style={{ padding: '8px 12px', fontSize: '0.9rem', background: '#2563eb', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>ARMORY (F)</button>
                        <button onClick={onExit} style={{ padding: '8px 12px', fontSize: '0.9rem', background: '#dc2626', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>EXIT</button>
                    </div>
                </div>

                {errorMsg && (
                    <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', color: '#fca5a5' }}>
                        {errorMsg}
                    </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Working on:</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e4e4e7' }}>{selectedGunId.toUpperCase()}</div>
                </div>

                {/* BRIGHTNESS */}
                <div style={groupStyle}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#a1a1aa' }}>0. LIGHT BRIGHTNESS</h4>
                    <input 
                        type="number" 
                        step="0.1" 
                        value={brightness} 
                        onChange={e => setBrightness(parseFloat(e.target.value) || 0)} 
                        style={{...inputStyle, width: '100%'}} 
                    />
                </div>

                {/* SCALING */}
                <div style={groupStyle}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#a1a1aa' }}>1. GLOBAL SCALE & BRIGHTNESS</h4>
                    <div style={{ marginBottom: '10px' }}>
                        <div style={{fontSize:'11px', color:'#52525b', marginBottom:'4px'}}>SCALE</div>
                        <input type="number" step="0.01" value={config.scale} onChange={e => handleChange('scale', 0, parseFloat(e.target.value))} style={{...inputStyle, width: '100%'}} />
                    </div>
                    <div>
                        <div style={{fontSize:'11px', color:'#52525b', marginBottom:'4px'}}>GUN ENV BRIGHTNESS</div>
                        <input type="number" step="0.1" value={config.envMapIntensity !== undefined ? config.envMapIntensity : 1.5} onChange={e => setConfig(p => ({...p, envMapIntensity: parseFloat(e.target.value) || 0}))} style={{...inputStyle, width: '100%'}} />
                    </div>
                </div>

                {/* INTRINSIC MESH OFFSET */}
                <div style={groupStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#a1a1aa' }}>2. MODEL FIX (MESH)</h4>
                        <button onClick={handleAutoCenter} style={{ padding: '4px 8px', fontSize: '0.7rem', background: '#4b5563', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>AUTO-CENTER</button>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <div style={{fontSize:'11px', color:'#52525b', marginBottom:'4px'}}>POS OFFSET (X, Y, Z)</div>
                        <div style={labelRowStyle}>
                            <input type="number" step="0.01" value={config.modelPos[0]} onChange={e => handleChange('modelPos', 0, parseFloat(e.target.value))} style={inputStyle} />
                            <input type="number" step="0.01" value={config.modelPos[1]} onChange={e => handleChange('modelPos', 1, parseFloat(e.target.value))} style={inputStyle} />
                            <input type="number" step="0.01" value={config.modelPos[2]} onChange={e => handleChange('modelPos', 2, parseFloat(e.target.value))} style={inputStyle} />
                        </div>
                    </div>
                    <div>
                        <div style={{fontSize:'11px', color:'#52525b', marginBottom:'4px'}}>ROT FIX (R, P, Y)</div>
                        <div style={labelRowStyle}>
                            <input type="number" step="0.01" value={config.modelRot[0]} onChange={e => handleChange('modelRot', 0, parseFloat(e.target.value))} style={inputStyle} />
                            <input type="number" step="0.01" value={config.modelRot[1]} onChange={e => handleChange('modelRot', 1, parseFloat(e.target.value))} style={inputStyle} />
                            <input type="number" step="0.01" value={config.modelRot[2]} onChange={e => handleChange('modelRot', 2, parseFloat(e.target.value))} style={inputStyle} />
                        </div>
                    </div>
                </div>

                {/* CONDITIONAL HIP / SPRINT VIEWMODEL CONTROLS */}
                {!isPreviewSprinting ? (
                    <div style={groupStyle}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#a1a1aa' }}>3. HIP-FIRE HOLD</h4>
                        <div style={{ marginBottom: '10px' }}>
                            <div style={{fontSize:'11px', color:'#52525b', marginBottom:'4px'}}>VIEWMODEL POS</div>
                            <div style={labelRowStyle}>
                                <input type="number" step="0.01" value={config.hipPos[0]} onChange={e => handleChange('hipPos', 0, parseFloat(e.target.value))} style={inputStyle} />
                                <input type="number" step="0.01" value={config.hipPos[1]} onChange={e => handleChange('hipPos', 1, parseFloat(e.target.value))} style={inputStyle} />
                                <input type="number" step="0.01" value={config.hipPos[2]} onChange={e => handleChange('hipPos', 2, parseFloat(e.target.value))} style={inputStyle} />
                            </div>
                        </div>
                        <div>
                            <div style={{fontSize:'11px', color:'#52525b', marginBottom:'4px'}}>VIEWMODEL ROT</div>
                            <div style={labelRowStyle}>
                                <input type="number" step="0.01" value={config.hipRot[0]} onChange={e => handleChange('hipRot', 0, parseFloat(e.target.value))} style={inputStyle} />
                                <input type="number" step="0.01" value={config.hipRot[1]} onChange={e => handleChange('hipRot', 1, parseFloat(e.target.value))} style={inputStyle} />
                                <input type="number" step="0.01" value={config.hipRot[2]} onChange={e => handleChange('hipRot', 2, parseFloat(e.target.value))} style={inputStyle} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={groupStyle}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#a1a1aa' }}>3. TACTICAL SPRINTING HOLD</h4>
                        <div style={{ marginBottom: '10px' }}>
                            <div style={{fontSize:'11px', color:'#52525b', marginBottom:'4px'}}>S_OFFSET POS (X, Y, Z)</div>
                            <div style={labelRowStyle}>
                                <input type="number" step="0.01" value={config.sprintPos ? config.sprintPos[0] : 0} onChange={e => handleChange('sprintPos', 0, parseFloat(e.target.value))} style={inputStyle} />
                                <input type="number" step="0.01" value={config.sprintPos ? config.sprintPos[1] : 0} onChange={e => handleChange('sprintPos', 1, parseFloat(e.target.value))} style={inputStyle} />
                                <input type="number" step="0.01" value={config.sprintPos ? config.sprintPos[2] : 0} onChange={e => handleChange('sprintPos', 2, parseFloat(e.target.value))} style={inputStyle} />
                            </div>
                        </div>
                        <div>
                            <div style={{fontSize:'11px', color:'#52525b', marginBottom:'4px'}}>S_OFFSET ROT (R, P, Y in Degrees)</div>
                            <div style={labelRowStyle}>
                                <input 
                                    type="number" 
                                    step="1" 
                                    value={config.sprintRot ? Math.round(config.sprintRot[0] * 180 / Math.PI) : 0} 
                                    onChange={e => handleChange('sprintRot', 0, (parseFloat(e.target.value) || 0) * Math.PI / 180)} 
                                    style={inputStyle} 
                                />
                                <input 
                                    type="number" 
                                    step="1" 
                                    value={config.sprintRot ? Math.round(config.sprintRot[1] * 180 / Math.PI) : 0} 
                                    onChange={e => handleChange('sprintRot', 1, (parseFloat(e.target.value) || 0) * Math.PI / 180)} 
                                    style={inputStyle} 
                                />
                                <input 
                                    type="number" 
                                    step="1" 
                                    value={config.sprintRot ? Math.round(config.sprintRot[2] * 180 / Math.PI) : 0} 
                                    onChange={e => handleChange('sprintRot', 2, (parseFloat(e.target.value) || 0) * Math.PI / 180)} 
                                    style={inputStyle} 
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ADS VIEWMODEL */}
                <div style={groupStyle}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#a1a1aa' }}>4. ADS (AIMING)</h4>
                    <div style={{ marginBottom: '10px' }}>
                        <div style={{fontSize:'11px', color:'#52525b', marginBottom:'4px'}}>VIEWMODEL POS</div>
                        <div style={labelRowStyle}>
                            <input type="number" step="0.005" value={config.adsPos[0]} onChange={e => handleChange('adsPos', 0, parseFloat(e.target.value))} style={inputStyle} />
                            <input type="number" step="0.005" value={config.adsPos[1]} onChange={e => handleChange('adsPos', 1, parseFloat(e.target.value))} style={inputStyle} />
                            <input type="number" step="0.005" value={config.adsPos[2]} onChange={e => handleChange('adsPos', 2, parseFloat(e.target.value))} style={inputStyle} />
                        </div>
                    </div>
                    <div>
                        <div style={{fontSize:'11px', color:'#52525b', marginBottom:'4px'}}>VIEWMODEL ROT</div>
                        <div style={labelRowStyle}>
                            <input type="number" step="0.005" value={config.adsRot[0]} onChange={e => handleChange('adsRot', 0, parseFloat(e.target.value))} style={inputStyle} />
                            <input type="number" step="0.005" value={config.adsRot[1]} onChange={e => handleChange('adsRot', 1, parseFloat(e.target.value))} style={inputStyle} />
                            <input type="number" step="0.005" value={config.adsRot[2]} onChange={e => handleChange('adsRot', 2, parseFloat(e.target.value))} style={inputStyle} />
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button onClick={handleCopy} style={{ flex: 1, padding: '10px', background: '#3f3f46', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>COPY FULL JS</button>
                    <button onClick={handleDownload} style={{ flex: 1, padding: '10px', background: '#16a34a', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>DOWNLOAD TS</button>
                </div>
            </div>
            
            {/* Right: Views (Each view is 16:9, so total container is 8:9 landscape) */}
            <div ref={rightContainerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100%', height: '50%', position: 'relative', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', gap: '8px', alignItems: 'center', zIndex: 10 }}>
                        <div style={{ background: 'rgba(0,0,0,0.8)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#a1a1aa', border: '1px solid #27272a' }}>
                            {isPreviewSprinting ? 'SPRINT SIMULATION (FOV 75)' : 'HIP-FIRE SIMULATION (FOV 75)'}
                        </div>
                        <button 
                            onClick={() => setIsPreviewSprinting(!isPreviewSprinting)} 
                            style={{ background: '#c084fc', border: 'none', padding: '8px 12px', borderRadius: '8px', color: 'black', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: 'opacity 0.2s' }}
                            onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
                            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                        >
                            {isPreviewSprinting ? 'SWITCH TO HIP-FIRE' : 'SWITCH TO SPRINT'}
                        </button>
                    </div>
                    <div style={{ aspectRatio: '16/9', width: 'auto', height: '100%', maxWidth: '100%', position: 'relative' }}>
                        <canvas ref={normalCanvas} style={{ display: 'block', width: '100%', height: '100%' }}></canvas>
                        {/* Centered crosshair */}
                        {!isPreviewSprinting && (
                            <div style={{ position: 'absolute', top: '50%', left: '50%', width: '10px', height: '10px', border: '1px solid rgba(255,255,255,0.3)', transform: 'translate(-50%,-50%)', pointerEvents:'none' }}></div>
                        )}
                    </div>
                </div>
                <div style={{ width: '100%', height: '50%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(0,0,0,0.8)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#a1a1aa', border: '1px solid #27272a', zIndex: 10 }}>ADS SIMULATION (FOV 60)</div>
                    <div style={{ aspectRatio: '16/9', width: 'auto', height: '100%', maxWidth: '100%', position: 'relative' }}>
                        <canvas ref={adsCanvas} style={{ display: 'block', width: '100%', height: '100%' }}></canvas>
                        {/* Centered red alignment line */}
                        <div style={{ position: 'absolute', top: '50%', left: '50%', width: '30px', height: '1px', background: 'rgba(239,68,68,0.5)', transform: 'translate(-50%,-50%)', pointerEvents:'none' }}></div>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', width: '1px', height: '30px', background: 'rgba(239,68,68,0.5)', transform: 'translate(-50%,-50%)', pointerEvents:'none' }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

