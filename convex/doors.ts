import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel"; // Added for type hinting
import { Segment, normalizeEdge, GAP, EPSILON } from "./walls";

const INTERIOR_DOOR_WIDTH = 0.9;
const INTERIOR_DOOR_HEIGHT = 2.1;

// Helper function for rounding coordinates (copied from walls.ts as it's not exported)
function roundToPrecision(value: number, precision: number = 3): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

// Helper to get normalized edges from a polygon
function getNormalizedEdges(
  polygon: number[][],
  spaceId: Id<"spaces">,
  normalizeEdgeFn: (
    p1: number[],
    p2: number[],
    id: Id<"spaces">
  ) => Segment | null
): Segment[] {
  const edges: Segment[] = [];
  if (!polygon || polygon.length < 3) {
    return edges;
  }
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    // Ensure points are valid 2D coordinates
    if (
      !p1 ||
      p1.length !== 2 ||
      typeof p1[0] !== "number" ||
      typeof p1[1] !== "number" ||
      !p2 ||
      p2.length !== 2 ||
      typeof p2[0] !== "number" ||
      typeof p2[1] !== "number"
    ) {
      console.warn(
        "Space " +
          spaceId +
          " has invalid point data in polygon, skipping edge: " +
          JSON.stringify(p1) +
          " to " +
          JSON.stringify(p2)
      );
      continue;
    }
    const normalized = normalizeEdgeFn(p1, p2, spaceId);
    if (normalized) {
      edges.push(normalized);
    }
  }
  return edges;
}

