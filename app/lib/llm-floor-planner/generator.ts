// import { createPlan } from "~/utils/create-plan";

// import type { Id } from "~/convex/_generated/dataModel";

export type Wall = {
  _id: string;
  storeyId: string;
  start: [number, number]; // [x,y] coordinate
  end: [number, number]; // [x,y] coordinate
  height: number;
  thickness: number; // for exterior walls must be 0.35, for interior walls must be 0.09
  type: "exterior" | "interior";
  spaceIds: string[];
};

export type Door = {
  _id: string;
  storeyId: string;
  wallId: string;
  offset: number; // distance from wall start
  width: number; // for interior doors must be 0.9, for exterior doors must be 1.2
  height: number; // for interior doors must be 2.1, for exterior doors must be 2.4
  type: "interior" | "exterior";
};

export type Window = {
  _id: string;
  storeyId: string;
  wallId: string; // id of the wall the window is on
  offset: number; // distance from wall start
  width: number;
  height: number;
  sillHeight: number; //  always fixed to 1.2m
};

export type FloorPlan = {
  spaces: Space[];
  walls: Wall[];
  doors: Door[];
  windows: Window[];
};

export type RoomType =
  | "entry"
  | "entryway"
  | "foyer"
  | "hallway"
  | "corridor"
  | "living"
  | "living room"
  | "family room"
  | "dining"
  | "dining room"
  | "kitchen"
  | "pantry"
  | "scullery"
  | "laundry"
  | "mudroom"
  | "bathroom"
  | "wc"
  | "toilet"
  | "powder room"
  | "shower"
  | "ensuite"
  | "bedroom"
  | "master bedroom"
  | "primary bedroom"
  | "guest bedroom"
  | "kids bedroom"
  | "study"
  | "office"
  | "library"
  | "playroom"
  | "nursery"
  | "walk-in closet"
  | "closet"
  | "storage"
  | "utility"
  | "garage"
  | "carport"
  | "balcony"
  | "terrace"
  | "patio"
  | "porch"
  | "sunroom"
  | "conservatory"
  | "cellar"
  | "basement"
  | "attic"
  | "stairs"
  | "lift"
  | "void"
  | "mechanical"
  | "plant room"
  | "server room"
  | "gym"
  | "sauna"
  | "home theater"
  | "music room"
  | "game room"
  | "wine cellar"
  | "safe room"
  | "workshop"
  | "studio";

export const ROOM_TYPE_WEIGHTS: Record<RoomType, number> = {
  entry: 1,
  entryway: 1,
  foyer: 1,
  hallway: 1,
  corridor: 1,
  living: 3,
  "living room": 3,
  "family room": 3,
  dining: 2,
  "dining room": 2,
  kitchen: 2,
  pantry: 1,
  scullery: 1,
  laundry: 1,
  mudroom: 1,
  bathroom: 1,
  wc: 0.7,
  toilet: 0.7,
  "powder room": 0.7,
  shower: 0.7,
  ensuite: 1,
  bedroom: 2,
  "master bedroom": 3,
  "primary bedroom": 3,
  "guest bedroom": 2,
  "kids bedroom": 2,
  study: 1.5,
  office: 1.5,
  library: 1.5,
  playroom: 1.5,
  nursery: 1.2,
  "walk-in closet": 1,
  closet: 0.5,
  storage: 0.7,
  utility: 0.7,
  garage: 3,
  carport: 2,
  balcony: 1,
  terrace: 1.5,
  patio: 1.5,
  porch: 1,
  sunroom: 1.5,
  conservatory: 1.5,
  cellar: 1,
  basement: 2,
  attic: 1,
  stairs: 0.7,
  lift: 0.5,
  void: 0.2,
  mechanical: 0.7,
  "plant room": 0.7,
  "server room": 0.7,
  gym: 2,
  sauna: 1,
  "home theater": 2,
  "music room": 1.5,
  "game room": 2,
  "wine cellar": 1,
  "safe room": 1,
  workshop: 1.5,
  studio: 1.5,
};

