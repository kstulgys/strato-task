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

interface RoomPlanInput {
  [key: string]: BBox; // e.g., "DiningKitchen(109)": BBox(...)
}

interface GraphInput {
  edges: EdgeInput[];
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

export function parseRoomNameAndId(roomStr: string): {
  name: string;
  id: number;
} {
  const match = roomStr.match(/([a-zA-Z]+)\((\d+)\)/);
  if (!match) throw new Error(`Invalid room string format: ${roomStr}`);
  return { name: match[1], id: parseInt(match[2], 10) };
}

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

function convertToMm(value: number): number {
  return value * GRID_UNIT_MM;
}

function convertBBoxToMm(bbox: BBox): BBoxMM {
  return {
    xs: convertToMm(bbox.xs),
    ys: convertToMm(bbox.ys),
    xe: convertToMm(bbox.xe),
    ye: convertToMm(bbox.ye),
  };
}

// Helper to create a unique key for a wall to avoid duplicates
function getWallKey(wall: WallRect): string {
  // Sort coordinates to ensure (x1,y1,x2,y2) is same as (x2,y2,x1,y1) for key generation if needed,
  // but for rects, order matters. This key assumes xs < xe and ys < ye.
  return `${wall.xs}_${wall.ys}_${wall.xe}_${wall.ye}_${wall.type}`;
}

export interface ProcessedRooms {
  rooms: RoomOutput[];
  walls: WallRect[];
  doors: DoorRect[];
}

export function processRoomLayout(
  roomInputs: RoomInput[],
  graphInputs: EdgeInput[]
): ProcessedRooms {
  const roomsMM: RoomOutput[] = roomInputs.map((room) => ({
    id: room.id,
    name: room.name,
    bboxMM: convertBBoxToMm(room.bbox),
  }));

  const walls: WallRect[] = [];
  const wallKeys = new Set<string>();
  const doors: DoorRect[] = [];

  const addWall = (wall: WallRect) => {
    const key = getWallKey(wall);
    if (!wallKeys.has(key) && wall.xs < wall.xe && wall.ys < wall.ye) {
      // Ensure valid rect before adding
      walls.push(wall);
      wallKeys.add(key);
    }
  };

  const roomMap = new Map<number, RoomOutput>(roomsMM.map((r) => [r.id, r]));

  // 1. Create explicit inner walls from graph
  graphInputs.forEach((edge) => {
    if (edge.separation === "wall" || edge.separation === "door") {
      const room1 = roomMap.get(edge.room1Id);
      const room2 = roomMap.get(edge.room2Id);
      if (!room1 || !room2) return;
      const r1 = room1.bboxMM;
      const r2 = room2.bboxMM;

      let wallXs = 0,
        wallYs = 0,
        wallXe = 0,
        wallYe = 0;
      let doorX = 0,
        doorZ = 0,
        doorRotationY = 0;
      let wallSegmentLength = 0;
      let wallExists = false;
      let connectedRoomIdForWall: number | undefined = undefined;
      let originalRoomIdForWall: number | undefined = undefined;

      if (r1.xe === r2.xs && Math.max(r1.ys, r2.ys) < Math.min(r1.ye, r2.ye)) {
        // R1 is left of R2
        const oS = Math.max(r1.ys, r2.ys);
        const oE = Math.min(r1.ye, r2.ye);
        wallXs = r1.xe - INNER_WALL_MM / 2;
        wallYs = oS;
        wallXe = r1.xe + INNER_WALL_MM / 2;
        wallYe = oE;
        wallExists = true;
        originalRoomIdForWall = room1.id;
        connectedRoomIdForWall = room2.id;

        if (edge.separation === "door") {
          doorX = r1.xe;
          doorZ = (oS + oE) / 2;
          doorRotationY = 0;
          wallSegmentLength = oE - oS;
        }
      } else if (
        r2.xe === r1.xs &&
        Math.max(r1.ys, r2.ys) < Math.min(r1.ye, r2.ye)
      ) {
        // R2 is left of R1
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
      } else if (
        r1.ye === r2.ys &&
        Math.max(r1.xs, r2.xs) < Math.min(r1.xe, r2.xe)
      ) {
        // R1 is above R2
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
          doorX = (oS + oE) / 2;
          doorZ = r1.ye;
          doorRotationY = Math.PI / 2;
          wallSegmentLength = oE - oS;
        }
      } else if (
        r2.ye === r1.ys &&
        Math.max(r1.xs, r2.xs) < Math.min(r1.xe, r2.xe)
      ) {
        // R2 is above R1
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
        addWall({
          xs: wallXs,
          ys: wallYs,
          xe: wallXe,
          ye: wallYe,
          type: "inner",
          originalRoomId: originalRoomIdForWall,
          connectedRoomId: connectedRoomIdForWall,
        });

        if (edge.separation === "door" && wallSegmentLength >= DOOR_WIDTH_MM) {
          doors.push({
            x: doorX,
            y: 0, // Base of the door is at floor level
            z: doorZ,
            width: DOOR_WIDTH_MM,
            height: DOOR_HEIGHT_MM,
            depth: DOOR_THICKNESS_MM, // This is the thickness of the door slab itself
            rotationY: doorRotationY,
            originalRoomId: room1.id,
            connectedRoomId: room2.id,
            wallThickness: INNER_WALL_MM, // Assuming doors are in inner walls for now
          });
        }
      }
    }
  });

