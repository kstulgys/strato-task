import { Agent, createTool } from "@convex-dev/agent";
import { api, components, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { z } from "zod";
import { Id } from "./_generated/dataModel";

const supportAgent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o-mini"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
  instructions:
    "You are an expert architect and residential floor plan designer/consultant. Your tone is a little bit sarcastic but your answers should be very short and to the point. You must provide answers strictly based on your capabilities with existing tools.",
  // Used for fetching context messages.
  contextOptions: {
    // Whether to include tool messages in the context.
    includeToolCalls: false,
    // How many recent messages to include. These are added after the search
    // messages, and do not count against the search limit.
    recentMessages: 10,
    // Whether to search across other threads for relevant messages.
    // By default, only the current thread is searched.
    searchOtherThreads: true,
    // Options for searching messages.
    searchOptions: {
      // The maximum number of messages to fetch.
      limit: 100,
      // Whether to use text search to find messages.
      textSearch: true,
      // Whether to use vector search to find messages.
      vectorSearch: true,
      // Note, this is after the limit is applied.
      // E.g. this will quadruple the number of messages fetched.
      // (two before, and one after each message found in the search)
      messageRange: { before: 2, after: 1 },
    },
  },
  // // Used for storing messages.
  storageOptions: {
    // When false, allows you to pass in arbitrary context that will
    // be in addition to automatically fetched content.
    // Pass true to have all input messages saved to the thread history.
    saveAllInputMessages: false,
    // By default it saves the input message, or the last message if multiple are provided.
    saveAnyInputMessages: true,
    // Save the generated messages to the thread history.
    saveOutputMessages: true,
  },
  // // Used for limiting the number of steps when tool calls are involved.
  maxSteps: 10,
  // // Used for limiting the number of retries when a tool call fails.
  maxRetries: 3,
});

export const createThread = action({
  args: {},
  handler: async (ctx) => {
    const { threadId, thread } = await supportAgent.createThread(ctx, {});
    return { threadId, text: "" };
  },
});

export const continueThread = action({
  args: { prompt: v.string(), storeyId: v.id("storey"), threadId: v.string() },
  handler: async (ctx, { prompt, storeyId, threadId }) => {
    const { thread } = await supportAgent.continueThread(ctx, {
      threadId,
    });
    const result = await thread.generateText({
      prompt,
      tools: {
        addWallBetweenRoomsTool: addWallBetweenRoomsTool(storeyId),
        // removeWallBetweenRoomsTool: removeWallBetweenRoomsTool(threadId),
        // provideBOQSummaryTool: provideBOQSummaryTool(threadId),
        addInteriorDoorsTool: addInteriorDoorsTool(storeyId),
        providesGeneralAnswersAboutFloorPlanTool:
          providesGeneralAnswersAboutFloorPlanTool(storeyId),
        removeDoorsFromWallTool: removeDoorsFromWallTool(storeyId),
        addWindowsToWalls: addWindowsToWalls(storeyId),
        updateWindowsTool: updateWindowsTool(storeyId),
        addExteriorDoorTool: addExteriorDoorTool(storeyId),
        removeWindowsTool: removeWindowsTool(storeyId),
        removeExteriorWallsTool: removeExteriorWallsTool(storeyId),
        // addSpacesTool: addSpacesTool(threadId),
        addSpacesWithWallsTool: addSpacesWithWallsTool(storeyId),
        mergeSpacesTool: mergeSpacesTool(storeyId),
        removeSpacesTool: removeSpacesTool(storeyId),
        addExteriorWallsTool: addExteriorWallsTool(storeyId),

        addDoorsTool: addDoorsTool(storeyId),
        updateSettingsTool: updateSettingsTool(storeyId),
      },
    });

    // if (result.text) {
    //   await ctx.runAction(internal.tts.create, {
    //     threadId,
    //     text: result.text,
    //   });
    // }

    await ctx.scheduler.runAfter(0, internal.tts.create, {
      storeyId,
      threadId,
      text: result.text,
    });

    return result.text;
  },
});

