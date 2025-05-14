import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const GAP = 0.09;
export const EPSILON = 1e-6; // A small value for float comparisons
export const COORD_PRECISION = 5; // For grouping coordinates, e.g., 5 decimal places
const EXTERIOR_WALL_THICKNESS = 0.35;
const HALF_EXTERIOR_WALL_THICKNESS = EXTERIOR_WALL_THICKNESS / 2;
const GAP_DISTANCE_CHECK_TOLERANCE = 0.025; // Increased tolerance to 2.5cm
const MIN_LENGTH_FOR_MITER_ADJUSTMENT = 0.001; // Reduced from 0.05

// Helper function for rounding coordinates
function roundToPrecision(value: number, precision: number = 3): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  spaceId: Id<"spaces">;
  orientation: "H" | "V";
  nx: number; // x-component of outward unit normal (assuming CCW polygon for space)
  ny: number; // y-component of outward unit normal
  // For H segments, y1=y2 is stored in y1. For V segments, x1=x2 is stored in x1.
  // Normalized: For H segments, x1 < x2. For V segments, y1 < y2.
}

interface Interval {
  start: number;
  end: number;
}

interface MergedWallInfo {
  start: number[];
  end: number[];
  spaceIds: Array<Id<"spaces">>;
  orientation: "H" | "V";
  nx_inner_normal: number; // For V walls, 0 for H walls. Original normal of the inner face.
  ny_inner_normal: number; // For H walls, 0 for V walls. Original normal of the inner face.
}

// Subtracts one interval (subtractor) from another (source).
// Returns an array of 0, 1, or 2 intervals that are parts of source not covered by subtractor.
function subtractInterval(source: Interval, subtractor: Interval): Interval[] {
  const results: Interval[] = [];

  // Case 1: No overlap (subtractor is completely to the left of source)
  if (subtractor.end <= source.start + EPSILON) {
    results.push(source);
    return results;
  }

  // Case 2: No overlap (subtractor is completely to the right of source)
  if (subtractor.start >= source.end - EPSILON) {
    results.push(source);
    return results;
  }

  // Case 3: Overlap exists.
  // Part of source to the left of subtractor's start
  if (source.start < subtractor.start - EPSILON) {
    results.push({ start: source.start, end: subtractor.start });
  }

  // Part of source to the right of subtractor's end
  if (source.end > subtractor.end + EPSILON) {
    results.push({ start: subtractor.end, end: source.end });
  }

  return results.filter((p) => p.end > p.start + EPSILON); // Ensure valid intervals
}

// Helper to normalize a polygon edge and determine orientation.
// Assumes axis-aligned edges from polygons. Non-axis-aligned edges are ignored.
export function normalizeEdge(
  p1Coords: number[],
  p2Coords: number[],
  spaceId: Id<"spaces">
): Segment | null {
  const orig_vx = p2Coords[0] - p1Coords[0];
  const orig_vy = p2Coords[1] - p1Coords[1];

  // Assuming CCW polygon winding for space, outward normal is (vy, -vx)
  let out_nx_raw = orig_vy;
  let out_ny_raw = -orig_vx;
  const len_normal = Math.sqrt(
    out_nx_raw * out_nx_raw + out_ny_raw * out_ny_raw
  );

  let nx = 0,
    ny = 0;
  if (len_normal > EPSILON) {
    nx = out_nx_raw / len_normal;
    ny = out_ny_raw / len_normal;
  } else {
    // console.warn(\`Zero length edge for space ${spaceId}, cannot determine normal: ${p1Coords} to ${p2Coords}\`);
    return null; // Cannot form a valid segment or determine normal for a zero-length edge
  }

  // Round normals to stabilize comparisons
  nx = roundToPrecision(nx, 7);
  ny = roundToPrecision(ny, 7);

  let [x1, y1] = p1Coords;
  let [x2, y2] = p2Coords;

  if (Math.abs(y1 - y2) < EPSILON) {
    // Horizontal
    if (x1 > x2) [x1, x2] = [x2, x1]; // Ensure x1 < x2 for normalized segment
    return {
      x1: roundToPrecision(x1),
      y1: roundToPrecision(y1),
      x2: roundToPrecision(x2),
      y2: roundToPrecision(y1), // y2 is same as y1
      spaceId,
      orientation: "H",
      nx,
      ny,
    };
  } else if (Math.abs(x1 - x2) < EPSILON) {
    // Vertical
    if (y1 > y2) [y1, y2] = [y2, y1]; // Ensure y1 < y2 for normalized segment
    return {
      x1: roundToPrecision(x1),
      y1: roundToPrecision(y1),
      x2: roundToPrecision(x1), // x2 is same as x1
      y2: roundToPrecision(y2),
      spaceId,
      orientation: "V",
      nx,
      ny,
    };
  }
  // console.warn("Non-axis-aligned edge found, skipping:", p1Coords, p2Coords);
  return null; // Skip non-axis-aligned edges
}

