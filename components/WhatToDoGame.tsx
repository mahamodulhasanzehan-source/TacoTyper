
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
const CHUNK_SIZE = 2; // 2x2 blocks per chunk
const BLOCK_SIZE = 1;
const PLAYER_HEIGHT = 2;
const GRAVITY = 30.0;
const JUMP_FORCE = 9.5; // sqrt(2 * 30 * 1.5) approx
const WALK_SPEED = 4.0;
const RUN_SPEED = 6.0;

// --- 3D COMPONENTS ---

// The floor grid manager using InstancedMesh for performance
const InfiniteFloor = ({ renderDistance, playerPos }: { renderDistance: number, playerPos: THREE.Vector3 }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    // Convert render distance (chunks) to blocks radius
    const radius = renderDistance * CHUNK_SIZE; 
    
    // We only create instances once and then update them or simple just render a huge grid. 
    // For "Infinite" appearance, we center the grid on the player's chunk coordinates.
    // Count: (2 * radius + 1)^2
    const side = (radius * 2) + 1;
    const count = side * side;

    useFrame(() => {
        if (!meshRef.current) return;

        // Snap player position to grid
        const centerX = Math.floor(playerPos.x / BLOCK_SIZE);
        const centerZ = Math.floor(playerPos.z / BLOCK_SIZE);

        let i = 0;
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                dummy.position.set(
                    (centerX + x) * BLOCK_SIZE, 
                    -0.5, // Floor is at y=-0.5 so top face is at 0
                    (centerZ + z) * BLOCK_SIZE
                );
                dummy.updateMatrix();
                meshRef.current.setMatrixAt(i++, dummy.matrix);
            }
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
            <meshStandardMaterial color="#4caf50" />
        </instancedMesh>
    );
};

// Player Logic
const Player = ({ position, color, setPosition }: { position: THREE.Vector3, color: string, setPosition: (v: THREE.Vector3) => void }) => {
    const { camera } = useThree();
    const [velocity] = useState(new THREE.Vector3());
    const [isJumping, setIsJumping] = useState(false);
    
    // Inputs
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
                    if (!isJumping && position.y <= 0.05) { // Simple ground check
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
        // Physics
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= GRAVITY * delta;

        const speed = isRunning.current ? RUN_SPEED : WALK_SPEED;
        const direction = new THREE.Vector3();

        direction.z = Number(moveForward.current) - Number(moveBackward.current);
        direction.x = Number(moveRight.current) - Number(moveLeft.current);
        direction.normalize();

        if (moveForward.current || moveBackward.current) velocity.z -= direction.z * 40.0 * delta * speed; // 40.0 is acceleration factor
        if (moveLeft.current || moveRight.current) velocity.x -= direction.x * 40.0 * delta * speed;

        // Apply movement relative to camera look direction
        // We need to extract forward/right vectors from camera but ignore Y pitch
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

        // Direct velocity application based on input state
        // This simple physics model is responsive
        if (moveVec.length() > 0) {
            position.x += moveVec.x * speed * delta;
            position.z += moveVec.z * speed * delta;
        }

        // Apply Gravity / Jump
        position.y += velocity.y * delta;

        // Ground Collision (Floor is at y=0 surface)
        if (position.y < 0) {
            velocity.y = 0;
            position.y = 0;
            setIsJumping(false);
        }

        // Sync Camera
        // Camera at 2nd block height (approx 1.8 units above feet)
        camera.position.set(position.x, position.y + 1.8, position.z);
        
        // Update parent position state for chunk loading
        setPosition(position.clone());
    });

    // Render Player Model (Visible only to self if we had 3rd person, but this is 1st person)
    // However, the prompt asks for "player being: two blocks tall".
    // We can render a mesh at the player position for shadow/representation if we look down?
    // Since it's 1st person, we mostly just need the collision box logic which is handled above.
    return (
        <group position={[position.x, position.y + 1, position.z]}>
            <mesh>
                <boxGeometry args={[0.8, 2, 0.8]} />
                <meshStandardMaterial color={color} transparent opacity={0.3} />
            </mesh>
        </group>
    );
};

// --- MAIN GAME COMPONENT ---