export const getThreadMessages = query({
  args: { threadId: v.union(v.string(), v.null()) },
  handler: async (ctx, { threadId }) => {
    if (!threadId) return null;
    return await ctx.runQuery(components.agent.messages.getThreadMessages, {
      threadId,
      order: "asc",
      isTool: false,
    });
  },
});

export const updateSettingsTool = (storeyId: Id<"storey">) => {
  return createTool({
    description: "Updates the settings for the floor plan.",
    args: z.object({
      view: z.optional(
        z.union([z.literal("orthographic"), z.literal("perspective")])
      ),
      showRawData: z.optional(z.boolean()),
    }),
    handler: async (ctx, { view, showRawData }) => {
      await ctx.runMutation(internal.settings.update, {
        storeyId,
        view,
        showRawData,
      });
      return "Settings updated successfully";
    },
  });
};

export const removeSpacesTool = (storeyId: Id<"storey">) => {
  return createTool({
    description: "Removes spaces with the given space numbers.",
    args: z.object({
      spaceNumbers: z.array(z.number()),
    }),
    handler: async (ctx, { spaceNumbers }) => {
      const response = (await ctx.runMutation(internal.spaces.removeSpaces, {
        threadId: ctx.threadId!,
        spaceNumbers,
      })) as {
        message: string;
      };
    },
  });
};

export const mergeSpacesTool = (storeyId: Id<"storey">) => {
  return createTool({
    description: "Merges spaces with the given space numbers.",
    args: z.object({
      spaceOneNumber: z.number(),
      spaceTwoNumber: z.number(),
    }),
    handler: async (ctx, { spaceOneNumber, spaceTwoNumber }) => {
      const response = (await ctx.runMutation(internal.spaces.mergeSpaces, {
        storeyId,
        spaceOneNumber,
        spaceTwoNumber,
      })) as {
        message: string;
      };

      return response;
    },
  });
};

export const addSpacesWithWallsTool = (storeyId: Id<"storey">) => {
  return createTool({
    description: "Adds spaces to the floor plan with walls.",
    args: z.object({
      referenceSpaceNumber: z.optional(z.number()),
      width: z.number(),
      length: z.number(),
      name: z.string(),
      placement: z.optional(
        z.union([
          z.literal("left"),
          z.literal("right"),
          z.literal("top"),
          z.literal("bottom"),
          z.literal("top-start"),
          z.literal("top-end"),
          z.literal("bottom-start"),
          z.literal("bottom-end"),
          z.literal("left-start"),
          z.literal("left-end"),
          z.literal("right-start"),
          z.literal("right-end"),
        ])
      ),
    }),
    handler: async (
      ctx,
      { referenceSpaceNumber, width, length, name, placement }
    ) => {
      const response = (await ctx.runMutation(
        internal.spaces.addSpacesWithWalls,
        {
          storeyId,
          referenceSpaceNumber,
          width,
          length,
          name,
          placement,
        }
      )) as {
        message: string;
      };

      return response;
    },
  });
};

export const addExteriorWallsTool = (storeyId: Id<"storey">) => {
  return createTool({
    description: "Adds exterior walls to the floor plan.",
    args: z.object({}),
    handler: async (ctx) => {
      const response = (await ctx.runMutation(internal.walls.addExteriorWalls, {
        storeyId,
      })) as {
        message: string;
      };

      return response;
    },
  });
};

export const addSpacesTool = (storeyId: Id<"storey">) => {
  return createTool({
    description:
      "Adds a space to the floor plan. If referenceRoomNumber is provided, the space will be added to the wall of the room with the given room number. If referenceRoomNumber is not provided, the space will be added to the floor plan as initial space.",
    args: z.object({
      referenceSpaceNumber: z.optional(z.number()),
      width: z.number(),
      length: z.number(),
      name: z.string(),
      placement: z.optional(
        z.union([
          z.literal("top-start"),
          z.literal("top"),
          z.literal("top-end"),
          z.literal("right-start"),
          z.literal("right"),
          z.literal("right-end"),
          z.literal("bottom-start"),
          z.literal("bottom"),
          z.literal("bottom-end"),
          z.literal("left-start"),
          z.literal("left"),
          z.literal("left-end"),
        ])
      ),
    }),
    handler: async (
      ctx,
      { referenceSpaceNumber, width, length, name, placement }
    ) => {
      const response = (await ctx.runMutation(internal.spaces.addSpaces, {
        storeyId,
        referenceSpaceNumber,
        width,
        length,
        name,
        placement,
      })) as {
        spaceId: Id<"spaces">;
        polygon: number[][];
        message: string;
      };

      return response;
    },
  });
};

