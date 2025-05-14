import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import {
  generateFloorPlan,
  GraphEdge,
} from "../app/lib/llm-floor-planner/generator";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

export const create = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const storeyId = await ctx.db.insert("storey", {
      threadId: args.threadId,
      units: "meters",
      height: 3,
    });

    // create settings
    await ctx.db.insert("settings", {
      storeyId,
      view: "perspective",
      showRawData: false,
    });

    return { storeyId };
  },
});
/// get entire storey with elements for a given storey id
export const byId = query({
  args: { storeyId: v.union(v.id("storey"), v.null()) },
  handler: async (ctx, args) => {
    if (!args.storeyId) return null;
    // const storey = await ctx.db.get(args.storeyId!);
    if (!args.storeyId) return null;

    const [storey, spaces, walls, doors, windows, slab] = await Promise.all([
      ctx.db.get(args.storeyId!),
      ctx.db
        .query("spaces")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", args.storeyId!))
        .collect(),
      ctx.db
        .query("walls")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", args.storeyId!))
        .collect(),
      ctx.db
        .query("doors")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", args.storeyId!))
        .collect(),
      ctx.db
        .query("windows")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", args.storeyId!))
        .collect(),
      ctx.db
        .query("slabs")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", args.storeyId!))
        .first(),
    ]);

    return {
      storey,
      spaces,
      walls,
      doors,
      windows,
      slab,
    };
  },
});

const initialSpaces = [
  {
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

const initialWalls = [
  {
    start: [0, 0],
    end: [3, 0],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["114"],
  },
  {
    start: [3, 0],
    end: [5, 0],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["110"],
  },
  {
    start: [5, 0],
    end: [10, 0],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["110"],
  },
  {
    start: [10, 0],
    end: [15, 0],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["112"],
  },
  {
    start: [10, 3],
    end: [15, 3],
    height: 3,
    thickness: 0.09,
    type: "interior",
    spaceIds: ["111", "112"],
  },
  {
    start: [0, 5],
    end: [3, 5],
    height: 3,
    thickness: 0.09,
    type: "interior",
    spaceIds: ["114", "113"],
  },
  {
    start: [3, 5],
    end: [5, 5],
    height: 3,
    thickness: 0.09,
    type: "interior",
    spaceIds: ["110", "113"],
  },
  {
    start: [10, 10],
    end: [15, 10],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["111"],
  },
  {
    start: [0, 13],
    end: [3, 13],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["113"],
  },
  {
    start: [3, 13],
    end: [5, 13],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["113"],
  },
  {
    start: [5, 13],
    end: [10, 13],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["109"],
  },
  {
    start: [0, 0],
    end: [0, 3],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["114"],
  },
  {
    start: [0, 3],
    end: [0, 5],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["114"],
  },
  {
    start: [0, 5],
    end: [0, 10],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["113"],
  },
  {
    start: [0, 10],
    end: [0, 13],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["113"],
  },
  {
    start: [3, 0],
    end: [3, 3],
    height: 3,
    thickness: 0.09,
    type: "interior",
    spaceIds: ["114", "110"],
  },
  {
    start: [3, 3],
    end: [3, 5],
    height: 3,
    thickness: 0.09,
    type: "interior",
    spaceIds: ["114", "110"],
  },
  {
    start: [10, 0],
    end: [10, 3],
    height: 3,
    thickness: 0.09,
    type: "interior",
    spaceIds: ["110", "112"],
  },
  {
    start: [10, 3],
    end: [10, 5],
    height: 3,
    thickness: 0.09,
    type: "interior",
    spaceIds: ["111", "110"],
  },
  {
    start: [10, 10],
    end: [10, 13],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["109"],
  },
  {
    start: [15, 0],
    end: [15, 3],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["112"],
  },
  {
    start: [15, 3],
    end: [15, 5],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["111"],
  },
  {
    start: [15, 5],
    end: [15, 10],
    height: 3,
    thickness: 0.35,
    type: "exterior",
    spaceIds: ["111"],
  },
];

const initialDoors = [
  {
    offset: 2.05,
    width: 0.9,
    height: 2.1,
    type: "interior",
  },
  {
    offset: 2.05,
    width: 0.9,
    height: 2.1,
    type: "interior",
  },
  {
    offset: 1.05,
    width: 0.9,
    height: 2.1,
    type: "interior",
  },
  {
    offset: 0.55,
    width: 0.9,
    height: 2.1,
    type: "interior",
  },
];

export const initializeExampleFloorPlan = internalMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const storeyId = await ctx.db.insert("storey", {
      threadId: args.threadId,
      height: 2.7,
      units: "meters",
    });

    // create spaces
    await Promise.all([
      initialSpaces.map((space, index) => {
        return ctx.db.insert("spaces", {
          storeyId,
          name: space.name,
          type: space.type,
          polygon: space.polygon,
          number: index + 1,
        });
      }),
    ]);

    const spaces = await ctx.db
      .query("spaces")
      .withIndex("byStoreyAndNumberId", (q) => q.eq("storeyId", storeyId))
      .collect();

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

    // @ts-expect-error ...
    const plan = generateFloorPlan(spaces, newGraph);

    await Promise.all([
      plan.walls.map((wall) => {
        return ctx.db.insert("walls", {
          type: wall.type as "exterior" | "interior",
          height: 2.7,
          start: wall.start,
          end: wall.end,
          thickness: wall.thickness,
          storeyId,
          spaceIds: wall.spaceIds as Id<"spaces">[],
        });
      }),
    ]);

    // const walls = await ctx.db
    //   .query("walls")
    //   .withIndex("byStoreyId", (q) => q.eq("storeyId", storeyId))
    //   .collect();

    // create doors
    // await Promise.all([
    //   initialDoors.map((door) => {
    //     return ctx.db.insert("doors", {
    //       storeyId,
    //       wallId: walls.find((wall) => wall.start === door.start && wall.end === door.end)!._id,
    //       offset: door.offset,
    //       width: door.width,
    //       height: door.height,
    //       type: door.type,
    //     });
    //   }),
    // ]);
  },
});