export default function WhatToDoGame({ user, onBackToHub, username }: WhatToDoGameProps) {
    const [gameState, setGameState] = useState<'color-select' | 'playing' | 'paused'>('color-select');
    const [playerColor, setPlayerColor] = useState('#ff0000');
    const [playerPos, setPlayerPos] = useState(new THREE.Vector3(0, 5, 0)); // Start in air
    
    // Settings
    const [showSettings, setShowSettings] = useState(false);
    const [renderDist, setRenderDist] = useState(16);
    const [simDist, setSimDist] = useState(4); // "Simulation" distance (logic placeholder)

    const displayableName = username || user.displayName || 'Player';

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState === 'color-select') return;

            if (e.key === 'Escape') {
                setGameState(prev => prev === 'playing' ? 'paused' : 'playing');
                setShowSettings(false);
            }
            if ((e.key === 'p' || e.key === 'P') && gameState !== 'color-select') {
                if (gameState === 'paused') return; // Can't open P menu if main pause menu is open? Or maybe yes?
                // Prompt says: "settings icon will not be visible to the player only when you press P. Will the settings menu open up."
                setShowSettings(prev => !prev);
                // When opening settings, we should unlock cursor to allow interaction
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
            
            {/* 1. COLOR SELECTION SCREEN */}
            {gameState === 'color-select' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
                    <RandomReveal className="bg-[#111] border-4 border-white p-8 max-w-md w-full text-center">
                        <h1 className="text-3xl text-white mb-2 font-bold">What to do</h1>
                        <p className="text-[#aaa] mb-8 text-sm">Choose your aura color</p>
                        
                        <div className="flex justify-center gap-4 mb-8">
                            {['#ff2a2a', '#4caf50', '#2196f3', '#ffeb3b', '#9c27b0', '#ffffff'].map(c => (
                                <button 
                                    key={c}
                                    onClick={() => setPlayerColor(c)}
                                    className={`w-10 h-10 rounded border-2 transition-transform hover:scale-110 ${playerColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>

                        <div 
                            className="w-20 h-40 mx-auto mb-8 border-2 border-white"
                            style={{ backgroundColor: playerColor }}
                        ></div>

                        <Button onClick={startGame} className="w-full">Enter World</Button>
                    </RandomReveal>
                </div>
            )}

            {/* 2. THE 3D WORLD */}
            {(gameState === 'playing' || gameState === 'paused') && (
                <Canvas shadows camera={{ fov: 75 }}>
                    <Sky sunPosition={[100, 20, 100]} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />
                    
                    <Player 
                        position={playerPos} 
                        color={playerColor} 
                        setPosition={setPlayerPos} // Updates parent state for chunk loading
                    />
                    
                    <InfiniteFloor renderDistance={renderDist} playerPos={playerPos} />
                    
                    {/* Controls only active when playing and settings closed */}
                    {gameState === 'playing' && !showSettings && (
                        <PointerLockControls selector="#root" />
                    )}
                </Canvas>
            )}

            {/* 3. OVERLAYS */}
            
            {/* Pause Menu (ESC) */}
            {gameState === 'paused' && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#111] border-2 border-white p-8 min-w-[300px] flex flex-col gap-4">
                        <h2 className="text-2xl text-white text-center mb-4">PAUSED</h2>
                        <Button onClick={() => setGameState('playing')}>Resume</Button>
                        <Button variant="secondary" onClick={onBackToHub}>Exit to Hub</Button>
                    </div>
                </div>
            )}

            {/* Settings Menu (P) */}
            {showSettings && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[70] bg-[#111] border-2 border-[#f4b400] p-6 w-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-[#f4b400] text-xl font-bold">World Settings</h2>
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
                                    className="flex-1 accent-[#f4b400]" 
                                />
                                <span className="text-[#f4b400] w-8">{renderDist}</span>
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
                                    className="flex-1 accent-[#f4b400]" 
                                />
                                <span className="text-[#f4b400] w-8">{simDist}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 text-[10px] text-[#555] text-center">
                        Press 'P' to close
                    </div>
                </div>
            )}

            {/* Chat (Visible unless in color select) */}
            {gameState !== 'color-select' && (
                <div className="absolute bottom-0 right-0 h-[250px] w-[300px] z-[40]">
                    <ChatWidget user={user} className="h-full border-b-0 border-r-0 opacity-80 hover:opacity-100 transition-opacity" />
                </div>
            )}

            {/* HUD (Crosshair) */}
            {gameState === 'playing' && !showSettings && (
                <div className="absolute top-1/2 left-1/2 w-4 h-4 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2 z-[30] pointer-events-none mix-blend-difference" />
            )}
            
            {/* Controls Hint */}
            {gameState === 'playing' && !showSettings && (
                <div className="absolute top-4 left-4 text-white/50 text-[10px] font-mono pointer-events-none z-[30]">
                    WASD to Move • SHIFT to Run • SPACE to Jump • P for Settings • ESC for Menu
                </div>
            )}

        </div>
    );
}
