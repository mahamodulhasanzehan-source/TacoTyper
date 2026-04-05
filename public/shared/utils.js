function createFloatingText(state, pos, textStr, colorHex) {
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

function createParticles(state, scene, pos, color, count) {
    for(let i=0; i<count; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: color, transparent: true }));
        p.position.copy(pos); 
        scene.add(p);
        const velocity = new THREE.Vector3((Math.random() - 0.5) * 10, Math.random() * 10, (Math.random() - 0.5) * 10);
        state.entities.particles.push({ mesh: p, velocity, life: 1.0 });
    }
}

function createHitscanTrail(state, scene, start, end, colorHex, thickness) {
    const dist = start.distanceTo(end);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, dist), new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.8 }));
    mesh.position.copy(start).lerp(end, 0.5); 
    mesh.lookAt(end); 
    scene.add(mesh);
    state.entities.trails.push({ mesh, life: 1.0 });
}

function getRoundedBoxGeometry(w, h, d) {
    const r = Math.min(0.005, w/2.1, h/2.1, d/2.1); 
    const w0 = w - 2*r;
    const h0 = h - 2*r;
    const x0 = -w0/2;
    const y0 = -h0/2;
    
    const shape = new THREE.Shape();
    shape.moveTo(x0 + r, y0); shape.lineTo(x0 + w0 - r, y0); shape.quadraticCurveTo(x0 + w0, y0, x0 + w0, y0 + r);
    shape.lineTo(x0 + w0, y0 + h0 - r); shape.quadraticCurveTo(x0 + w0, y0 + h0, x0 + w0 - r, y0 + h0);
    shape.lineTo(x0 + r, y0 + h0); shape.quadraticCurveTo(x0, y0 + h0, x0, y0 + h0 - r);
    shape.lineTo(x0, y0 + r); shape.quadraticCurveTo(x0, y0, x0 + r, y0);

    return new THREE.ExtrudeGeometry(shape, { depth: d - 2*r, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: r, bevelThickness: r }).center();
}
