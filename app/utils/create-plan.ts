// Complete TypeScript implementation without external libraries

// Types
type RoomType =
  | "entryway"
  | "living"
  | "kitchen"
  | "dining"
  | "bedroom"
  | "bathroom"
  | "hallway"
  | "garage";

type RoomNode = {
  name: string;
  type: RoomType;
  weight: number;
  minRatio: number;
  maxRatio: number;
};

type GraphEdge = [[string, RoomType], [string, RoomType], "door" | "wall"];

type Space = {
  _id: string;
  storeyId: string;
  name: string;
  type: RoomType;
  polygon: [number, number][]; // 2D
};

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  roomIndex: number;
}

// Main function to generate floor plan
function generateFloorPlan(
  width: number,
  height: number,
  rooms: RoomNode[],
  graph: GraphEdge[]
): Space[] {
  // Create initial state
  const initialState = createInitialState(width, height, rooms);

  // Run our own simulated annealing
  const finalState = simulatedAnnealing(
    initialState,
    (state) => calculateEnergy(state, rooms, graph, width, height),
    (state) => generateNeighborState(state, width, height),
    {
      maxIterations: 10000,
      initialTemperature: 5000,
      minTemperature: 0.1,
      coolingRate: 0.995,
    }
  );

  // Convert the final state to Space[] format
  return convertToSpaces(finalState, rooms);
}

// Our own implementation of simulated annealing
function simulatedAnnealing<T>(
  initialState: T,
  energyFunction: (state: T) => number,
  neighborFunction: (state: T) => T,
  options: {
    maxIterations: number;
    initialTemperature: number;
    minTemperature: number;
    coolingRate: number;
  }
): T {
  let currentState = initialState;
  let bestState = initialState;
  let currentEnergy = energyFunction(currentState);
  let bestEnergy = currentEnergy;

  let temperature = options.initialTemperature;
  let iteration = 0;

  while (
    temperature > options.minTemperature &&
    iteration < options.maxIterations
  ) {
    // Generate neighbor state
    const neighborState = neighborFunction(currentState);
    const neighborEnergy = energyFunction(neighborState);

    // Decide whether to accept the neighbor
    if (neighborEnergy < currentEnergy) {
      // Accept better state
      currentState = neighborState;
      currentEnergy = neighborEnergy;

      // Update best state if this is better
      if (currentEnergy < bestEnergy) {
        bestState = currentState;
        bestEnergy = currentEnergy;
      }
    } else {
      // Calculate acceptance probability
      const delta = neighborEnergy - currentEnergy;
      const acceptanceProbability = Math.exp(-delta / temperature);

      // Accept worse state with probability
      if (Math.random() < acceptanceProbability) {
        currentState = neighborState;
        currentEnergy = neighborEnergy;
      }
    }

    // Cool down
    temperature *= options.coolingRate;
    iteration++;

    // Log progress occasionally
    if (iteration % 500 === 0) {
      console.log(
        `Iteration ${iteration}, Temperature: ${temperature.toFixed(
          2
        )}, Energy: ${currentEnergy.toFixed(2)}`
      );
    }
  }

  console.log(
    `Final iteration: ${iteration}, Best energy: ${bestEnergy.toFixed(2)}`
  );
  return bestState;
}

// Create an initial arrangement of rooms
function createInitialState(
  width: number,
  height: number,
  rooms: RoomNode[]
): Rectangle[] {
  const totalArea = width * height;
  const result: Rectangle[] = [];

  // Start with a grid-based approach
  const gridSize = Math.ceil(Math.sqrt(rooms.length));
  const cellWidth = width / gridSize;
  const cellHeight = height / gridSize;

  let x = 0;
  let y = 0;

  rooms.forEach((room, index) => {
    // Target area based on weight
    const targetArea = room.weight * totalArea;

    // Calculate dimensions trying to respect the ratio
    let roomWidth = Math.min(cellWidth, Math.sqrt(targetArea * room.minRatio));
    let roomHeight = Math.min(
      cellHeight,
      Math.sqrt(targetArea / room.minRatio)
    );

    // Adjust to fit grid
    if (x + roomWidth > width) {
      x = 0;
      y += cellHeight;
    }

    // Handle last row specially
    if (y + roomHeight > height) {
      roomHeight = height - y;
    }

    // Add the room
    result.push({
      x,
      y,
      width: roomWidth,
      height: roomHeight,
      roomIndex: index,
    });

    // Update position for next room
    x += roomWidth;
  });

  // Fill remaining space with the last room to ensure no gaps
  if (result.length > 0) {
    const lastRoom = result[result.length - 1];
    if (lastRoom.x + lastRoom.width < width) {
      lastRoom.width = width - lastRoom.x;
    }
    if (lastRoom.y + lastRoom.height < height) {
      lastRoom.height = height - lastRoom.y;
    }
  }

  return result;
}

