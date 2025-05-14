import { internal } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { GAP, EPSILON, COORD_PRECISION } from "./walls";

export const get = query({
  args: {
    storeyId: v.union(v.id("storey"), v.null()),
  },
  handler: async (ctx, args) => {
    if (!args.storeyId) return [];

    const spaces = await ctx.db
      .query("spaces")
      .withIndex("byStoreyId", (q) => q.eq("storeyId", args.storeyId!))
      .collect();

    return spaces;
  },
});

export const removeSpaces = internalMutation({
  args: {
    threadId: v.string(),
    spaceNumbers: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const storey = await ctx.db
      .query("storey")
      .withIndex("byThreadId", (q) => q.eq("threadId", args.threadId))
      .first();
    if (!storey) throw new Error("Storey not found");

    if (args.spaceNumbers.length === 0) {
      return { message: "No space numbers provided to remove." };
    }

    const spacesToDelete = await Promise.all(
      args.spaceNumbers.map((spaceNumber) =>
        ctx.db
          .query("spaces")
          .withIndex("byStoreyAndNumberId", (q) =>
            q.eq("storeyId", storey._id).eq("number", spaceNumber)
          )
          .first()
      )
    );

    if (spacesToDelete.length > 0) {
      await Promise.all(
        spacesToDelete.map((space) => ctx.db.delete(space!._id))
      );
    }

    // --- Wall Regeneration ---

    // 1. Delete all existing walls for the storey
    const allWallsForStorey = await ctx.db
      .query("walls")
      .withIndex("byStoreyId", (q) => q.eq("storeyId", storey._id)) // Assumes a simple byStoreyId index exists
      .collect();
    if (allWallsForStorey.length > 0) {
      await Promise.all(
        allWallsForStorey.map((wall) => ctx.db.delete(wall._id))
      );
    }

    // 2. Regenerate exterior walls
    await ctx.runMutation(internal.walls.addExteriorWalls, {
      storeyId: storey._id,
    });

    // 3. Regenerate interior walls
    // This needs to be called regardless of whether spaces are left or not,
    // as generateInteriorWalls handles the case of < 2 spaces internally.
    await ctx.runMutation(internal.walls.generateInteriorWalls, {
      storeyId: storey._id,
    });

    // Update slab after wall changes
    await ctx.runMutation(internal.spaces.updateStoreySlab, {
      storeyId: storey._id,
    });

    return {
      message: `Spaces removed. Walls have been regenerated.`,
    };
  },
});

