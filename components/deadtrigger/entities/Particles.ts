import * as THREE from 'three';
import { globals } from '../globals';
import { state } from '../state';

export function createFloatingText(pos: THREE.Vector3, textStr: string, colorHex: number) {
    const div = document.createElement('div');
    div.innerText = textStr;
    div.style.position = 'absolute'; 
    div.style.color = '#' + colorHex.toString(16).padStart(6, '0');
    div.style.fontWeight = 'bold'; 
    div.style.fontSize = '24px'; 
    div.style.pointerEvents = 'none';
    div.style.textShadow = '2px 2px 4px black'; 
    div.style.zIndex = '100';
    document.body.appendChild(div);
    
    const worldPos = pos.clone(); 
    worldPos.y += 2.5; 
    state.entities.floatingTexts.push({ element: div, pos: worldPos, life: 1.0 });
}

export function createParticles(pos: THREE.Vector3, color: number, count: number) {
    if (state.settings.disableRealisticGuns) {
        count = Math.floor(count * 0.2);
        if (count < 1) return;
    }
    for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: color, transparent: true }));
        p.position.copy(pos); 
        globals.scene.add(p);
        const velocity = new THREE.Vector3((Math.random() - 0.5) * 10, Math.random() * 10, (Math.random() - 0.5) * 10);
        state.entities.particles.push({ mesh: p, velocity, life: 1.0 });
    }
}

export function createHitscanTrail(start: THREE.Vector3, end: THREE.Vector3, colorHex: string | number = 0xffe633, thickness = 0.05, life = 0.315) {
    const dist = start.distanceTo(end);
    if (dist < 0.05) return;
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, thickness, dist), 
        new THREE.MeshBasicMaterial({ 
            color: new THREE.Color(colorHex || 0xffe633), 
            transparent: true, 
            opacity: 0.95, 
            blending: THREE.AdditiveBlending,
            toneMapped: false 
        })
    );
    mesh.position.copy(start).lerp(end, 0.5); 
    mesh.lookAt(end); 
    globals.scene.add(mesh);
    
    state.entities.trails.push({ mesh, life: life, maxLife: life });
}

export function createBulletTracerSegment(start: THREE.Vector3, end: THREE.Vector3, colorHex: string | number = 0xffe633, thickness = 0.045, life = 0.315) {
    const dist = start.distanceTo(end);
    if (dist < 0.05) return;
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, thickness, dist),
        new THREE.MeshBasicMaterial({ 
            color: new THREE.Color(colorHex || 0xffe633), 
            transparent: true, 
            opacity: 0.95, 
            blending: THREE.AdditiveBlending,
            toneMapped: false 
        })
    );
    mesh.position.copy(start).lerp(end, 0.5);
    mesh.lookAt(end);
    globals.scene.add(mesh);
    state.entities.trails.push({ mesh, life: life, maxLife: life });
}
