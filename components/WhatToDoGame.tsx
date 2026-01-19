
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { User } from '../services/firebase';
import ChatWidget from './ChatWidget';
import { RandomReveal } from './Visuals';
import { Button } from './Overlays';

interface WhatToDoGameProps {
    user: User;
    onBackToHub: () => void;
    username?: string | null;
}

// --- CONSTANTS ---
const CHUNK_SIZE = 2;
const BLOCK_SIZE = 1;
const GRAVITY = 30.0;
const JUMP_FORCE = 9.5;
const WALK_SPEED = 4.0;
const RUN_SPEED = 6.0;
const PLAYER_HEIGHT = 1.8;
const REACH_DISTANCE = 4.0;

// --- UTILS ---

const useBlockTexture = () => {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Lighter Green Background
            ctx.fillStyle = '#66BB6A'; 
            ctx.fillRect(0, 0, 128, 128);
            
            // Black Outline (Thinner)
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2; 
            ctx.strokeRect(0, 0, 128, 128);
            
            // Inner highlight
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(4, 4, 120, 120);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }, []);
};

// --- 3D COMPONENTS ---

const FPSCounter = () => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let animationFrameId: number;

        const loop = () => {
            frameCount++;
            const time = performance.now();
            if (time >= lastTime + 1000) {
                if (ref.current) {
                    ref.current.innerText = `FPS: ${frameCount}`;
                }
                frameCount = 0;
                lastTime = time;
            }
            animationFrameId = requestAnimationFrame(loop);
        };

        loop();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div 
            ref={ref} 
            className="absolute top-2 left-2 text-red-500 font-bold text-xl z-50 font-mono shadow-black drop-shadow-md pointer-events-none animate-fade-in"
        >
            FPS: 0
        </div>
    );
};

const GameLights = ({ playerPos, shadowsEnabled }: { playerPos: THREE.Vector3, shadowsEnabled: boolean }) => {
    const lightRef = useRef<THREE.DirectionalLight>(null);
    
    useFrame(() => {
        if (lightRef.current) {
            lightRef.current.position.set(playerPos.x + 30, playerPos.y + 50, playerPos.z + 20);
            lightRef.current.target.position.copy(playerPos);
            lightRef.current.target.updateMatrixWorld();
        }
    });

    return (
        <>
            <ambientLight intensity={0.6} />
            <directionalLight 
                ref={lightRef}
                intensity={1.2} 
                castShadow={shadowsEnabled}
                shadow-mapSize={[2048, 2048]}
                shadow-bias={-0.0005}
            >
                {shadowsEnabled && <orthographicCamera attach="shadow-camera" args={[-50, 50, 50, -50, 0.1, 200]} />}
            </directionalLight>
        </>
    );
};