type Edge = {
  _id: string;
  i: string;
  j: string;
  separation?: "door" | "wall";
};

type GraphPath = [string, RoomType, "door" | "wall"];

// export const exampleFloorGraphPaths: GraphPath[] = [
//   ["Entryway", "living room", "door"],
//   ["Entryway", "garage", "door"],
//   ["Entryway", "hallway", "door"],
//   ["Living Room", "dining room", "door"],
//   ["Living Room", "kitchen", "wall"],
//   ["Living Room", "hallway", "wall"],
//   ["Dining Room", "kitchen", "door"],
//   ["Kitchen", "laundry", "door"],
//   ["Hallway", "master bedroom", "door"],
//   ["Hallway", "bedroom", "door"],
//   ["Hallway", "bathroom", "door"],
//   ["Master Bedroom", "bathroom", "door"],
//   ["Garage", "laundry", "door"],
// ];

// squarified treemap

export const exampleFloorGraphPaths: GraphPath[] = [
  ["entryway", "living room", "door"],
  ["entryway", "garage", "door"],
  ["entryway", "hallway", "door"],
  ["living room", "dining room", "door"],
  ["living room", "kitchen", "wall"],
  ["living room", "hallway", "wall"],
  ["dining room", "kitchen", "door"],
  ["kitchen", "laundry", "door"],
  ["hallway", "master bedroom", "door"],
  ["hallway", "bedroom", "door"],
  ["hallway", "bathroom", "door"],
  ["master bedroom", "bathroom", "door"],
  ["garage", "laundry", "door"],
];

function createEdge(edge: GraphEdge): Edge {
  return {
    _id: `edge-${edge[0][0]}-${edge[1][0]}`,
    i: edge[0][0],
    j: edge[1][0],
    separation: edge[2],
  };
}

export type GraphEdge = [
  [string, RoomType],
  [string, RoomType],
  "door" | "wall"
];

// createEdge("Entryway", "Hall", "door"),
// createEdge("Entryway", "Living", "wall"),
// createEdge("Hall", "Shower", "door"),
// createEdge("Hall", "Bedroom", "door"),
// createEdge("Hall", "Living", "wall"),
// createEdge("Hall", "Dining Kitchen", "door"),
// createEdge("Dining Kitchen", "Bedroom", "door"),
// createEdge("Bedroom", "Shower", "door"),

// Edge((i = Entryway(114)), (j = Hall(110)), (separation = "door")),
//   Edge((i = Hall(110)), (j = Living(113)), (separation = "void")),
//   Edge((i = Living(113)), (j = DiningKitchen(109)), (separation = "void")),
//   Edge((i = Hall(110)), (j = Bedroom(111)), (separation = "door")),
//   Edge((i = Hall(110)), (j = Shower(112)), (separation = "door")),
//   Edge((i = Shower(112)), (j = Bedroom(111)), (separation = "wall"));

const newGraph: GraphEdge[] = [
  [["Entryway", "entryway"], ["Hall", "hallway"], "door"],
  [["Entryway", "entryway"], ["Living", "living"], "wall"],
  [["Hall", "hallway"], ["Shower", "shower"], "door"],
  [["Hall", "hallway"], ["Bedroom", "bedroom"], "door"],
  [["Hall", "hallway"], ["Living", "living"], "wall"],
  [["Hall", "hallway"], ["Dining Room", "dining room"], "door"],
  [["Dining Room", "dining room"], ["Bedroom", "bedroom"], "door"],
  [["Bedroom", "bedroom"], ["Shower", "shower"], "door"],
];

