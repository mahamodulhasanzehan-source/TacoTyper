import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree, createPortal } from '@react-three/fiber';
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

// --- TYPES ---
interface BotEntity {
    id: string;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    color: string;
    moveTimer: number;
}

interface BulletEntity {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    spawnTime: number;
}

// --- CONSTANTS ---
const CHUNK_SIZE = 2;
const BLOCK_SIZE = 1;
const GRAVITY = 30.0;
const JUMP_FORCE = 9.5;
const WALK_SPEED = 4.0;
const RUN_SPEED = 6.0;
const BULLET_SPEED = 40.0;
const BOT_COUNT = 10;
const PLAYER_HEIGHT = 1.8;

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
            
            // Black Outline
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 8; 
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
    const frameCount = useRef(0);
    const lastTime = useRef(performance.now());

    useFrame(() => {
        frameCount.current++;
        const time = performance.now();
        if (time >= lastTime.current + 1000) {
            if (ref.current) {
                ref.current.innerText = `FPS: ${frameCount.current}`;
            }
            frameCount.current = 0;
            lastTime.current = time;
        }
    });

    return (
        <div 
            ref={ref} 
            className="absolute top-2 left-2 text-blue-500 font-bold text-xl z-50 font-mono shadow-black drop-shadow-md pointer-events-none animate-fade-in"
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

    // Optimization: Track last update position to avoid re-calculating 4000 matrices every frame
    const lastUpdatePos = useRef({ x: Infinity, z: Infinity });

    useFrame(() => {
        if (!meshRef.current) return;

        const centerX = Math.floor(playerPos.x / BLOCK_SIZE);
        const centerZ = Math.floor(playerPos.z / BLOCK_SIZE);

        // Only update if player moved a full block
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
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} receiveShadow={shadowsEnabled} castShadow={shadowsEnabled}>
            <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
            <meshStandardMaterial map={texture} />
        </instancedMesh>
    );
};

const Bullets = ({ bullets }: { bullets: React.MutableRefObject<BulletEntity[]> }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        
        let activeCount = 0;
        const bulletsToRemove: number[] = [];
        const now = Date.now();

        bullets.current.forEach((b, i) => {
            const moveStep = b.velocity.clone().multiplyScalar(delta);
            b.position.add(moveStep);
            
            if (b.spawnTime + 2000 < now) {
                bulletsToRemove.push(i);
            } else {
                dummy.position.copy(b.position);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                meshRef.current!.setMatrixAt(activeCount, dummy.matrix);
                activeCount++;
            }
        });

        // Hide unused instances
        for (let i = activeCount; i < 50; i++) {
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;

        for (let i = bulletsToRemove.length - 1; i >= 0; i--) {
            bullets.current.splice(bulletsToRemove[i], 1);
        }
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, 50]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#FFFF00" />
        </instancedMesh>
    );
};

const Bots = ({ 
    bots, 
    bullets, 
    onKill 
}: { 
    bots: React.MutableRefObject<BotEntity[]>, 
    bullets: React.MutableRefObject<BulletEntity[]>,
    onKill: () => void 
}) => {
    const groupRef = useRef<THREE.Group>(null);
    
    // Initialize Bots
    useEffect(() => {
        if (bots.current.length === 0) {
            for (let i = 0; i < BOT_COUNT; i++) {
                bots.current.push({
                    id: Math.random().toString(),
                    position: new THREE.Vector3((Math.random() - 0.5) * 40, 1, (Math.random() - 0.5) * 40),
                    velocity: new THREE.Vector3(),
                    color: '#' + Math.floor(Math.random()*16777215).toString(16),
                    moveTimer: 0
                });
            }
        }
    }, []);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        bots.current.forEach((bot, i) => {
            if (state.clock.elapsedTime > bot.moveTimer) {
                bot.velocity.x = (Math.random() - 0.5) * 4;
                bot.velocity.z = (Math.random() - 0.5) * 4;
                bot.moveTimer = state.clock.elapsedTime + 1 + Math.random() * 2;
            }

            bot.position.x += bot.velocity.x * delta;
            bot.position.z += bot.velocity.z * delta;
            
            // Boundaries
            if (bot.position.x > 30) bot.position.x = -30;
            if (bot.position.x < -30) bot.position.x = 30;
            if (bot.position.z > 30) bot.position.z = -30;
            if (bot.position.z < -30) bot.position.z = 30;

            const mesh = groupRef.current!.children[i];
            if (mesh) {
                mesh.position.copy(bot.position);
            }

            // Simple Collision
            bullets.current.forEach((bullet) => {
                if (bullet.position.distanceTo(bot.position) < 1.0) {
                    onKill();
                    bot.position.set((Math.random() - 0.5) * 40, 1, (Math.random() - 0.5) * 40);
                    bullet.spawnTime = 0; // mark for removal
                }
            });
        });
    });

    return (
        <group ref={groupRef}>
            {bots.current.map((bot) => (
                <group key={bot.id} position={bot.position}>
                    <mesh position={[0, 0, 0]} castShadow receiveShadow>
                        <boxGeometry args={[0.8, 2, 0.8]} />
                        <meshStandardMaterial color={bot.color} />
                    </mesh>
                    <mesh position={[0, 1.5, 0]}>
                         <planeGeometry args={[1, 0.2]} />
                         <meshBasicMaterial color="#000" />
                    </mesh>
                </group>
            ))}
        </group>
    );
};