// Calculate the energy (lower is better) of a floor plan solution
function calculateEnergy(
  state: Rectangle[],
  rooms: RoomNode[],
  graph: GraphEdge[],
  totalWidth: number,
  totalHeight: number
): number {
  let energy = 0;
  const totalArea = totalWidth * totalHeight;

  // Penalize room size deviations from target
  energy += calculateSizePenalty(state, rooms, totalArea);

  // Penalize ratio violations
  energy += calculateRatioPenalty(state, rooms) * 2;

  // Penalize adjacency violations
  energy += calculateAdjacencyPenalty(state, rooms, graph) * 3;

  // Penalize overlaps
  energy += calculateOverlapPenalty(state) * 10;

  // Penalize gaps
  energy += calculateGapPenalty(state, totalWidth, totalHeight) * 5;

  return energy;
}

// Penalize room sizes that deviate from target areas
function calculateSizePenalty(
  state: Rectangle[],
  rooms: RoomNode[],
  totalArea: number
): number {
  let penalty = 0;

  state.forEach((rect) => {
    const room = rooms[rect.roomIndex];
    const actualArea = rect.width * rect.height;
    const targetArea = room.weight * totalArea;

    // Penalize deviation from target area
    penalty += Math.abs(actualArea - targetArea) / targetArea;
  });

  return penalty;
}

// Penalize room shapes that violate min/max ratio constraints
function calculateRatioPenalty(state: Rectangle[], rooms: RoomNode[]): number {
  let penalty = 0;

  state.forEach((rect) => {
    const room = rooms[rect.roomIndex];
    const ratio = rect.width / rect.height;

    // If outside allowed ratio range
    if (ratio < room.minRatio) {
      penalty += (room.minRatio - ratio) * 10;
    } else if (ratio > room.maxRatio) {
      penalty += (ratio - room.maxRatio) * 10;
    }
  });

  return penalty;
}

// Penalize adjacency violations based on graph requirements
function calculateAdjacencyPenalty(
  state: Rectangle[],
  rooms: RoomNode[],
  graph: GraphEdge[]
): number {
  let penalty = 0;

  // For each edge in the graph
  graph.forEach((edge) => {
    const [room1Info, room2Info, connectionType] = edge;
    const [room1Name] = room1Info;
    const [room2Name] = room2Info;

    // Find the rectangles for these rooms
    const room1Index = rooms.findIndex((r) => r.name === room1Name);
    const room2Index = rooms.findIndex((r) => r.name === room2Name);

    if (room1Index === -1 || room2Index === -1) return;

    const rect1 = state.find((r) => r.roomIndex === room1Index);
    const rect2 = state.find((r) => r.roomIndex === room2Index);

    if (!rect1 || !rect2) return;

    // Check if rooms are adjacent
    const areAdjacent = areRoomsAdjacent(rect1, rect2);

    // If they should be connected but aren't adjacent
    if (connectionType === "door" && !areAdjacent) {
      // Calculate distance between centers
      const distance = Math.sqrt(
        Math.pow(rect1.x + rect1.width / 2 - (rect2.x + rect2.width / 2), 2) +
          Math.pow(rect1.y + rect1.height / 2 - (rect2.y + rect2.height / 2), 2)
      );
      penalty += distance;
    }

    // If they should be separated by a wall but are adjacent
    if (connectionType === "wall" && areAdjacent) {
      penalty += 50; // High penalty for wall violations
    }
  });

  return penalty;
}

// Check if two rectangles are adjacent (share an edge)
function areRoomsAdjacent(rect1: Rectangle, rect2: Rectangle): boolean {
  // Rectangles are adjacent if they share a horizontal or vertical edge
  const horizontalOverlap =
    rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;

  const verticalOverlap =
    rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x;

  // Adjacent horizontally
  if (
    horizontalOverlap &&
    (Math.abs(rect1.x - (rect2.x + rect2.width)) < 0.01 ||
      Math.abs(rect2.x - (rect1.x + rect1.width)) < 0.01)
  ) {
    return true;
  }

  // Adjacent vertically
  if (
    verticalOverlap &&
    (Math.abs(rect1.y - (rect2.y + rect2.height)) < 0.01 ||
      Math.abs(rect2.y - (rect1.y + rect1.height)) < 0.01)
  ) {
    return true;
  }

  return false;
}

