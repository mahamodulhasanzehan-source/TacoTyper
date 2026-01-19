// Manually define missing types to fix build errors

// JSX Intrinsic Elements for React Three Fiber
declare namespace JSX {
  interface IntrinsicElements {
    ambientLight: any;
    directionalLight: any;
    pointLight: any;
    spotLight: any;
    orthographicCamera: any;
    perspectiveCamera: any;
    instancedMesh: any;
    boxGeometry: any;
    sphereGeometry: any;
    planeGeometry: any;
    meshStandardMaterial: any;
    meshBasicMaterial: any;
    meshPhongMaterial: any;
    group: any;
    mesh: any;
    primitive: any;
  }
}

// Asset Modules
declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  const src: string;
  export default src;
}

declare module '*.css';
declare module '*.scss';
declare module '*.sass';
declare module '*.less';
declare module '*.styl';
declare module '*.stylus';
declare module '*.pcss';
declare module '*.sss';

declare module '*.png' { const src: string; export default src; }
declare module '*.jpg' { const src: string; export default src; }
declare module '*.jpeg' { const src: string; export default src; }
declare module '*.gif' { const src: string; export default src; }
declare module '*.ico' { const src: string; export default src; }
declare module '*.webp' { const src: string; export default src; }
declare module '*.bmp' { const src: string; export default src; }

// Environment Variables
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_API_KEY: string
  [key: string]: any
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
