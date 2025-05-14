import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls, Text, Grid, Line } from "@react-three/drei";
import {
  Geometry,
  Base,
  Subtraction,
  Addition,
  Intersection,
} from "@react-three/csg";
import type { ThreeEvent } from "@react-three/fiber";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useParams, useSearchParams } from "react-router";
import {
  exampleFloorPlan,
  type Door as DoorFromGenerator,
  type Window as WindowFromGenerator,
} from "./generator";
import type { Door, Window, Space, Wall } from "convex/schema"; // This import might become unused
import type { Id } from "~/convex/_generated/dataModel";

type SelectedWallData = {
  id: string;
  start: [number, number];
  end: [number, number];
  height: number;
  thickness: number;
};

// Define more specific types for what WallWithOpenings actually needs
type DoorOpeningProps = {
  offset: number;
  width: number;
  height: number;
};

type WindowOpeningProps = {
  offset: number;
  width: number;
  height: number;
  sillHeight?: number;
};

type WallWithOpeningsProps = {
  id: string;
  start: [number, number];
  end: [number, number];
  height: number;
  thickness: number;
  doors: DoorOpeningProps[];
  windows: WindowOpeningProps[];
  onWallSelect?: (data: Wall) => void;
  type?: "exterior" | "interior";
  wall: Wall;
  isSelected?: boolean;
};

function WallWithOpenings({
  id,
  start,
  end,
  height,
  thickness,
  doors = [],
  windows = [],
  onWallSelect,
  type,
  wall,
  isSelected,
}: WallWithOpeningsProps) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  if (!length || !height || !thickness) return null;

  const mx = (start[0] + end[0]) / 2;
  const mz = (start[1] + end[1]) / 2;

  const handleMeshClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (onWallSelect) {
      onWallSelect(wall);
    }
  };

  // Choose color based on wall type
  const wallColor = isSelected
    ? "#f1c40f" // yellow for selected
    : type === "exterior"
    ? "#c0392b" // red for exterior
    : "#e0e0e0"; // light gray for interior

  return (
    <group position={[mx, height / 2, mz]} rotation={[0, -angle, 0]}>
      <mesh onClick={handleMeshClick}>
        <meshStandardMaterial color={wallColor} />
        <Geometry computeVertexNormals>
          <Base>
            <boxGeometry args={[length, height, thickness]} />
          </Base>

          {doors.map((door, i) => (
            <Subtraction
              key={`door-${i}`}
              position={[
                (door.offset ?? 0) - length / 2 + door.width / 2,
                (door.height ?? 2.1) / 2 - height / 2,
                0,
              ]}
            >
              <boxGeometry args={[door.width, door.height, thickness + 0.01]} />
            </Subtraction>
          ))}

          {/* Render door meshes inside the voids */}
          {doors.map((door, i) => (
            <mesh
              key={`door-mesh-${i}`}
              position={[
                (door.offset ?? 0) - length / 2 + door.width / 2,
                (door.height ?? 2.1) / 2 - height / 2,
                thickness * 0.15, // Slightly inset
              ]}
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={[
                  door.width * 0.95,
                  (door.height ?? 2.1) * 0.98,
                  thickness * 0.7,
                ]}
              />
              <meshStandardMaterial color="#8B5C2A" />
            </mesh>
          ))}

          {windows.map((window, i) => (
            <Subtraction
              key={`window-${i}`}
              position={[
                (window.offset ?? 0) - length / 2 + window.width / 2,
                (window.sillHeight ?? 1) +
                  (window.height ?? 1.2) / 2 -
                  height / 2,
                0,
              ]}
            >
              <boxGeometry
                args={[window.width, window.height, thickness + 0.01]}
              />
            </Subtraction>
          ))}

          {/* Render window glass panes inside the voids */}
          {windows.map((window, i) => (
            <mesh
              key={`window-mesh-${i}`}
              position={[
                (window.offset ?? 0) - length / 2 + window.width / 2,
                (window.sillHeight ?? 1) +
                  (window.height ?? 1.2) / 2 -
                  height / 2,
                thickness * 0.15, // Slightly inset
              ]}
              castShadow={false}
              receiveShadow={false}
            >
              <boxGeometry
                args={[
                  window.width * 0.95,
                  (window.height ?? 1.2) * 0.98,
                  thickness * 0.5,
                ]}
              />
              <meshPhysicalMaterial
                color="#7ec8e3"
                transparent
                opacity={0.4}
                roughness={0.1}
                metalness={0.2}
                transmission={0.8}
                thickness={0.1}
              />
            </mesh>
          ))}
        </Geometry>
      </mesh>
    </group>
  );
}

