import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

export default defineSchema({
  storey: defineTable({
    threadId: v.string(),
    name: v.optional(v.string()),
    version: v.optional(v.number()),
    units: v.union(v.literal("meters")),
    height: v.number(),
  }).index("byThreadId", ["threadId"]),

  spaces: defineTable({
    number: v.optional(v.number()),
    storeyId: v.id("storey"),
    name: v.string(),
    type: v.string(), // bedroom, bathroom, kitchen, etc.
    polygon: v.array(v.array(v.number())), // array of [x, y] points (2D floor plan)
  })
    .index("byStoreyAndNumberId", ["storeyId", "number"])
    .index("byStoreyId", ["storeyId"]),

  walls: defineTable({
    storeyId: v.id("storey"),
    start: v.array(v.number()), // [x,y] coordinate
    end: v.array(v.number()), // [x,y] coordinate
    height: v.number(),
    thickness: v.number(), // make always fixed to 0.35 for exterior walls and 0.09 for interior walls
    type: v.union(v.literal("exterior"), v.literal("interior")),
    spaceIds: v.array(v.id("spaces")),
  })
    .index("byStoreyId", ["storeyId"])
    .index("byStoreyIdAndType", ["storeyId", "type"]),

  doors: defineTable({
    storeyId: v.id("storey"),
    wallId: v.id("walls"),
    offset: v.number(), // distance from wall start
    width: v.number(), // make always fixed to 0.9m for interior doors and 1.2m for exterior doors
    height: v.number(), // make always fixed to 2.1m
    type: v.union(v.literal("interior"), v.literal("exterior")),
  })
    .index("byWallId", ["wallId"])
    .index("byStoreyId", ["storeyId"]),

  windows: defineTable({
    storeyId: v.id("storey"),
    wallId: v.id("walls"),
    offset: v.number(), // distance from wall start
    width: v.number(),
    height: v.number(),
    sillHeight: v.number(), // make always fixed to 1.2m
  })
    .index("byWallId", ["wallId"])
    .index("byStoreyId", ["storeyId"]),

  slabs: defineTable({
    storeyId: v.id("storey"),
    polygon: v.array(v.array(v.number())), // array of [x, y] points (2D floor plan)
  }).index("byStoreyId", ["storeyId"]),

  tts: defineTable({
    threadId: v.string(),
    message: v.string(),
    audioStorageId: v.id("_storage"),
    audioUrl: v.optional(v.string()),
  }).index("byThreadId", ["threadId"]),
});

export type Storey = Doc<"storey">;
export type Space = Doc<"spaces">;
export type Wall = Doc<"walls">;
export type Door = Doc<"doors">;
export type Window = Doc<"windows">;
