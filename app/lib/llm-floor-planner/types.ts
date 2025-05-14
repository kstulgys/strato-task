// --- Basic Types ---
export type Vec2 = [number, number];

// --- Wall Types ---
export type WallType = "exterior" | "interior" | "sandwich";

export interface WallLayer {
  material: string;
  thickness: number; // meters
  color?: string;
  density?: number; // kg/m³, optional
  notes?: string;
}

export interface WallPreset {
  name: string;
  type: WallType;
  layers: WallLayer[];
}

// The main Wall type
export interface Wall {
  id: string;
  start: Vec2;
  end: Vec2;
  height: number;
  spaces: string[]; // IDs of adjacent spaces
  type: WallType;
  layers?: WallLayer[]; // For sandwich/multi-layer walls
  // For single-layer walls, you may use layers: [{...}]
  // thickness is always derived from layers if present
}

export interface SpacePreset {
  name: string;
  defaultArea: number; // m², suggested area
  defaultCeilingHeight: number; // meters
  minArea?: number; // m², optional
  maxArea?: number; // m², optional
  notes?: string;
}

// --- Space Types ---
export interface Space {
  id: string;
  name: string;
  polygon: Vec2[]; // 2D points in order
  floorHeight: number;
  ceilingHeight: number;
}

// --- Window Types ---
export type WindowType = "single" | "double" | "sliding" | "fixed";

export interface WindowPreset {
  name: string;
  type: WindowType;
  width: number; // meters
  height: number; // meters
  sillHeight: number; // meters (distance from floor to bottom of window)
  frameMaterial: string;
  glazing: string;
  color?: string;
  notes?: string;
}

export interface Window {
  id: string;
  wallId: string;
  position: number; // Distance from wall start, in meters
  width: number;
  height: number;
  sillHeight: number;
  type: WindowType;
  frameMaterial: string;
  glazing: string;
  color?: string;
  notes?: string;
}

// --- Door Types ---
export type DoorType = "single" | "double" | "sliding";
export type DoorLocationType = "interior" | "exterior";

export interface DoorPreset {
  name: string;
  type: DoorType; // "single" | "double" | "sliding"
  locationType: DoorLocationType;
  width: number;
  height: number;
  frameMaterial: string;
  color?: string;
  notes?: string;
}

export interface Door {
  id: string;
  wallId: string;
  position: number;
  width: number;
  height: number;
  type: DoorType;
  locationType: DoorLocationType;
  frameMaterial: string;
  color?: string;
  notes?: string;
}

// --- Floor Plan ---
export interface FloorPlan {
  spaces: Space[];
  walls: Wall[];
  doors: Door[];
  windows: Window[];
}