export const addDoors = internalMutation({
  args: {
    storeyId: v.id("storey"),
    spaceNumbers: v.array(v.number()), // Expecting two numbers
  },
  handler: async (ctx, args) => {
    if (args.spaceNumbers.length !== 2) {
      return {
        error: "Exactly two space numbers must be provided.",
        message: "Failed to add door.",
      };
    }

    const spaceDocsPromises = args.spaceNumbers.map((spaceNumber) =>
      ctx.db
        .query("spaces")
        .withIndex("byStoreyAndNumberId", (q) =>
          q.eq("storeyId", args.storeyId).eq("number", spaceNumber)
        )
        .first()
    );

    const fetchedSpaceDocs = await Promise.all(spaceDocsPromises);
    const space1Doc = fetchedSpaceDocs[0];
    const space2Doc = fetchedSpaceDocs[1];

    if (!space1Doc) {
      return {
        error:
          "Space with number " +
          args.spaceNumbers[0] +
          " not found on storey " +
          args.storeyId +
          ".",
        message: "Failed to add door.",
      };
    }
    if (!space2Doc) {
      return {
        error:
          "Space with number " +
          args.spaceNumbers[1] +
          " not found on storey " +
          args.storeyId +
          ".",
        message: "Failed to add door.",
      };
    }
    if (!space1Doc.polygon || space1Doc.polygon.length === 0) {
      return {
        error:
          "Space " +
          space1Doc._id +
          " (number " +
          space1Doc.number +
          ") has no polygon data.",
        message: "Failed to add door.",
      };
    }
    if (!space2Doc.polygon || space2Doc.polygon.length === 0) {
      return {
        error:
          "Space " +
          space2Doc._id +
          " (number " +
          space2Doc.number +
          ") has no polygon data.",
        message: "Failed to add door.",
      };
    }

    const interiorWalls = await ctx.db
      .query("walls")
      .withIndex("byStoreyIdAndType", (q) =>
        q.eq("storeyId", args.storeyId).eq("type", "interior")
      )
      .collect();

    const edges1 = getNormalizedEdges(
      space1Doc.polygon,
      space1Doc._id,
      normalizeEdge
    );
    const edges2 = getNormalizedEdges(
      space2Doc.polygon,
      space2Doc._id,
      normalizeEdge
    );

    const sharedBoundaries: Array<{
      start: [number, number];
      end: [number, number];
      orientation: "H" | "V";
      length: number;
    }> = [];

    for (const e1 of edges1) {
      for (const e2 of edges2) {
        if (e1.orientation !== e2.orientation) continue;

        // Check opposing normals (e.g., e1.nx = 1, e2.nx = -1)
        if (
          !(
            Math.abs(e1.nx + e2.nx) < EPSILON &&
            Math.abs(e1.ny + e2.ny) < EPSILON
          )
        ) {
          continue;
        }

        let overlapStartCoord: number | undefined,
          overlapEndCoord: number | undefined,
          centerlineFixedCoord: number | undefined;
        let isSeparatedByGap = false;

        if (e1.orientation === "H") {
          // Segments are horizontal, compare y-coordinates for GAP
          if (Math.abs(Math.abs(e1.y1 - e2.y1) - GAP) < EPSILON) {
            isSeparatedByGap = true;
            overlapStartCoord = Math.max(e1.x1, e2.x1);
            overlapEndCoord = Math.min(e1.x2, e2.x2);
            centerlineFixedCoord = (e1.y1 + e2.y1) / 2;
          }
        } else {
          // Segments are vertical, compare x-coordinates for GAP
          if (Math.abs(Math.abs(e1.x1 - e2.x1) - GAP) < EPSILON) {
            isSeparatedByGap = true;
            overlapStartCoord = Math.max(e1.y1, e2.y1);
            overlapEndCoord = Math.min(e1.y2, e2.y2);
            centerlineFixedCoord = (e1.x1 + e2.x1) / 2;
          }
        }

        if (
          isSeparatedByGap &&
          overlapStartCoord !== undefined &&
          overlapEndCoord !== undefined &&
          centerlineFixedCoord !== undefined &&
          overlapEndCoord > overlapStartCoord + EPSILON
        ) {
          const length = overlapEndCoord - overlapStartCoord;
          if (e1.orientation === "H") {
            sharedBoundaries.push({
              start: [overlapStartCoord, centerlineFixedCoord],
              end: [overlapEndCoord, centerlineFixedCoord],
              orientation: "H",
              length: length,
            });
          } else {
            // Vertical
            sharedBoundaries.push({
              start: [centerlineFixedCoord, overlapStartCoord],
              end: [centerlineFixedCoord, overlapEndCoord],
              orientation: "V",
              length: length,
            });
          }
        }
      }
    }

    if (sharedBoundaries.length === 0) {
      return {
        error: "No shared boundary found between the specified spaces.",
        message: "Failed to add door.",
      };
    }

    sharedBoundaries.sort((a, b) => b.length - a.length);
    const chosenBoundary = sharedBoundaries[0];

    if (chosenBoundary.length < INTERIOR_DOOR_WIDTH - EPSILON) {
      return {
        error: `Shared boundary (length: ${chosenBoundary.length.toFixed(
          2
        )}m) is too short for a ${INTERIOR_DOOR_WIDTH}m wide door.`,
        message: "Failed to add door.",
      };
    }

    const midPointOfBoundary: [number, number] = [
      (chosenBoundary.start[0] + chosenBoundary.end[0]) / 2,
      (chosenBoundary.start[1] + chosenBoundary.end[1]) / 2,
    ];

    let targetWallDoc: Doc<"walls"> | undefined = undefined;
    for (const iw of interiorWalls) {
      // Ensure it's an interior wall linking the two specific spaces
      if (
        !iw.spaceIds.includes(space1Doc._id) ||
        !iw.spaceIds.includes(space2Doc._id)
      ) {
        continue;
      }

      const wallIsHorizontal = Math.abs(iw.start[1] - iw.end[1]) < EPSILON;
      const wallIsVertical = Math.abs(iw.start[0] - iw.end[0]) < EPSILON;
      const wallOrientation = wallIsHorizontal
        ? "H"
        : wallIsVertical
        ? "V"
        : null;

      if (wallOrientation !== chosenBoundary.orientation) continue;

      let iw_start_coord, iw_end_coord, iw_fixed_coord;
      let boundary_s_coord, boundary_e_coord, boundary_f_coord;

      if (chosenBoundary.orientation === "H") {
        iw_start_coord = Math.min(iw.start[0], iw.end[0]);
        iw_end_coord = Math.max(iw.start[0], iw.end[0]);
        iw_fixed_coord = iw.start[1]; // y-coordinate of the horizontal wall
        boundary_s_coord = chosenBoundary.start[0]; // x1 of boundary
        boundary_e_coord = chosenBoundary.end[0]; // x2 of boundary
        boundary_f_coord = chosenBoundary.start[1]; // y of boundary
      } else {
        // Vertical
        iw_start_coord = Math.min(iw.start[1], iw.end[1]);
        iw_end_coord = Math.max(iw.start[1], iw.end[1]);
        iw_fixed_coord = iw.start[0]; // x-coordinate of the vertical wall
        boundary_s_coord = chosenBoundary.start[1]; // y1 of boundary
        boundary_e_coord = chosenBoundary.end[1]; // y2 of boundary
        boundary_f_coord = chosenBoundary.start[0]; // x of boundary
      }

      // Check if wall 'iw' contains the 'chosenBoundary'
      // 1. Fixed coordinates must match (i.e., they are collinear)
      // 2. The span of 'iw' must cover the span of 'chosenBoundary'
      if (
        Math.abs(iw_fixed_coord - boundary_f_coord) < EPSILON &&
        iw_start_coord <= boundary_s_coord + EPSILON &&
        iw_end_coord >= boundary_e_coord - EPSILON
      ) {
        targetWallDoc = iw;
        break;
      }
    }

    if (!targetWallDoc) {
      return {
        error:
          "Could not find a matching database wall for the shared boundary.",
        message: "Failed to add door.",
      };
    }

    const wallDx = targetWallDoc.end[0] - targetWallDoc.start[0];
    const wallDy = targetWallDoc.end[1] - targetWallDoc.start[1];
    const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

    const vecToMid_x = midPointOfBoundary[0] - targetWallDoc.start[0];
    const vecToMid_y = midPointOfBoundary[1] - targetWallDoc.start[1];
    const offsetToMidpoint = Math.sqrt(
      vecToMid_x * vecToMid_x + vecToMid_y * vecToMid_y
    );

    // Check if the door can be centered on the midpoint within the targetWallDoc
    if (offsetToMidpoint < INTERIOR_DOOR_WIDTH / 2 - EPSILON) {
      return {
        error: `Cannot center door: Midpoint of boundary (at ${offsetToMidpoint.toFixed(
          2
        )}m from wall start) is too close to the start of the wall segment (length ${wallLength.toFixed(
          2
        )}m) for a ${INTERIOR_DOOR_WIDTH}m door.`,
        message: "Failed to add door.",
      };
    }
    if (offsetToMidpoint + INTERIOR_DOOR_WIDTH / 2 > wallLength + EPSILON) {
      return {
        error: `Cannot center door: Midpoint of boundary (at ${offsetToMidpoint.toFixed(
          2
        )}m from wall start) is too close to the end of the wall segment (length ${wallLength.toFixed(
          2
        )}m) for a ${INTERIOR_DOOR_WIDTH}m door.`,
        message: "Failed to add door.",
      };
    }

    const doorOffsetDB = offsetToMidpoint - INTERIOR_DOOR_WIDTH / 2;

    const newDoorId = await ctx.db.insert("doors", {
      storeyId: args.storeyId,
      wallId: targetWallDoc._id,
      offset: roundToPrecision(doorOffsetDB),
      width: INTERIOR_DOOR_WIDTH,
      height: INTERIOR_DOOR_HEIGHT,
      type: "interior",
    });

    return {
      message: "Door added successfully",
      doorId: newDoorId,
    };
  },
});