export const addWallBetweenRooms = internalMutation({
  args: {
    threadId: v.string(),
    roomNumberOne: v.number(),
    roomNumberTwo: v.number(),
    shouldAddDoorToNewWall: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const storey = await ctx.db
      .query("storey")
      .withIndex("byThreadId", (q) => q.eq("threadId", args.threadId))
      .first();

    const [roomOne, roomTwo, walls] = await Promise.all([
      ctx.db
        .query("spaces")
        .withIndex("byStoreyAndNumberId", (q) =>
          q.eq("storeyId", storey!._id).eq("number", args.roomNumberOne)
        )
        .first(),
      ctx.db
        .query("spaces")
        .withIndex("byStoreyAndNumberId", (q) =>
          q.eq("storeyId", storey!._id).eq("number", args.roomNumberTwo)
        )
        .first(),
      ctx.db
        .query("walls")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey!._id))
        .collect(),
    ]);

    if (!roomOne || !roomOne.polygon || !roomTwo || !roomTwo.polygon) {
      throw new Error(
        "One or both room documents are missing or lack polygon data."
      );
    }

    const existingWall = walls.find((it) => {
      if (it.type === "interior") {
        return (
          it.spaceIds.includes(roomOne!._id) &&
          it.spaceIds.includes(roomTwo!._id)
        );
      }
    });

    if (existingWall) {
      throw new Error("Wall already exists between rooms");
    }

    const poly1 = roomOne.polygon as Point[]; // Cast if necessary, ensure type safety
    const poly2 = roomTwo.polygon as Point[];

    const sharedEdge = findSharedEdge(poly1, poly2);

    if (!sharedEdge) {
      throw new Error(
        `Rooms "${roomOne.name}" and "${roomTwo.name}" do not share a common boundary edge or are not adjacent.`
      );
    }

    // Now use sharedEdge.start and sharedEdge.end for the new wall
    const wallId = await ctx.db.insert("walls", {
      type: "interior",
      height: 2.7,
      start: sharedEdge.start, // Calculated start point
      end: sharedEdge.end, // Calculated end point
      thickness: 0.09,
      storeyId: storey!._id, // Ensure storey is correctly obtained
      spaceIds: [roomOne._id, roomTwo._id], // Use actual room IDs
      // ... any other wall properties
    });

    if (args.shouldAddDoorToNewWall) {
      await ctx.runMutation(internal.storey.addDoorToWall, {
        threadId: args.threadId,
        roomNumberOne: args.roomNumberOne,
        roomNumberTwo: args.roomNumberTwo,
      });
    }

    return {
      wallId,
      message: `Wall between ${roomOne.name} and ${roomTwo.name} added.`,
    };
  },
});