// Penalize overlapping rooms
function calculateOverlapPenalty(state: Rectangle[]): number {
  let penalty = 0;

  // Check each pair of rectangles
  for (let i = 0; i < state.length; i++) {
    for (let j = i + 1; j < state.length; j++) {
      const rect1 = state[i];
      const rect2 = state[j];

      // Calculate overlap area
      const overlapX = Math.max(
        0,
        Math.min(rect1.x + rect1.width, rect2.x + rect2.width) -
          Math.max(rect1.x, rect2.x)
      );
      const overlapY = Math.max(
        0,
        Math.min(rect1.y + rect1.height, rect2.y + rect2.height) -
          Math.max(rect1.y, rect2.y)
      );
      const overlapArea = overlapX * overlapY;

      penalty += overlapArea * 100; // Heavy penalty for overlaps
    }
  }

  return penalty;
}

// Penalize gaps in the floor plan
function calculateGapPenalty(
  state: Rectangle[],
  totalWidth: number,
  totalHeight: number
): number {
  // Create a binary grid representing the floor plan
  const gridResolution = 20; // Grid cells per unit
  const grid = Array(Math.ceil(totalHeight * gridResolution))
    .fill(0)
    .map(() => Array(Math.ceil(totalWidth * gridResolution)).fill(0));

  // Mark occupied cells
  state.forEach((rect) => {
    const startX = Math.floor(rect.x * gridResolution);
    const startY = Math.floor(rect.y * gridResolution);
    const endX = Math.ceil((rect.x + rect.width) * gridResolution);
    const endY = Math.ceil((rect.y + rect.height) * gridResolution);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
          grid[y][x] = 1;
        }
      }
    }
  });

  // Count unoccupied cells
  let unoccupiedCount = 0;
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x] === 0) {
        unoccupiedCount++;
      }
    }
  }

  // Calculate penalty
  const totalCells = grid.length * grid[0].length;
  const unoccupiedRatio = unoccupiedCount / totalCells;

  return unoccupiedRatio * 1000; // Strong penalty for gaps
}

// Generate a neighbor state by applying random modifications
function generateNeighborState(
  state: Rectangle[],
  width: number,
  height: number
): Rectangle[] {
  // Create a deep copy of the state
  const newState = JSON.parse(JSON.stringify(state)) as Rectangle[];

  // Choose a random modification strategy
  const strategy = Math.floor(Math.random() * 4);

  switch (strategy) {
    case 0:
      moveRoom(newState, width, height);
      break;
    case 1:
      resizeRoom(newState, width, height);
      break;
    case 2:
      swapRooms(newState);
      break;
    case 3:
      adjustRoom(newState, width, height);
      break;
  }

  return newState;
}

// Move a room by a small amount
function moveRoom(state: Rectangle[], width: number, height: number): void {
  const roomIndex = Math.floor(Math.random() * state.length);
  const room = state[roomIndex];
  const moveDistance = Math.min(width, height) * 0.05; // 5% of floor dimension

  // Random direction
  const dx = (Math.random() - 0.5) * 2 * moveDistance;
  const dy = (Math.random() - 0.5) * 2 * moveDistance;

  // Apply movement with boundary checks
  room.x = Math.max(0, Math.min(width - room.width, room.x + dx));
  room.y = Math.max(0, Math.min(height - room.height, room.y + dy));
}

// Resize a room while maintaining approximate area
function resizeRoom(state: Rectangle[], width: number, height: number): void {
  const roomIndex = Math.floor(Math.random() * state.length);
  const room = state[roomIndex];

  // Calculate max allowed changes
  const maxWidthChange = Math.min(room.width * 0.2, width * 0.1);
  const maxHeightChange = Math.min(room.height * 0.2, height * 0.1);

  // Apply random changes
  const widthChange = (Math.random() - 0.5) * 2 * maxWidthChange;
  const heightChange = (Math.random() - 0.5) * 2 * maxHeightChange;

  // Apply changes with constraints
  room.width = Math.max(
    0.1,
    Math.min(width - room.x, room.width + widthChange)
  );
  room.height = Math.max(
    0.1,
    Math.min(height - room.y, room.height + heightChange)
  );
}

// Swap two rooms entirely
function swapRooms(state: Rectangle[]): void {
  if (state.length < 2) return;

  const roomIndex1 = Math.floor(Math.random() * state.length);
  let roomIndex2 = Math.floor(Math.random() * state.length);

  // Ensure we pick different rooms
  while (roomIndex2 === roomIndex1) {
    roomIndex2 = Math.floor(Math.random() * state.length);
  }

  // Swap room indices
  const tempIndex = state[roomIndex1].roomIndex;
  state[roomIndex1].roomIndex = state[roomIndex2].roomIndex;
  state[roomIndex2].roomIndex = tempIndex;
}

