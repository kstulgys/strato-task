import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

export const get = query({
  args: { storeyId: v.union(v.id("storey"), v.null()) },
  handler: async (ctx, args) => {
    if (!args.storeyId) return null;
    const settings = await ctx.db
      .query("settings")
      .withIndex("byStoreyId", (q) => q.eq("storeyId", args.storeyId!))
      .first();
    return settings;
  },
});

export const update = internalMutation({
  args: {
    storeyId: v.id("storey"),
    view: v.optional(
      v.union(v.literal("orthographic"), v.literal("perspective"))
    ),
    showRawData: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("byStoreyId", (q) => q.eq("storeyId", args.storeyId))
      .first();
    if (!settings) {
      return { error: "Settings not found" };
    }
    await ctx.db.patch(settings._id, {
      view: args.view || settings.view,
      showRawData: args.showRawData || settings.showRawData,
    });
  },
});