export const removeDoorsFromWall = internalMutation({
  args: {
    threadId: v.string(),
    roomNumberOne: v.number(),
    roomNumberTwo: v.number(),
  },
  handler: async (ctx, args) => {
    const storey = await ctx.db
      .query("storey")
      .withIndex("byThreadId", (q) => q.eq("threadId", args.threadId))
      .first();

    const [roomOne, roomTwo, walls] = await Promise.all([
      ctx.db
        .query("spaces")
        .withIndex("byStoreyAndNumberId", (q) =>
          q.eq("storeyId", storey!._id).eq("number", args.roomNumberOne)
        )
        .first(),
      ctx.db
        .query("spaces")
        .withIndex("byStoreyAndNumberId", (q) =>
          q.eq("storeyId", storey!._id).eq("number", args.roomNumberTwo)
        )
        .first(),
      ctx.db
        .query("walls")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey!._id))
        .collect(),
    ]);

    const wall = walls.find((it) => {
      if (it.type === "interior") {
        return (
          it.spaceIds.includes(roomOne!._id) &&
          it.spaceIds.includes(roomTwo!._id)
        );
      }
    });

    if (!wall) {
      throw new Error(
        `There is no wall between rooms ${roomOne!.name} and ${roomTwo!.name}`
      );
    }

    const doors = await ctx.db
      .query("doors")
      .withIndex("byWallId", (q) => q.eq("wallId", wall!._id))
      .collect();

    await Promise.all(doors.map((it) => ctx.db.delete(it._id)));

    return {
      message: `Doors removed from wall between ${roomOne!.name} and ${
        roomTwo!.name
      }`,
    };
  },
});

export const addDoorToWall = internalMutation({
  args: {
    threadId: v.string(),
    roomNumberOne: v.optional(v.number()),
    roomNumberTwo: v.optional(v.number()),
    exceptRoomNumbers: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const storey = await ctx.db
      .query("storey")
      .withIndex("byThreadId", (q) => q.eq("threadId", args.threadId))
      .first();

    const [roomOne, roomTwo, walls] = await Promise.all([
      ctx.db
        .query("spaces")
        .withIndex("byStoreyAndNumberId", (q) =>
          q.eq("storeyId", storey!._id).eq("number", args.roomNumberOne)
        )
        .first(),
      ctx.db
        .query("spaces")
        .withIndex("byStoreyAndNumberId", (q) =>
          q.eq("storeyId", storey!._id).eq("number", args.roomNumberTwo)
        )
        .first(),
      ctx.db
        .query("walls")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey!._id))
        .collect(),
    ]);

    const wall = walls.find((it) => {
      if (it.type === "interior") {
        return (
          it.spaceIds.includes(roomOne!._id) &&
          it.spaceIds.includes(roomTwo!._id)
        );
      }
    });

    if (!wall) {
      throw new Error(
        `There is no wall between rooms ${roomOne!.name} and ${roomTwo!.name}`
      );
    }

    // Calculate wall length
    const [x1, y1] = wall.start;
    const [x2, y2] = wall.end;
    const wallLength = Math.hypot(x2 - x1, y2 - y1);
    const doorWidth = 0.9; // Standard interior door width
    // Place door in the middle
    const offset = (wallLength - doorWidth) / 2;

    const doorId = await ctx.db.insert("doors", {
      wallId: wall!._id,
      offset,
      width: doorWidth,
      height: 2.1,
      type: "interior",
      storeyId: storey!._id,
    });

    return {
      doorId,
      message: `Door added to wall between ${roomOne!.name} and ${
        roomTwo!.name
      }`,
    };
  },
});