// Make small adjustments to a room's shape
function adjustRoom(state: Rectangle[], width: number, height: number): void {
  const roomIndex = Math.floor(Math.random() * state.length);
  const room = state[roomIndex];

  // Choose which edge to adjust
  const edge = Math.floor(Math.random() * 4);
  const adjustAmount = Math.min(width, height) * 0.03; // 3% of floor dimension

  switch (edge) {
    case 0: // Top edge
      if (room.height > adjustAmount * 2) {
        room.y += adjustAmount;
        room.height -= adjustAmount;
      }
      break;
    case 1: // Right edge
      if (room.width > adjustAmount * 2) {
        room.width -= adjustAmount;
      }
      break;
    case 2: // Bottom edge
      if (room.height > adjustAmount * 2) {
        room.height -= adjustAmount;
      }
      break;
    case 3: // Left edge
      if (room.width > adjustAmount * 2) {
        room.x += adjustAmount;
        room.width -= adjustAmount;
      }
      break;
  }
}

// Convert rectangles to Space[] format
function convertToSpaces(state: Rectangle[], rooms: RoomNode[]): Space[] {
  return state.map((rect) => {
    const room = rooms[rect.roomIndex];
    return {
      _id: generateUuid(),
      name: room.name,
      type: room.type,
      storeyId: "1",
      polygon: [
        [rect.x, rect.y],
        [rect.x + rect.width, rect.y],
        [rect.x + rect.width, rect.y + rect.height],
        [rect.x, rect.y + rect.height],
      ],
    };
  });
}

// Simple UUID generator function
function generateUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Usage example
function generateExampleFloorPlan() {
  const floorPlanWidth = 10;
  const floorPlanLength = 12;

  const rooms: RoomNode[] = [
    {
      name: "Entryway",
      type: "entryway",
      weight: 0.05,
      minRatio: 0.7,
      maxRatio: 1.5,
    },
    {
      name: "Living Room",
      type: "living",
      weight: 0.22,
      minRatio: 0.7,
      maxRatio: 1.5,
    },
    {
      name: "Kitchen",
      type: "kitchen",
      weight: 0.1,
      minRatio: 0.8,
      maxRatio: 1.2,
    },
    {
      name: "Dining Area",
      type: "dining",
      weight: 0.09,
      minRatio: 0.8,
      maxRatio: 1.2,
    },
    {
      name: "Master Bedroom",
      type: "bedroom",
      weight: 0.15,
      minRatio: 0.8,
      maxRatio: 1.5,
    },
    {
      name: "Bedroom 2",
      type: "bedroom",
      weight: 0.1,
      minRatio: 0.8,
      maxRatio: 1.5,
    },
    {
      name: "Bedroom 3",
      type: "bedroom",
      weight: 0.08,
      minRatio: 0.8,
      maxRatio: 1.5,
    },
    {
      name: "Bathroom",
      type: "bathroom",
      weight: 0.06,
      minRatio: 1.0,
      maxRatio: 2.0,
    },
    {
      name: "Ensuite",
      type: "bathroom",
      weight: 0.04,
      minRatio: 1.0,
      maxRatio: 2.0,
    },
    {
      name: "Hallway",
      type: "hallway",
      weight: 0.06,
      minRatio: 0.3,
      maxRatio: 3.0,
    },
    {
      name: "Garage",
      type: "garage",
      weight: 0.05,
      minRatio: 0.7,
      maxRatio: 1.5,
    },
  ];

  const graph: GraphEdge[] = [
    [["Entryway", "entryway"], ["Living Room", "living"], "door"],
    [["Entryway", "entryway"], ["Hallway", "hallway"], "door"],
    [["Entryway", "entryway"], ["Garage", "garage"], "door"],
    [["Living Room", "living"], ["Dining Area", "dining"], "door"],
    [["Living Room", "living"], ["Kitchen", "kitchen"], "door"],
    [["Kitchen", "kitchen"], ["Dining Area", "dining"], "door"],
    [["Hallway", "hallway"], ["Master Bedroom", "bedroom"], "door"],
    [["Hallway", "hallway"], ["Bedroom 2", "bedroom"], "door"],
    [["Hallway", "hallway"], ["Bedroom 3", "bedroom"], "door"],
    [["Hallway", "hallway"], ["Bathroom", "bathroom"], "door"],
    [["Master Bedroom", "bedroom"], ["Ensuite", "bathroom"], "door"],
    [["Living Room", "living"], ["Bedroom 2", "bedroom"], "wall"],
    [["Living Room", "living"], ["Bedroom 3", "bedroom"], "wall"],
    [["Kitchen", "kitchen"], ["Bathroom", "bathroom"], "wall"],
    [["Garage", "garage"], ["Living Room", "living"], "wall"],
  ];

  return generateFloorPlan(floorPlanWidth, floorPlanLength, rooms, graph);
}

// Execute the algorithm
const spaces = generateExampleFloorPlan();

export const floorPlanExample = {
  spaces,
  walls: [],
  doors: [],
  windows: [],
};
