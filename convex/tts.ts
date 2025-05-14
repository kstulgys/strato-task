import {
  internalAction,
  internalMutation,
  mutation,
} from "./_generated/server";
import { v } from "convex/values";
import { OpenAI } from "openai";
import { internal } from "./_generated/api";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const create = internalAction({
  args: { text: v.string(), threadId: v.string() },
  handler: async (ctx, args) => {
    const response = await openai.audio.speech.create({
      model: "tts-1",
      input: args.text,
      voice: "ash",
      response_format: "mp3",
    });

    // Convert the response to a Buffer
    const blob = await response.blob();

    // Store the audio in Convex's file storage
    const storageId = await ctx.storage.store(blob);
    const url = await ctx.storage.getUrl(storageId);

    await ctx.runMutation(internal.tts.createTts, {
      text: args.text,
      threadId: args.threadId,
      storageId,
      audioUrl: url!,
    });
  },
});

export const createTts = internalMutation({
  args: {
    text: v.string(),
    threadId: v.string(),
    storageId: v.id("_storage"),
    audioUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("tts", {
      threadId: args.threadId,
      message: args.text,
      audioStorageId: args.storageId,
      audioUrl: args.audioUrl,
    });
  },
});

export const byThreadId = mutation({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tts")
      .filter((q) => q.eq(q.field("threadId"), args.threadId))
      .order("asc")
      .first();
  },
});