export const addExteriorDoor = internalMutation({
  args: {
    threadId: v.string(),
    roomNumber: v.number(),
    wallOrientation: v.union(
      v.literal("left"),
      v.literal("right"),
      v.literal("top"),
      v.literal("bottom")
    ),
  },
  handler: async (ctx, args) => {
    const storey = await ctx.db
      .query("storey")
      .withIndex("byThreadId", (q) => q.eq("threadId", args.threadId))
      .first();
    if (!storey) throw new Error("Storey not found");

    // Get the room
    const room = await ctx.db
      .query("spaces")
      .withIndex("byStoreyAndNumberId", (q) =>
        q.eq("storeyId", storey._id).eq("number", args.roomNumber)
      )
      .first();
    if (!room) throw new Error("Room not found");

    // Find the two points for the requested wall side
    const poly = room.polygon;
    let idxA, idxB;
    if (args.wallOrientation === "left") {
      idxA = 0;
      idxB = poly.length - 1;
    } else if (args.wallOrientation === "right") {
      idxA = 1;
      idxB = 2;
    } else if (args.wallOrientation === "top") {
      idxA = 0;
      idxB = 1;
    } else if (args.wallOrientation === "bottom") {
      idxA = 2;
      idxB = 3;
    } else {
      throw new Error("Invalid wallOrientation");
    }
    const wallA = poly[idxA];
    const wallB = poly[idxB];

    // Find the exterior wall for this segment (regardless of order)
    const walls = await ctx.db
      .query("walls")
      .withIndex("byStoreyId", (q) => q.eq("storeyId", storey._id))
      .collect();

    const wall = walls.find(
      (w) =>
        w.type === "exterior" &&
        w.spaceIds.includes(room._id) &&
        ((pointsEqual(w.start as Point, wallA as Point) &&
          pointsEqual(w.end as Point, wallB as Point)) ||
          (pointsEqual(w.start as Point, wallB as Point) &&
            pointsEqual(w.end as Point, wallA as Point)))
    );
    if (!wall) throw new Error("Exterior wall not found for the given side");

    // Remove any windows on this wall
    const windows = await ctx.db
      .query("windows")
      .withIndex("byWallId", (q) => q.eq("wallId", wall._id))
      .collect();
    await Promise.all(windows.map((w) => ctx.db.delete(w._id)));

    // Insert exterior door in the middle of the wall
    const [x1, y1] = wall.start;
    const [x2, y2] = wall.end;
    const wallLength = Math.hypot(x2 - x1, y2 - y1);
    const doorWidth = 1.2;
    const doorHeight = 2.4;
    const offset = (wallLength - doorWidth) / 2;
    const doorId = await ctx.db.insert("doors", {
      wallId: wall._id,
      offset,
      width: doorWidth,
      height: doorHeight,
      type: "exterior",
      storeyId: storey._id,
    });

    return {
      doorId,
      message: `Exterior door added to wall (${args.wallOrientation}) of room ${room.name}.`,
    };
  },
});

