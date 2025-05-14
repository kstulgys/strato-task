// import type {
//   Space,
//   DoorPreset,
//   FloorPlan,
//   Vec2,
//   Wall,
//   Window,
//   Door,
//   WallPreset,
//   WindowPreset,
//   SpacePreset,
// } from "./types";

import type { Id } from "convex/_generated/dataModel";
import type { Door, Space, Storey, Wall, Window } from "convex/schema";

// export const exteriorWallPresets: WallPreset[] = [
//   {
//     name: "Brick-Insulation-Concrete",
//     type: "exterior",
//     layers: [
//       { material: "brick", thickness: 0.12, color: "#b22222" },
//       { material: "insulation", thickness: 0.08, color: "#ffffcc" },
//       { material: "concrete", thickness: 0.16, color: "#cccccc" },
//     ],
//   },
//   {
//     name: "Concrete-Insulation-Brick",
//     type: "exterior",
//     layers: [
//       { material: "concrete", thickness: 0.15, color: "#cccccc" },
//       { material: "insulation", thickness: 0.1, color: "#ffffcc" },
//       { material: "brick", thickness: 0.1, color: "#b22222" },
//     ],
//   },
//   {
//     name: "Aerated Block-Insulation-Brick",
//     type: "exterior",
//     layers: [
//       { material: "aerated block", thickness: 0.2, color: "#e0e0e0" },
//       { material: "insulation", thickness: 0.1, color: "#ffffcc" },
//       { material: "brick", thickness: 0.12, color: "#b22222" },
//     ],
//   },
// ];

// export const interiorWallPresets: WallPreset[] = [
//   {
//     name: "Gypsum Board Partition",
//     type: "interior",
//     layers: [{ material: "gypsum board", thickness: 0.1, color: "#f5f5dc" }],
//   },
//   {
//     name: "Brick Partition",
//     type: "interior",
//     layers: [{ material: "brick", thickness: 0.12, color: "#b22222" }],
//   },
//   {
//     name: "Double Gypsum Board with Insulation",
//     type: "interior",
//     layers: [
//       {
//         material: "gypsum board",
//         thickness: 0.0125,
//         color: "#f5f5dc",
//         notes: "outer layer",
//       },
//       { material: "insulation", thickness: 0.05, color: "#ffffcc" },
//       {
//         material: "gypsum board",
//         thickness: 0.0125,
//         color: "#f5f5dc",
//         notes: "inner layer",
//       },
//     ],
//   },
// ];

// export function createWallFromPreset(
//   preset: WallPreset,
//   start: Vec2,
//   end: Vec2,
//   height: number,
//   spaces: string[]
// ): Wall {
//   return {
//     _id: crypto.randomUUID(),
//     start,
//     end,
//     height,
//     layers: preset.layers.map((layer) => ({ ...layer })), // deep copy
//     spaces,
//     type: preset.type,
//   };
// }

// export const windowPresets: WindowPreset[] = [
//   {
//     name: "Standard Double Casement",
//     type: "double",
//     width: 1.2,
//     height: 1.2,
//     sillHeight: 0.9,
//     frameMaterial: "PVC",
//     glazing: "double",
//     color: "#ffffff",
//     notes: "Most common for living rooms and bedrooms",
//   },
//   {
//     name: "Sliding Balcony Door",
//     type: "sliding",
//     width: 2.0,
//     height: 2.1,
//     sillHeight: 0.0,
//     frameMaterial: "aluminum",
//     glazing: "double",
//     color: "#cccccc",
//     notes: "Used for balconies and patios",
//   },
//   {
//     name: "Fixed Bathroom Window",
//     type: "fixed",
//     width: 0.6,
//     height: 0.6,
//     sillHeight: 1.5,
//     frameMaterial: "PVC",
//     glazing: "frosted single",
//     color: "#ffffff",
//     notes: "Privacy glass, does not open",
//   },
// ];

// function createWindowFromPreset(
//   preset: WindowPreset,
//   wallId: string,
//   position: number,
//   custom?: Partial<Omit<Window, "_id" | "wallId" | "position">>
// ): Window {
//   return {
//     _id: crypto.randomUUID(),
//     wallId,
//     position,
//     width: preset.width,
//     height: preset.height,
//     sillHeight: preset.sillHeight,
//     type: preset.type,
//     frameMaterial: preset.frameMaterial,
//     glazing: preset.glazing,
//     color: preset.color,
//     notes: preset.notes,
//     ...custom, // allows for optional overrides
//   };
// }

// export const doorPresets: DoorPreset[] = [
//   {
//     name: "Standard Interior Door",
//     type: "single",
//     locationType: "interior",
//     width: 0.9,
//     height: 2.1,
//     frameMaterial: "wood",
//     color: "#f5f5dc",
//     notes: "Most common for rooms and bathrooms",
//   },
//   {
//     name: "Double Entry Door",
//     type: "double",
//     locationType: "exterior",
//     width: 1.6,
//     height: 2.1,
//     frameMaterial: "steel",
//     color: "#333333",
//     notes: "Main entrance, double leaf",
//   },
//   {
//     name: "Sliding Balcony Door",
//     type: "sliding",
//     locationType: "exterior",
//     width: 1.8,
//     height: 2.1,
//     frameMaterial: "aluminum",
//     color: "#cccccc",
//     notes: "Balcony or patio access",
//   },
// ];