// Helper function to calculate the center of a polygon
function getPolygonCenter(polygon: number[][]): [number, number, number] {
  if (!polygon || polygon.length === 0) {
    return [0, 0, 0];
  }
  let sumX = 0;
  let sumZ = 0;
  for (const point of polygon) {
    sumX += point[0];
    sumZ += point[1];
  }
  return [sumX / polygon.length, 0, sumZ / polygon.length];
}

// Helper function to calculate the bounding box of a polygon
function getPolygonBoundingBox(polygon: number[][]): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  if (!polygon || polygon.length === 0) {
    return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  }
  let minX = polygon[0][0];
  let maxX = polygon[0][0];
  let minZ = polygon[0][1];
  let maxZ = polygon[0][1];

  for (const point of polygon) {
    if (point[0] < minX) minX = point[0];
    if (point[0] > maxX) maxX = point[0];
    if (point[1] < minZ) minZ = point[1];
    if (point[1] > maxZ) maxZ = point[1];
  }
  return { minX, maxX, minZ, maxZ };
}

// Helper function to calculate the area of a polygon using the shoelace formula
function getPolygonArea(polygon: number[][]): number {
  if (!polygon || polygon.length < 3) {
    return 0; // Not a polygon
  }
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    area += p1[0] * p2[1] - p2[0] * p1[1];
  }
  return Math.abs(area) / 2;
}

// Helper function to calculate bounding box for a list of walls
function getWallsBoundingBox(wallsToBound: Wall[]): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  if (!wallsToBound || wallsToBound.length === 0) {
    return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  wallsToBound.forEach((wall) => {
    // Assuming wall.start and wall.end are [x, y] coordinates
    if (
      wall.start &&
      wall.start.length >= 2 &&
      wall.end &&
      wall.end.length >= 2
    ) {
      minX = Math.min(minX, wall.start[0], wall.end[0]);
      maxX = Math.max(maxX, wall.start[0], wall.end[0]);
      minZ = Math.min(minZ, wall.start[1], wall.end[1]);
      maxZ = Math.max(maxZ, wall.start[1], wall.end[1]);
    }
  });

  if (
    minX === Infinity ||
    maxX === -Infinity ||
    minZ === Infinity ||
    maxZ === -Infinity
  ) {
    // This case means no valid wall coordinates were processed
    return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  }

  return { minX, maxX, minZ, maxZ };
}

const EPSILON = 0.001; // Tolerance for comparing points

function pointsAreEqual(
  p1: [number, number] | THREE.Vector2,
  p2: [number, number] | THREE.Vector2
): boolean {
  const p1_x = Array.isArray(p1) ? p1[0] : p1.x;
  const p1_y = Array.isArray(p1) ? p1[1] : p1.y;
  const p2_x = Array.isArray(p2) ? p2[0] : p2.x;
  const p2_y = Array.isArray(p2) ? p2[1] : p2.y;
  return Math.abs(p1_x - p2_x) < EPSILON && Math.abs(p1_y - p2_y) < EPSILON;
}