export const removeWindows = internalMutation({
  args: {
    threadId: v.string(),
    roomNumbers: v.optional(v.array(v.number())),
    wallOrientation: v.optional(
      v.union(
        v.literal("left"),
        v.literal("right"),
        v.literal("top"),
        v.literal("bottom")
      )
    ),
  },
  handler: async (ctx, args) => {
    const storey = await ctx.db
      .query("storey")
      .withIndex("byThreadId", (q) => q.eq("threadId", args.threadId))
      .first();
    if (!storey) throw new Error("Storey not found");

    const [rooms, walls, windows] = await Promise.all([
      ctx.db
        .query("spaces")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey._id))
        .collect(),
      ctx.db
        .query("walls")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey._id))
        .collect(),
      ctx.db
        .query("windows")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey._id))
        .collect(),
    ]);

    let targetWalls: typeof walls = [];

    // Helper to get wall segment for a room and orientation
    function getWallForOrientation(room: any, orientation: string) {
      const poly = room.polygon;
      let idxA, idxB;
      if (orientation === "left") {
        idxA = 0;
        idxB = poly.length - 1;
      } else if (orientation === "right") {
        idxA = 1;
        idxB = 2;
      } else if (orientation === "top") {
        idxA = 0;
        idxB = 1;
      } else if (orientation === "bottom") {
        idxA = 2;
        idxB = 3;
      } else {
        return null;
      }
      const wallA = poly[idxA];
      const wallB = poly[idxB];
      return walls.find(
        (w) =>
          w.type === "exterior" &&
          w.spaceIds.includes(room._id) &&
          ((pointsEqual(w.start as Point, wallA as Point) &&
            pointsEqual(w.end as Point, wallB as Point)) ||
            (pointsEqual(w.start as Point, wallB as Point) &&
              pointsEqual(w.end as Point, wallA as Point)))
      );
    }

    if (
      args.roomNumbers &&
      args.roomNumbers.length > 0 &&
      args.wallOrientation
    ) {
      // Remove windows from the exterior wall(s) with the given orientation for each room
      const roomIds = rooms
        .filter(
          (r) =>
            typeof r.number === "number" && args.roomNumbers!.includes(r.number)
        )
        .map((r) => r._id);
      for (const room of rooms) {
        if (!roomIds.includes(room._id)) continue;
        const wall = getWallForOrientation(room, args.wallOrientation!);
        if (wall) targetWalls.push(wall);
      }
    } else if (args.roomNumbers && args.roomNumbers.length > 0) {
      // Remove windows from all exterior walls connected to these rooms
      const roomIds = rooms
        .filter(
          (r) =>
            typeof r.number === "number" && args.roomNumbers!.includes(r.number)
        )
        .map((r) => r._id);
      targetWalls = walls.filter(
        (w) =>
          w.type === "exterior" && w.spaceIds.some((id) => roomIds.includes(id))
      );
    } else if (args.wallOrientation) {
      // Remove windows from all exterior walls with the given orientation for all rooms
      for (const room of rooms) {
        const wall = getWallForOrientation(room, args.wallOrientation!);
        if (wall) targetWalls.push(wall);
      }
      // Remove duplicates
      targetWalls = targetWalls.filter(
        (w, i, arr) => arr.findIndex((w2) => w2._id === w._id) === i
      );
    } else {
      // Remove windows from all exterior walls
      targetWalls = walls.filter((w) => w.type === "exterior");
    }

    // Remove all windows for the target walls
    const windowsToRemove = windows.filter((w) =>
      targetWalls.some((wall) => wall._id === w.wallId)
    );
    await Promise.all(windowsToRemove.map((w) => ctx.db.delete(w._id)));

    return {
      message: `Removed ${windowsToRemove.length} windows from exterior walls.`,
    };
  },
});

