declare module 'three' {
  export class AmbientLight {
    constructor(color: number, intensity?: number);
  }
  
  export class DirectionalLight {
    constructor(color: number, intensity?: number);
    position: { set(x: number, y: number, z: number): void };
    name: string;
  }
  
  export class SphereGeometry {
    constructor(radius: number, widthSegments?: number, heightSegments?: number);
  }
  
  export class MeshBasicMaterial {
    constructor(parameters?: { color?: number });
  }
  
  export class Mesh {
    constructor(geometry: any, material: any);
    position: { set(x: number, y: number, z: number): void };
    name: string;
  }
}