function mergeAxisAlignedCenterlineSegments(
  segmentsToMerge: Segment[],
  orientation: "H" | "V",
  fixedCoordValue: number // y_centerline for H, x_centerline for V
): MergedWallInfo[] {
  const results: MergedWallInfo[] = [];
  if (segmentsToMerge.length === 0) return results;

  segmentsToMerge.sort((a, b) =>
    orientation === "H" ? a.x1 - b.x1 : a.y1 - b.y1
  );

  let currentMergedData: {
    startCoord: number; // x1 for H, y1 for V
    endCoord: number; // x2 for H, y2 for V
    spaceIds: Set<Id<"spaces">>;
    // These store the .nx and .ny from the first segment of a merged run.
    // These .nx, .ny on the Segment interface are the outward normals of the *original inner face*.
    repNxFromOriginal: number;
    repNyFromOriginal: number;
  } | null = null;

  for (const seg of segmentsToMerge) {
    const segStart = orientation === "H" ? seg.x1 : seg.y1;
    const segEnd = orientation === "H" ? seg.x2 : seg.y2;

    if (currentMergedData === null) {
      currentMergedData = {
        startCoord: segStart,
        endCoord: segEnd,
        spaceIds: new Set([seg.spaceId]),
        repNxFromOriginal: seg.nx, // Store original inner face normal component
        repNyFromOriginal: seg.ny, // Store original inner face normal component
      };
    } else {
      const gapToSeg = segStart - currentMergedData.endCoord;
      if (gapToSeg <= EPSILON) {
        // Overlap or direct contiguity
        currentMergedData.endCoord = Math.max(
          currentMergedData.endCoord,
          segEnd
        );
        currentMergedData.spaceIds.add(seg.spaceId);
      } else if (Math.abs(gapToSeg - GAP) < EPSILON) {
        // Separated by one GAP
        currentMergedData.endCoord = segEnd;
        currentMergedData.spaceIds.add(seg.spaceId);
      } else {
        // Finalize previous merged segment
        results.push(
          orientation === "H"
            ? {
                start: [currentMergedData.startCoord, fixedCoordValue],
                end: [currentMergedData.endCoord, fixedCoordValue],
                spaceIds: Array.from(currentMergedData.spaceIds),
                orientation: "H",
                nx_inner_normal: 0, // For H-wall, its effective inner normal has nx=0
                ny_inner_normal: currentMergedData.repNyFromOriginal,
              }
            : {
                // Orientation === 'V'
                start: [fixedCoordValue, currentMergedData.startCoord],
                end: [fixedCoordValue, currentMergedData.endCoord],
                spaceIds: Array.from(currentMergedData.spaceIds),
                orientation: "V",
                nx_inner_normal: currentMergedData.repNxFromOriginal,
                ny_inner_normal: 0, // For V-wall, its effective inner normal has ny=0
              }
        );
        // Start new merged segment
        currentMergedData = {
          startCoord: segStart,
          endCoord: segEnd,
          spaceIds: new Set([seg.spaceId]),
          repNxFromOriginal: seg.nx,
          repNyFromOriginal: seg.ny,
        };
      }
    }
  }

  // Finalize the last currentMerged segment if it exists
  if (currentMergedData) {
    results.push(
      orientation === "H"
        ? {
            start: [currentMergedData.startCoord, fixedCoordValue],
            end: [currentMergedData.endCoord, fixedCoordValue],
            spaceIds: Array.from(currentMergedData.spaceIds),
            orientation: "H",
            nx_inner_normal: 0,
            ny_inner_normal: currentMergedData.repNyFromOriginal,
          }
        : {
            // Orientation === 'V'
            start: [fixedCoordValue, currentMergedData.startCoord],
            end: [fixedCoordValue, currentMergedData.endCoord],
            spaceIds: Array.from(currentMergedData.spaceIds),
            orientation: "V",
            nx_inner_normal: currentMergedData.repNxFromOriginal,
            ny_inner_normal: 0,
          }
    );
  }
  return results;
}