export const updateWindows = internalMutation({
  args: {
    threadId: v.string(),
    roomNumbers: v.optional(v.array(v.number())),
    percentageOfWallAreaToCover: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const storey = await ctx.db
      .query("storey")
      .withIndex("byThreadId", (q) => q.eq("threadId", args.threadId))
      .first();
    if (!storey) throw new Error("Storey not found");

    const [rooms, walls, windows] = await Promise.all([
      ctx.db
        .query("spaces")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey._id))
        .collect(),
      ctx.db
        .query("walls")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey._id))
        .collect(),
      ctx.db
        .query("windows")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey._id))
        .collect(),
    ]);

    // Determine which walls to update windows for
    let targetWalls;
    if (args.roomNumbers && args.roomNumbers.length > 0) {
      // Find all walls related to the given rooms (exterior only)
      const roomIds = rooms
        .filter(
          (r) =>
            typeof r.number === "number" && args.roomNumbers!.includes(r.number)
        )
        .map((r) => r._id);
      targetWalls = walls.filter(
        (w) =>
          w.type === "exterior" && w.spaceIds.some((id) => roomIds.includes(id))
      );
    } else {
      // All exterior walls
      targetWalls = walls.filter((w) => w.type === "exterior");
    }

    // Remove all windows for the target walls
    const windowsToRemove = windows.filter((w) =>
      targetWalls.some((wall) => wall._id === w.wallId)
    );
    await Promise.all(windowsToRemove.map((w) => ctx.db.delete(w._id)));

    // Use provided percentage or default to 35%
    const percent =
      typeof args.percentageOfWallAreaToCover === "number"
        ? args.percentageOfWallAreaToCover
        : 0.35;

    // Standard window sizes
    const standardSizes = [
      { width: 0.91, height: 1.52 },
      { width: 1.02, height: 1.52 },
      { width: 1.22, height: 1.52 },
    ];

    // For each wall, add a window
    await Promise.all(
      targetWalls.map(async (wall) => {
        // Skip if this wall has an exterior door
        const doors = await ctx.db
          .query("doors")
          .withIndex("byWallId", (q) => q.eq("wallId", wall._id))
          .collect();
        if (doors.some((d) => d.type === "exterior")) return;
        // Calculate wall length
        const [x1, y1] = wall.start;
        const [x2, y2] = wall.end;
        const wallLength = Math.hypot(x2 - x1, y2 - y1);
        const wallHeight = wall.height;
        const wallArea = wallLength * wallHeight;
        const requiredArea = wallArea * percent;

        // Find the largest standard window that fits
        let chosen = null;
        for (const size of standardSizes) {
          if (size.width <= wallLength && size.height <= wallHeight) {
            chosen = size;
          }
        }
        let width, height;
        if (chosen) {
          width = chosen.width;
          height = chosen.height;
        } else {
          // If no standard size fits, use the largest that fits in wall
          width = Math.min(
            standardSizes[standardSizes.length - 1].width,
            wallLength
          );
          height = Math.min(standardSizes[0].height, wallHeight);
        }
        let windowArea = width * height;
        // If the area is not enough, extend width up to wall length
        if (windowArea < requiredArea) {
          width = Math.min(requiredArea / height, wallLength);
          windowArea = width * height;
        }
        // Place window in the middle of the wall
        const offset = (wallLength - width) / 2;
        await ctx.db.insert("windows", {
          storeyId: storey._id,
          wallId: wall._id,
          offset,
          width,
          height,
          sillHeight: 1.12,
        });
      })
    );

    return { message: "Windows updated for target walls." };
  },
});

export const addWindowsToWalls = internalMutation({
  args: {
    threadId: v.string(),
    roomNumbers: v.optional(v.array(v.number())),
    percentageOfWallAreaToCover: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const storey = await ctx.db
      .query("storey")
      .withIndex("byThreadId", (q) => q.eq("threadId", args.threadId))
      .first();

    const [rooms, walls, windows] = await Promise.all([
      ctx.db
        .query("spaces")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey!._id))
        .collect(),
      ctx.db
        .query("walls")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey!._id))
        .collect(),
      ctx.db
        .query("windows")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey!._id))
        .collect(),
    ]);

    // Helper to check if a wall already has a window
    function wallHasWindow(wallId: string) {
      return windows.some((w) => w.wallId === wallId);
    }

    // Determine which walls to add windows to
    let targetWalls;
    if (args.roomNumbers && args.roomNumbers.length > 0) {
      // Find all walls related to the given rooms (exterior only)
      const roomIds = rooms
        .filter(
          (r) =>
            typeof r.number === "number" && args.roomNumbers!.includes(r.number)
        )
        .map((r) => r._id);
      targetWalls = walls.filter(
        (w) =>
          w.type === "exterior" && w.spaceIds.some((id) => roomIds.includes(id))
      );
    } else {
      // All exterior walls
      targetWalls = walls.filter((w) => w.type === "exterior");
    }

    // Use provided percentage or default to 35%
    const percent =
      typeof args.percentageOfWallAreaToCover === "number"
        ? args.percentageOfWallAreaToCover
        : 0.35;

    // Standard window sizes
    const standardSizes = [
      { width: 0.91, height: 1.52 },
      { width: 1.02, height: 1.52 },
      { width: 1.22, height: 1.52 },
    ];

    // For each wall, add a window if it doesn't have one
    await Promise.all(
      targetWalls.map(async (wall) => {
        // Skip if this wall has an exterior door
        const doors = await ctx.db
          .query("doors")
          .withIndex("byWallId", (q) => q.eq("wallId", wall._id))
          .collect();
        if (doors.some((d) => d.type === "exterior")) return;
        if (wallHasWindow(wall._id)) return;
        // Calculate wall length
        const [x1, y1] = wall.start;
        const [x2, y2] = wall.end;
        const wallLength = Math.hypot(x2 - x1, y2 - y1);
        const wallHeight = wall.height;
        const wallArea = wallLength * wallHeight;
        const requiredArea = wallArea * percent;

        // Find the largest standard window that fits
        let chosen = null;
        for (const size of standardSizes) {
          if (size.width <= wallLength && size.height <= wallHeight) {
            chosen = size;
          }
        }
        let width, height;
        if (chosen) {
          width = chosen.width;
          height = chosen.height;
        } else {
          // If no standard size fits, use the largest that fits in wall
          width = Math.min(
            standardSizes[standardSizes.length - 1].width,
            wallLength
          );
          height = Math.min(standardSizes[0].height, wallHeight);
        }
        let windowArea = width * height;
        // If the area is not enough, extend width up to wall length
        if (windowArea < requiredArea) {
          width = Math.min(requiredArea / height, wallLength);
          windowArea = width * height;
        }
        // Place window in the middle of the wall
        const offset = (wallLength - width) / 2;
        await ctx.db.insert("windows", {
          storeyId: storey!._id,
          wallId: wall._id,
          offset,
          width,
          height,
          sillHeight: 1.12,
        });
      })
    );

    return { message: "Windows added to walls as requested." };
  },
});

