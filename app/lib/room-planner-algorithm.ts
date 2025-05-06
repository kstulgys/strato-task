// Constants
const GRID_UNIT_MM = 600;
const OUTER_WALL_INNER_PART_MM = 80;
const OUTER_WALL_OUTER_PART_MM = 300;
const OUTER_WALL_TOTAL_MM = OUTER_WALL_INNER_PART_MM + OUTER_WALL_OUTER_PART_MM;
const INNER_WALL_MM = 90;

const DOOR_THICKNESS_MM = 100;
const DOOR_HEIGHT_MM = 2000; // Standard door height
const DOOR_WIDTH_MM = 900; // Standard door width

// Types
export interface BBox {
  xs: number;
  ys: number;
  xe: number;
  ye: number;
}

export interface RoomInput {
  id: number;
  name: string;
  bbox: BBox;
}

export interface EdgeInput {
  room1Name: string;
  room1Id: number;
  room2Name: string;
  room2Id: number;
  separation: "wall" | "door" | "void";
}

// Output Types
export interface BBoxMM {
  xs: number;
  ys: number;
  xe: number;
  ye: number;
}

export interface RoomOutput {
  id: number;
  name: string;
  bboxMM: BBoxMM; // clear internal space
}

export interface WallRect {
  xs: number;
  ys: number;
  xe: number;
  ye: number;
  type: "inner" | "outer_facade" | "outer_main";
  originalRoomId?: number; // For debugging or further processing
  connectedRoomId?: number; // For debugging or further processing
}

export interface DoorRect {
  x: number; // center x
  y: number; // center y (floor level of door, bottom of the door)
  z: number; // center z
  width: number; // dimension across the wall opening
  height: number; // door height
  depth: number; // door thickness (how thick the door slab is)
  rotationY: number; // 0 or Math.PI / 2 for orientation
  originalRoomId: number;
  connectedRoomId: number;
  wallThickness: number; // The thickness of the wall this door is in
}

// --- Input Parsing ---

/**
 * Parses a room string like "Living(123)" into its name and ID.
 * @param roomStr The room string to parse.
 * @returns An object containing the name and ID of the room.
 * @throws Error if the room string format is invalid.
 */
export function parseRoomNameAndId(roomStr: string): {
  name: string;
  id: number;
} {
  const match = roomStr.match(/([a-zA-Z]+)\((\d+)\)/);
  if (!match) throw new Error(`Invalid room string format: ${roomStr}`);
  return { name: match[1], id: parseInt(match[2], 10) };
}

/**
 * Parses a BBox string like "BBox(xs=0, ys=0, xe=5, ye=5)" into a BBox object.
 * @param bboxStr The BBox string to parse.
 * @returns A BBox object.
 * @throws Error if the BBox string format is invalid.
 */
export function parseBBox(bboxStr: string): BBox {
  const params = bboxStr.replace(/BBox\(|\)/g, "").split(", ");
  const bbox: Partial<BBox> = {};
  params.forEach((param) => {
    const [key, value] = param.split("=");
    if (key === "xs" || key === "ys" || key === "xe" || key === "ye") {
      bbox[key] = parseInt(value, 10);
    }
  });
  if (Object.keys(bbox).length !== 4)
    throw new Error(`Invalid BBox string format: ${bboxStr}`);
  return bbox as BBox;
}

/**
 * Parses a multi-line room plan string into an array of RoomInput objects.
 * Each line should define a room, e.g., "Living(113): BBox(xs=0, ys=5, xe=5, ye=13)".
 * @param roomPlanStr The string containing the room plan.
 * @returns An array of RoomInput objects.
 * @throws Error for invalid line formats.
 */
export function parseRoomPlan(roomPlanStr: string): RoomInput[] {
  const rooms: RoomInput[] = [];
  const lines = roomPlanStr
    .trim()
    .replace(/^{\s*|\s*}$/g, "")
    .split(/,\s*\n\s*|\),\s*/);

  lines.forEach((line) => {
    if (line.trim() === "") return;
    const parts = line.split(": BBox(");
    if (parts.length !== 2) {
      // Handle case where last line might not have trailing comma and BBox is directly appended
      const lastPartMatch = line.match(/(.+): BBox\((.+)\)/);
      if (lastPartMatch && lastPartMatch.length === 3) {
        const roomDetails = parseRoomNameAndId(lastPartMatch[1].trim());
        const bbox = parseBBox(
          `BBox(${lastPartMatch[2].trim().replace(/\)$/, "")})`
        );
        rooms.push({ ...roomDetails, bbox });
        return;
      }
      throw new Error(`Invalid room plan line: ${line}`);
    }
    const roomDetails = parseRoomNameAndId(parts[0].trim());
    const bbox = parseBBox(`BBox(${parts[1].trim().replace(/\)$/, "")})`);
    rooms.push({ ...roomDetails, bbox });
  });
  return rooms;
}

/**
 * Parses a multi-line graph string into an array of EdgeInput objects.
 * Each line should define an edge, e.g., "Edge(i=Entryway(114), j=Hall(110), separation='door')".
 * @param graphStr The string containing the graph definition.
 * @returns An array of EdgeInput objects.
 * @throws Error for invalid line formats or edge details.
 */