export const testGraphPaths: GraphPath[] = [
  ["entryway", "living room", "door"],
  ["entryway", "garage", "door"],
  ["entryway", "hallway", "door"],

  ["living room", "dining room", "door"],
  ["living room", "kitchen", "wall"],
  ["living room", "hallway", "wall"],

  ["dining room", "kitchen", "door"],
  ["kitchen", "laundry", "door"],
  ["hallway", "master bedroom", "door"],

  ["hallway", "bedroom", "door"],
  ["hallway", "bathroom", "door"],
  ["master bedroom", "bathroom", "door"],
  ["garage", "laundry", "door"],
];

const sampleGraph: GraphEdge[] = [
  [["Entryway", "entryway"], ["Living Room", "living room"], "door"],
  [["Entryway", "entryway"], ["Garage", "garage"], "door"],
  [["Entryway", "entryway"], ["Hallway", "hallway"], "door"],

  [["Living Room", "living room"], ["Dining Room", "dining room"], "door"],
  [["Living Room", "living room"], ["Kitchen", "kitchen"], "wall"],
  [["Living Room", "living room"], ["Hallway", "hallway"], "wall"],

  [["Dining Room", "dining room"], ["Kitchen", "kitchen"], "door"],
  [["Kitchen", "kitchen"], ["Laundry", "laundry"], "door"],
  [["Hallway", "hallway"], ["Master Bedroom", "master bedroom"], "door"],

  [["Hallway", "hallway"], ["Bedroom", "bedroom"], "door"],
  [["Hallway", "hallway"], ["Bathroom", "bathroom"], "door"],
  [["Master Bedroom", "master bedroom"], ["Bathroom", "bathroom"], "door"],
  [["Garage", "garage"], ["Laundry", "laundry"], "door"],
];

type Space = {
  _id: string;
  storeyId: string;
  name: string;
  type: RoomType; // bedroom, bathroom, kitchen, etc.
  polygon: number[][]; // array of [x, y] points (2D floor plan)
};

// const plan: Space[] = [
//   createSpace("Dining Kitchen", "kitchen", [
//     [5, 5],
//     [10, 5],
//     [10, 13],
//     [5, 13],
//   ]),
//   createSpace("Hall", "hall", [
//     [3, 0],
//     [10, 0],
//     [10, 5],
//     [3, 5],
//   ]),
//   createSpace("Bedroom", "bedroom", [
//     [10, 3],
//     [15, 3],
//     [15, 10],
//     [10, 10],
//   ]),
//   createSpace("Shower", "shower", [
//     [10, 0],
//     [15, 0],
//     [15, 3],
//     [10, 3],
//   ]),
//   createSpace("Living", "living", [
//     [0, 5],
//     [5, 5],
//     [5, 13],
//     [0, 13],
//   ]),
//   createSpace("Entryway", "entryway", [
//     [0, 0],
//     [3, 0],
//     [3, 5],
//     [0, 5],
//   ]),
// ];

type Point = [number, number];

function pointsEqual(a: Point, b: Point, tolerance: number = 1e-6): boolean {
  return Math.abs(a[0] - b[0]) < tolerance && Math.abs(a[1] - b[1]) < tolerance;
}

function edgeKey(a: Point, b: Point): string {
  // Order-insensitive key for wall between two points
  // Ensure consistent string representation for floating point numbers
  const p1 = [a[0].toFixed(7), a[1].toFixed(7)];
  const p2 = [b[0].toFixed(7), b[1].toFixed(7)];

  return p1[0] < p2[0] || (p1[0] === p2[0] && p1[1] < p2[1])
    ? `${p1[0]},${p1[1]}|${p2[0]},${p2[1]}`
    : `${p2[0]},${p2[1]}|${p1[0]},${p1[1]}`;
}