export const removeExteriorWalls = internalMutation({
  args: {
    threadId: v.string(),
    roomNumbers: v.optional(v.array(v.number())),
    wallOrientation: v.optional(
      v.union(
        v.literal("left"),
        v.literal("right"),
        v.literal("top"),
        v.literal("bottom")
      )
    ),
  },
  handler: async (ctx, args) => {
    const storey = await ctx.db
      .query("storey")
      .withIndex("byThreadId", (q) => q.eq("threadId", args.threadId))
      .first();

    const [walls, doors, windows] = await Promise.all([
      ctx.db
        .query("walls")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey!._id))
        .collect(),
      ctx.db
        .query("doors")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey!._id))
        .collect(),
      ctx.db
        .query("windows")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey!._id))
        .collect(),
    ]);
    // remove walls and its doors and windows
    await Promise.all(
      walls.map(async (wall) => {
        if (wall.type !== "exterior") return;
        const doorsToDelete = doors.filter((d) => d.wallId === wall._id);
        const windowsToDelete = windows.filter((w) => w.wallId === wall._id);

        if (doorsToDelete.length > 0) {
          await Promise.all([
            ...doorsToDelete.map((d) => ctx.db.delete(d._id)),
          ]);
        }
        if (windowsToDelete.length > 0) {
          await Promise.all([
            ...windowsToDelete.map((w) => ctx.db.delete(w._id)),
          ]);
        }

        await ctx.db.delete(wall._id);
      })
    );

    return {
      message: `Removed ${walls.length} exterior walls.`,
    };
  },
});

export const removeWallBetweenRooms = internalMutation({
  args: {
    threadId: v.string(),
    roomNumberOne: v.number(),
    roomNumberTwo: v.number(),
  },
  handler: async (ctx, args) => {
    const storey = await ctx.db
      .query("storey")
      .withIndex("byThreadId", (q) => q.eq("threadId", args.threadId))
      .first();

    const [roomOne, roomTwo, walls] = await Promise.all([
      ctx.db
        .query("spaces")
        .withIndex("byStoreyAndNumberId", (q) =>
          q.eq("storeyId", storey!._id).eq("number", args.roomNumberOne)
        )
        .first(),
      ctx.db
        .query("spaces")
        .withIndex("byStoreyAndNumberId", (q) =>
          q.eq("storeyId", storey!._id).eq("number", args.roomNumberTwo)
        )
        .first(),
      ctx.db
        .query("walls")
        .withIndex("byStoreyId", (q) => q.eq("storeyId", storey!._id))
        .collect(),
    ]);

    const wall = walls.find((it) => {
      if (it.type === "interior") {
        return (
          it.spaceIds.includes(roomOne!._id) &&
          it.spaceIds.includes(roomTwo!._id)
        );
      }
    });

    if (!wall) {
      throw new Error(
        `There is no wall between rooms ${roomOne!.name} and ${roomTwo!.name}`
      );
    }

    await ctx.db.delete(wall!._id);
    // remove doors from the wall
    const doors = await ctx.db
      .query("doors")
      .withIndex("byWallId", (q) => q.eq("wallId", wall!._id))
      .collect();

    await Promise.all(doors.map((it) => ctx.db.delete(it._id)));

    return {
      deletedWallId: wall!._id,
      message: `Wall between ${roomOne!.name} and ${roomTwo!.name} removed.`,
    };
  },
});