  const subtractSegmentList = (
    sourceSegments: { start: number; end: number }[],
    subStart: number,
    subEnd: number
  ): { start: number; end: number }[] => {
    if (subStart >= subEnd) return sourceSegments;
    let resultSegments: { start: number; end: number }[] = [];
    sourceSegments.forEach((seg) => {
      if (subEnd <= seg.start || subStart >= seg.end) {
        // No overlap with this segment
        resultSegments.push(seg);
      } else {
        // Overlap
        if (seg.start < subStart) {
          // Part before subtraction
          resultSegments.push({ start: seg.start, end: subStart });
        }
        if (seg.end > subEnd) {
          // Part after subtraction
          resultSegments.push({ start: subEnd, end: seg.end });
        }
      }
    });
    return resultSegments.filter((s) => s.start < s.end);
  };

  // 2. Determine true external wall segments and implicit inner walls
  roomsMM.forEach((roomA) => {
    const rA = roomA.bboxMM;

    let candidateOuterTop = [{ start: rA.xs, end: rA.xe }];
    let candidateOuterBottom = [{ start: rA.xs, end: rA.xe }];
    let candidateOuterLeft = [{ start: rA.ys, end: rA.ye }];
    let candidateOuterRight = [{ start: rA.ys, end: rA.ye }];

    // Pass 1: Subtract segments based on graph (voids, or where inner walls were made)
    graphInputs.forEach((edge) => {
      let otherRoomId: number | undefined;
      let isRoomAFirst = false;
      if (edge.room1Id === roomA.id) {
        otherRoomId = edge.room2Id;
        isRoomAFirst = true;
      } else if (edge.room2Id === roomA.id) {
        otherRoomId = edge.room1Id;
      } else return;

      const roomB = roomMap.get(otherRoomId);
      if (!roomB) return;
      const rB = roomB.bboxMM;

      if (rA.xe === rB.xs && Math.max(rA.ys, rB.ys) < Math.min(rA.ye, rB.ye)) {
        // A is left of B
        const oS = Math.max(rA.ys, rB.ys),
          oE = Math.min(rA.ye, rB.ye);
        candidateOuterRight = subtractSegmentList(candidateOuterRight, oS, oE);
      } else if (
        rA.xs === rB.xe &&
        Math.max(rA.ys, rB.ys) < Math.min(rA.ye, rB.ye)
      ) {
        // A is right of B
        const oS = Math.max(rA.ys, rB.ys),
          oE = Math.min(rA.ye, rB.ye);
        candidateOuterLeft = subtractSegmentList(candidateOuterLeft, oS, oE);
      } else if (
        rA.ye === rB.ys &&
        Math.max(rA.xs, rB.xs) < Math.min(rA.xe, rB.xe)
      ) {
        // A is above B
        const oS = Math.max(rA.xs, rB.xs),
          oE = Math.min(rA.xe, rB.xe);
        candidateOuterBottom = subtractSegmentList(
          candidateOuterBottom,
          oS,
          oE
        );
      } else if (
        rA.ys === rB.ye &&
        Math.max(rA.xs, rB.xs) < Math.min(rA.xe, rB.xe)
      ) {
        // A is below B
        const oS = Math.max(rA.xs, rB.xs),
          oE = Math.min(rA.xe, rB.xe);
        candidateOuterTop = subtractSegmentList(candidateOuterTop, oS, oE);
      }
    });

    // Pass 2: Geometric adjacencies for implicit inner walls and further subtractions
    roomsMM.forEach((roomB) => {
      if (roomA.id === roomB.id) return;
      const rB = roomB.bboxMM;
      const existingEdge = graphInputs.find(
        (e) =>
          (e.room1Id === roomA.id && e.room2Id === roomB.id) ||
          (e.room1Id === roomB.id && e.room2Id === roomA.id)
      );

      // A's right touches B's left
      if (rA.xe === rB.xs && Math.max(rA.ys, rB.ys) < Math.min(rA.ye, rB.ye)) {
        const oS = Math.max(rA.ys, rB.ys),
          oE = Math.min(rA.ye, rB.ye);
        if (
          !existingEdge ||
          (existingEdge.separation !== "void" &&
            existingEdge.separation !== "wall" &&
            existingEdge.separation !== "door")
        ) {
          addWall({
            xs: rA.xe - INNER_WALL_MM / 2,
            ys: oS,
            xe: rA.xe + INNER_WALL_MM / 2,
            ye: oE,
            type: "inner",
            originalRoomId: roomA.id,
            connectedRoomId: roomB.id,
          });
        }
        candidateOuterRight = subtractSegmentList(candidateOuterRight, oS, oE);
      }
      // A's left touches B's right
      if (rA.xs === rB.xe && Math.max(rA.ys, rB.ys) < Math.min(rA.ye, rB.ye)) {
        const oS = Math.max(rA.ys, rB.ys),
          oE = Math.min(rA.ye, rB.ye);
        if (
          !existingEdge ||
          (existingEdge.separation !== "void" &&
            existingEdge.separation !== "wall" &&
            existingEdge.separation !== "door")
        ) {
          addWall({
            xs: rA.xs - INNER_WALL_MM / 2,
            ys: oS,
            xe: rA.xs + INNER_WALL_MM / 2,
            ye: oE,
            type: "inner",
            originalRoomId: roomA.id,
            connectedRoomId: roomB.id,
          });
        }
        candidateOuterLeft = subtractSegmentList(candidateOuterLeft, oS, oE);
      }
      // A's bottom touches B's top
      if (rA.ye === rB.ys && Math.max(rA.xs, rB.xs) < Math.min(rA.xe, rB.xe)) {
        const oS = Math.max(rA.xs, rB.xs),
          oE = Math.min(rA.xe, rB.xe);
        if (
          !existingEdge ||
          (existingEdge.separation !== "void" &&
            existingEdge.separation !== "wall" &&
            existingEdge.separation !== "door")
        ) {
          addWall({
            xs: oS,
            ys: rA.ye - INNER_WALL_MM / 2,
            xe: oE,
            ye: rA.ye + INNER_WALL_MM / 2,
            type: "inner",
            originalRoomId: roomA.id,
            connectedRoomId: roomB.id,
          });
        }
        candidateOuterBottom = subtractSegmentList(
          candidateOuterBottom,
          oS,
          oE
        );
      }
      // A's top touches B's bottom
      if (rA.ys === rB.ye && Math.max(rA.xs, rB.xs) < Math.min(rA.xe, rB.xe)) {
        const oS = Math.max(rA.xs, rB.xs),
          oE = Math.min(rA.xe, rB.xe);
        if (
          !existingEdge ||
          (existingEdge.separation !== "void" &&
            existingEdge.separation !== "wall" &&
            existingEdge.separation !== "door")
        ) {
          addWall({
            xs: oS,
            ys: rA.ys - INNER_WALL_MM / 2,
            xe: oE,
            ye: rA.ys + INNER_WALL_MM / 2,
            type: "inner",
            originalRoomId: roomA.id,
            connectedRoomId: roomB.id,
          });
        }
        candidateOuterTop = subtractSegmentList(candidateOuterTop, oS, oE);
      }
    });

    const r = rA; // alias for corner extension logic
    const isCornerExternal = (
      ct: "TL" | "TR" | "BL" | "BR",
      ts: any[],
      bs: any[],
      ls: any[],
      rs: any[]
    ): boolean => {
      switch (ct) {
        case "TL":
          return (
            ts.some((s) => s.start === r.xs) && ls.some((s) => s.start === r.ys)
          );
        case "TR":
          return (
            ts.some((s) => s.end === r.xe) && rs.some((s) => s.start === r.ys)
          );
        case "BL":
          return (
            bs.some((s) => s.start === r.xs) && ls.some((s) => s.end === r.ye)
          );
        case "BR":
          return (
            bs.some((s) => s.end === r.xe) && rs.some((s) => s.end === r.ye)
          );
        default:
          return false;
      }
    };
    const iTLE = isCornerExternal(
      "TL",
      candidateOuterTop,
      candidateOuterBottom,
      candidateOuterLeft,
      candidateOuterRight
    );
    const iTRE = isCornerExternal(
      "TR",
      candidateOuterTop,
      candidateOuterBottom,
      candidateOuterLeft,
      candidateOuterRight
    );
    const iBLE = isCornerExternal(
      "BL",
      candidateOuterTop,
      candidateOuterBottom,
      candidateOuterLeft,
      candidateOuterRight
    );
    const iBRE = isCornerExternal(
      "BR",
      candidateOuterTop,
      candidateOuterBottom,
      candidateOuterLeft,
      candidateOuterRight
    );

    candidateOuterTop.forEach((seg) => {
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
      addWall({
        xs: fxs,
        ys: r.ys - OUTER_WALL_INNER_PART_MM,
        xe: fxe,
        ye: r.ys,
        type: "outer_facade",
        originalRoomId: roomA.id,
      });
      addWall({
        xs: mxs,
        ys: r.ys - OUTER_WALL_TOTAL_MM,
        xe: mxe,
        ye: r.ys - OUTER_WALL_INNER_PART_MM,
        type: "outer_main",
        originalRoomId: roomA.id,
      });
    });
    candidateOuterBottom.forEach((seg) => {
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
      addWall({
        xs: fxs,
        ys: r.ye,
        xe: fxe,
        ye: r.ye + OUTER_WALL_INNER_PART_MM,
        type: "outer_facade",
        originalRoomId: roomA.id,
      });
      addWall({
        xs: mxs,
        ys: r.ye + OUTER_WALL_INNER_PART_MM,
        xe: mxe,
        ye: r.ye + OUTER_WALL_TOTAL_MM,
        type: "outer_main",
        originalRoomId: roomA.id,
      });
    });
    candidateOuterLeft.forEach((seg) => {
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
      addWall({
        xs: r.xs - OUTER_WALL_INNER_PART_MM,
        ys: fys,
        xe: r.xs,
        ye: fye,
        type: "outer_facade",
        originalRoomId: roomA.id,
      });
      addWall({
        xs: r.xs - OUTER_WALL_TOTAL_MM,
        ys: mys,
        xe: r.xs - OUTER_WALL_INNER_PART_MM,
        ye: mye,
        type: "outer_main",
        originalRoomId: roomA.id,
      });
    });
    candidateOuterRight.forEach((seg) => {
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
      addWall({
        xs: r.xe,
        ys: fys,
        xe: r.xe + OUTER_WALL_INNER_PART_MM,
        ye: fye,
        type: "outer_facade",
        originalRoomId: roomA.id,
      });
      addWall({
        xs: r.xe + OUTER_WALL_INNER_PART_MM,
        ys: mys,
        xe: r.xe + OUTER_WALL_TOTAL_MM,
        ye: mye,
        type: "outer_main",
        originalRoomId: roomA.id,
      });
    });
  });
  return { rooms: roomsMM, walls, doors };
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


// Export functions if this were a module
// export { parseRoomPlan, parseGraph, processRoomLayout, RoomInput, EdgeInput, ProcessedRooms, WallRect, RoomOutput };
*/