// export function createDoorFromPreset(
//   preset: DoorPreset,
//   wallId: string,
//   position: number,
//   custom?: Partial<Omit<Door, "_id" | "wallId" | "position">>
// ): Door {
//   return {
//     _id: crypto.randomUUID(),
//     wallId,
//     position,
//     width: preset.width,
//     height: preset.height,
//     type: preset.type,
//     locationType: preset.locationType, // <--- NEW
//     frameMaterial: preset.frameMaterial,
//     color: preset.color,
//     notes: preset.notes,
//     ...custom,
//   };
// }

// export const spacePresets: SpacePreset[] = [
//   {
//     name: "Living Room",
//     defaultArea: 22,
//     defaultCeilingHeight: 2.7,
//     minArea: 16,
//     maxArea: 40,
//     notes: "Main social area, often largest room",
//   },
//   {
//     name: "Kitchen",
//     defaultArea: 10,
//     defaultCeilingHeight: 2.7,
//     minArea: 7,
//     maxArea: 20,
//     notes: "Cooking and food preparation",
//   },
//   {
//     name: "Bedroom",
//     defaultArea: 12,
//     defaultCeilingHeight: 2.7,
//     minArea: 8,
//     maxArea: 20,
//     notes: "Sleeping area, can be master or secondary",
//   },
//   {
//     name: "Bathroom",
//     defaultArea: 5,
//     defaultCeilingHeight: 2.5,
//     minArea: 3,
//     maxArea: 10,
//     notes: "Toilet, shower, and/or bath",
//   },
//   {
//     name: "Hallway",
//     defaultArea: 8,
//     defaultCeilingHeight: 2.7,
//     minArea: 4,
//     maxArea: 15,
//     notes: "Circulation space",
//   },
//   {
//     name: "Storage",
//     defaultArea: 3,
//     defaultCeilingHeight: 2.5,
//     minArea: 1,
//     maxArea: 8,
//     notes: "Closet, pantry, or utility",
//   },
// ];

// export function createSpaceFromPreset(
//   preset: SpacePreset,
//   _id: string,
//   polygon: Vec2[],
//   floorHeight?: number
// ): Space {
//   return {
//     _id,
//     name: preset.name,
//     polygon,
//     floorHeight: floorHeight ?? 0,
//     ceilingHeight: preset.defaultCeilingHeight,
//   };
// }

// // Removing the entire old example block to prevent redeclaration errors.
// // Start of new floor plan example data generation
// const newExtWallPreset = exteriorWallPresets[0];
// const newIntWallPreset = interiorWallPresets[0];
// const newEntryDoorPreset =
//   doorPresets.find((d) => d.name === "Double Entry Door") ?? doorPresets[1];
// const newInteriorDoorPreset =
//   doorPresets.find((d) => d.name === "Standard Interior Door") ??
//   doorPresets[0];
// const newLivingWindowPreset =
//   windowPresets.find((w) => w.name === "Standard Double Casement") ??
//   windowPresets[0];
// const newBedroomWindowPreset =
//   windowPresets.find((w) => w.name === "Standard Double Casement") ??
//   windowPresets[0];
// const newKitchenWindowPreset =
//   windowPresets.find((w) => w.name === "Standard Double Casement") ??
//   windowPresets[0];
// const newBathroomWindowPreset =
//   windowPresets.find((w) => w.name === "Fixed Bathroom Window") ??
//   windowPresets[2];

// const designWallHeight = 2.7;

type FloorPlan = {
  storey: Omit<Storey, "_id" | "_creationTime">[];
  spaces: (Omit<Space, "_id" | "_creationTime" | "storeyId"> & {
    storeyId: string;
    _id: string;
  })[];
  walls: (Omit<Wall, "_id" | "_creationTime" | "storeyId" | "spaceIds"> & {
    storeyId: string;
    spaceIds: string[];
    _id: string;
  })[];
  doors: (Omit<Door, "_id" | "_creationTime" | "storeyId" | "wallId"> & {
    storeyId: string;
    wallId: string;
    _id: string;
  })[];
  windows: (Omit<Window, "_id" | "_creationTime" | "storeyId" | "wallId"> & {
    storeyId: string;
    wallId: string;
    _id: string;
  })[];
};