export const mergeSpaces = internalMutation({
  args: {
    storeyId: v.id("storey"),
    spaceOneNumber: v.number(),
    spaceTwoNumber: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.spaceOneNumber === args.spaceTwoNumber) {
      throw new Error("Cannot merge a space with itself.");
    }

    const spaceOne = await ctx.db
      .query("spaces")
      .withIndex(
        "byStoreyAndNumberId",
        (
          q // Assuming index name is byStoreyIdAndNumber
        ) => q.eq("storeyId", args.storeyId).eq("number", args.spaceOneNumber)
      )
      .first();

    const spaceTwo = await ctx.db
      .query("spaces")
      .withIndex(
        "byStoreyAndNumberId",
        (
          q // Assuming index name is byStoreyIdAndNumber
        ) => q.eq("storeyId", args.storeyId).eq("number", args.spaceTwoNumber)
      )
      .first();

    if (!spaceOne || !spaceTwo) {
      throw new Error(
        `One or both spaces (numbers ${args.spaceOneNumber}, ${args.spaceTwoNumber}) not found.`
      );
    }

    // Helper to get bounding box
    function getSpaceBoundingBox(polygon: number[][]): {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    } {
      const xs = polygon.map((p) => p[0]);
      const ys = polygon.map((p) => p[1]);
      return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
      };
    }

    const bbox1 = getSpaceBoundingBox(spaceOne.polygon);
    const bbox2 = getSpaceBoundingBox(spaceTwo.polygon);

    let newPolygonCoordinates: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    } | null = null;

    // Check for horizontal adjacency and alignment (separated by GAP)
    const horizontallyAligned =
      Math.abs(bbox1.minY - bbox2.minY) < EPSILON &&
      Math.abs(bbox1.maxY - bbox2.maxY) < EPSILON;
    if (horizontallyAligned) {
      // Case 1: spaceTwo is to the right of spaceOne
      if (Math.abs(bbox2.minX - bbox1.maxX - GAP) < EPSILON) {
        newPolygonCoordinates = {
          minX: bbox1.minX,
          minY: bbox1.minY,
          maxX: bbox2.maxX,
          maxY: bbox1.maxY,
        };
      }
      // Case 2: spaceOne is to the right of spaceTwo
      else if (Math.abs(bbox1.minX - bbox2.maxX - GAP) < EPSILON) {
        newPolygonCoordinates = {
          minX: bbox2.minX,
          minY: bbox1.minY,
          maxX: bbox1.maxX,
          maxY: bbox1.maxY,
        };
      }
    }

    // If not horizontally merged, check for vertical adjacency and alignment
    if (!newPolygonCoordinates) {
      const verticallyAligned =
        Math.abs(bbox1.minX - bbox2.minX) < EPSILON &&
        Math.abs(bbox1.maxX - bbox2.maxX) < EPSILON;
      if (verticallyAligned) {
        // Case 3: spaceTwo is below spaceOne
        if (Math.abs(bbox2.minY - bbox1.maxY - GAP) < EPSILON) {
          newPolygonCoordinates = {
            minX: bbox1.minX,
            minY: bbox1.minY,
            maxX: bbox1.maxX,
            maxY: bbox2.maxY,
          };
        }
        // Case 4: spaceOne is below spaceTwo
        else if (Math.abs(bbox1.minY - bbox2.maxY - GAP) < EPSILON) {
          newPolygonCoordinates = {
            minX: bbox1.minX,
            minY: bbox2.minY,
            maxX: bbox1.maxX,
            maxY: bbox1.maxY,
          };
        }
      }
    }

    if (!newPolygonCoordinates) {
      throw new Error(
        "Spaces are not suitably adjacent and aligned for merging. They must be rectangular, axis-aligned, and separated by the standard GAP."
      );
    }

    const { minX: nX, minY: nY, maxX: mX, maxY: mY } = newPolygonCoordinates;
    const finalNewPolygon: number[][] = [
      [nX, nY],
      [mX, nY],
      [mX, mY],
      [nX, mY],
    ];

    // Decide which space to keep (e.g., the one with the lower number or spaceOne by default)
    // Let's keep spaceOne's identity and remove spaceTwo.
    const spaceToKeep = spaceOne;
    const spaceToRemove = spaceTwo;

    const newName = `${spaceOne.name} & ${spaceTwo.name}`; // Or a more sophisticated naming

    await ctx.db.patch(spaceToKeep._id, {
      polygon: finalNewPolygon,
      name: newName,
    });
    await ctx.db.delete(spaceToRemove._id);

    // --- Wall Regeneration ---

    // 1. Delete all existing walls for the storey (more generic approach for now)
    const allWallsForStorey = await ctx.db
      .query("walls")
      .withIndex("byStoreyId", (q) => q.eq("storeyId", args.storeyId)) // Assumes a simple byStoreyId index exists
      .collect();
    if (allWallsForStorey.length > 0) {
      await Promise.all(
        allWallsForStorey.map((wall) => ctx.db.delete(wall._id))
      );
    }

    // 2. Regenerate exterior walls
    await ctx.runMutation(internal.walls.addExteriorWalls, {
      storeyId: args.storeyId,
    });

    // 3. Regenerate interior walls
    await ctx.runMutation(internal.walls.generateInteriorWalls, {
      storeyId: args.storeyId,
    });

    // Update slab after wall changes
    await ctx.runMutation(internal.spaces.updateStoreySlab, {
      storeyId: args.storeyId,
    });

    return {
      message: `Spaces ${args.spaceOneNumber} and ${args.spaceTwoNumber} merged successfully into space ${spaceToKeep.number}. Wall regeneration initiated.`,
      mergedSpaceId: spaceToKeep._id,
    };
  },
});