function wallLength(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

// Helper function to check collinearity
function areCollinear(
  p1: Point,
  p2: Point,
  p3: Point,
  tolerance: number = 1e-6
): boolean {
  const area =
    p1[0] * (p2[1] - p3[1]) + p2[0] * (p3[1] - p1[1]) + p3[0] * (p1[1] - p2[1]);
  return Math.abs(area) < tolerance;
}

// Helper function to check if a point is on a segment (assuming p, segA, segB are collinear)
function isPointOnSegment(
  p: Point,
  segA: Point,
  segB: Point,
  tolerance: number = 1e-6
): boolean {
  // Check if p is collinear with segA and segB
  if (!areCollinear(segA, p, segB, tolerance)) {
    return false;
  }
  // Check if p is within the bounding box of segA and segB
  return (
    p[0] >= Math.min(segA[0], segB[0]) - tolerance &&
    p[0] <= Math.max(segA[0], segB[0]) + tolerance &&
    p[1] >= Math.min(segA[1], segB[1]) - tolerance &&
    p[1] <= Math.max(segA[1], segB[1]) + tolerance
  );
}

function getAllUniqueCoordinates(plan: Space[]): {
  uniqueXs: number[];
  uniqueYs: number[];
} {
  const allX = new Set<number>();
  const allY = new Set<number>();
  for (const space of plan) {
    for (const p of space.polygon) {
      allX.add(p[0]);
      allY.add(p[1]);
    }
  }
  const uniqueXs = Array.from(allX).sort((a, b) => a - b);
  const uniqueYs = Array.from(allY).sort((a, b) => a - b);
  return { uniqueXs, uniqueYs };
}

export function generateFloorPlan(
  plan: Space[],
  graphPaths: GraphEdge[]
): FloorPlan {
  const graph = graphPaths.map(createEdge);
  // const { graph, plan } = createPlan(graphPaths, width, length);

  // console.log({ graph, plan });

  const storeyId = "storey-1";
  const spaces = plan; // Spaces are passed directly

  const spaceMap = new Map<string, Space>();
  for (const s of plan) spaceMap.set(s.name, s);

  const graphEdgeMap = new Map<string, Edge>();
  for (const e of graph) {
    const key = [e.i, e.j].sort().join("|");
    graphEdgeMap.set(key, e);
  }

  const { uniqueXs, uniqueYs } = getAllUniqueCoordinates(plan);

  const minimalSegmentData = new Map<
    string,
    { spaces: Set<string>; segmentPoints: [Point, Point] }
  >();

  // Generate minimal horizontal segments
  for (const y of uniqueYs) {
    for (let i = 0; i < uniqueXs.length - 1; i++) {
      const x1 = uniqueXs[i];
      const x2 = uniqueXs[i + 1];
      if (Math.abs(x1 - x2) < 1e-6) continue; // Skip zero-length segments

      const minSegA: Point = [x1, y];
      const minSegB: Point = [x2, y];

      const currentSegmentKey = edgeKey(minSegA, minSegB);
      const associatedSpaces = new Set<string>();

      for (const space of plan) {
        const polygon = space.polygon;
        for (let k = 0; k < polygon.length; k++) {
          const polyA = polygon[k];
          const polyB = polygon[(k + 1) % polygon.length];
          if (pointsEqual(polyA as Point, polyB as Point)) continue;

          if (
            areCollinear(polyA as Point, polyB as Point, minSegA) &&
            areCollinear(polyA as Point, polyB as Point, minSegB) &&
            isPointOnSegment(minSegA, polyA as Point, polyB as Point) &&
            isPointOnSegment(minSegB, polyA as Point, polyB as Point)
          ) {
            associatedSpaces.add(space.name);
            break;
          }
        }
      }

      if (associatedSpaces.size > 0) {
        minimalSegmentData.set(currentSegmentKey, {
          spaces: associatedSpaces,
          segmentPoints: [minSegA, minSegB],
        });
      }
    }
  }

  // Generate minimal vertical segments
  for (const x of uniqueXs) {
    for (let i = 0; i < uniqueYs.length - 1; i++) {
      const y1 = uniqueYs[i];
      const y2 = uniqueYs[i + 1];
      if (Math.abs(y1 - y2) < 1e-6) continue; // Skip zero-length segments

      const minSegA: Point = [x, y1];
      const minSegB: Point = [x, y2];

      const currentSegmentKey = edgeKey(minSegA, minSegB);
      const associatedSpaces = new Set<string>();

      for (const space of plan) {
        const polygon = space.polygon;
        for (let k = 0; k < polygon.length; k++) {
          const polyA = polygon[k];
          const polyB = polygon[(k + 1) % polygon.length];
          if (pointsEqual(polyA as Point, polyB as Point)) continue;

          if (
            areCollinear(polyA as Point, polyB as Point, minSegA) &&
            areCollinear(polyA as Point, polyB as Point, minSegB) &&
            isPointOnSegment(minSegA, polyA as Point, polyB as Point) &&
            isPointOnSegment(minSegB, polyA as Point, polyB as Point)
          ) {
            associatedSpaces.add(space.name);
            break;
          }
        }
      }
      if (associatedSpaces.size > 0) {
        minimalSegmentData.set(currentSegmentKey, {
          spaces: associatedSpaces,
          segmentPoints: [minSegA, minSegB],
        });
      }
    }
  }

  const walls: Wall[] = [];
  const doors: Door[] = [];
  let wallIdCounter = 1;
  let doorIdCounter = 1;

  // Step 1: Create all wall segments and identify candidates for door boundaries
  const doorCandidateBoundaries = new Map<
    string,
    {
      segments: Array<{ id: string; start: Point; end: Point; length: number }>;
    }
  >();

  for (const [key, data] of minimalSegmentData.entries()) {
    const wallSpaceNames = Array.from(data.spaces);
    const [a, b] = data.segmentPoints;

    if (wallSpaceNames.length === 1) {
      // Exterior wall
      walls.push({
        _id: `wall-${wallIdCounter++}`,
        storeyId,
        start: a,
        end: b,
        height: 3,
        thickness: 0.35,
        type: "exterior",
        spaceIds: [spaceMap.get(wallSpaceNames[0])!._id],
      });
    } else if (wallSpaceNames.length === 2) {
      // Interior segment
      const [name1, name2] = wallSpaceNames.sort();
      const graphEdgeKey = `${name1}|${name2}`;
      const edge = graphEdgeMap.get(graphEdgeKey);

      if (edge && (edge.separation === "door" || edge.separation === "wall")) {
        const wallId = `wall-${wallIdCounter++}`;
        walls.push({
          _id: wallId,
          storeyId,
          start: a,
          end: b,
          height: 3,
          thickness: 0.09,
          type: "interior",
          spaceIds: [spaceMap.get(name1)!._id, spaceMap.get(name2)!._id],
        });

        if (edge.separation === "door") {
          const roomPairKey = graphEdgeKey; // Already sorted: name1|name2
          if (!doorCandidateBoundaries.has(roomPairKey)) {
            doorCandidateBoundaries.set(roomPairKey, {
              segments: [],
            });
          }
          doorCandidateBoundaries.get(roomPairKey)!.segments.push({
            id: wallId,
            start: a,
            end: b,
            length: wallLength(a, b),
          });
        }
      }
      // If no edge, or edge is 'void', it's an opening - no wall created here.
    }
  }

  // Step 2: Process door candidate boundaries to place doors
  for (const [roomPairKey, data] of doorCandidateBoundaries.entries()) {
    let { segments } = data;

    if (segments.length === 0) continue;

    // Sort segments to form a contiguous line
    // Check orientation (all segments in a boundary share orientation)
    const isHorizontal =
      Math.abs(segments[0].start[1] - segments[0].end[1]) < 1e-6;
    if (isHorizontal) {
      segments.sort(
        (s1, s2) =>
          Math.min(s1.start[0], s1.end[0]) - Math.min(s2.start[0], s2.end[0])
      );
    } else {
      // Vertical
      segments.sort(
        (s1, s2) =>
          Math.min(s1.start[1], s1.end[1]) - Math.min(s2.start[1], s2.end[1])
      );
    }

    const totalBoundaryLength = segments.reduce(
      (sum, seg) => sum + seg.length,
      0
    );
    const doorWidth = 0.9; // Standard interior door width
    const doorHeight = 2.1; // Standard interior door height

    if (totalBoundaryLength < doorWidth) {
      continue;
    }

    const doorStartPosAlongBoundary = totalBoundaryLength / 2 - doorWidth / 2;
    let accumulatedLength = 0;

    for (const segment of segments) {
      const segmentStartOnBoundary = accumulatedLength;
      const segmentEndOnBoundary = accumulatedLength + segment.length;

      if (
        doorStartPosAlongBoundary >= segmentStartOnBoundary &&
        doorStartPosAlongBoundary < segmentEndOnBoundary
      ) {
        const offsetInSegment =
          doorStartPosAlongBoundary - segmentStartOnBoundary;

        // Ensure the door can actually fit, starting from this offset on this segment
        if (segment.length - offsetInSegment >= 0) {
          doors.push({
            _id: `door-${doorIdCounter++}`,
            storeyId,
            wallId: segment.id,
            offset: offsetInSegment,
            width: doorWidth,
            height: doorHeight,
            type: "interior",
          });
          break; // One door placed for this boundary
        }
      }
      accumulatedLength += segment.length;
    }
  }

  return {
    spaces,
    walls,
    doors,
    windows: [], // Window generation not implemented
  };
}

// Assuming RoomType is a string.
// If RoomType is an actual enum in your project (e.g., enum RoomType { DiningKitchen = "DK", ... }),
// you would use the enum members (e.g., RoomType.DiningKitchen) for the 'type' field
// and ensure the string values here match your enum's expectations or map accordingly.

const spaces: Space[] = [
  {
    _id: "109",
    storeyId: "1",
    name: "Dining Kitchen",
    type: "dining", // Assuming "DiningKitchen" is a valid RoomType string
    polygon: [
      [5, 5], // [xs, ys]
      [10, 5], // [xe, ys]
      [10, 13], // [xe, ye]
      [5, 13], // [xs, ye]
    ],
  },
  {
    _id: "110",
    storeyId: "1",
    name: "Hall",
    type: "hallway", // Assuming "Hall" is a valid RoomType string
    polygon: [
      [3, 0], // [xs, ys]
      [10, 0], // [xe, ys]
      [10, 5], // [xe, ye]
      [3, 5], // [xs, ye]
    ],
  },
  {
    _id: "111",
    storeyId: "1",
    name: "Bedroom",
    type: "bedroom", // Assuming "Bedroom" is a valid RoomType string
    polygon: [
      [10, 3], // [xs, ys]
      [15, 3], // [xe, ys]
      [15, 10], // [xe, ye]
      [10, 10], // [xs, ye]
    ],
  },
  {
    _id: "112",
    storeyId: "1",
    name: "Shower",
    type: "shower", // Assuming "Shower" is a valid RoomType string
    polygon: [
      [10, 0], // [xs, ys]
      [15, 0], // [xe, ys]
      [15, 3], // [xe, ye]
      [10, 3], // [xs, ye]
    ],
  },
  {
    _id: "113",
    storeyId: "1",
    name: "Living",
    type: "living", // Assuming "Living" is a valid RoomType string
    polygon: [
      [0, 5], // [xs, ys]
      [5, 5], // [xe, ys]
      [5, 13], // [xe, ye]
      [0, 13], // [xs, ye]
    ],
  },
  {
    _id: "114",
    storeyId: "1",
    name: "Entryway",
    type: "entryway", // Assuming "Entryway" is a valid RoomType string
    polygon: [
      [0, 0], // [xs, ys]
      [3, 0], // [xe, ys]
      [3, 5], // [xe, ye]
      [0, 5], // [xs, ye]
    ],
  },
];

// You can then use the 'spaces' array in your TypeScript application.
// For example:
// console.log(spaces[0].name); // Output: DiningKitchen

export const exampleFloorPlan = generateFloorPlan(spaces, newGraph);