export const exampleFloorPlan: FloorPlan = {
  storey: [
    {
      threadId: "floor1",
      name: "Ground Floor",
      version: 1,
      units: "meters",
    },
  ],
  spaces: [
    {
      _id: "space1",
      storeyId: "floor1",
      name: "Living Room",
      type: "living",
      polygon: [
        [0, 3],
        [6, 3],
        [6, 8],
        [0, 8],
      ],
    },
    {
      _id: "space2",
      storeyId: "floor1",
      name: "Kitchen",
      type: "kitchen",
      polygon: [
        [6, 3],
        [10, 3],
        [10, 8],
        [6, 8],
      ],
    },
    {
      _id: "space3",
      storeyId: "floor1",
      name: "Dining Area",
      type: "dining",
      polygon: [
        [10, 3],
        [12, 3],
        [12, 8],
        [10, 8],
      ],
    },
    {
      _id: "space4",
      storeyId: "floor1",
      name: "Master Bedroom",
      type: "bedroom",
      polygon: [
        [0, 0],
        [5, 0],
        [5, 3],
        [0, 3],
      ],
    },
    {
      _id: "space5",
      storeyId: "floor1",
      name: "Bedroom 2",
      type: "bedroom",
      polygon: [
        [6, 0],
        [10, 0],
        [10, 3],
        [6, 3],
      ],
    },
    {
      _id: "space6",
      storeyId: "floor1",
      name: "Bathroom",
      type: "bathroom",
      polygon: [
        [10, 0],
        [12, 0],
        [12, 3],
        [10, 3],
      ],
    },
    {
      _id: "space7",
      storeyId: "floor1",
      name: "Entrance Hall",
      type: "hall",
      polygon: [
        [5, 0],
        [6, 0],
        [6, 3],
        [5, 3],
      ],
    },
  ],
  walls: [
    {
      _id: "wall1",
      storeyId: "floor1",
      start: [0, 0],
      end: [12, 0],
      height: 2.7,
      thickness: 0.25,
      type: "exterior",
      spaceIds: ["space4", "space7", "space5", "space6"],
    },
    {
      _id: "wall2",
      storeyId: "floor1",
      start: [12, 0],
      end: [12, 8],
      height: 2.7,
      thickness: 0.25,
      type: "exterior",
      spaceIds: ["space6", "space3"],
    },
    {
      _id: "wall3",
      storeyId: "floor1",
      start: [12, 8],
      end: [0, 8],
      height: 2.7,
      thickness: 0.25,
      type: "exterior",
      spaceIds: ["space1", "space2", "space3"],
    },
    {
      _id: "wall4",
      storeyId: "floor1",
      start: [0, 8],
      end: [0, 0],
      height: 2.7,
      thickness: 0.25,
      type: "exterior",
      spaceIds: ["space1", "space4"],
    },
    {
      _id: "wall5",
      storeyId: "floor1",
      start: [0, 3],
      end: [12, 3],
      height: 2.7,
      thickness: 0.15,
      type: "interior",
      spaceIds: [
        "space1",
        "space2",
        "space3",
        "space4",
        "space5",
        "space6",
        "space7",
      ],
    },
    {
      _id: "wall6",
      storeyId: "floor1",
      start: [6, 0],
      end: [6, 8],
      height: 2.7,
      thickness: 0.15,
      type: "interior",
      spaceIds: ["space1", "space2", "space5", "space7"],
    },
    {
      _id: "wall7",
      storeyId: "floor1",
      start: [5, 0],
      end: [5, 3],
      height: 2.7,
      thickness: 0.15,
      type: "interior",
      spaceIds: ["space4", "space7"],
    },
    {
      _id: "wall8",
      storeyId: "floor1",
      start: [10, 0],
      end: [10, 8],
      height: 2.7,
      thickness: 0.15,
      type: "interior",
      spaceIds: ["space2", "space3", "space5", "space6"],
    },
  ],
  doors: [
    {
      _id: "door1",
      storeyId: "floor1",
      wallId: "wall1",
      offset: 5.5,
      width: 1.0,
      height: 2.1,
      type: "exterior",
    },
    {
      _id: "door2",
      storeyId: "floor1",
      wallId: "wall5",
      offset: 3.0,
      width: 0.9,
      height: 2.1,
      type: "interior",
    },
    {
      _id: "door3",
      storeyId: "floor1",
      wallId: "wall5",
      offset: 8.0,
      width: 0.9,
      height: 2.1,
      type: "interior",
    },
    {
      _id: "door4",
      storeyId: "floor1",
      wallId: "wall5",
      offset: 11.0,
      width: 0.9,
      height: 2.1,
      type: "interior",
    },
    {
      _id: "door5",
      storeyId: "floor1",
      wallId: "wall6",
      offset: 5.0,
      width: 0.9,
      height: 2.1,
      type: "interior",
    },
    {
      _id: "door6",
      storeyId: "floor1",
      wallId: "wall7",
      offset: 1.5,
      width: 0.9,
      height: 2.1,
      type: "interior",
    },
    {
      _id: "door7",
      storeyId: "floor1",
      wallId: "wall8",
      offset: 1.5,
      width: 0.9,
      height: 2.1,
      type: "interior",
    },
    {
      _id: "door8",
      storeyId: "floor1",
      wallId: "wall8",
      offset: 5.0,
      width: 0.9,
      height: 2.1,
      type: "interior",
    },
  ],
  windows: [
    {
      _id: "window1",
      storeyId: "floor1",
      wallId: "wall1",
      offset: 2.5,
      width: 1.8,
      height: 1.5,
      sillHeight: 0.9,
    },
    {
      _id: "window2",
      storeyId: "floor1",
      wallId: "wall1",
      offset: 8.5,
      width: 1.8,
      height: 1.5,
      sillHeight: 0.9,
    },
    {
      _id: "window3",
      storeyId: "floor1",
      wallId: "wall2",
      offset: 2.0,
      width: 1.2,
      height: 1.5,
      sillHeight: 0.9,
    },
    {
      _id: "window4",
      storeyId: "floor1",
      wallId: "wall2",
      offset: 6.0,
      width: 1.8,
      height: 1.5,
      sillHeight: 0.9,
    },
    {
      _id: "window5",
      storeyId: "floor1",
      wallId: "wall3",
      offset: 3.0,
      width: 2.0,
      height: 1.5,
      sillHeight: 0.9,
    },
    {
      _id: "window6",
      storeyId: "floor1",
      wallId: "wall3",
      offset: 9.0,
      width: 2.0,
      height: 1.5,
      sillHeight: 0.9,
    },
    {
      _id: "window7",
      storeyId: "floor1",
      wallId: "wall4",
      offset: 2.0,
      width: 1.8,
      height: 1.5,
      sillHeight: 0.9,
    },
    {
      _id: "window8",
      storeyId: "floor1",
      wallId: "wall4",
      offset: 6.0,
      width: 1.8,
      height: 1.5,
      sillHeight: 0.9,
    },
  ],
};