export const addExteriorWalls = internalMutation({
  args: {
    storeyId: v.id("storey"),
  },
  handler: async (ctx, args) => {
    const storey = await ctx.db.get(args.storeyId);
    if (!storey) throw new Error("Storey not found");

    const spaces = await ctx.db
      .query("spaces")
      .withIndex("byStoreyId", (q) => q.eq("storeyId", storey._id))
      .collect();

    if (spaces.length === 0) {
      return { message: "No spaces found, no exterior walls added." };
    }

    const allSegments: Segment[] = [];
    for (const space of spaces) {
      const polygon = space.polygon;
      if (!polygon || polygon.length < 3) {
        // console.warn(\`Space ${space._id} has invalid polygon, skipping.\`);
        continue;
      }
      for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];
        if (!p1 || p1.length !== 2 || !p2 || p2.length !== 2) {
          // console.warn(\`Space ${space._id} has invalid point in polygon, skipping edge.\`);
          continue;
        }
        const normalized = normalizeEdge(p1, p2, space._id);
        if (normalized) {
          allSegments.push(normalized);
        }
      }
    }

    const finalExteriorSegments: Segment[] = [];
    for (const s1 of allSegments) {
      let partsOfS1CurrentlyConsideredExterior: Segment[] = [s1];

      for (const s2 of allSegments) {
        if (s1.spaceId === s2.spaceId) continue;
        if (s1.orientation !== s2.orientation) continue;

        let s2IsAtGapDistance = false;
        if (s1.orientation === "H") {
          if (
            Math.abs(Math.abs(s1.y1 - s2.y1) - GAP) <
            GAP_DISTANCE_CHECK_TOLERANCE
          ) {
            s2IsAtGapDistance = true;
          }
        } else {
          // 'V'
          if (
            Math.abs(Math.abs(s1.x1 - s2.x1) - GAP) <
            GAP_DISTANCE_CHECK_TOLERANCE
          ) {
            s2IsAtGapDistance = true;
          }
        }

        if (s2IsAtGapDistance) {
          // Check if normals are opposing for s2 to cover s1
          const areOpposingNormals =
            Math.abs(s1.nx + s2.nx) < EPSILON &&
            Math.abs(s1.ny + s2.ny) < EPSILON;

          if (areOpposingNormals) {
            // Only proceed if normals are opposing
            const nextPartsForS1: Segment[] = [];
            for (const currentPart of partsOfS1CurrentlyConsideredExterior) {
              let intervalCurrentPart: Interval;
              // Use a more generous fattening for the subtractor interval
              const SUBTRACTION_FATTENING_TOLERANCE = 0.045; // Try GAP / 2 for more aggressive fattening
              let intervalS2: Interval;

              if (s1.orientation === "H") {
                intervalCurrentPart = {
                  start: currentPart.x1,
                  end: currentPart.x2,
                };
                intervalS2 = {
                  start: s2.x1 - SUBTRACTION_FATTENING_TOLERANCE,
                  end: s2.x2 + SUBTRACTION_FATTENING_TOLERANCE,
                };
              } else {
                // s1.orientation === "V", s2.orientation will also be "V"
                intervalCurrentPart = {
                  start: currentPart.y1,
                  end: currentPart.y2,
                };
                intervalS2 = {
                  start: s2.y1 - SUBTRACTION_FATTENING_TOLERANCE,
                  end: s2.y2 + SUBTRACTION_FATTENING_TOLERANCE,
                };
              }

              const subtractedIntervals = subtractInterval(
                intervalCurrentPart,
                intervalS2
              );
              for (const sp of subtractedIntervals) {
                // Check if the subtracted part is valid (length > EPSILON already handled by subtractInterval)
                if (s1.orientation === "H") {
                  nextPartsForS1.push({
                    ...currentPart,
                    x1: sp.start,
                    x2: sp.end,
                  });
                } else {
                  // 'V'
                  nextPartsForS1.push({
                    ...currentPart,
                    y1: sp.start,
                    y2: sp.end,
                  });
                }
              }
            }
            partsOfS1CurrentlyConsideredExterior = nextPartsForS1;
            if (partsOfS1CurrentlyConsideredExterior.length === 0) break; // s1 fully covered
          } // end if(areOpposingNormals)
        } // end if(s2IsAtGapDistance)
      } // end loop for s2
      finalExteriorSegments.push(...partsOfS1CurrentlyConsideredExterior);
    } // end loop for s1

    // Filter out very short segments that are likely artifacts before further processing
    const MIN_EXTERIOR_SEGMENT_LENGTH = 0.005; // 5mm threshold
    const trulyFinalExteriorSegments = finalExteriorSegments.filter((seg) => {
      if (seg.orientation === "H") {
        return seg.x2 - seg.x1 > MIN_EXTERIOR_SEGMENT_LENGTH;
      } else {
        // 'V'
        return seg.y2 - seg.y1 > MIN_EXTERIOR_SEGMENT_LENGTH;
      }
    });

    const centerlineExteriorSegments = trulyFinalExteriorSegments.map((seg) => {
      const dx = seg.nx * HALF_EXTERIOR_WALL_THICKNESS;
      const dy = seg.ny * HALF_EXTERIOR_WALL_THICKNESS;
      return {
        ...seg,
        x1: roundToPrecision(seg.x1 + dx),
        y1: roundToPrecision(seg.y1 + dy),
        x2: roundToPrecision(seg.x2 + dx),
        y2: roundToPrecision(seg.y2 + dy),
      };
    });

    const mergedWalls: MergedWallInfo[] = [];

    // Merge Horizontal Segments
    const horizontalGroups = new Map<string, Segment[]>();
    for (const seg of centerlineExteriorSegments.filter(
      (s) => s.orientation === "H"
    )) {
      const key = seg.y1.toFixed(COORD_PRECISION); // Key by centerline y-coordinate
      if (!horizontalGroups.has(key)) horizontalGroups.set(key, []);
      horizontalGroups.get(key)!.push(seg);
    }
    for (const [y_key_str, segmentsAtLevel] of horizontalGroups) {
      const y_centerline = parseFloat(y_key_str);
      mergedWalls.push(
        ...mergeAxisAlignedCenterlineSegments(
          segmentsAtLevel,
          "H",
          y_centerline
        )
      );
    }

    // Merge Vertical Segments
    const verticalGroups = new Map<string, Segment[]>();
    for (const seg of centerlineExteriorSegments.filter(
      (s) => s.orientation === "V"
    )) {
      const key = seg.x1.toFixed(COORD_PRECISION); // Key by centerline x-coordinate
      if (!verticalGroups.has(key)) verticalGroups.set(key, []);
      verticalGroups.get(key)!.push(seg);
    }
    for (const [x_key_str, segmentsAtLevel] of verticalGroups) {
      const x_centerline = parseFloat(x_key_str);
      mergedWalls.push(
        ...mergeAxisAlignedCenterlineSegments(
          segmentsAtLevel,
          "V",
          x_centerline
        )
      );
    }

    // Adjust corners to meet properly
    for (let i = 0; i < mergedWalls.length; i++) {
      for (let j = i + 1; j < mergedWalls.length; j++) {
        const wallA = mergedWalls[i];
        const wallB = mergedWalls[j];

        let hWall: MergedWallInfo | null = null;
        let vWall: MergedWallInfo | null = null;

        if (wallA.orientation === "H" && wallB.orientation === "V") {
          hWall = wallA;
          vWall = wallB;
        } else if (wallA.orientation === "V" && wallB.orientation === "H") {
          hWall = wallB;
          vWall = wallA;
        }

        if (hWall && vWall) {
          const checkAndAdjustEndpoints = (epH_idx: 0 | 1, epV_idx: 0 | 1) => {
            const currentHWallLength = Math.abs(
              roundToPrecision(hWall!.end[0] - hWall!.start[0])
            );
            const currentVWallLength = Math.abs(
              roundToPrecision(vWall!.end[1] - vWall!.start[1])
            );

            if (
              currentHWallLength < MIN_LENGTH_FOR_MITER_ADJUSTMENT ||
              currentVWallLength < MIN_LENGTH_FOR_MITER_ADJUSTMENT
            ) {
              return;
            }

            const epH_centerline =
              epH_idx === 0
                ? hWall!.start.map((c) => roundToPrecision(c))
                : hWall!.end.map((c) => roundToPrecision(c));
            const epV_centerline =
              epV_idx === 0
                ? vWall!.start.map((c) => roundToPrecision(c))
                : vWall!.end.map((c) => roundToPrecision(c));

            let target_X_for_hWall = 0;
            let target_Y_for_vWall = 0;
            let shouldAdjust = false;

            const x_dist = Math.abs(epH_centerline[0] - epV_centerline[0]);
            const y_dist = Math.abs(epV_centerline[1] - epH_centerline[1]);
            const threshold =
              HALF_EXTERIOR_WALL_THICKNESS + GAP_DISTANCE_CHECK_TOLERANCE;

            if (x_dist < threshold && y_dist < threshold) {
              target_X_for_hWall = epV_centerline[0];
              target_Y_for_vWall = epH_centerline[1];
              shouldAdjust = true;
            }

            if (shouldAdjust) {
              const hWall_extension_sign = epH_idx === 1 ? 1 : -1;
              const hWall_x_adjustment = roundToPrecision(
                hWall_extension_sign * HALF_EXTERIOR_WALL_THICKNESS
              );

              const vWall_extension_sign = epV_idx === 1 ? 1 : -1;
              const vWall_y_adjustment = roundToPrecision(
                vWall_extension_sign * HALF_EXTERIOR_WALL_THICKNESS
              );

              if (epH_idx === 0) {
                hWall!.start[0] = roundToPrecision(
                  target_X_for_hWall + hWall_x_adjustment
                );
              } else {
                hWall!.end[0] = roundToPrecision(
                  target_X_for_hWall + hWall_x_adjustment
                );
              }

              if (epV_idx === 0) {
                vWall!.start[1] = roundToPrecision(
                  target_Y_for_vWall + vWall_y_adjustment
                );
              } else {
                vWall!.end[1] = roundToPrecision(
                  target_Y_for_vWall + vWall_y_adjustment
                );
              }
            }
          };

          checkAndAdjustEndpoints(1, 0); // H-end with V-start
          checkAndAdjustEndpoints(1, 1); // H-end with V-end
          checkAndAdjustEndpoints(0, 0); // H-start with V-start
          checkAndAdjustEndpoints(0, 1); // H-start with V-end
        }
      }
    }

    for (const wall of mergedWalls) {
      // Ensure start and end points are not identical (zero-length wall)
      if (
        Math.abs(wall.start[0] - wall.end[0]) < EPSILON &&
        Math.abs(wall.start[1] - wall.end[1]) < EPSILON
      ) {
        // console.warn("Skipping zero-length wall:", wall);
        continue;
      }
      await ctx.db.insert("walls", {
        storeyId: storey._id,
        start: wall.start.map((c) => roundToPrecision(c)),
        end: wall.end.map((c) => roundToPrecision(c)),
        height: storey.height,
        thickness: EXTERIOR_WALL_THICKNESS,
        type: "exterior",
        spaceIds: wall.spaceIds,
      });
    }

    return {
      message: `Exterior walls added: ${mergedWalls.length} wall segments created.`,
    };
  },
});

