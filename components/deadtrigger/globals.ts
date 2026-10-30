import * as THREE from 'three';

class Globals {
    scene!: THREE.Scene;
    camera!: THREE.PerspectiveCamera;
    renderer!: THREE.WebGLRenderer;
    yawObj!: THREE.Object3D;
    pitchObj!: THREE.Object3D;
    cameraRecoilObj!: THREE.Object3D;
    viewmodel!: THREE.Group;
    currentWeaponMesh: THREE.Group | THREE.Object3D | null = null;
    stationMesh!: THREE.Mesh;
    stationPos: THREE.Vector3 = new THREE.Vector3(10, 1.5, -10);
    stationLight!: THREE.PointLight;
    raycaster: THREE.Raycaster = new THREE.Raycaster();
    environmentMeshes: THREE.Object3D[] = [];
    dirLight!: THREE.DirectionalLight;
    ambientLight!: THREE.AmbientLight;
    gunAmbientLight!: THREE.AmbientLight;
    skySphere!: THREE.Mesh;
    dayTimer: number = 0;
    composer: any = null;
    
    // Audio Context
    audioCtx: any = null;
    buffGun: any = null;
    buffSniper: any = null;
    envMapTexture: THREE.Texture | null = null;
}

export const globals = new Globals();