export const addSpacesWithWalls = internalMutation({
  args: {
    storeyId: v.id("storey"),
    referenceSpaceNumber: v.optional(v.number()),
    width: v.number(),
    length: v.number(),
    name: v.string(),
    placement: v.optional(
      v.union(
        v.literal("top-start"),
        v.literal("top"),
        v.literal("top-end"),
        v.literal("right-start"),
        v.literal("right"),
        v.literal("right-end"),
        v.literal("bottom-start"),
        v.literal("bottom"),
        v.literal("bottom-end"),
        v.literal("left-start"),
        v.literal("left"),
        v.literal("left-end")
      )
    ),
  },
  handler: async (ctx, args) => {
    const addSpaceResult = await ctx.runMutation(internal.spaces.addSpaces, {
      storeyId: args.storeyId,
      referenceSpaceNumber: args.referenceSpaceNumber,
      width: args.width,
      length: args.length,
      name: args.name,
      placement: args.placement,
    });

    if (!addSpaceResult?.spaceId) {
      throw new Error(
        addSpaceResult.message ??
          "Failed to add space due to placement conflict or other error."
      );
    }

    const storey = await ctx.db.get(args.storeyId);
    if (!storey) throw new Error("Storey not found");

    // Delete existing interior walls before regenerating.
    const existingInteriorWalls = await ctx.db
      .query("walls")
      .withIndex("byStoreyId", (q) => q.eq("storeyId", storey._id))
      .collect();
    if (existingInteriorWalls.length > 0) {
      await Promise.all(
        existingInteriorWalls.map((wall) => ctx.db.delete(wall._id))
      );
    }

    // Regenerate exterior walls (this might also delete old ones or be additive depending on its impl.)
    await ctx.runMutation(internal.walls.addExteriorWalls, {
      storeyId: args.storeyId,
    });

    // Regenerate interior walls using the new centralized mutation
    await ctx.runMutation(internal.walls.generateInteriorWalls, {
      storeyId: storey._id,
    });

    // Final call to update slab after all wall changes
    // await ctx.runMutation(internal.spaces.updateStoreySlab, {
    //   storeyId: args.storeyId,
    // });

    return {
      message: "Space and walls added/updated successfully",
      // Potentially return spaceId from addSpaceResult if needed by the caller
    };
  },
});

// Helper function for comparing points with tolerance
function pointsAreEqual(
  p1: number[] | undefined,
  p2: number[] | undefined,
  tolerance: number = EPSILON
): boolean {
  if (!p1 || !p2 || p1.length !== 2 || p2.length !== 2) return false;
  return (
    Math.abs(p1[0] - p2[0]) < tolerance && Math.abs(p1[1] - p2[1]) < tolerance
  );
}

// Helper to stringify a point for use as a map key
function pointToKey(p: number[]): string {
  return `${p[0].toFixed(COORD_PRECISION)},${p[1].toFixed(COORD_PRECISION)}`;
}