export const generateInteriorWalls = internalMutation({
  args: {
    storeyId: v.id("storey"),
  },
  handler: async (ctx, args) => {
    const { storeyId } = args;

    const storey = await ctx.db.get(storeyId);
    if (!storey)
      throw new Error("Storey not found for generating interior walls");

    const spaces = await ctx.db
      .query("spaces")
      .withIndex("byStoreyId", (q) => q.eq("storeyId", storeyId))
      .collect();

    if (spaces.length < 2) {
      // console.log("Not enough spaces to generate interior walls.");
      return { message: "Not enough spaces to generate interior walls." };
    }

    // --- Start of logic moved from addSpacesWithWalls ---
    const allSpaceSegments: Segment[] = [];
    for (const space of spaces) {
      const polygon = space.polygon;
      if (!polygon || polygon.length < 3) continue;
      for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];
        if (!p1 || p1.length !== 2 || !p2 || p2.length !== 2) continue;
        const normalized = normalizeEdge(p1, p2, space._id);
        if (normalized) {
          allSpaceSegments.push(normalized);
        }
      }
    }

    const interiorWallCandidates: Array<{
      startCoord: number;
      endCoord: number;
      fixedCoord: number;
      orientation: "H" | "V";
      spaceIds: [Id<"spaces">, Id<"spaces">];
    }> = [];

    for (let i = 0; i < allSpaceSegments.length; i++) {
      const s1 = allSpaceSegments[i];
      for (let j = i + 1; j < allSpaceSegments.length; j++) {
        const s2 = allSpaceSegments[j];

        if (s1.spaceId === s2.spaceId) continue;
        if (s1.orientation !== s2.orientation) continue;

        const areOpposing =
          Math.abs(s1.nx + s2.nx) < EPSILON &&
          Math.abs(s1.ny + s2.ny) < EPSILON;
        if (!areOpposing) continue;

        let areSeparatedByGap = false;
        let overlapStart = 0,
          overlapEnd = 0;
        let centerlineFixedCoord = 0;

        if (s1.orientation === "H") {
          if (Math.abs(Math.abs(s1.y1 - s2.y1) - GAP) < EPSILON) {
            areSeparatedByGap = true;
            overlapStart = Math.max(s1.x1, s2.x1);
            overlapEnd = Math.min(s1.x2, s2.x2);
            centerlineFixedCoord = (s1.y1 + s2.y1) / 2;
          }
        } else {
          if (Math.abs(Math.abs(s1.x1 - s2.x1) - GAP) < EPSILON) {
            areSeparatedByGap = true;
            overlapStart = Math.max(s1.y1, s2.y1);
            overlapEnd = Math.min(s1.y2, s2.y2);
            centerlineFixedCoord = (s1.x1 + s2.x1) / 2;
          }
        }

        if (areSeparatedByGap && overlapEnd > overlapStart + EPSILON) {
          const spaceIdPair = [s1.spaceId, s2.spaceId];
          spaceIdPair.sort();

          interiorWallCandidates.push({
            startCoord: overlapStart,
            endCoord: overlapEnd,
            fixedCoord: centerlineFixedCoord,
            orientation: s1.orientation,
            spaceIds: spaceIdPair as [Id<"spaces">, Id<"spaces">],
          });
        }
      }
    }

    const groupedCandidates = new Map<
      string,
      Array<(typeof interiorWallCandidates)[0]>
    >();
    for (const cand of interiorWallCandidates) {
      const snappedCenterlineFixedCoord =
        Math.round(cand.fixedCoord / 0.005) * 0.005;
      const key =
        cand.orientation + "-" + snappedCenterlineFixedCoord.toFixed(3);
      if (!groupedCandidates.has(key)) {
        groupedCandidates.set(key, []);
      }
      groupedCandidates.get(key)!.push(cand);
    }

    const INTERIOR_WALL_THICKNESS = GAP;
    const INTERIOR_MERGE_TOLERANCE = 0.015;

    let createdWallsCount = 0;
    for (const candidates of groupedCandidates.values()) {
      if (candidates.length === 0) continue;
      candidates.sort((a, b) => a.startCoord - b.startCoord);

      let currentMergedCandidate = candidates[0]; // Initialize with the first candidate
      let currentMerged = {
        startCoord: currentMergedCandidate.startCoord,
        endCoord: currentMergedCandidate.endCoord,
        fixedCoord: currentMergedCandidate.fixedCoord,
        orientation: currentMergedCandidate.orientation,
        allAdjacentSpaceIds: new Set<Id<"spaces">>(
          currentMergedCandidate.spaceIds
        ),
      };

      for (let i = 1; i < candidates.length; i++) {
        const nextCandidate = candidates[i];

        let performMerge = false;
        const gapBetweenCandidates =
          nextCandidate.startCoord - currentMerged.endCoord;

        if (gapBetweenCandidates <= INTERIOR_MERGE_TOLERANCE) {
          performMerge = true;
        } else if (Math.abs(gapBetweenCandidates - GAP) < EPSILON) {
          // Check if they share exactly one spaceId to confirm continuation
          const currentSpaceIds = currentMerged.allAdjacentSpaceIds;
          let sharedCount = 0;
          for (const id of nextCandidate.spaceIds) {
            if (currentSpaceIds.has(id)) {
              sharedCount++;
            }
          }
          if (
            sharedCount === 1 &&
            currentSpaceIds.size > 0 &&
            nextCandidate.spaceIds.length > 0
          ) {
            performMerge = true;
          }
        }

        if (performMerge) {
          currentMerged.endCoord = Math.max(
            currentMerged.endCoord,
            nextCandidate.endCoord
          );
          nextCandidate.spaceIds.forEach((id) =>
            currentMerged.allAdjacentSpaceIds.add(id)
          );
        } else {
          if (currentMerged.endCoord > currentMerged.startCoord + EPSILON) {
            const wallStart =
              currentMerged.orientation === "H"
                ? [currentMerged.startCoord, currentMerged.fixedCoord]
                : [currentMerged.fixedCoord, currentMerged.startCoord];
            const wallEnd =
              currentMerged.orientation === "H"
                ? [currentMerged.endCoord, currentMerged.fixedCoord]
                : [currentMerged.fixedCoord, currentMerged.endCoord];
            await ctx.db.insert("walls", {
              storeyId: storeyId,
              start: wallStart,
              end: wallEnd,
              height: storey.height,
              thickness: INTERIOR_WALL_THICKNESS,
              type: "interior",
              spaceIds: Array.from(currentMerged.allAdjacentSpaceIds),
            });
            createdWallsCount++;
          }
          currentMergedCandidate = nextCandidate;
          currentMerged = {
            startCoord: currentMergedCandidate.startCoord,
            endCoord: currentMergedCandidate.endCoord,
            fixedCoord: currentMergedCandidate.fixedCoord,
            orientation: currentMergedCandidate.orientation,
            allAdjacentSpaceIds: new Set<Id<"spaces">>(
              currentMergedCandidate.spaceIds
            ),
          };
        }
      }
      if (currentMerged.endCoord > currentMerged.startCoord + EPSILON) {
        const wallStart =
          currentMerged.orientation === "H"
            ? [currentMerged.startCoord, currentMerged.fixedCoord]
            : [currentMerged.fixedCoord, currentMerged.startCoord];
        const wallEnd =
          currentMerged.orientation === "H"
            ? [currentMerged.endCoord, currentMerged.fixedCoord]
            : [currentMerged.fixedCoord, currentMerged.endCoord];
        await ctx.db.insert("walls", {
          storeyId: storeyId,
          start: wallStart,
          end: wallEnd,
          height: storey.height,
          thickness: INTERIOR_WALL_THICKNESS,
          type: "interior",
          spaceIds: Array.from(currentMerged.allAdjacentSpaceIds),
        });
        createdWallsCount++;
      }
    }
    // --- End of logic moved from addSpacesWithWalls ---

    return {
      message: `Interior wall generation complete. ${createdWallsCount} interior wall segments created.`,
    };
  },
});