export const addDoorsTool = (storeyId: Id<"storey">) => {
  return createTool({
    description:
      "Adds doors to the floor plan between the spaces with the given space numbers.",
    args: z.object({
      spaceNumbers: z.array(z.number()),
    }),
    handler: async (ctx, { spaceNumbers }) => {
      const response = (await ctx.runMutation(internal.doors.addDoors, {
        storeyId,
        spaceNumbers,
      })) as {
        message: string;
      };

      return response;
    },
  });
};

export const removeWindowsTool = (storeyId: Id<"storey">) => {
  return createTool({
    description: "Removes windows from the floor plan.",
    args: z.object({
      roomNumbers: z.array(z.number()),
      wallOrientation: z.optional(
        z.union([
          z.literal("left"),
          z.literal("right"),
          z.literal("top"),
          z.literal("bottom"),
        ])
      ),
    }),
    handler: async (ctx, { roomNumbers, wallOrientation }) => {
      const response = (await ctx.runMutation(internal.storey.removeWindows, {
        threadId: ctx.threadId!,
        roomNumbers,
        wallOrientation,
      })) as {
        message: string;
      };

      return response;
    },
  });
};

export const addExteriorDoorTool = (storeyId: Id<"storey">) => {
  return createTool({
    description:
      "Adds an exterior door to the wall by room number and wall wall orientation.",
    args: z.object({
      roomNumber: z.number(),
      wallOrientation: z.union([
        z.literal("left"),
        z.literal("right"),
        z.literal("top"),
        z.literal("bottom"),
      ]),
    }),
    handler: async (ctx, { roomNumber, wallOrientation }) => {
      const response = (await ctx.runMutation(internal.storey.addExteriorDoor, {
        threadId: ctx.threadId!,
        roomNumber,
        wallOrientation,
      })) as {
        message: string;
      };

      return response;
    },
  });
};

export const removeExteriorWallsTool = (storeyId: Id<"storey">) => {
  return createTool({
    description:
      "Removes exterior walls from the floor plan. If roomNumbers and wallOrientation not provided then will remove all exterior walls with windows and doors from project.",
    args: z.object({
      roomNumbers: z.optional(z.array(z.number())),
      wallOrientation: z.optional(
        z.union([
          z.literal("left"),
          z.literal("right"),
          z.literal("top"),
          z.literal("bottom"),
        ])
      ),
    }),
    handler: async (ctx, { roomNumbers, wallOrientation }) => {
      const response = (await ctx.runMutation(
        internal.storey.removeExteriorWalls,
        {
          threadId: ctx.threadId!,
          roomNumbers,
          wallOrientation,
        }
      )) as {
        message: string;
      };

      return response;
    },
  });
};

export const updateWindowsTool = (storeyId: Id<"storey">) => {
  return createTool({
    description: "Updates the windows in the floor plan.",
    args: z.object({
      roomNumbers: z.array(z.number()),
      percentageOfWallAreaToCover: z.optional(z.number()),
    }),
    handler: async (ctx, { roomNumbers, percentageOfWallAreaToCover }) => {
      const response = (await ctx.runMutation(internal.storey.updateWindows, {
        threadId: ctx.threadId!,
        roomNumbers,
        percentageOfWallAreaToCover,
      })) as {
        message: string;
      };

      return response;
    },
  });
};