const Player = ({ 
    position, 
    setPosition, 
    onShoot,
    color,
    shadowsEnabled
}: { 
    position: THREE.Vector3, 
    setPosition: (v: THREE.Vector3) => void,
    onShoot: (pos: THREE.Vector3, dir: THREE.Vector3) => void,
    color: string,
    shadowsEnabled: boolean
}) => {
    const { camera } = useThree();
    const [velocity] = useState(new THREE.Vector3());
    const [isJumping, setIsJumping] = useState(false);
    
    const gunRef = useRef<THREE.Group>(null);
    const isShooting = useRef(false);
    const shootTime = useRef(0);
    
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
        const onMouseDown = () => {
            if (document.pointerLockElement) {
                const dir = new THREE.Vector3();
                camera.getWorldDirection(dir);
                const spawnPos = camera.position.clone().add(dir.multiplyScalar(0.5));
                spawnPos.y -= 0.2;
                
                onShoot(spawnPos, dir);
                
                isShooting.current = true;
                shootTime.current = Date.now();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('mousedown', onMouseDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            document.removeEventListener('mousedown', onMouseDown);
        };
    }, [isJumping, position, velocity, camera, onShoot]);

    useFrame((state, delta) => {
        // Physics
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= GRAVITY * delta;

        const speed = isRunning.current ? RUN_SPEED : WALK_SPEED;
        const direction = new THREE.Vector3();
        direction.z = Number(moveForward.current) - Number(moveBackward.current);
        direction.x = Number(moveRight.current) - Number(moveLeft.current);
        direction.normalize();

        if (moveForward.current || moveBackward.current) velocity.z -= direction.z * 40.0 * delta * speed;
        if (moveLeft.current || moveRight.current) velocity.x -= direction.x * 40.0 * delta * speed;

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

        position.y += velocity.y * delta;
        if (position.y < 0) {
            velocity.y = 0;
            position.y = 0;
            setIsJumping(false);
        }

        camera.position.set(position.x, position.y + PLAYER_HEIGHT, position.z);
        setPosition(position.clone());

        // Gun Animation
        if (gunRef.current) {
            if (moveForward.current || moveBackward.current || moveLeft.current || moveRight.current) {
                const bobSpeed = isRunning.current ? 15 : 10;
                gunRef.current.position.y = -0.4 + Math.sin(state.clock.elapsedTime * bobSpeed) * 0.02;
            } else {
                gunRef.current.position.y = -0.4;
            }

            if (isShooting.current) {
                const elapsed = Date.now() - shootTime.current;
                if (elapsed < 150) {
                    const progress = elapsed / 150;
                    const value = Math.sin(progress * Math.PI);
                    gunRef.current.position.z = -0.5 + (value * 0.2);
                    gunRef.current.rotation.x = value * 0.5;
                } else {
                    isShooting.current = false;
                    gunRef.current.position.z = -0.5;
                    gunRef.current.rotation.x = 0;
                }
            }
        }
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

            {createPortal(
                <group ref={gunRef} position={[0.4, -0.4, -0.5]}>
                    <mesh castShadow={shadowsEnabled}>
                        <boxGeometry args={[0.2, 0.2, 0.6]} />
                        <meshStandardMaterial color="#333" />
                    </mesh>
                    <mesh position={[0, -0.2, 0.2]} castShadow={shadowsEnabled}>
                        <boxGeometry args={[0.2, 0.4, 0.2]} />
                        <meshStandardMaterial color={color} />
                    </mesh>
                </group>,
                camera
            )}
        </group>
    );
};

// --- MAIN GAME COMPONENT ---

export default function WhatToDoGame({ user, onBackToHub, username }: WhatToDoGameProps) {
    const [gameState, setGameState] = useState<'graphics-select' | 'color-select' | 'playing' | 'paused'>('graphics-select');
    
    const [playerColor, setPlayerColor] = useState('#5BC8F0');
    const [playerPos, setPlayerPos] = useState(new THREE.Vector3(0, 5, 0));
    
    // Graphics
    const [shadowsEnabled, setShadowsEnabled] = useState(true);
    const [renderDist, setRenderDist] = useState(16);
    const [simDist, setSimDist] = useState(4);

    const bulletsRef = useRef<BulletEntity[]>([]);
    const botsRef = useRef<BotEntity[]>([]);

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

    const handleShoot = useCallback((pos: THREE.Vector3, dir: THREE.Vector3) => {
        bulletsRef.current.push({
            position: pos.clone(),
            velocity: dir.clone().multiplyScalar(BULLET_SPEED),
            spawnTime: Date.now()
        });
    }, []);

    const handleBotKill = useCallback(() => {
        // Logic for kill confirmation or score could go here
    }, []);

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

                        <div className="text-white mb-4">Player Name: {displayableName}</div>
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
                            color={playerColor} 
                            setPosition={setPlayerPos}
                            onShoot={handleShoot}
                            shadowsEnabled={shadowsEnabled}
                        />
                        
                        <Bots bots={botsRef} bullets={bulletsRef} onKill={handleBotKill} />
                        <Bullets bullets={bulletsRef} />
                        <InfiniteFloor renderDistance={renderDist} playerPos={playerPos} shadowsEnabled={shadowsEnabled} />
                        
                        {gameState === 'playing' && !showSettings && (
                            <PointerLockControls selector="#root" />
                        )}
                    </Canvas>
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

            {/* Chat */}
            {gameState !== 'graphics-select' && gameState !== 'color-select' && (
                <div className="absolute bottom-0 right-0 h-[250px] w-[300px] z-[40] animate-fade-in">
                    <ChatWidget user={user} className="h-full border-b-0 border-r-0 opacity-80 hover:opacity-100 transition-opacity" />
                </div>
            )}

            {/* Crosshair (Dot) */}
            {gameState === 'playing' && !showSettings && (
                <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 z-[30] pointer-events-none mix-blend-difference shadow-[0_0_2px_black] animate-fade-in" />
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