export const updateStoreySlab = internalMutation({
  args: {
    storeyId: v.id("storey"),
  },
  handler: async (ctx, args) => {
    const storey = await ctx.db.get(args.storeyId);
    if (!storey) {
      console.warn(`[updateStoreySlab] Storey ${args.storeyId} not found.`);
      return;
    }

    const allSpacesOnStorey = await ctx.db
      .query("spaces")
      .withIndex("byStoreyId", (q) => q.eq("storeyId", args.storeyId))
      .collect();

    const exteriorWalls = await ctx.db
      .query("walls")
      .withIndex("byStoreyIdAndType", (q) =>
        q.eq("storeyId", args.storeyId).eq("type", "exterior")
      )
      .collect();

    let finalSlabPolygon: number[][] | null = null;
    let traceAttempted = false;
    let traceSuccess = false;

    // Attempt 1: Trace polygon from exterior walls
    if (exteriorWalls.length >= 3) {
      traceAttempted = true;
      type WallSegmentNode = {
        id: Id<"walls">;
        start: number[];
        end: number[];
        originalIndex: number;
      };
      const wallSegmentNodes: WallSegmentNode[] = exteriorWalls.map(
        (wall, index) => ({
          id: wall._id,
          start: wall.start,
          end: wall.end,
          originalIndex: index,
        })
      );

      const adj = new Map<
        string,
        { point: number[]; segments: WallSegmentNode[] }
      >();

      for (const segNode of wallSegmentNodes) {
        const startKey = pointToKey(segNode.start);
        const endKey = pointToKey(segNode.end);

        if (!adj.has(startKey))
          adj.set(startKey, { point: segNode.start, segments: [] });
        adj.get(startKey)!.segments.push(segNode);

        if (!adj.has(endKey))
          adj.set(endKey, { point: segNode.end, segments: [] });
        adj.get(endKey)!.segments.push(segNode);
      }

      const path: number[][] = [];
      const usedSegments = new Set<Id<"walls">>();
      let currentPoint: number[] | null = null;
      let currentSegmentNode: WallSegmentNode | null = null;

      // Find a starting point: prefer points with exactly 2 connections if possible (typical for clean polygon)
      let startNode: WallSegmentNode | null = null;
      for (const segNode of wallSegmentNodes) {
        const startConnections =
          adj.get(pointToKey(segNode.start))?.segments.length ?? 0;
        const endConnections =
          adj.get(pointToKey(segNode.end))?.segments.length ?? 0;
        if (startConnections === 2 || endConnections === 2) {
          startNode = segNode;
          break;
        }
      }
      if (!startNode && wallSegmentNodes.length > 0)
        startNode = wallSegmentNodes[0]; // Fallback to first segment

      if (startNode) {
        currentSegmentNode = startNode;
        currentPoint = [...currentSegmentNode.start];
        path.push(currentPoint);
        currentPoint = [...currentSegmentNode.end];
        path.push(currentPoint);
        usedSegments.add(currentSegmentNode.id);

        for (let i = 0; i < wallSegmentNodes.length; i++) {
          // Max iterations to prevent infinite loops
          const connected = adj.get(pointToKey(currentPoint!));
          if (!connected || connected.segments.length === 0) break; // Dead end

          let nextSegmentNode: WallSegmentNode | null = null;
          for (const candidateNode of connected.segments) {
            if (!usedSegments.has(candidateNode.id)) {
              nextSegmentNode = candidateNode;
              break;
            }
          }

          if (!nextSegmentNode) break; // No unused segment found at this point

          currentSegmentNode = nextSegmentNode;
          usedSegments.add(currentSegmentNode.id);

          if (pointsAreEqual(currentPoint, currentSegmentNode.start)) {
            currentPoint = [...currentSegmentNode.end];
          } else if (pointsAreEqual(currentPoint, currentSegmentNode.end)) {
            currentPoint = [...currentSegmentNode.start];
          } else {
            // Should not happen if adjacency list is correct and point is shared
            console.warn(
              `[updateStoreySlab] Discontinuity found at point ${JSON.stringify(
                currentPoint
              )} for segment ${currentSegmentNode.id}`
            );
            currentPoint = null; // Force break
            break;
          }
          path.push([...currentPoint]);

          if (pointsAreEqual(currentPoint, path[0])) {
            if (usedSegments.size === exteriorWalls.length) {
              path.pop(); // Remove redundant closing point
              if (path.length >= 3) {
                finalSlabPolygon = path;
                traceSuccess = true;
              }
            }
            break; // Closed loop
          }
          if (path.length > exteriorWalls.length + 1) break; // Overran, something is wrong
        }
      }

      if (!traceSuccess) {
        console.warn(
          `[updateStoreySlab] Failed to trace a closed polygon from ${
            exteriorWalls.length
          } exterior walls for storey ${args.storeyId}. Used ${
            usedSegments.size
          } segments. Path closed: ${
            currentPoint ? pointsAreEqual(currentPoint, path[0]) : "false"
          }. Fallback to bounding box.`
        );
      } else {
        console.log(
          `[updateStoreySlab] Successfully traced slab polygon from ${usedSegments.size} exterior walls for storey ${args.storeyId}.`
        );
      }
    } else if (exteriorWalls.length > 0 && exteriorWalls.length < 3) {
      traceAttempted = true; // Attempted but not enough walls
      console.warn(
        `[updateStoreySlab] Not enough exterior walls (${exteriorWalls.length}) to form a polygon for storey ${args.storeyId}. Fallback to bounding box.`
      );
    }

    // Attempt 2: Bounding Box (Fallback or if no exterior walls or trace failed)
    if (!traceSuccess && allSpacesOnStorey.length > 0) {
      if (traceAttempted) {
        console.log(
          `[updateStoreySlab] Using bounding box for slab for storey ${args.storeyId} due to trace failure or insufficient walls.`
        );
      } else {
        console.log(
          `[updateStoreySlab] No exterior walls found or too few, using bounding box for slab for storey ${args.storeyId}.`
        );
      }
      let overallMinX = Infinity;
      let overallMinY = Infinity;
      let overallMaxX = -Infinity;
      let overallMaxY = -Infinity;

      for (const space of allSpacesOnStorey) {
        if (space.polygon && Array.isArray(space.polygon)) {
          for (const point of space.polygon) {
            if (
              Array.isArray(point) &&
              point.length === 2 &&
              typeof point[0] === "number" &&
              typeof point[1] === "number" &&
              !isNaN(point[0]) &&
              !isNaN(point[1])
            ) {
              overallMinX = Math.min(overallMinX, point[0]);
              overallMinY = Math.min(overallMinY, point[1]);
              overallMaxX = Math.max(overallMaxX, point[0]);
              overallMaxY = Math.max(overallMaxY, point[1]);
            }
          }
        }
      }

      if (
        isFinite(overallMinX) &&
        isFinite(overallMinY) &&
        isFinite(overallMaxX) &&
        isFinite(overallMaxY)
      ) {
        const roundCoordinate = (n: number) =>
          Math.round(n * COORD_PRECISION) / COORD_PRECISION;
        finalSlabPolygon = [
          [roundCoordinate(overallMinX), roundCoordinate(overallMinY)],
          [roundCoordinate(overallMaxX), roundCoordinate(overallMinY)],
          [roundCoordinate(overallMaxX), roundCoordinate(overallMaxY)],
          [roundCoordinate(overallMinX), roundCoordinate(overallMaxY)],
        ];
      }
    }

    // Update Slab Document
    const existingSlab = await ctx.db
      .query("slabs")
      .withIndex("byStoreyId", (q) => q.eq("storeyId", args.storeyId))
      .first();

    if (finalSlabPolygon && finalSlabPolygon.length >= 3) {
      // Ensure polygon points are valid numbers
      const cleanedPolygon = finalSlabPolygon.map((p) => [
        Number(p[0].toFixed(COORD_PRECISION)),
        Number(p[1].toFixed(COORD_PRECISION)),
      ]);

      if (existingSlab) {
        // Check if polygon is different before patching
        const polygonsAreSame =
          existingSlab.polygon.length === cleanedPolygon.length &&
          existingSlab.polygon.every((p, i) =>
            pointsAreEqual(p, cleanedPolygon[i], 0.0001)
          ); // smaller tolerance for same check

        if (!polygonsAreSame) {
          await ctx.db.patch(existingSlab._id, { polygon: cleanedPolygon });
          console.log(
            `[updateStoreySlab] Patched slab for storey ${args.storeyId}.`
          );
        } else {
          console.log(
            `[updateStoreySlab] Slab polygon unchanged for storey ${args.storeyId}. No patch needed.`
          );
        }
      } else {
        await ctx.db.insert("slabs", {
          storeyId: args.storeyId,
          polygon: cleanedPolygon,
        });
        console.log(
          `[updateStoreySlab] Inserted new slab for storey ${args.storeyId}.`
        );
      }
    } else {
      // No valid polygon could be formed (e.g., no spaces, no valid exterior walls)
      if (existingSlab) {
        await ctx.db.delete(existingSlab._id);
        console.log(
          `[updateStoreySlab] Deleted existing slab for storey ${args.storeyId} as no valid polygon could be formed.`
        );
      } else {
        console.log(
          `[updateStoreySlab] No slab to create or delete for storey ${args.storeyId}.`
        );
      }
    }
  },
});