export const removeWallBetweenRoomsTool = (storeyId: Id<"storey">) => {
  return createTool({
    description: `Removes a wall between two rooms with the given room numbers.`,
    args: z.object({
      roomNumberOne: z.number(),
      roomNumberTwo: z.number(),
    }),
    handler: async (ctx, { roomNumberOne, roomNumberTwo }) => {
      const response = (await ctx.runMutation(
        internal.storey.removeWallBetweenRooms,
        {
          threadId: ctx.threadId!,
          roomNumberOne,
          roomNumberTwo,
        }
      )) as {
        deletedWallId: Id<"walls">;
        message: string;
      };

      return response;
    },
  });
};

export const removeDoorsFromWallTool = (storeyId: Id<"storey">) => {
  return createTool({
    description: `Removes doors from a wall between two rooms with the given room numbers.`,
    args: z.object({
      roomNumberOne: z.number(),
      roomNumberTwo: z.number(),
    }),
    handler: async (ctx, { roomNumberOne, roomNumberTwo }) => {
      const response = (await ctx.runMutation(
        internal.storey.removeDoorsFromWall,
        {
          threadId: ctx.threadId!,
          roomNumberOne,
          roomNumberTwo,
        }
      )) as {
        message: string;
      };

      return response;
    },
  });
};

export const addWindowsToWalls = (storeyId: Id<"storey">) => {
  return createTool({
    description: `Adds windows to the walls of the given room numbers or to all exterior walls.`,
    args: z.object({
      roomNumbers: z.array(z.number()),
      percentageOfWallAreaToCover: z.optional(z.number()),
    }),
    handler: async (ctx, { roomNumbers, percentageOfWallAreaToCover }) => {
      const response = (await ctx.runMutation(
        internal.storey.addWindowsToWalls,
        {
          threadId: ctx.threadId!,
          roomNumbers,
          percentageOfWallAreaToCover,
        }
      )) as {
        message: string;
      };

      return response;
    },
  });
};

// export const providesBOQSummaryTool = (threadId: string) => {
//   return createTool({
//     description:
//       "Provides a summary of the BOQ. User might provide a specific requirements for the BOQ. Response must be in markdown format with table/tables.",
//     args: z.object({
//       clarification: z.optional(z.string()),
//     }),
//     handler: async (ctx, args) => {
//       const storey = await ctx.runQuery(api.storey.byThreadId, {
//         threadId,
//       });

//       if (!storey) {
//         throw new Error("Storey not found");
//       }

// const prompt = `
//   Provide a summary of the BOQ for the following floor plan.

//   ${JSON.stringify(storey, null, 2)}

//   ${args.clarification || ""}

//   Response must be in markdown format.
// `;

//       const { text } = (await generateText({
//         model: openai("gpt-4.1"),
//         prompt,
//       })) as { text: string };

//       return text;
//     },
//   });
// };

export const providesGeneralAnswersAboutFloorPlanTool = (
  storeyId: Id<"storey">
) => {
  return createTool({
    description:
      "Provides general answers about the floor plan. User might ask about the floor plan, the rooms, the walls, the doors, the windows, etc.",
    args: z.object({
      prompt: z.string(),
    }),
    handler: async (ctx, args) => {
      const storey = await ctx.runQuery(api.storey.byId, {
        storeyId,
      });

      if (!storey) {
        throw new Error("Storey not found");
      }

      const prompt = `
        This is a floor plan with all the elements, properties and 2D coordinates.

        ${JSON.stringify(storey, null, 2)}

        ${args.prompt}
      `;

      const { text } = (await generateText({
        model: openai("gpt-4.1"),
        prompt,
      })) as { text: string };

      return text;
    },
  });
};

export const addWallBetweenRoomsTool = (storeyId: Id<"storey">) => {
  return createTool({
    description: "Adds a wall between two rooms with the given room numbers.",
    args: z.object({
      roomNumberOne: z.number(),
      roomNumberTwo: z.number(),
    }),
    handler: async (ctx, { roomNumberOne, roomNumberTwo }) => {
      const response = (await ctx.runMutation(
        internal.storey.addWallBetweenRooms,
        {
          threadId: ctx.threadId!,
          roomNumberOne,
          roomNumberTwo,
        }
      )) as {
        wallId: Id<"walls">;
        message: string;
      };

      return response;
    },
  });
};