export function FloorPlanRenderer() {
  const [searchParams] = useSearchParams();
  // const threadId = searchParams.get("threadId");
  const storeyId = searchParams.get("storeyId") as Id<"storey"> | null;
  const threadId = searchParams.get("threadId");

  const SLAB_THICKNESS = 0.1; // Define slab thickness

  const floorPlan = useQuery(api.storey.byId, {
    storeyId,
  });

  const spaces = useQuery(api.spaces.get, {
    storeyId,
  });

  const { walls = [], doors = [], windows = [], slab = null } = floorPlan || {};

  const [selectedWallInfo, setSelectedWallInfo] = useState<Wall | null>(null);

  const modelCenter = React.useMemo(() => {
    if (!walls.length && (!spaces || !spaces.length)) {
      return new THREE.Vector3(0, 0, 0);
    }

    // Ensure all wall start/end are [number, number]
    const safeWalls = walls.map((wall) => ({
      ...wall,
      start: [wall.start[0], wall.start[1]] as [number, number],
      end: [wall.end[0], wall.end[1]] as [number, number],
    }));

    // Ensure all spaces have type as RoomType
    const safeSpaces = spaces?.map((space) => ({
      ...space,
      polygon: space.polygon, // Assuming polygon is already in correct [[number, number], ...]
      type: space.type as any, // RoomType - keep as is if used elsewhere, otherwise review type
    }));

    let overallMinX = Infinity;
    let overallMaxX = -Infinity;
    let overallMinZ = Infinity;
    let overallMaxZ = -Infinity;

    if (safeWalls.length > 0) {
      const wallsBbox = getWallsBoundingBox(safeWalls);
      overallMinX = Math.min(overallMinX, wallsBbox.minX);
      overallMaxX = Math.max(overallMaxX, wallsBbox.maxX);
      overallMinZ = Math.min(overallMinZ, wallsBbox.minZ);
      overallMaxZ = Math.max(overallMaxZ, wallsBbox.maxZ);
    }

    if (safeSpaces && safeSpaces.length > 0) {
      safeSpaces.forEach((space) => {
        if (space.polygon && space.polygon.length > 0) {
          const spaceBbox = getPolygonBoundingBox(space.polygon);
          overallMinX = Math.min(overallMinX, spaceBbox.minX);
          overallMaxX = Math.max(overallMaxX, spaceBbox.maxX);
          overallMinZ = Math.min(overallMinZ, spaceBbox.minZ);
          overallMaxZ = Math.max(overallMaxZ, spaceBbox.maxZ);
        }
      });
    }

    if (overallMinX === Infinity) {
      // No walls or spaces with geometry
      return new THREE.Vector3(0, 0, 0);
    }

    return new THREE.Vector3(
      (overallMinX + overallMaxX) / 2,
      0,
      (overallMinZ + overallMaxZ) / 2
    );
  }, [walls, spaces]);

  const doorsByWall = React.useMemo(() => {
    const map = new Map<string, DoorFromGenerator[]>();
    for (const door of doors) {
      if (!map.has(door.wallId)) map.set(door.wallId, []);
      map.get(door.wallId)!.push(door);
    }
    return map;
  }, [doors]);

  const windowsByWall = React.useMemo(() => {
    const map = new Map<string, WindowFromGenerator[]>();
    for (const window of windows) {
      if (!map.has(window.wallId)) map.set(window.wallId, []);
      map.get(window.wallId)!.push(window);
    }
    return map;
  }, [windows]);

  const handleWallSelect = (data: Wall) => {
    setSelectedWallInfo(data);
  };

  return (
    <>
      <Canvas
        orthographic
        camera={{
          position: [15, 20, 25],
          fov: 50,
          near: 0.1,
          far: 1000,
          up: [0, 1, 0],
        }}
        onPointerMissed={() => setSelectedWallInfo(null)}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={0.7} />
        <Grid
          position={[0, 0, 0]}
          args={[100, 100]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor={new THREE.Color("#6f6f6f")}
          sectionSize={5}
          sectionThickness={1}
          sectionColor={new THREE.Color("#4f4f4f")}
          infiniteGrid
          fadeDistance={50}
          fadeStrength={1}
        />
        <group onPointerMissed={(e) => e.stopPropagation()}>
          {walls.map((wall) => (
            <WallWithOpenings
              wall={wall}
              key={wall._id}
              id={wall._id}
              start={[wall.start[0], wall.start[1]] as [number, number]}
              end={[wall.end[0], wall.end[1]] as [number, number]}
              height={wall.height}
              thickness={wall.thickness}
              doors={(doorsByWall.get(wall._id) || []).map((d) => ({
                offset: d.offset,
                width: d.width,
                height: d.height,
              }))}
              windows={(windowsByWall.get(wall._id) || []).map((w) => ({
                offset: w.offset,
                width: w.width,
                height: w.height,
                sillHeight: w.sillHeight,
              }))}
              onWallSelect={handleWallSelect}
              type={wall.type}
              isSelected={selectedWallInfo?._id === wall._id}
            />
          ))}
          {spaces?.map((space) => {
            const center = getPolygonCenter(space.polygon);
            const boundingBox = getPolygonBoundingBox(space.polygon);
            const width = boundingBox.maxX - boundingBox.minX;
            const depth = boundingBox.maxZ - boundingBox.minZ;

            // Ensure width and depth are positive to avoid THREE.js warnings/errors
            if (width <= 0 || depth <= 0) return null;

            const area = getPolygonArea(space.polygon);

            return (
              <group key={space._id}>
                {/* <mesh position={[center[0], height / 2, center[2]]}>
                  <boxGeometry args={[width, height, depth]} />
                  <meshStandardMaterial
                    color="skyblue"
                    transparent
                    opacity={0.35}
                    side={THREE.DoubleSide} // Render both sides to see inside transparent objects
                  />
                </mesh> */}
                <Text
                  position={[center[0], 0.2, center[2] - 0.2]} // Position text above the cube
                  rotation={[-Math.PI / 2, 0, 0]}
                  fontSize={0.15}
                  color="black"
                  anchorX="center"
                  anchorY="middle"
                >
                  no. {space.number}
                </Text>
                <Text
                  position={[center[0], 0.2, center[2]]} // Position text above the cube
                  rotation={[-Math.PI / 2, 0, 0]}
                  fontSize={0.1}
                  color="black"
                  anchorX="center"
                  anchorY="middle"
                >
                  {space.name}
                </Text>
                <Text
                  position={[center[0], 0.2, center[2] + 0.15]} // Position text slightly below the name
                  rotation={[-Math.PI / 2, 0, 0]}
                  fontSize={0.1}
                  color="black"
                  anchorX="center"
                  anchorY="middle"
                >
                  {`Area: ${area.toFixed(2)} m²`}
                </Text>
                <group position={[0, 0.02, 0]}>
                  {space.polygon.map((point, index) => {
                    const nextPoint =
                      space.polygon[(index + 1) % space.polygon.length];
                    return (
                      <Line
                        key={`boundary-${space._id}-${index}`}
                        points={[
                          new THREE.Vector3(point[0], 0, point[1]),
                          new THREE.Vector3(nextPoint[0], 0, nextPoint[1]),
                        ]}
                        color="black"
                        lineWidth={2}
                      />
                    );
                  })}
                </group>
              </group>
            );
          })}
        </group>

        <OrbitControls target={modelCenter} />
      </Canvas>
      {selectedWallInfo && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            color: "white",
            padding: "12px",
            borderRadius: "8px",
            fontFamily: "monospace",
            fontSize: "13px",
            zIndex: 1000,
            maxWidth: "300px",
            wordBreak: "break-all",
          }}
          className="text-sm overflow-x-auto"
        >
          <h3>Selected Wall Info</h3>
          <pre>{JSON.stringify(selectedWallInfo, null, 2)}</pre>
        </div>
      )}
    </>
  );
}

// Which Algorithm to Choose?
// For simplicity: Start with the Rectangle Subdivision approach
// For best results: Use Simulated Annealing or Genetic Algorithm
// For interactive generation: Use BSP with user-guided partitioning
// The Simulated Annealing approach is likely the most balanced, offering good results without excessive complexity. You could implement a basic version first, then add more sophisticated optimization if needed.