export const addSpaces = internalMutation({
  args: {
    storeyId: v.id("storey"),
    referenceSpaceNumber: v.optional(v.number()),
    width: v.number(),
    length: v.number(),
    name: v.string(),
    // placement can be: left, right, top, bottom, top-left, top-right, bottom-left, bottom-right
    placement: v.optional(
      v.union(
        v.literal("top-start"),
        v.literal("top"),
        v.literal("top-end"),
        v.literal("right-start"),
        v.literal("right"),
        v.literal("right-end"),
        v.literal("bottom-start"),
        v.literal("bottom"),
        v.literal("bottom-end"),
        v.literal("left-start"),
        v.literal("left"),
        v.literal("left-end")
      )
    ),
  },
  handler: async (ctx, args) => {
    const storey = await ctx.db.get(args.storeyId);
    if (!storey) throw new Error("Storey not found");

    const spaces = await ctx.db
      .query("spaces")
      .withIndex("byStoreyId", (q) => q.eq("storeyId", storey._id))
      .collect();

    // Find next available number
    const nextNumber: number =
      spaces.length > 0
        ? Math.max(
            ...spaces.map((s) => (typeof s.number === "number" ? s.number : 0))
          ) + 1
        : 1;

    const GAP = 0.09; // 9 cm gap for interior wall
    let polygon: number[][] = [
      [0, 0],
      [args.width, 0],
      [args.width, args.length],
      [0, args.length],
    ];
    // Helper to compare two polygons (order-insensitive, with tolerance)
    function polygonsEqual(
      polyA: number[][],
      polyB: number[][],
      tolerance = 1e-6
    ) {
      if (polyA.length !== polyB.length) return false;
      // For each point in polyA, there must be a matching point in polyB
      return polyA.every((pa) =>
        polyB.some(
          (pb) =>
            Math.abs(pa[0] - pb[0]) < tolerance &&
            Math.abs(pa[1] - pb[1]) < tolerance
        )
      );
    }

    // If there are no spaces, always add at origin
    if (spaces.length === 0) {
      polygon = [
        [0, 0],
        [args.width, 0],
        [args.width, args.length],
        [0, args.length],
      ];
    } else if (!args.referenceSpaceNumber && !args.placement) {
      // No reference, but there are spaces: add at origin
      polygon = [
        [0, 0],
        [args.width, 0],
        [args.width, args.length],
        [0, args.length],
      ];
    } else {
      // Find reference room
      const refRoom = spaces.find(
        (s) =>
          typeof s.number === "number" && s.number === args.referenceSpaceNumber
      );
      // If referenceSpaceNumber is provided but not found, add at origin
      if (args.referenceSpaceNumber && !refRoom) {
        polygon = [
          [0, 0],
          [args.width, 0],
          [args.width, args.length],
          [0, args.length],
        ];
      } else if (refRoom) {
        const refPoly = refRoom.polygon;
        // Calculate min/max for reference room
        const minX = Math.min(...refPoly.map((p: number[]) => p[0]));
        const maxX = Math.max(...refPoly.map((p: number[]) => p[0]));
        const minY = Math.min(...refPoly.map((p: number[]) => p[1]));
        const maxY = Math.max(...refPoly.map((p: number[]) => p[1]));
        const placement = args.placement || "right";
        const [basePlacement, align = "center"] = placement.split("-");
        // Helper to find all spaces attached to the same edge and alignment (robust for stacking)
        function findStackedSpaces(edge: string, align: string): typeof spaces {
          return spaces.filter((s: { polygon: number[][] }) => {
            const poly = s.polygon;
            const sMinX = Math.min(...poly.map((p: number[]) => p[0]));
            const sMaxX = Math.max(...poly.map((p: number[]) => p[0]));
            const sMinY = Math.min(...poly.map((p: number[]) => p[1]));
            const sMaxY = Math.max(...poly.map((p: number[]) => p[1]));
            if (edge === "right") {
              if (Math.abs(sMinX - (maxX + GAP)) < 1e-6) {
                if (align === "start") {
                  // Top-aligned: top edge flush with reference top
                  return Math.abs(sMinY - minY) < 1e-6;
                } else if (align === "end") {
                  // Bottom-aligned: bottom edge flush with reference bottom
                  return Math.abs(sMaxY - maxY) < 1e-6;
                } else {
                  // Center: any vertical overlap
                  return sMaxY > minY && sMinY < maxY;
                }
              }
            } else if (edge === "left") {
              if (Math.abs(sMaxX - (minX - GAP)) < 1e-6) {
                if (align === "start") {
                  // Top-aligned: top edge flush with reference top
                  return Math.abs(sMinY - minY) < 1e-6;
                } else if (align === "end") {
                  // Bottom-aligned: bottom edge flush with reference bottom
                  return Math.abs(sMaxY - maxY) < 1e-6;
                } else {
                  // Center: any vertical overlap
                  return sMaxY > minY && sMinY < maxY;
                }
              }
            } else if (edge === "bottom") {
              if (Math.abs(sMinY - (maxY + GAP)) < 1e-6) {
                if (align === "start") {
                  // Left-aligned: left edge flush with reference left
                  return Math.abs(sMinX - minX) < 1e-6;
                } else if (align === "end") {
                  // Right-aligned: right edge flush with reference right
                  return Math.abs(sMaxX - maxX) < 1e-6;
                } else {
                  // Center: any horizontal overlap
                  return sMaxX > minX && sMinX < maxX;
                }
              }
            } else if (edge === "top") {
              if (Math.abs(sMaxY - (minY - GAP)) < 1e-6) {
                if (align === "start") {
                  // Left-aligned: left edge flush with reference left
                  return Math.abs(sMinX - minX) < 1e-6;
                } else if (align === "end") {
                  // Right-aligned: right edge flush with reference right
                  return Math.abs(sMaxX - maxX) < 1e-6;
                } else {
                  // Center: any horizontal overlap
                  return sMaxX > minX && sMinX < maxX;
                }
              }
            }
            return false;
          });
        }
        // Find stacked spaces (all spaces already attached to the same edge and alignment)
        const stacked = findStackedSpaces(basePlacement, align);

        // Helper to round to 2 decimal places
        function round2(n: number) {
          return Math.round(n * 100) / 100;
        }
        if (basePlacement === "left") {
          if (align === "start") {
            // left-start: anchor new space's top-left to reference's top-left (top-aligned)
            const x1 = minX - GAP - args.width;
            const y1 = minY;
            polygon = [
              [round2(x1), round2(y1)],
              [round2(x1 + args.width), round2(y1)],
              [round2(x1 + args.width), round2(y1 + args.length)],
              [round2(x1), round2(y1 + args.length)],
            ];
          } else if (align === "end") {
            // left-end: anchor new space's bottom-left to reference's bottom-left (bottom-aligned)
            const x1 = minX - GAP - args.width;
            const y1 = maxY - args.length;
            polygon = [
              [round2(x1), round2(y1)],
              [round2(x1 + args.width), round2(y1)],
              [round2(x1 + args.width), round2(y1 + args.length)],
              [round2(x1), round2(y1 + args.length)],
            ];
          } else {
            // left-center: vertically center new space to reference
            const x1 = minX - GAP - args.width;
            const y1 = minY + (maxY - minY) / 2 - args.length / 2;
            polygon = [
              [round2(x1), round2(y1)],
              [round2(x1 + args.width), round2(y1)],
              [round2(x1 + args.width), round2(y1 + args.length)],
              [round2(x1), round2(y1 + args.length)],
            ];
          }
        } else if (basePlacement === "right") {
          if (align === "start") {
            // right-start: anchor new space's top-right to reference's top-right (top-aligned)
            const x1 = maxX + GAP;
            const y1 = minY;
            polygon = [
              [round2(x1), round2(y1)],
              [round2(x1 + args.width), round2(y1)],
              [round2(x1 + args.width), round2(y1 + args.length)],
              [round2(x1), round2(y1 + args.length)],
            ];
          } else if (align === "end") {
            // right-end: anchor new space's bottom-right to reference's bottom-right (bottom-aligned)
            const x1 = maxX + GAP;
            const y1 = maxY - args.length;
            polygon = [
              [round2(x1), round2(y1)],
              [round2(x1 + args.width), round2(y1)],
              [round2(x1 + args.width), round2(y1 + args.length)],
              [round2(x1), round2(y1 + args.length)],
            ];
          } else {
            // right-center: vertically center new space to reference
            const x1 = maxX + GAP;
            const y1 = minY + (maxY - minY) / 2 - args.length / 2;
            polygon = [
              [round2(x1), round2(y1)],
              [round2(x1 + args.width), round2(y1)],
              [round2(x1 + args.width), round2(y1 + args.length)],
              [round2(x1), round2(y1 + args.length)],
            ];
          }
        } else if (basePlacement === "top") {
          if (align === "start") {
            // top-start: anchor new space's bottom-left to reference's top-left (left-aligned)
            const x1 = minX;
            const y1 = minY - GAP - args.length;
            polygon = [
              [round2(x1), round2(y1)],
              [round2(x1 + args.width), round2(y1)],
              [round2(x1 + args.width), round2(y1 + args.length)],
              [round2(x1), round2(y1 + args.length)],
            ];
          } else if (align === "end") {
            // top-end: anchor new space's bottom-right to reference's top-right (right-aligned)
            const x1 = maxX - args.width;
            const y1 = minY - GAP - args.length;
            polygon = [
              [round2(x1), round2(y1)],
              [round2(x1 + args.width), round2(y1)],
              [round2(x1 + args.width), round2(y1 + args.length)],
              [round2(x1), round2(y1 + args.length)],
            ];
          } else {
            // top-center: horizontally center new space to reference
            const x1 = minX + (maxX - minX) / 2 - args.width / 2;
            const y1 = maxY + GAP;
            polygon = [
              [round2(x1), round2(y1)],
              [round2(x1 + args.width), round2(y1)],
              [round2(x1 + args.width), round2(y1 + args.length)],
              [round2(x1), round2(y1 + args.length)],
            ];
          }
        } else if (basePlacement === "bottom") {
          if (align === "start") {
            // bottom-start: anchor new space's top-left to reference's bottom-left (left-aligned)
            const x1 = minX;
            const y1 = maxY + GAP;
            polygon = [
              [round2(x1), round2(y1)],
              [round2(x1 + args.width), round2(y1)],
              [round2(x1 + args.width), round2(y1 + args.length)],
              [round2(x1), round2(y1 + args.length)],
            ];
          } else if (align === "end") {
            // bottom-end: anchor new space's top-right to reference's bottom-right (right-aligned)
            const x1 = maxX - args.width;
            const y1 = maxY + GAP;
            polygon = [
              [round2(x1), round2(y1)],
              [round2(x1 + args.width), round2(y1)],
              [round2(x1 + args.width), round2(y1 + args.length)],
              [round2(x1), round2(y1 + args.length)],
            ];
          } else {
            // bottom-center: horizontally center new space to reference
            const x1 = minX + (maxX - minX) / 2 - args.width / 2;
            const y1 = minY - GAP - args.length;
            polygon = [
              [round2(x1), round2(y1)],
              [round2(x1 + args.width), round2(y1)],
              [round2(x1 + args.width), round2(y1 + args.length)],
              [round2(x1), round2(y1 + args.length)],
            ];
          }
        } else {
          throw new Error("Invalid placement");
        }
        // Check for overlap/adjacency
        const conflict = spaces.some((s) => polygonsEqual(s.polygon, polygon));
        if (conflict) {
          return {
            spaceId: null,
            polygon,
            message: `Cannot add space: a space already exists in the '${placement}' direction.`,
            roomNumber: null,
          };
        }
      } else {
        // No reference room found and no referenceSpaceNumber: add at origin
        polygon = [
          [0, 0],
          [args.width, 0],
          [args.width, args.length],
          [0, args.length],
        ];
      }
    }

    const spaceId = await ctx.db.insert("spaces", {
      storeyId: storey._id,
      name: args.name,
      type: "other",
      polygon,
      number: nextNumber,
    });

    // Call the new centralized slab update logic
    await ctx.runMutation(internal.spaces.updateStoreySlab, {
      storeyId: args.storeyId,
    });

    return { spaceId, polygon, message: "Space added", roomNumber: nextNumber };
  },
});