export const addInteriorDoorsTool = (storeyId: Id<"storey">) => {
  return createTool({
    description: "Adds interior door to a wall that separates 2 rooms",
    args: z.object({
      roomNumberOne: z.number(),
      roomNumberTwo: z.number(),
    }),
    handler: async (ctx, { roomNumberOne, roomNumberTwo }) => {
      const response = (await ctx.runMutation(internal.storey.addDoorToWall, {
        threadId: ctx.threadId!,
        roomNumberOne,
        roomNumberTwo,
      })) as {
        doorId: Id<"doors">;
        message: string;
      };

      return response;
    },
  });
};

export const addOrReplaceDoorTool = (storeyId: Id<"storey">) => {
  return createTool({
    description:
      "Adds all or replaces all doors in the floor plan with the default parameters.",
    args: z.object({}),
    handler: async (ctx) => {},
  });
};

// const generateRandomFloorPlan = (threadId: string) => {
//   return createTool({
//     description: "Generates a floor plan.",
//     args: z.object({
//       prompt: z.optional(z.string()),
//     }),
//     handler: async (ctx, { prompt }) => {
//       const finalPrompt = `${FLOOR_PLAN_STRUCTURE} ${prompt}`;
//       const { thread } = await supportAgent.continueThread(ctx, { threadId });
//       const result = await thread.generateText({ prompt: finalPrompt });
//       const jsonToParse = result.text.replace("```json", "").replace("```", "");
//       const json = JSON.parse(jsonToParse) as any;

//       console.log({ json });

//       await ctx.runMutation(internal.agent.createFloorPlan, {
//         threadId,
//         json,
//       });
//       return json;
//     },
//   });
// };

// export const updateFloorPlan = (threadId: string) => {
//   return createTool({
//     description: "Updates a floor plan.",
//     args: z.object({
//       prompt: z.string(),
//     }),
//     handler: async (ctx, { prompt }) => {
//       const floorPlan = await ctx.runQuery(
//         internal.agent.floorPlanByThreadIdInternal,
//         {
//           threadId,
//         }
//       );
//       if (!floorPlan) {
//         throw new Error("Floor plan not found");
//       }

//       const { _id, _creationTime, threadId: tId, ...rest } = floorPlan;

//       const finalPrompt = `
//       ${prompt}

//       ${GENERAL_FLOOR_PLAN_RULES_PROMPT}

//       This is my current floor plan: ${JSON.stringify(rest, null, 2)}

//       ${FLOOR_PLAN_STRUCTURE}
//        `;
//       const { thread } = await supportAgent.continueThread(ctx, { threadId });
//       const result = await thread.generateText({ prompt: finalPrompt });
//       const jsonToParse = result.text.replace("```json", "").replace("```", "");
//       const json = JSON.parse(jsonToParse) as any;

//       console.log({ json });

//       await ctx.runMutation(internal.agent.updateFloorPlanByThreadId, {
//         threadId,
//         json,
//       });
//       return json;
//     },
//   });
// };

// export const createFloorPlan = internalMutation({
//   args: { threadId: v.string(), json: v.any() },
//   handler: async (ctx, { threadId, json }) => {
//     return await ctx.db.insert("floorPlans", {
//       threadId,
//       ...json,
//     });
//   },
// });

// export const updateFloorPlanByThreadId = internalMutation({
//   args: { threadId: v.string(), json: v.any() },
//   handler: async (ctx, { threadId, json }) => {
//     const result = await ctx.db
//       .query("floorPlans")
//       .filter((q) => q.eq(q.field("threadId"), threadId))
//       .first();

//     if (!result) {
//       throw new Error("Floor plan not found");
//     }
//     return await ctx.db.patch(result._id, {
//       ...json,
//     });
//   },
// });

// export const floorPlanByThreadIdInternal = internalQuery({
//   args: { threadId: v.union(v.string(), v.null()) },
//   handler: async (ctx, { threadId }) => {
//     if (!threadId) return null;
//     return await ctx.db
//       .query("floorPlans")
//       .filter((q) => q.eq(q.field("threadId"), threadId))
//       .first();
//   },
// });