const InfiniteFloor = ({ renderDistance, playerPos, shadowsEnabled }: { renderDistance: number, playerPos: THREE.Vector3, shadowsEnabled: boolean }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const texture = useBlockTexture();
    
    const radiusInBlocks = renderDistance * CHUNK_SIZE; 
    const side = (radiusInBlocks * 2) + 1;
    const count = side * side;

    const lastUpdatePos = useRef({ x: Infinity, z: Infinity });

    useEffect(() => {
        lastUpdatePos.current = { x: Infinity, z: Infinity };
    }, [renderDistance]);

    useFrame(() => {
        if (!meshRef.current) return;

        const centerX = Math.floor(playerPos.x / BLOCK_SIZE);
        const centerZ = Math.floor(playerPos.z / BLOCK_SIZE);

        if (centerX === lastUpdatePos.current.x && centerZ === lastUpdatePos.current.z) return;
        lastUpdatePos.current = { x: centerX, z: centerZ };

        let i = 0;
        const radiusSq = radiusInBlocks * radiusInBlocks;

        for (let x = -radiusInBlocks; x <= radiusInBlocks; x++) {
            for (let z = -radiusInBlocks; z <= radiusInBlocks; z++) {
                const distSq = x * x + z * z;
                
                if (distSq <= radiusSq) {
                    dummy.position.set(
                        (centerX + x) * BLOCK_SIZE, 
                        -0.5, 
                        (centerZ + z) * BLOCK_SIZE
                    );
                    dummy.scale.set(1, 1, 1);
                } else {
                    dummy.position.set(0, -100, 0); 
                    dummy.scale.set(0, 0, 0); 
                }

                dummy.updateMatrix();
                meshRef.current.setMatrixAt(i++, dummy.matrix);
            }
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh 
            ref={meshRef} 
            args={[undefined, undefined, count]} 
            receiveShadow={shadowsEnabled} 
            castShadow={shadowsEnabled}
            key={count}
            name="floor" // Identified for Raycasting
        >
            <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
            <meshStandardMaterial map={texture} />
        </instancedMesh>
    );
};

// --- BUILDING SYSTEM ---

type BlockMap = Map<string, {x: number, y: number, z: number}>;

const PlacedBlocks = ({ blocks, shadowsEnabled }: { blocks: BlockMap, shadowsEnabled: boolean }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const blockList = useMemo(() => Array.from(blocks.values()), [blocks]);

    useEffect(() => {
        if (!meshRef.current) return;
        blockList.forEach((block, i) => {
            dummy.position.set(block.x, block.y, block.z);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [blockList]);

    return (
        <instancedMesh 
            ref={meshRef} 
            args={[undefined, undefined, 1000]} // Max 1000 blocks for now
            receiveShadow={shadowsEnabled}
            castShadow={shadowsEnabled}
            name="placedBlocks"
        >
            <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
            <meshStandardMaterial color="white" />
        </instancedMesh>
    );
};

const Particles = ({ particles }: { particles: any[] }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        particles.forEach((p, i) => {
            if (p.life > 0) {
                p.life -= delta;
                p.velocity.y -= GRAVITY * 0.5 * delta; // Gravity effect
                p.position.add(p.velocity.clone().multiplyScalar(delta));
                
                // Floor collision for particles
                if (p.position.y < 0) {
                    p.position.y = 0;
                    p.velocity.y = 0;
                    p.velocity.x *= 0.5; // Friction
                    p.velocity.z *= 0.5;
                }

                dummy.position.copy(p.position);
                dummy.scale.setScalar(p.size * (p.life / 3)); // Shrink as dying
                dummy.updateMatrix();
                meshRef.current!.setMatrixAt(i, dummy.matrix);
            } else {
                dummy.scale.setScalar(0);
                dummy.updateMatrix();
                meshRef.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh 
            ref={meshRef} 
            args={[undefined, undefined, 100]} // Pool size
        >
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color="white" />
        </instancedMesh>
    );
};

const InteractionManager = ({ 
    blocks, 
    setBlocks, 
    setParticles, 
    selectedSlot 
}: { 
    blocks: BlockMap, 
    setBlocks: React.Dispatch<React.SetStateAction<BlockMap>>,
    setParticles: React.Dispatch<React.SetStateAction<any[]>>,
    selectedSlot: number 
}) => {
    const { camera, scene, raycaster } = useThree();

    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            if (document.pointerLockElement !== document.querySelector("#root")) return;
            
            // 0 = Left (Break), 2 = Right (Place)
            if (e.button !== 0 && e.button !== 2) return;

            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            raycaster.far = REACH_DISTANCE;
            
            // Intersect floor and placed blocks
            const intersects = raycaster.intersectObjects(scene.children, true);
            const hit = intersects.find(i => i.object.name === 'floor' || i.object.name === 'placedBlocks');

            if (hit) {
                const point = hit.point;
                const normal = hit.face?.normal;
                
                // Calculate grid position based on hit + normal (small offset to get inside/outside block)
                const isBreak = e.button === 0;
                
                // Breaking: Move slightly INTO the block
                const breakPos = point.clone().add(raycaster.ray.direction.clone().multiplyScalar(0.01));
                const breakX = Math.floor(breakPos.x);
                const breakY = Math.floor(breakPos.y);
                const breakZ = Math.floor(breakPos.z);
                const breakKey = `${breakX},${breakY},${breakZ}`;

                if (isBreak) {
                    if (blocks.has(breakKey)) {
                        // Break Block
                        const newBlocks = new Map(blocks);
                        newBlocks.delete(breakKey);
                        setBlocks(newBlocks);

                        // Spawn Particles
                        const newParts = [];
                        for(let i=0; i<8; i++) {
                            newParts.push({
                                id: Math.random(),
                                position: new THREE.Vector3(breakX + 0.5, breakY + 0.5, breakZ + 0.5),
                                velocity: new THREE.Vector3((Math.random()-0.5)*2, Math.random()*2, (Math.random()-0.5)*2),
                                life: 3.0,
                                size: 0.5 + Math.random() * 0.5
                            });
                        }
                        setParticles(prev => [...newParts, ...prev].slice(0, 100)); // Keep pool manageable
                    }
                } else {
                    // Placing: Move slightly OUT of the block using normal
                    if (selectedSlot !== 0) return; // Only slot 0 (white block) can build
                    if (!normal) return;

                    const placePos = point.clone().add(normal.clone().multiplyScalar(0.1));
                    const placeX = Math.floor(placePos.x);
                    const placeY = Math.floor(placePos.y);
                    const placeZ = Math.floor(placePos.z);
                    const placeKey = `${placeX},${placeY},${placeZ}`;

                    // Prevent placing inside player
                    const playerX = Math.floor(camera.position.x);
                    const playerZ = Math.floor(camera.position.z);
                    // Simple check: don't place in player head or feet (approx)
                    const distToHead = new THREE.Vector3(placeX+0.5, placeY+0.5, placeZ+0.5).distanceTo(camera.position);
                    if (distToHead < 1.2) return;

                    const newBlocks = new Map(blocks);
                    newBlocks.set(placeKey, { x: placeX+0.5, y: placeY+0.5, z: placeZ+0.5 });
                    setBlocks(newBlocks);
                }
            }
        };

        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [camera, scene, blocks, selectedSlot]);

    return null;
};

const Player = ({ 
    position, 
    setPosition, 
    shadowsEnabled,
    color
}: { 
    position: THREE.Vector3, 
    setPosition: (v: THREE.Vector3) => void,
    shadowsEnabled: boolean,
    color: string
}) => {
    const { camera } = useThree();
    const [velocity] = useState(new THREE.Vector3());
    const [isJumping, setIsJumping] = useState(false);
    
    const moveForward = useRef(false);
    const moveBackward = useRef(false);
    const moveLeft = useRef(false);
    const moveRight = useRef(false);
    const isRunning = useRef(false);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            switch (event.code) {
                case 'ArrowUp': case 'KeyW': moveForward.current = true; break;
                case 'ArrowLeft': case 'KeyA': moveLeft.current = true; break;
                case 'ArrowDown': case 'KeyS': moveBackward.current = true; break;
                case 'ArrowRight': case 'KeyD': moveRight.current = true; break;
                case 'ShiftLeft': case 'ShiftRight': isRunning.current = true; break;
                case 'Space': 
                    if (!isJumping && position.y <= 0.05) { 
                        velocity.y = JUMP_FORCE;
                        setIsJumping(true);
                    }
                    break;
            }
        };
        const onKeyUp = (event: KeyboardEvent) => {
            switch (event.code) {
                case 'ArrowUp': case 'KeyW': moveForward.current = false; break;
                case 'ArrowLeft': case 'KeyA': moveLeft.current = false; break;
                case 'ArrowDown': case 'KeyS': moveBackward.current = false; break;
                case 'ArrowRight': case 'KeyD': moveRight.current = false; break;
                case 'ShiftLeft': case 'ShiftRight': isRunning.current = false; break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
        };
    }, [isJumping, position, velocity]);

    useFrame((state, delta) => {
        // Physics (Gravity only for Y)
        velocity.y -= GRAVITY * delta;

        // Movement Logic (Direct Position Update)
        const speed = isRunning.current ? RUN_SPEED : WALK_SPEED;
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        camForward.y = 0; camForward.normalize();
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        camRight.y = 0; camRight.normalize();

        const moveVec = new THREE.Vector3();
        if (moveForward.current) moveVec.add(camForward);
        if (moveBackward.current) moveVec.sub(camForward);
        if (moveRight.current) moveVec.add(camRight);
        if (moveLeft.current) moveVec.sub(camRight);
        moveVec.normalize();

        if (moveVec.length() > 0) {
            position.x += moveVec.x * speed * delta;
            position.z += moveVec.z * speed * delta;
        }

        // Apply Vertical Velocity
        position.y += velocity.y * delta;
        
        // Ground Collision
        if (position.y < 0) {
            velocity.y = 0;
            position.y = 0;
            setIsJumping(false);
        }

        camera.position.set(position.x, position.y + PLAYER_HEIGHT, position.z);
        setPosition(position.clone());
    });

    return (
        <group>
            {/* Shadow Caster: Invisible to camera but casts shadow */}
            {shadowsEnabled && (
                <mesh position={[position.x, position.y + 1, position.z]} castShadow>
                    <boxGeometry args={[0.8, 2, 0.8]} />
                    <meshBasicMaterial color="black" colorWrite={false} />
                </mesh>
            )}
        </group>
    );
};

// --- HOTBAR COMPONENT ---
const Hotbar = ({ selectedSlot }: { selectedSlot: number }) => {
    return (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-lg border border-white/20 z-50">
            {[0, 1, 2].map(i => (
                <div 
                    key={i}
                    className={`w-12 h-12 border-2 flex items-center justify-center transition-all ${selectedSlot === i ? 'border-yellow-400 scale-110 bg-white/20' : 'border-gray-500 bg-black/50'}`}
                >
                    {i === 0 && (
                        <div className="w-6 h-6 bg-white border border-gray-400 shadow-[2px_2px_0_#999]"></div>
                    )}
                    <span className="absolute top-0 left-1 text-[8px] text-white shadow-black drop-shadow">{i + 1}</span>
                </div>
            ))}
        </div>
    );
};

// --- MAIN GAME COMPONENT ---

export default function WhatToDoGame({ user, onBackToHub, username }: WhatToDoGameProps) {
    const [gameState, setGameState] = useState<'graphics-select' | 'color-select' | 'playing' | 'paused'>('graphics-select');
    
    const [playerColor, setPlayerColor] = useState('#5BC8F0');
    const [playerPos, setPlayerPos] = useState(new THREE.Vector3(0, 5, 0));
    
    // Game Logic
    const [blocks, setBlocks] = useState<BlockMap>(new Map());
    const [particles, setParticles] = useState<any[]>([]);
    const [selectedSlot, setSelectedSlot] = useState(0);

    // Graphics
    const [shadowsEnabled, setShadowsEnabled] = useState(true);
    const [renderDist, setRenderDist] = useState(16);
    const [simDist, setSimDist] = useState(4);

    const [showSettings, setShowSettings] = useState(false);
    const displayableName = username || user.displayName || 'Player';

    const selectGraphics = (mode: 'normal' | 'low') => {
        if (mode === 'low') {
            setShadowsEnabled(false);
            setRenderDist(9);
            setSimDist(2);
        } else {
            setShadowsEnabled(true);
            setRenderDist(16);
            setSimDist(8);
        }
        setGameState('color-select');
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Hotbar selection
            if (e.key === '1') setSelectedSlot(0);
            if (e.key === '2') setSelectedSlot(1);
            if (e.key === '3') setSelectedSlot(2);

            if (gameState === 'graphics-select' || gameState === 'color-select') return;

            if (e.key === 'Escape') {
                setGameState(prev => prev === 'playing' ? 'paused' : 'playing');
                setShowSettings(false);
            }
            if ((e.key === 'p' || e.key === 'P')) {
                if (gameState === 'paused') return; 
                setShowSettings(prev => !prev);
                if (!showSettings) {
                    document.exitPointerLock();
                } 
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, showSettings]);

    const startGame = () => {
        setGameState('playing');
    };

    return (
        <div className="w-full h-full bg-black relative font-['Inter',_sans-serif]">
            
            {/* 1. GRAPHICS SELECTION */}
            {gameState === 'graphics-select' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
                    <RandomReveal className="bg-[#081427] border-4 border-[#A7C7E7] p-8 max-w-lg w-full text-center">
                        <h2 className="text-2xl text-white mb-6">Choose your graphics settings</h2>
                        <div className="flex flex-col gap-4">
                            <Button onClick={() => selectGraphics('normal')}>Normal</Button>
                            <div className="flex items-center justify-center gap-2">
                                <Button variant="secondary" onClick={() => selectGraphics('low')}>Low End</Button>
                            </div>
                        </div>
                    </RandomReveal>
                </div>
            )}

            {/* 2. COLOR SELECTION */}
            {gameState === 'color-select' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
                    <RandomReveal className="bg-[#081427] border-4 border-[#A7C7E7] p-8 max-w-md w-full text-center">
                        <h1 className="text-3xl text-[#A7C7E7] mb-2 font-bold">Ligma World</h1>
                        <p className="text-[#aaa] mb-8 text-sm">Enter Player Details</p>
                        
                        <div className="flex justify-center gap-4 mb-8">
                            {['#5BC8F0', '#4caf50', '#ff2a2a', '#ffeb3b', '#9c27b0', '#ffffff'].map(c => (
                                <button 
                                    key={c}
                                    onClick={() => setPlayerColor(c)}
                                    className={`w-10 h-10 rounded border-2 transition-transform hover:scale-110 ${playerColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>

                        <div className="text-white mb-4 font-bold text-lg" style={{ color: 'white' }}>Player Name: {displayableName}</div>
                        <Button onClick={startGame} className="w-full">Confirm</Button>
                    </RandomReveal>
                </div>
            )}

            {/* 3. 3D WORLD */}
            {(gameState === 'playing' || gameState === 'paused') && (
                <>
                    <FPSCounter />
                    <Canvas shadows={shadowsEnabled} camera={{ fov: 75 }}>
                        <Sky sunPosition={[100, 20, 100]} />
                        <GameLights playerPos={playerPos} shadowsEnabled={shadowsEnabled} />
                        
                        <Player 
                            position={playerPos} 
                            setPosition={setPlayerPos}
                            shadowsEnabled={shadowsEnabled}
                            color={playerColor}
                        />

                        {/* Building System */}
                        <InteractionManager 
                            blocks={blocks} 
                            setBlocks={setBlocks} 
                            setParticles={setParticles}
                            selectedSlot={selectedSlot}
                        />
                        <PlacedBlocks blocks={blocks} shadowsEnabled={shadowsEnabled} />
                        <Particles particles={particles} />
                        
                        <InfiniteFloor renderDistance={renderDist} playerPos={playerPos} shadowsEnabled={shadowsEnabled} />
                        
                        {gameState === 'playing' && !showSettings && (
                            <PointerLockControls selector="#root" />
                        )}
                    </Canvas>

                    <Hotbar selectedSlot={selectedSlot} />
                </>
            )}

            {/* 4. MENUS & HUD */}
            {gameState === 'paused' && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <RandomReveal className="bg-[#081427] border-2 border-white p-8 min-w-[300px] flex flex-col gap-4 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        <h2 className="text-2xl text-white text-center mb-4">Options Menu</h2>
                        <Button onClick={() => setGameState('playing')}>Resume Game</Button>
                        <Button variant="secondary" onClick={() => setShowSettings(true)}>Settings</Button>
                        <Button variant="accent" onClick={onBackToHub}>Exit World</Button>
                    </RandomReveal>
                </div>
            )}

            {showSettings && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[70] bg-[#081427] border-2 border-[#A7C7E7] p-6 w-[400px] animate-pop-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-[#A7C7E7] text-xl font-bold">Settings</h2>
                        <button onClick={() => setShowSettings(false)} className="text-white hover:text-red-500">✕</button>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div>
                            <label className="text-white text-xs block mb-2">Render Distance (Chunks)</label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="range" 
                                    min="4" max="32" step="2"
                                    value={renderDist} 
                                    onChange={(e) => setRenderDist(parseInt(e.target.value))}
                                    className="flex-1 accent-[#A7C7E7]" 
                                />
                                <span className="text-[#A7C7E7] w-8">{renderDist}</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-white text-xs block mb-2">Simulation Distance (Chunks)</label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="range" 
                                    min="2" max="16" step="2"
                                    value={simDist} 
                                    onChange={(e) => setSimDist(parseInt(e.target.value))}
                                    className="flex-1 accent-[#A7C7E7]" 
                                />
                                <span className="text-[#A7C7E7] w-8">{simDist}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 text-[10px] text-[#555] text-center">Press 'P' to close</div>
                </div>
            )}

            {/* Chat (Global Mode) */}
            {gameState !== 'graphics-select' && gameState !== 'color-select' && (
                <div className="absolute bottom-16 left-4 w-[350px] h-[250px] z-[40]">
                    <ChatWidget 
                        user={user} 
                        mode="global"
                        channelId="global_world_chat"
                        className="h-full" 
                    />
                </div>
            )}
            
            {/* Money Mockup */}
            {gameState === 'playing' && !showSettings && (
                <div className="absolute top-2 right-2 flex flex-col items-end pointer-events-none z-30 animate-fade-in">
                    <div className="flex border-2 border-white bg-[#333] w-[200px] h-[20px] mb-2">
                        <div className="w-full bg-red-600 h-full"></div>
                    </div>
                    <div className="text-[#85bb65] text-2xl font-bold shadow-black drop-shadow-md">$50</div>
                </div>
            )}

        </div>
    );
}