type Point = [number, number];
function pointsEqual(a: Point, b: Point, tolerance: number = 1e-6): boolean {
  if (!a || !b) return false;
  return Math.abs(a[0] - b[0]) < tolerance && Math.abs(a[1] - b[1]) < tolerance;
}

// Define findSharedEdge if not already available
function findSharedEdge(
  poly1: Point[],
  poly2: Point[],
  tolerance: number = 1e-6
): { start: Point; end: Point } | null {
  if (!poly1 || poly1.length < 3 || !poly2 || poly2.length < 3) {
    // console.error("Invalid polygons provided to findSharedEdge."); // Consider logging if appropriate for your setup
    return null;
  }

  for (let i = 0; i < poly1.length; i++) {
    const p1_s = poly1[i];
    const p1_e = poly1[(i + 1) % poly1.length];

    if (pointsEqual(p1_s, p1_e, tolerance)) continue; // Skip zero-length edges from poly1

    for (let j = 0; j < poly2.length; j++) {
      const p2_s = poly2[j];
      const p2_e = poly2[(j + 1) % poly2.length];

      if (pointsEqual(p2_s, p2_e, tolerance)) continue; // Skip zero-length edges from poly2

      // Check for vertical line overlap
      if (
        Math.abs(p1_s[0] - p1_e[0]) < tolerance && // p1 is vertical
        Math.abs(p2_s[0] - p2_e[0]) < tolerance && // p2 is vertical
        Math.abs(p1_s[0] - p2_s[0]) < tolerance // p1 and p2 are on the same x-coordinate
      ) {
        const x = p1_s[0];
        const y1_min = Math.min(p1_s[1], p1_e[1]);
        const y1_max = Math.max(p1_s[1], p1_e[1]);
        const y2_min = Math.min(p2_s[1], p2_e[1]);
        const y2_max = Math.max(p2_s[1], p2_e[1]);

        const overlap_min_y = Math.max(y1_min, y2_min);
        const overlap_max_y = Math.min(y1_max, y2_max);

        if (overlap_max_y > overlap_min_y + tolerance) {
          const sharedStart: Point = [x, overlap_min_y];
          const sharedEnd: Point = [x, overlap_max_y];
          // Ensure non-zero length for the shared segment before returning
          if (!pointsEqual(sharedStart, sharedEnd, tolerance)) {
            return { start: sharedStart, end: sharedEnd };
          }
        }
      }
      // Check for horizontal line overlap
      else if (
        Math.abs(p1_s[1] - p1_e[1]) < tolerance && // p1 is horizontal
        Math.abs(p2_s[1] - p2_e[1]) < tolerance && // p2 is horizontal
        Math.abs(p1_s[1] - p2_s[1]) < tolerance // p1 and p2 are on the same y-coordinate
      ) {
        const y = p1_s[1];
        const x1_min = Math.min(p1_s[0], p1_e[0]);
        const x1_max = Math.max(p1_s[0], p1_e[0]);
        const x2_min = Math.min(p2_s[0], p2_e[0]);
        const x2_max = Math.max(p2_s[0], p2_e[0]);

        const overlap_min_x = Math.max(x1_min, x2_min);
        const overlap_max_x = Math.min(x1_max, x2_max);

        if (overlap_max_x > overlap_min_x + tolerance) {
          const sharedStart: Point = [overlap_min_x, y];
          const sharedEnd: Point = [overlap_max_x, y];
          // Ensure non-zero length for the shared segment before returning
          if (!pointsEqual(sharedStart, sharedEnd, tolerance)) {
            return { start: sharedStart, end: sharedEnd };
          }
        }
      }
    }
  }
  return null; // No shared edge found
}