export function generateSpacesByCategory(
  category: string,
  templateVariation: number,
  totalWidth: number,
  totalLength: number
) {
  // Create rooms based on selected category and variation
  let rooms: {
    name: string;
    x: number;
    y: number;
    width: number;
    length: number;
  }[] = [];

  if (category === "compact") {
    // COMPACT LAYOUTS (5 variations)
    switch (templateVariation) {
      case 0: // Studio apartment
        rooms = [
          {
            name: "Living Room",
            x: 0,
            y: 0,
            width: totalWidth * 0.7,
            length: totalLength * 0.65,
          },
          {
            name: "Kitchen",
            x: totalWidth * 0.7,
            y: 0,
            width: totalWidth * 0.3,
            length: totalLength * 0.4,
          },
          {
            name: "Bathroom",
            x: totalWidth * 0.7,
            y: totalLength * 0.4,
            width: totalWidth * 0.3,
            length: totalLength * 0.25,
          },
          {
            name: "Bedroom",
            x: 0,
            y: totalLength * 0.65,
            width: totalWidth * 0.6,
            length: totalLength * 0.35,
          },
          {
            name: "Hallway",
            x: totalWidth * 0.6,
            y: totalLength * 0.65,
            width: totalWidth * 0.4,
            length: totalLength * 0.35,
          },
        ];
        break;

      case 1: // 1-bedroom linear
        rooms = [
          {
            name: "Living Room",
            x: 0,
            y: 0,
            width: totalWidth * 0.5,
            length: totalLength,
          },
          {
            name: "Kitchen",
            x: totalWidth * 0.5,
            y: 0,
            width: totalWidth * 0.5,
            length: totalLength * 0.3,
          },
          {
            name: "Bathroom",
            x: totalWidth * 0.5,
            y: totalLength * 0.3,
            width: totalWidth * 0.2,
            length: totalLength * 0.3,
          },
          {
            name: "Hallway",
            x: totalWidth * 0.7,
            y: totalLength * 0.3,
            width: totalWidth * 0.3,
            length: totalLength * 0.3,
          },
          {
            name: "Bedroom",
            x: totalWidth * 0.5,
            y: totalLength * 0.6,
            width: totalWidth * 0.5,
            length: totalLength * 0.4,
          },
        ];
        break;

      case 2: // L-shaped studio
        rooms = [
          {
            name: "Living Room",
            x: 0,
            y: 0,
            width: totalWidth * 0.6,
            length: totalLength * 0.6,
          },
          {
            name: "Kitchen",
            x: totalWidth * 0.6,
            y: 0,
            width: totalWidth * 0.4,
            length: totalLength * 0.4,
          },
          {
            name: "Bathroom",
            x: totalWidth * 0.6,
            y: totalLength * 0.4,
            width: totalWidth * 0.4,
            length: totalLength * 0.2,
          },
          {
            name: "Bedroom",
            x: 0,
            y: totalLength * 0.6,
            width: totalWidth,
            length: totalLength * 0.4,
          },
        ];
        break;

      case 3: // Efficient 1-bedroom
        rooms = [
          {
            name: "Kitchen",
            x: 0,
            y: 0,
            width: totalWidth * 0.3,
            length: totalLength * 0.4,
          },
          {
            name: "Living Room",
            x: totalWidth * 0.3,
            y: 0,
            width: totalWidth * 0.7,
            length: totalLength * 0.5,
          },
          {
            name: "Bathroom",
            x: 0,
            y: totalLength * 0.4,
            width: totalWidth * 0.3,
            length: totalLength * 0.3,
          },
          {
            name: "Hallway",
            x: 0,
            y: totalLength * 0.7,
            width: totalWidth * 0.3,
            length: totalLength * 0.3,
          },
          {
            name: "Bedroom",
            x: totalWidth * 0.3,
            y: totalLength * 0.5,
            width: totalWidth * 0.7,
            length: totalLength * 0.5,
          },
        ];
        break;

      case 4: // Open concept studio
        rooms = [
          {
            name: "Living Room",
            x: 0,
            y: 0,
            width: totalWidth * 0.65,
            length: totalLength * 0.5,
          },
          {
            name: "Kitchen",
            x: 0,
            y: totalLength * 0.5,
            width: totalWidth * 0.4,
            length: totalLength * 0.5,
          },
          {
            name: "Bedroom",
            x: totalWidth * 0.65,
            y: 0,
            width: totalWidth * 0.35,
            length: totalLength * 0.7,
          },
          {
            name: "Bathroom",
            x: totalWidth * 0.65,
            y: totalLength * 0.7,
            width: totalWidth * 0.35,
            length: totalLength * 0.3,
          },
          {
            name: "Dining Room",
            x: totalWidth * 0.4,
            y: totalLength * 0.5,
            width: totalWidth * 0.25,
            length: totalLength * 0.5,
          },
        ];
        break;
    }
  } else if (category === "standard") {
    // STANDARD LAYOUTS (5 variations)
    switch (templateVariation) {
      case 0: // Traditional 3-bedroom
        rooms = [
          {
            name: "Living Room",
            x: 0,
            y: 0,
            width: totalWidth * 0.5,
            length: totalLength * 0.4,
          },
          {
            name: "Kitchen",
            x: totalWidth * 0.5,
            y: 0,
            width: totalWidth * 0.25,
            length: totalLength * 0.3,
          },
          {
            name: "Dining Room",
            x: totalWidth * 0.75,
            y: 0,
            width: totalWidth * 0.25,
            length: totalLength * 0.3,
          },
          {
            name: "Hallway",
            x: totalWidth * 0.4,
            y: totalLength * 0.4,
            width: totalWidth * 0.2,
            length: totalLength * 0.6,
          },
          {
            name: "Master Bedroom",
            x: 0,
            y: totalLength * 0.4,
            width: totalWidth * 0.4,
            length: totalLength * 0.6,
          },
          {
            name: "Bedroom",
            x: totalWidth * 0.6,
            y: totalLength * 0.3,
            width: totalWidth * 0.4,
            length: totalLength * 0.35,
          },
          {
            name: "Bathroom",
            x: totalWidth * 0.6,
            y: totalLength * 0.65,
            width: totalWidth * 0.4,
            length: totalLength * 0.35,
          },
        ];
        break;

      case 1: // Split bedroom plan
        rooms = [
          {
            name: "Living Room",
            x: totalWidth * 0.3,
            y: 0,
            width: totalWidth * 0.4,
            length: totalLength * 0.5,
          },
          {
            name: "Kitchen",
            x: totalWidth * 0.7,
            y: 0,
            width: totalWidth * 0.3,
            length: totalLength * 0.3,
          },
          {
            name: "Dining Room",
            x: totalWidth * 0.7,
            y: totalLength * 0.3,
            width: totalWidth * 0.3,
            length: totalLength * 0.2,
          },
          {
            name: "Master Bedroom",
            x: 0,
            y: 0,
            width: totalWidth * 0.3,
            length: totalLength * 0.6,
          },
          {
            name: "Master Bathroom",
            x: 0,
            y: totalLength * 0.6,
            width: totalWidth * 0.3,
            length: totalLength * 0.4,
          },
          {
            name: "Hallway",
            x: totalWidth * 0.3,
            y: totalLength * 0.5,
            width: totalWidth * 0.4,
            length: totalLength * 0.15,
          },
          {
            name: "Bedroom",
            x: totalWidth * 0.3,
            y: totalLength * 0.65,
            width: totalWidth * 0.35,
            length: totalLength * 0.35,
          },
          {
            name: "Bathroom",
            x: totalWidth * 0.65,
            y: totalLength * 0.65,
            width: totalWidth * 0.35,
            length: totalLength * 0.35,
          },
        ];
        break;

      case 2: // Central hallway plan
        rooms = [
          {
            name: "Living Room",
            x: 0,
            y: 0,
            width: totalWidth * 0.5,
            length: totalLength * 0.4,
          },
          {
            name: "Kitchen",
            x: totalWidth * 0.5,
            y: 0,
            width: totalWidth * 0.5,
            length: totalLength * 0.25,
          },
          {
            name: "Dining Room",
            x: totalWidth * 0.5,
            y: totalLength * 0.25,
            width: totalWidth * 0.5,
            length: totalLength * 0.15,
          },
          {
            name: "Hallway",
            x: 0,
            y: totalLength * 0.4,
            width: totalWidth,
            length: totalLength * 0.2,
          },
          {
            name: "Master Bedroom",
            x: 0,
            y: totalLength * 0.6,
            width: totalWidth * 0.4,
            length: totalLength * 0.4,
          },
          {
            name: "Bathroom",
            x: totalWidth * 0.4,
            y: totalLength * 0.6,
            width: totalWidth * 0.2,
            length: totalLength * 0.4,
          },
          {
            name: "Bedroom",
            x: totalWidth * 0.6,
            y: totalLength * 0.6,
            width: totalWidth * 0.4,
            length: totalLength * 0.4,
          },
        ];
        break;

      case 3: // L-shaped home
        rooms = [
          {
            name: "Living Room",
            x: 0,
            y: 0,
            width: totalWidth * 0.6,
            length: totalLength * 0.4,
          },
          {
            name: "Dining Room",
            x: 0,
            y: totalLength * 0.4,
            width: totalWidth * 0.3,
            length: totalLength * 0.3,
          },
          {
            name: "Kitchen",
            x: totalWidth * 0.3,
            y: totalLength * 0.4,
            width: totalWidth * 0.3,
            length: totalLength * 0.3,
          },
          {
            name: "Hallway",
            x: totalWidth * 0.6,
            y: 0,
            width: totalWidth * 0.15,
            length: totalLength * 0.7,
          },
          {
            name: "Master Bedroom",
            x: totalWidth * 0.75,
            y: 0,
            width: totalWidth * 0.25,
            length: totalLength * 0.4,
          },
          {
            name: "Bathroom",
            x: totalWidth * 0.75,
            y: totalLength * 0.4,
            width: totalWidth * 0.25,
            length: totalLength * 0.3,
          },
          {
            name: "Bedroom",
            x: 0,
            y: totalLength * 0.7,
            width: totalWidth * 0.5,
            length: totalLength * 0.3,
          },
          {
            name: "Bathroom 2",
            x: totalWidth * 0.5,
            y: totalLength * 0.7,
            width: totalWidth * 0.25,
            length: totalLength * 0.3,
          },
        ];
        break;

      case 4: // Ranch style
        rooms = [
          {
            name: "Living Room",
            x: totalWidth * 0.25,
            y: 0,
            width: totalWidth * 0.5,
            length: totalLength * 0.4,
          },
          {
            name: "Kitchen",
            x: totalWidth * 0.75,
            y: 0,
            width: totalWidth * 0.25,
            length: totalLength * 0.25,
          },
          {
            name: "Dining Room",
            x: totalWidth * 0.75,
            y: totalLength * 0.25,
            width: totalWidth * 0.25,
            length: totalLength * 0.25,
          },
          {
            name: "Hallway",
            x: 0,
            y: totalLength * 0.4,
            width: totalWidth,
            length: totalLength * 0.2,
          },
          {
            name: "Master Bedroom",
            x: 0,
            y: 0,
            width: totalWidth * 0.25,
            length: totalLength * 0.4,
          },
          {
            name: "Master Bathroom",
            x: 0,
            y: totalLength * 0.6,
            width: totalWidth * 0.2,
            length: totalLength * 0.4,
          },
          {
            name: "Bedroom",
            x: totalWidth * 0.2,
            y: totalLength * 0.6,
            width: totalWidth * 0.4,
            length: totalLength * 0.4,
          },
          {
            name: "Bedroom 2",
            x: totalWidth * 0.6,
            y: totalLength * 0.6,
            width: totalWidth * 0.4,
            length: totalLength * 0.4,
          },
        ];
        break;
    }
  } else {
    // LARGE LAYOUTS (5 variations)
    switch (templateVariation) {
      case 0: // Luxury 4-bedroom
        rooms = [
          {
            name: "Living Room",
            x: totalWidth * 0.25,
            y: 0,
            width: totalWidth * 0.4,
            length: totalLength * 0.3,
          },
          {
            name: "Dining Room",
            x: totalWidth * 0.65,
            y: 0,
            width: totalWidth * 0.35,
            length: totalLength * 0.3,
          },
          {
            name: "Kitchen",
            x: 0,
            y: 0,
            width: totalWidth * 0.25,
            length: totalLength * 0.3,
          },
          {
            name: "Hallway",
            x: 0,
            y: totalLength * 0.3,
            width: totalWidth,
            length: totalLength * 0.15,
          },
          {
            name: "Master Bedroom",
            x: 0,
            y: totalLength * 0.45,
            width: totalWidth * 0.4,
            length: totalLength * 0.3,
          },
          {
            name: "Master Bathroom",
            x: 0,
            y: totalLength * 0.75,
            width: totalWidth * 0.25,
            length: totalLength * 0.25,
          },
          {
            name: "Bathroom",
            x: totalWidth * 0.25,
            y: totalLength * 0.75,
            width: totalWidth * 0.15,
            length: totalLength * 0.25,
          },
          {
            name: "Bedroom",
            x: totalWidth * 0.4,
            y: totalLength * 0.45,
            width: totalWidth * 0.3,
            length: totalLength * 0.3,
          },
          {
            name: "Bedroom 2",
            x: totalWidth * 0.7,
            y: totalLength * 0.45,
            width: totalWidth * 0.3,
            length: totalLength * 0.3,
          },
          {
            name: "Bedroom 3",
            x: totalWidth * 0.4,
            y: totalLength * 0.75,
            width: totalWidth * 0.35,
            length: totalLength * 0.25,
          },
          {
            name: "Bathroom 2",
            x: totalWidth * 0.75,
            y: totalLength * 0.75,
            width: totalWidth * 0.25,
            length: totalLength * 0.25,
          },
        ];
        break;

      case 1: // Executive home
        rooms = [
          {
            name: "Living Room",
            x: 0,
            y: 0,
            width: totalWidth * 0.4,
            length: totalLength * 0.4,
          },
          {
            name: "Dining Room",
            x: totalWidth * 0.4,
            y: 0,
            width: totalWidth * 0.3,
            length: totalLength * 0.3,
          },
          {
            name: "Kitchen",
            x: totalWidth * 0.7,
            y: 0,
            width: totalWidth * 0.3,
            length: totalLength * 0.3,
          },
          {
            name: "Study",
            x: totalWidth * 0.4,
            y: totalLength * 0.3,
            width: totalWidth * 0.3,
            length: totalLength * 0.2,
          },
          {
            name: "Hallway",
            x: totalWidth * 0.7,
            y: totalLength * 0.3,
            width: totalWidth * 0.3,
            length: totalLength * 0.2,
          },
          {
            name: "Master Bedroom",
            x: 0,
            y: totalLength * 0.4,
            width: totalWidth * 0.45,
            length: totalLength * 0.3,
          },
          {
            name: "Master Bathroom",
            x: 0,
            y: totalLength * 0.7,
            width: totalWidth * 0.25,
            length: totalLength * 0.3,
          },
          {
            name: "Hallway 2",
            x: totalWidth * 0.25,
            y: totalLength * 0.7,
            width: totalWidth * 0.2,
            length: totalLength * 0.3,
          },
          {
            name: "Bedroom",
            x: totalWidth * 0.45,
            y: totalLength * 0.5,
            width: totalWidth * 0.25,
            length: totalLength * 0.25,
          },
          {
            name: "Bedroom 2",
            x: totalWidth * 0.7,
            y: totalLength * 0.5,
            width: totalWidth * 0.3,
            length: totalLength * 0.25,
          },
          {
            name: "Bathroom",
            x: totalWidth * 0.45,
            y: totalLength * 0.75,
            width: totalWidth * 0.25,
            length: totalLength * 0.25,
          },
          {
            name: "Bedroom 3",
            x: totalWidth * 0.7,
            y: totalLength * 0.75,
            width: totalWidth * 0.3,
            length: totalLength * 0.25,
          },
        ];
        break;

      case 2: // Open concept large home
        rooms = [
          {
            name: "Living Room",
            x: 0,
            y: 0,
            width: totalWidth * 0.5,
            length: totalLength * 0.35,
          },
          {
            name: "Kitchen",
            x: totalWidth * 0.5,
            y: 0,
            width: totalWidth * 0.3,
            length: totalLength * 0.25,
          },
          {
            name: "Dining Room",
            x: totalWidth * 0.8,
            y: 0,
            width: totalWidth * 0.2,
            length: totalLength * 0.25,
          },
          {
            name: "Study",
            x: totalWidth * 0.5,
            y: totalLength * 0.25,
            width: totalWidth * 0.2,
            length: totalLength * 0.15,
          },
          {
            name: "Bathroom",
            x: totalWidth * 0.7,
            y: totalLength * 0.25,
            width: totalWidth * 0.3,
            length: totalLength * 0.15,
          },
          {
            name: "Hallway",
            x: 0,
            y: totalLength * 0.35,
            width: totalWidth,
            length: totalLength * 0.15,
          },
          {
            name: "Master Bedroom",
            x: 0,
            y: totalLength * 0.5,
            width: totalWidth * 0.35,
            length: totalLength * 0.3,
          },
          {
            name: "Master Bathroom",
            x: 0,
            y: totalLength * 0.8,
            width: totalWidth * 0.35,
            length: totalLength * 0.2,
          },
          {
            name: "Bedroom",
            x: totalWidth * 0.35,
            y: totalLength * 0.5,
            width: totalWidth * 0.3,
            length: totalLength * 0.25,
          },
          {
            name: "Bedroom 2",
            x: totalWidth * 0.65,
            y: totalLength * 0.5,
            width: totalWidth * 0.35,
            length: totalLength * 0.25,
          },
          {
            name: "Bathroom 2",
            x: totalWidth * 0.35,
            y: totalLength * 0.75,
            width: totalWidth * 0.3,
            length: totalLength * 0.25,
          },
          {
            name: "Bedroom 3",
            x: totalWidth * 0.65,
            y: totalLength * 0.75,
            width: totalWidth * 0.35,
            length: totalLength * 0.25,
          },
        ];
        break;

      case 3: // Modern open floor plan
        rooms = [
          {
            name: "Living Room",
            x: 0,
            y: 0,
            width: totalWidth * 0.6,
            length: totalLength * 0.3,
          },
          {
            name: "Kitchen",
            x: 0,
            y: totalLength * 0.3,
            width: totalWidth * 0.3,
            length: totalLength * 0.2,
          },
          {
            name: "Dining Room",
            x: totalWidth * 0.3,
            y: totalLength * 0.3,
            width: totalWidth * 0.3,
            length: totalLength * 0.2,
          },
          {
            name: "Study",
            x: totalWidth * 0.6,
            y: 0,
            width: totalWidth * 0.4,
            length: totalLength * 0.25,
          },
          {
            name: "Bathroom",
            x: totalWidth * 0.6,
            y: totalLength * 0.25,
            width: totalWidth * 0.15,
            length: totalLength * 0.15,
          },
          {
            name: "Hallway",
            x: totalWidth * 0.75,
            y: totalLength * 0.25,
            width: totalWidth * 0.25,
            length: totalLength * 0.15,
          },
          {
            name: "Master Bedroom",
            x: 0,
            y: totalLength * 0.5,
            width: totalWidth * 0.4,
            length: totalLength * 0.5,
          },
          {
            name: "Master Bathroom",
            x: totalWidth * 0.4,
            y: totalLength * 0.5,
            width: totalWidth * 0.2,
            length: totalLength * 0.25,
          },
          {
            name: "Bedroom",
            x: totalWidth * 0.6,
            y: totalLength * 0.4,
            width: totalWidth * 0.4,
            length: totalLength * 0.3,
          },
          {
            name: "Bedroom 2",
            x: totalWidth * 0.6,
            y: totalLength * 0.7,
            width: totalWidth * 0.4,
            length: totalLength * 0.3,
          },
          {
            name: "Bathroom 2",
            x: totalWidth * 0.4,
            y: totalLength * 0.75,
            width: totalWidth * 0.2,
            length: totalLength * 0.25,
          },
        ];
        break;

      case 4: // Villa style
        rooms = [
          {
            name: "Living Room",
            x: totalWidth * 0.3,
            y: 0,
            width: totalWidth * 0.5,
            length: totalLength * 0.35,
          },
          {
            name: "Kitchen",
            x: 0,
            y: 0,
            width: totalWidth * 0.3,
            length: totalLength * 0.25,
          },
          {
            name: "Dining Room",
            x: totalWidth * 0.8,
            y: 0,
            width: totalWidth * 0.2,
            length: totalLength * 0.35,
          },
          {
            name: "Study",
            x: 0,
            y: totalLength * 0.25,
            width: totalWidth * 0.3,
            length: totalLength * 0.25,
          },
          {
            name: "Hallway",
            x: totalWidth * 0.3,
            y: totalLength * 0.35,
            width: totalWidth * 0.4,
            length: totalLength * 0.15,
          },
          {
            name: "Bathroom",
            x: totalWidth * 0.7,
            y: totalLength * 0.35,
            width: totalWidth * 0.3,
            length: totalLength * 0.15,
          },
          {
            name: "Master Bedroom",
            x: 0,
            y: totalLength * 0.5,
            width: totalWidth * 0.4,
            length: totalLength * 0.3,
          },
          {
            name: "Master Bathroom",
            x: 0,
            y: totalLength * 0.8,
            width: totalWidth * 0.2,
            length: totalLength * 0.2,
          },
          {
            name: "Closet",
            x: totalWidth * 0.2,
            y: totalLength * 0.8,
            width: totalWidth * 0.2,
            length: totalLength * 0.2,
          },
          {
            name: "Bedroom",
            x: totalWidth * 0.4,
            y: totalLength * 0.5,
            width: totalWidth * 0.3,
            length: totalLength * 0.25,
          },
          {
            name: "Bedroom 2",
            x: totalWidth * 0.7,
            y: totalLength * 0.5,
            width: totalWidth * 0.3,
            length: totalLength * 0.25,
          },
          {
            name: "Bathroom 2",
            x: totalWidth * 0.4,
            y: totalLength * 0.75,
            width: totalWidth * 0.3,
            length: totalLength * 0.25,
          },
          {
            name: "Bedroom 3",
            x: totalWidth * 0.7,
            y: totalLength * 0.75,
            width: totalWidth * 0.3,
            length: totalLength * 0.25,
          },
        ];
        break;
    }
  }
  return rooms;
}