export function parseGraph(graphStr: string): EdgeInput[] {
  const edges: EdgeInput[] = [];
  const lines = graphStr
    .trim()
    .replace(/^\[\s*|\s*\]$/g, "")
    .split(/,\s*\n\s*Edge\(|Edge\(/);

  lines.forEach((line) => {
    if (line.trim() === "" || line.trim() === "graph = [") return;
    const content = line.replace(/\)$/, "").trim();
    const parts = content.split(", ");
    if (parts.length !== 3)
      throw new Error(`Invalid graph edge line: Edge(${line}`);

    const room1Match = parts[0].match(/i=(.+)/);
    const room2Match = parts[1].match(/j=(.+)/);
    const separationMatch = parts[2].match(/separation='(.+)'/);

    if (!room1Match || !room2Match || !separationMatch) {
      throw new Error(`Could not parse edge details: Edge(${line}`);
    }

    const room1 = parseRoomNameAndId(room1Match[1]);
    const room2 = parseRoomNameAndId(room2Match[1]);
    const separation = separationMatch[1] as "wall" | "door" | "void";

    edges.push({
      room1Name: room1.name,
      room1Id: room1.id,
      room2Name: room2.name,
      room2Id: room2.id,
      separation,
    });
  });
  return edges;
}

// --- Conversion and Core Logic ---

/**
 * Converts a value from grid units to millimeters.
 * @param value The value in grid units.
 * @returns The value in millimeters.
 */
function convertToMm(value: number): number {
  return value * GRID_UNIT_MM;
}

/**
 * Converts a BBox object from grid units to millimeters.
 * @param bbox The BBox object with coordinates in grid units.
 * @returns A new BBoxMM object with coordinates in millimeters.
 */
function convertBBoxToMm(bbox: BBox): BBoxMM {
  return {
    xs: convertToMm(bbox.xs),
    ys: convertToMm(bbox.ys),
    xe: convertToMm(bbox.xe),
    ye: convertToMm(bbox.ye),
  };
}

/**
 * Creates a unique string key for a given WallRect to prevent duplicate walls.
 * The key is based on the wall's coordinates and type.
 * @param wall The WallRect object.
 * @returns A string key.
 */
function getWallKey(wall: WallRect): string {
  // Sort coordinates to ensure (x1,y1,x2,y2) is same as (x2,y2,x1,y1) for key generation if needed,
  // but for rects, order matters. This key assumes xs < xe and ys < ye.
  return `${wall.xs}_${wall.ys}_${wall.xe}_${wall.ye}_${wall.type}`;
}

/** Interface for the return type of `createExplicitInnerElements`. */
interface ExplicitInnerElements {
  walls: WallRect[];
  doors: DoorRect[];
}

/**
 * Processes graph input to create inner walls and doors based on explicit 'wall' or 'door' separations.
 * It identifies adjacencies between rooms as defined in the graph and constructs
 * WallRect and DoorRect objects accordingly.
 *
 * @param graphInputs Array of edge definitions from the input graph.
 * @param roomMap A Map of room ID to RoomOutput (rooms with mm coordinates).
 * @returns An object containing arrays of newly created `explicitWalls` and `doors`.
 */
function createExplicitInnerElements(
  graphInputs: EdgeInput[],
  roomMap: Map<number, RoomOutput>
): ExplicitInnerElements {
  const explicitWalls: WallRect[] = [];
  const doors: DoorRect[] = [];

  graphInputs.forEach((edge) => {
    // Only process edges that explicitly define a physical separation (wall or door)
    if (edge.separation === "wall" || edge.separation === "door") {
      const room1 = roomMap.get(edge.room1Id);
      const room2 = roomMap.get(edge.room2Id);
      if (!room1 || !room2) return; // Should not happen with valid input
      const r1 = room1.bboxMM;
      const r2 = room2.bboxMM;

      let wallXs = 0,
        wallYs = 0,
        wallXe = 0,
        wallYe = 0;
      let doorX = 0,
        doorZ = 0,
        doorRotationY = 0;
      let wallSegmentLength = 0; // Length of the shared boundary, used for door placement
      let wallExists = false; // Flag to indicate if a shared boundary was found
      let connectedRoomIdForWall: number | undefined = undefined;
      let originalRoomIdForWall: number | undefined = undefined;

      // Check for adjacency in all four directions
      // Case 1: Room1 is to the left of Room2 (r1.xe === r2.xs)
      if (r1.xe === r2.xs && Math.max(r1.ys, r2.ys) < Math.min(r1.ye, r2.ye)) {
        const oS = Math.max(r1.ys, r2.ys); // Start of overlap
        const oE = Math.min(r1.ye, r2.ye); // End of overlap
        // Wall centered on the boundary
        wallXs = r1.xe - INNER_WALL_MM / 2;
        wallYs = oS;
        wallXe = r1.xe + INNER_WALL_MM / 2;
        wallYe = oE;
        wallExists = true;
        originalRoomIdForWall = room1.id;
        connectedRoomIdForWall = room2.id;
        if (edge.separation === "door") {
          doorX = r1.xe; // Door center X is on the boundary line
          doorZ = (oS + oE) / 2; // Door center Z is midpoint of overlap
          doorRotationY = 0; // Door along Z-axis, part of a "vertical" wall segment
          wallSegmentLength = oE - oS;
        }
        // Case 2: Room2 is to the left of Room1 (r2.xe === r1.xs)
      } else if (
        r2.xe === r1.xs &&
        Math.max(r1.ys, r2.ys) < Math.min(r1.ye, r2.ye)
      ) {
        const oS = Math.max(r1.ys, r2.ys);
        const oE = Math.min(r1.ye, r2.ye);
        wallXs = r2.xe - INNER_WALL_MM / 2;
        wallYs = oS;
        wallXe = r2.xe + INNER_WALL_MM / 2;
        wallYe = oE;
        wallExists = true;
        originalRoomIdForWall = room2.id;
        connectedRoomIdForWall = room1.id;
        if (edge.separation === "door") {
          doorX = r2.xe;
          doorZ = (oS + oE) / 2;
          doorRotationY = 0;
          wallSegmentLength = oE - oS;
        }
        // Case 3: Room1 is above Room2 (r1.ye === r2.ys)
      } else if (
        r1.ye === r2.ys &&
        Math.max(r1.xs, r2.xs) < Math.min(r1.xe, r2.xe)
      ) {
        const oS = Math.max(r1.xs, r2.xs);
        const oE = Math.min(r1.xe, r2.xe);
        wallXs = oS;
        wallYs = r1.ye - INNER_WALL_MM / 2;
        wallXe = oE;
        wallYe = r1.ye + INNER_WALL_MM / 2;
        wallExists = true;
        originalRoomIdForWall = room1.id;
        connectedRoomIdForWall = room2.id;
        if (edge.separation === "door") {
          doorX = (oS + oE) / 2; // Door center X is midpoint of overlap
          doorZ = r1.ye; // Door center Z is on the boundary line
          doorRotationY = Math.PI / 2; // Door along X-axis, part of a "horizontal" wall segment
          wallSegmentLength = oE - oS;
        }
        // Case 4: Room2 is above Room1 (r2.ye === r1.ys)
      } else if (
        r2.ye === r1.ys &&
        Math.max(r1.xs, r2.xs) < Math.min(r1.xe, r2.xe)
      ) {
        const oS = Math.max(r1.xs, r2.xs);
        const oE = Math.min(r1.xe, r2.xe);
        wallXs = oS;
        wallYs = r2.ye - INNER_WALL_MM / 2;
        wallXe = oE;
        wallYe = r2.ye + INNER_WALL_MM / 2;
        wallExists = true;
        originalRoomIdForWall = room2.id;
        connectedRoomIdForWall = room1.id;
        if (edge.separation === "door") {
          doorX = (oS + oE) / 2;
          doorZ = r2.ye;
          doorRotationY = Math.PI / 2;
          wallSegmentLength = oE - oS;
        }
      }

      if (wallExists) {
        explicitWalls.push({
          xs: wallXs,
          ys: wallYs,
          xe: wallXe,
          ye: wallYe,
          type: "inner",
          originalRoomId: originalRoomIdForWall,
          connectedRoomId: connectedRoomIdForWall,
        });

        // Only add a door if the edge specifies it and the wall segment is wide enough
        if (edge.separation === "door" && wallSegmentLength >= DOOR_WIDTH_MM) {
          doors.push({
            x: doorX,
            y: 0, // Door base is at floor level, 3D rendering will adjust y to center
            z: doorZ,
            width: DOOR_WIDTH_MM, // Standard door opening width
            height: DOOR_HEIGHT_MM, // Standard door height
            depth: DOOR_THICKNESS_MM, // Thickness of the door slab itself
            rotationY: doorRotationY, // Orientation of the door within the wall
            originalRoomId: room1.id,
            connectedRoomId: room2.id,
            wallThickness: INNER_WALL_MM, // Assuming doors in explicit edges are in inner walls
          });
        }
      }
    }
  });
  return { walls: explicitWalls, doors };
}

/** Represents the four potential outer segments of a room before they are finalized. */
interface CandidateRoomSegments {
  top: { start: number; end: number }[];
  bottom: { start: number; end: number }[];
  left: { start: number; end: number }[];
  right: { start: number; end: number }[];
}

/**
 * Initializes the four outer boundary segments for a given room.
 * Each segment initially spans the full length/width of the room side.
 * These segments will be subtracted from later as adjacencies are processed.
 *
 * @param room The RoomOutput object (with mm coordinates).
 * @returns A CandidateRoomSegments object with initial top, bottom, left, and right segments.
 */
function initializeCandidateOuterSegments(
  room: RoomOutput
): CandidateRoomSegments {
  const r = room.bboxMM;
  return {
    top: [{ start: r.xs, end: r.xe }],
    bottom: [{ start: r.xs, end: r.xe }],
    left: [{ start: r.ys, end: r.ye }],
    right: [{ start: r.ys, end: r.ye }],
  };
}

/**
 * Refines a room's candidate outer wall segments based on explicit graph connections.
 * This function represents "Pass 1" of outer wall processing for a given `roomA`.
 * It iterates through graph connections involving `roomA`.
 * If `roomA` is adjacent to another room (`roomB`) according to the graph,
 * the overlapping portion of their shared boundary is subtracted from `roomA`'s
 * corresponding candidate outer segment. This prevents outer walls from being generated
 * where rooms are explicitly connected (e.g., by a void, door, or an already created inner wall from `createExplicitInnerElements`).
 *
 * @param currentSegments The current candidate outer segments for `roomA`.
 * @param roomA The room currently being processed.
 * @param roomMap A Map of room ID to RoomOutput, for fetching details of connected rooms.
 * @param graphInputs Array of edge definitions from the input graph.
 * @param subtractFunc The utility function to subtract one segment list from another.
 * @returns Updated CandidateRoomSegments for `roomA`.
 */
function refineOuterSegmentsWithGraph(
  currentSegments: CandidateRoomSegments,
  roomA: RoomOutput,
  roomMap: Map<number, RoomOutput>,
  graphInputs: EdgeInput[],
  subtractFunc: (
    source: { start: number; end: number }[],
    subStart: number,
    subEnd: number
  ) => { start: number; end: number }[]
): CandidateRoomSegments {
  const rA = roomA.bboxMM;
  let { top, bottom, left, right } = currentSegments;

  graphInputs.forEach((edge) => {
    let otherRoomId: number | undefined;
    // Check if roomA is part of the current edge
    if (edge.room1Id === roomA.id) otherRoomId = edge.room2Id;
    else if (edge.room2Id === roomA.id) otherRoomId = edge.room1Id;
    else return; // Edge does not involve roomA

    const roomB = roomMap.get(otherRoomId);
    if (!roomB) return; // Should not happen with valid input
    const rB = roomB.bboxMM;

    // If roomA and roomB are adjacent as per this edge, subtract the shared boundary
    // from the corresponding candidate outer segment of roomA.
    // This applies to *any* type of graph connection (void, door, wall)
    // as the presence of an edge means this boundary is not purely external.
    if (rA.xe === rB.xs && Math.max(rA.ys, rB.ys) < Math.min(rA.ye, rB.ye)) {
      // A is left of B
      const oS = Math.max(rA.ys, rB.ys),
        oE = Math.min(rA.ye, rB.ye);
      right = subtractFunc(right, oS, oE);
    } else if (
      rA.xs === rB.xe &&
      Math.max(rA.ys, rB.ys) < Math.min(rA.ye, rB.ye)
    ) {
      // A is right of B
      const oS = Math.max(rA.ys, rB.ys),
        oE = Math.min(rA.ye, rB.ye);
      left = subtractFunc(left, oS, oE);
    } else if (
      rA.ye === rB.ys &&
      Math.max(rA.xs, rB.xs) < Math.min(rA.xe, rB.xe)
    ) {
      // A is above B
      const oS = Math.max(rA.xs, rB.xs),
        oE = Math.min(rA.xe, rB.xe);
      bottom = subtractFunc(bottom, oS, oE);
    } else if (
      rA.ys === rB.ye &&
      Math.max(rA.xs, rB.xs) < Math.min(rA.xe, rB.xe)
    ) {
      // A is below B
      const oS = Math.max(rA.xs, rB.xs),
        oE = Math.min(rA.xe, rB.xe);
      top = subtractFunc(top, oS, oE);
    }
  });
  return { top, bottom, left, right };
}

/**
 * Manages implicit connections (geometric adjacencies not in the graph) for `roomA`.
 * This function represents "Pass 2" of wall processing for a given `roomA`.
 * It iterates through all other rooms (`roomB`) to find geometric adjacencies
 * that are not explicitly defined by an edge in `graphInputs`.
 *
 * If an implicit adjacency is found (e.g., `roomA`'s right side touches `roomB`'s left side,
 * and there is no defined edge between them):
 *   1. An implicit inner wall is created between them using `addWallFunc`.
 *   2. The corresponding candidate outer segment of `roomA` is shortened by `subtractFunc`
 *      to account for this new inner wall. This prevents an outer wall from forming where
 *      an implicit inner wall should be.
 *
 * @param roomA The primary room being processed.
 * @param roomsMM Array of all rooms in the layout (with mm coordinates), used to find potential `roomB`s.
 * @param roomMap A Map of room ID to RoomOutput (Unused in current impl, but kept for potential future use or consistency).
 * @param graphInputs Array of edge definitions from the input graph, to check for existing explicit connections.
 * @param currentSegments The candidate outer wall segments for `roomA` after Pass 1.
 * @param addWallFunc Callback function to add a newly created WallRect to the main wall list.
 * @param subtractFunc Utility function to subtract one segment list from another.
 * @returns Updated CandidateRoomSegments for `roomA` after considering implicit connections.
 */
function manageImplicitConnections(
  roomA: RoomOutput,
  roomsMM: RoomOutput[],
  roomMap: Map<number, RoomOutput>, // Not strictly needed if roomsMM has all info, but can be kept if parsing IDs
  graphInputs: EdgeInput[],
  currentSegments: CandidateRoomSegments,
  addWallFunc: (wall: WallRect) => void,
  subtractFunc: (
    source: { start: number; end: number }[],
    subStart: number,
    subEnd: number
  ) => { start: number; end: number }[]
): CandidateRoomSegments {
  const rA = roomA.bboxMM;
  let { top, bottom, left, right } = currentSegments;

  roomsMM.forEach((roomB) => {
    if (roomA.id === roomB.id) return; // Don't compare a room to itself
    const rB = roomB.bboxMM;
    // Check if there's an existing edge definition in the graph for these two rooms
    const existingEdge = graphInputs.find(
      (e) =>
        (e.room1Id === roomA.id && e.room2Id === roomB.id) ||
        (e.room1Id === roomB.id && e.room2Id === roomA.id)
    );

    // Case 1: Room A's right side touches Room B's left side
    if (rA.xe === rB.xs && Math.max(rA.ys, rB.ys) < Math.min(rA.ye, rB.ye)) {
      const oS = Math.max(rA.ys, rB.ys),
        oE = Math.min(rA.ye, rB.ye); // Overlapping segment
      // If no edge exists, or if the edge isn't a type that already implies a physical separation (void, wall, door)
      // This condition means we found a purely geometric adjacency that needs an implicit inner wall.
      if (!existingEdge) {
        // Stricter: only add if NO edge. If edge exists (even void), graph defines the relationship.
        addWallFunc({
          xs: rA.xe - INNER_WALL_MM / 2,
          ys: oS,
          xe: rA.xe + INNER_WALL_MM / 2,
          ye: oE,
          type: "inner",
          originalRoomId: roomA.id,
          connectedRoomId: roomB.id,
        });
      }
      // Regardless of whether an implicit wall was added, this boundary is not external for roomA.
      right = subtractFunc(right, oS, oE);
    }
    // Case 2: Room A's left side touches Room B's right side
    if (rA.xs === rB.xe && Math.max(rA.ys, rB.ys) < Math.min(rA.ye, rB.ye)) {
      const oS = Math.max(rA.ys, rB.ys),
        oE = Math.min(rA.ye, rB.ye);
      if (!existingEdge) {
        addWallFunc({
          xs: rA.xs - INNER_WALL_MM / 2,
          ys: oS,
          xe: rA.xs + INNER_WALL_MM / 2,
          ye: oE,
          type: "inner",
          originalRoomId: roomB.id,
          connectedRoomId: roomA.id, // Swapped for consistent original/connected perspective
        });
      }
      left = subtractFunc(left, oS, oE);
    }
    // Case 3: Room A's bottom side touches Room B's top side
    if (rA.ye === rB.ys && Math.max(rA.xs, rB.xs) < Math.min(rA.xe, rB.xe)) {
      const oS = Math.max(rA.xs, rB.xs),
        oE = Math.min(rA.xe, rB.xe);
      if (!existingEdge) {
        addWallFunc({
          xs: oS,
          ys: rA.ye - INNER_WALL_MM / 2,
          xe: oE,
          ye: rA.ye + INNER_WALL_MM / 2,
          type: "inner",
          originalRoomId: roomA.id,
          connectedRoomId: roomB.id,
        });
      }
      bottom = subtractFunc(bottom, oS, oE);
    }
    // Case 4: Room A's top side touches Room B's bottom side
    if (rA.ys === rB.ye && Math.max(rA.xs, rB.xs) < Math.min(rA.xe, rB.xe)) {
      const oS = Math.max(rA.xs, rB.xs),
        oE = Math.min(rA.xe, rB.xe);
      if (!existingEdge) {
        addWallFunc({
          xs: oS,
          ys: rA.ys - INNER_WALL_MM / 2,
          xe: oE,
          ye: rA.ys + INNER_WALL_MM / 2,
          type: "inner",
          originalRoomId: roomB.id,
          connectedRoomId: roomA.id, // Swapped for perspective
        });
      }
      top = subtractFunc(top, oS, oE);
    }
  });
  return { top, bottom, left, right };
}

/**
 * Creates outer walls (facade and main layers) for a given room based on its finalized segments.
 * After all internal connections and adjacencies have been processed, the remaining segments
 * in `finalSegments` represent true external boundaries of the room.
 * This function constructs the two-part outer walls (facade and main structural part)
 * for these segments, including logic to correctly extend them at external corners.
 *
 * @param roomA The room for which to create outer walls.
 * @param finalSegments The finalized (after all subtractions) CandidateRoomSegments for `roomA`.
 * @param addWallFunc Callback function to add the newly created WallRect objects to the main wall list.
 */
function createOuterWallsForRoom(
  roomA: RoomOutput,
  finalSegments: CandidateRoomSegments,
  addWallFunc: (wall: WallRect) => void
) {
  const r = roomA.bboxMM; // alias for roomA's bounding box in mm

  // Helper to check if a corner is external based on the final segments
  const isCornerExternal = (
    cornerType: "TL" | "TR" | "BL" | "BR",
    topSegs: { start: number; end: number }[],
    bottomSegs: { start: number; end: number }[],
    leftSegs: { start: number; end: number }[],
    rightSegs: { start: number; end: number }[]
  ): boolean => {
    switch (cornerType) {
      case "TL":
        return (
          topSegs.some((s) => s.start === r.xs) &&
          leftSegs.some((s) => s.start === r.ys)
        );
      case "TR":
        return (
          topSegs.some((s) => s.end === r.xe) &&
          rightSegs.some((s) => s.start === r.ys)
        );
      case "BL":
        return (
          bottomSegs.some((s) => s.start === r.xs) &&
          leftSegs.some((s) => s.end === r.ye)
        );
      case "BR":
        return (
          bottomSegs.some((s) => s.end === r.xe) &&
          rightSegs.some((s) => s.end === r.ye)
        );
      default:
        return false;
    }
  };

  const iTLE = isCornerExternal(
    "TL",
    finalSegments.top,
    finalSegments.bottom,
    finalSegments.left,
    finalSegments.right
  );
  const iTRE = isCornerExternal(
    "TR",
    finalSegments.top,
    finalSegments.bottom,
    finalSegments.left,
    finalSegments.right
  );
  const iBLE = isCornerExternal(
    "BL",
    finalSegments.top,
    finalSegments.bottom,
    finalSegments.left,
    finalSegments.right
  );
  const iBRE = isCornerExternal(
    "BR",
    finalSegments.top,
    finalSegments.bottom,
    finalSegments.left,
    finalSegments.right
  );

  finalSegments.top.forEach((seg) => {
    let fxs = seg.start,
      fxe = seg.end,
      mxs = seg.start,
      mxe = seg.end;
    if (fxs === r.xs && iTLE) {
      fxs -= OUTER_WALL_INNER_PART_MM;
      mxs -= OUTER_WALL_TOTAL_MM;
    }
    if (fxe === r.xe && iTRE) {
      fxe += OUTER_WALL_INNER_PART_MM;
      mxe += OUTER_WALL_TOTAL_MM;
    }
    addWallFunc({
      xs: fxs,
      ys: r.ys - OUTER_WALL_INNER_PART_MM,
      xe: fxe,
      ye: r.ys,
      type: "outer_facade",
      originalRoomId: roomA.id,
    });
    addWallFunc({
      xs: mxs,
      ys: r.ys - OUTER_WALL_TOTAL_MM,
      xe: mxe,
      ye: r.ys - OUTER_WALL_INNER_PART_MM,
      type: "outer_main",
      originalRoomId: roomA.id,
    });
  });
  finalSegments.bottom.forEach((seg) => {
    let fxs = seg.start,
      fxe = seg.end,
      mxs = seg.start,
      mxe = seg.end;
    if (fxs === r.xs && iBLE) {
      fxs -= OUTER_WALL_INNER_PART_MM;
      mxs -= OUTER_WALL_TOTAL_MM;
    }
    if (fxe === r.xe && iBRE) {
      fxe += OUTER_WALL_INNER_PART_MM;
      mxe += OUTER_WALL_TOTAL_MM;
    }
    addWallFunc({
      xs: fxs,
      ys: r.ye,
      xe: fxe,
      ye: r.ye + OUTER_WALL_INNER_PART_MM,
      type: "outer_facade",
      originalRoomId: roomA.id,
    });
    addWallFunc({
      xs: mxs,
      ys: r.ye + OUTER_WALL_INNER_PART_MM,
      xe: mxe,
      ye: r.ye + OUTER_WALL_TOTAL_MM,
      type: "outer_main",
      originalRoomId: roomA.id,
    });
  });
  finalSegments.left.forEach((seg) => {
    let fys = seg.start,
      fye = seg.end,
      mys = seg.start,
      mye = seg.end;
    if (fys === r.ys && iTLE) {
      fys -= OUTER_WALL_INNER_PART_MM;
      mys -= OUTER_WALL_TOTAL_MM;
    }
    if (fye === r.ye && iBLE) {
      fye += OUTER_WALL_INNER_PART_MM;
      mye += OUTER_WALL_TOTAL_MM;
    }
    addWallFunc({
      xs: r.xs - OUTER_WALL_INNER_PART_MM,
      ys: fys,
      xe: r.xs,
      ye: fye,
      type: "outer_facade",
      originalRoomId: roomA.id,
    });
    addWallFunc({
      xs: r.xs - OUTER_WALL_TOTAL_MM,
      ys: mys,
      xe: r.xs - OUTER_WALL_INNER_PART_MM,
      ye: mye,
      type: "outer_main",
      originalRoomId: roomA.id,
    });
  });
  finalSegments.right.forEach((seg) => {
    let fys = seg.start,
      fye = seg.end,
      mys = seg.start,
      mye = seg.end;
    if (fys === r.ys && iTRE) {
      fys -= OUTER_WALL_INNER_PART_MM;
      mys -= OUTER_WALL_TOTAL_MM;
    }
    if (fye === r.ye && iBRE) {
      fye += OUTER_WALL_INNER_PART_MM;
      mye += OUTER_WALL_TOTAL_MM;
    }
    addWallFunc({
      xs: r.xe,
      ys: fys,
      xe: r.xe + OUTER_WALL_INNER_PART_MM,
      ye: fye,
      type: "outer_facade",
      originalRoomId: roomA.id,
    });
    addWallFunc({
      xs: r.xe + OUTER_WALL_INNER_PART_MM,
      ys: mys,
      xe: r.xe + OUTER_WALL_TOTAL_MM,
      ye: mye,
      type: "outer_main",
      originalRoomId: roomA.id,
    });
  });
}

export interface ProcessedRooms {
  rooms: RoomOutput[];
  walls: WallRect[];
  doors: DoorRect[];
}

/**
 * Main function to process room layout data and generate rooms, walls, and doors in millimeters.
 * This function orchestrates the entire wall generation process.
 *
 * Key Stages:
 * 1. Initialization: Converts input room data to millimeters and sets up a `roomMap` for lookups.
 * 2. Explicit Elements: Creates inner walls and doors directly specified by 'wall' or 'door' edges
 *    in the `graphInputs` using `createExplicitInnerElements`.
 * 3. Per-Room Boundary Finalization (Loop through each room):
 *    a. Initialize full-length candidate outer wall segments for the current room (`initializeCandidateOuterSegments`).
 *    b. Pass 1 (Graph Refinement): Adjusts these segments based on *any* connections in `graphInputs`
 *       (voids, doors, explicit walls) to ensure outer walls don't form across these planned connections
 *       (`refineOuterSegmentsWithGraph`).
 *    c. Pass 2 (Implicit Connections): Detects purely geometric adjacencies between rooms not defined in the graph.
 *       For these, it creates implicit inner walls and further refines the outer segments (`manageImplicitConnections`).
 *    d. Outer Wall Construction: Builds the final `outer_facade` and `outer_main` wall parts from the
 *       processed segments, including logic for external corners (`createOuterWallsForRoom`).
 * 4. Output: Returns all rooms, a unique list of all generated walls, and all doors.
 *
 * @param roomInputs Parsed room definitions.
 * @param graphInputs Parsed graph defining connections between rooms.
 * @returns An object containing lists of rooms, walls, and doors with millimeter coordinates.
 */
export function processRoomLayout(
  roomInputs: RoomInput[],
  graphInputs: EdgeInput[]
): ProcessedRooms {
  // Convert all input room BBoxes to millimeter units.
  const roomsMM: RoomOutput[] = roomInputs.map((room) => ({
    id: room.id,
    name: room.name,
    bboxMM: convertBBoxToMm(room.bbox), // Core conversion
  }));

  const allWalls: WallRect[] = []; // Accumulates all generated wall segments.
  const wallKeys = new Set<string>(); // Used by addWall to ensure no duplicate walls are added.
  let allDoors: DoorRect[] = []; // Accumulates all generated door objects.

  // Closure to add a wall to the allWalls array, ensuring no duplicates by checking wallKeys.
  // Also ensures wall has valid dimensions (xs < xe, ys < ye) before adding.
  const addWall = (wall: WallRect) => {
    const key = getWallKey(wall);
    if (!wallKeys.has(key) && wall.xs < wall.xe && wall.ys < wall.ye) {
      allWalls.push(wall);
      wallKeys.add(key);
    }
  };

  // Create a Map for quick lookup of room data by room ID.
  const roomMap = new Map<number, RoomOutput>(roomsMM.map((r) => [r.id, r]));

  // Stage 1: Create explicit inner walls and doors from graph connections.
  // These are walls/doors directly specified by 'wall' or 'door' edges in the input graph.
  const explicitElements = createExplicitInnerElements(graphInputs, roomMap);
  explicitElements.walls.forEach(addWall); // Add newly created explicit walls to the main list.
  allDoors = explicitElements.doors; // Store doors generated from explicit 'door' edges.

  // Utility function to subtract a segment (subStart, subEnd) from a list of source segments.
  // Returns a new list of segments representing the remainder after the subtraction.
  // E.g., if source is [{start:0, end:10}] and subtraction is {start:3, end:7}, result is [{start:0, end:3}, {start:7, end:10}].
  const subtractSegmentList = (
    sourceSegments: { start: number; end: number }[],
    subStart: number,
    subEnd: number
  ): { start: number; end: number }[] => {
    if (subStart >= subEnd) return sourceSegments; // No valid subtraction range
    let resultSegments: { start: number; end: number }[] = [];
    sourceSegments.forEach((seg) => {
      if (subEnd <= seg.start || subStart >= seg.end) {
        // No overlap with this segment, keep it as is
        resultSegments.push(seg);
      } else {
        // Overlap exists
        if (seg.start < subStart) {
          // Part before subtraction
          resultSegments.push({ start: seg.start, end: subStart });
        }
        if (seg.end > subEnd) {
          // Part after subtraction
          resultSegments.push({ start: subEnd, end: seg.end });
        }
        // The subtracted part itself (subStart to subEnd within seg) is omitted
      }
    });
    return resultSegments.filter((s) => s.start < s.end); // Ensure segments have positive length.
  };

  // Stages 2 & 3: For each room, determine its final wall geometry through several passes of segment processing.
  // This loop iterates through each room to define its boundaries.
  roomsMM.forEach((roomA) => {
    // Alias for current room's bounding box in mm for convenience.
    const rA = roomA.bboxMM;

    // Initialize candidate outer segments for roomA (top, bottom, left, right).
    // These initially span the full dimensions of the room's sides.
    let candidateSegments = initializeCandidateOuterSegments(roomA);

    // Pass 1: Refine candidate segments based on explicit graph connections.
    // This step subtracts portions of segments where roomA is connected to another room
    // via any type of edge in the graph (void, door, explicit wall), effectively carving out
    // openings or shared boundaries that should not be part of the room's final outer wall.
    candidateSegments = refineOuterSegmentsWithGraph(
      candidateSegments,
      roomA,
      roomMap,
      graphInputs,
      subtractSegmentList
    );

    // Pass 2: Identify and handle implicit connections (geometric adjacencies not explicitly in the graph)
    // and further refine candidate segments. This also creates any necessary implicit inner walls
    // between rooms that touch but have no explicit graph edge. (If an edge like 'void' exists, it's handled by Pass 1).
    candidateSegments = manageImplicitConnections(
      roomA,
      roomsMM,
      roomMap, // Pass roomMap for consistency, though not strictly used if roomsMM is iterated
      graphInputs,
      candidateSegments,
      addWall, // Pass the main addWall closure to allow adding implicit walls
      subtractSegmentList
    );

    // Stage 3 (within the loop): Create the final outer wall (facade and main) geometries for roomA
    // using its fully processed candidate segments and the addWall function.
    // This step takes the remaining segments after all subtractions and graph-based refinements,
    // and builds the physical outer wall pieces, including corner extensions.
    createOuterWallsForRoom(roomA, candidateSegments, addWall);
  });
  return { rooms: roomsMM, walls: allWalls, doors: allDoors };
}

// --- Example Usage (for testing) ---
/*
const exampleRoomPlanStr = `{
    DiningKitchen(109): BBox(xs=5, ys=5, xe=10, ye=13),
    Hall(110): BBox(xs=3, ys=0, xe=10, ye=5),
    Bedroom(111): BBox(xs=10, ys=3, xe=15, ye=10),
    Shower(112): BBox(xs=10, ys=0, xe=15, ye=3),
    Living(113): BBox(xs=0, ys=5, xe=5, ye=13),
    Entryway(114): BBox(xs=0, ys=0, xe=3, ye=5)
}`;

const exampleGraphStr = `[
    Edge(i=Entryway(114), j=Hall(110), separation='door'),
    Edge(i=Hall(110), j=Living(113), separation='void'),
    Edge(i=Living(113), j=DiningKitchen(109), separation='void'),
    Edge(i=Hall(110), j=Bedroom(111), separation='door'),
    Edge(i=Hall(110), j=Shower(112), separation='door'),
    Edge(i=Shower(112), j=Bedroom(111), separation='wall')
]`;

const roomInputs = parseRoomPlan(exampleRoomPlanStr);
const graphInputs = parseGraph(exampleGraphStr);

const result = processRoomLayout(roomInputs, graphInputs);

console.log("Processed Rooms (mm):");
result.rooms.forEach(room => console.log(room.name, room.id, room.bboxMM));

console.log("
Processed Walls (mm):");
result.walls.forEach(wall => console.log(wall));

console.log("
Processed Doors (mm):");
if (result.doors) result.doors.forEach(door => console.log(door));

// --- Second Example ---
const roomPlanStr2 = `{
    DiningKitchen(110): BBox(xs=0, ys=6, xe=6, ye=15),
    Bedroom(111): BBox(xs=9, ys=8, xe=14, ye=13),
    Entryway(112): BBox(xs=9, ys=5, xe=14, ye=8),
    Shower(113): BBox(xs=6, ys=10, xe=9, ye=15),
    CorridorV(114): BBox(xs=6, ys=6, xe=9, ye=10),
    Dressing(115): BBox(xs=9, ys=13, xe=14, ye=15),
    Living(116): BBox(xs=0, ys=0, xe=9, ye=6)
}`;
const graphStr2 = `[
    Edge(i=Entryway(112), j=CorridorV(114), separation='door'),
    Edge(i=CorridorV(114), j=Living(116), separation='void'),
    Edge(i=Living(116), j=DiningKitchen(110), separation='void'),
    Edge(i=CorridorV(114), j=Bedroom(111), separation='door'),
    Edge(i=Bedroom(111), j=Dressing(115), separation='door'),
    Edge(i=CorridorV(114), j=Shower(113), separation='door'),
    Edge(i=Shower(113), j=Bedroom(111), separation='wall')
]`;

const roomInputs2 = parseRoomPlan(roomPlanStr2);
const graphInputs2 = parseGraph(graphStr2);
const result2 = processRoomLayout(roomInputs2, graphInputs2);

console.log("
--- Example 2 ---");
console.log("Processed Rooms (mm):");
result2.rooms.forEach(room => console.log(room.name, room.id, room.bboxMM));
console.log("
Processed Walls (mm):");
result2.walls.forEach(wall => console.log(wall));
console.log("
Processed Doors (mm):");
if (result2.doors) result2.doors.forEach(door => console.log(door));
*/
