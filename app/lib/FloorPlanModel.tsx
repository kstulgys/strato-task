import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Box, Text } from "@react-three/drei";
import { DoubleSide } from "three";
import type {
  RoomOutput,
  WallRect,
  RoomInput,
  EdgeInput,
  DoorRect,
} from "./room-planner-algorithm";
import {
  parseRoomPlan,
  parseGraph,
  processRoomLayout,
} from "./room-planner-algorithm";

// Constants
const WALL_HEIGHT_MM = 2500;
const ROOM_FLOOR_THICKNESS_MM = 20; // A small thickness for the floor, can be 0 for a plane
const DOOR_COLOR = "#654321"; // Dark brown for doors

const examples = [
  {
    label: "Example 1",
    plan: `{
    DiningKitchen(109): BBox(xs=5, ys=5, xe=10, ye=13),
    Hall(110): BBox(xs=3, ys=0, xe=10, ye=5),
    Bedroom(111): BBox(xs=10, ys=3, xe=15, ye=10),
    Shower(112): BBox(xs=10, ys=0, xe=15, ye=3),
    Living(113): BBox(xs=0, ys=5, xe=5, ye=13),
    Entryway(114): BBox(xs=0, ys=0, xe=3, ye=5)
}`,
    graph: `[
    Edge(i=Entryway(114), j=Hall(110), separation='door'),
    Edge(i=Hall(110), j=Living(113), separation='void'),
    Edge(i=Living(113), j=DiningKitchen(109), separation='void'),
    Edge(i=Hall(110), j=Bedroom(111), separation='door'),
    Edge(i=Hall(110), j=Shower(112), separation='door'),
    Edge(i=Shower(112), j=Bedroom(111), separation='wall')
]`,
  },
  {
    label: "Example 2",
    plan: `{
    DiningKitchen(110): BBox(xs=0, ys=6, xe=6, ye=15),
    Bedroom(111): BBox(xs=9, ys=8, xe=14, ye=13),
    Entryway(112): BBox(xs=9, ys=5, xe=14, ye=8),
    Shower(113): BBox(xs=6, ys=10, xe=9, ye=15),
    CorridorV(114): BBox(xs=6, ys=6, xe=9, ye=10),
    Dressing(115): BBox(xs=9, ys=13, xe=14, ye=15),
    Living(116): BBox(xs=0, ys=0, xe=9, ye=6)
}`,
    graph: `[
    Edge(i=Entryway(112), j=CorridorV(114), separation='door'),
    Edge(i=CorridorV(114), j=Living(116), separation='void'),
    Edge(i=Living(116), j=DiningKitchen(110), separation='void'),
    Edge(i=CorridorV(114), j=Bedroom(111), separation='door'),
    Edge(i=Bedroom(111), j=Dressing(115), separation='door'),
    Edge(i=CorridorV(114), j=Shower(113), separation='door'),
    Edge(i=Shower(113), j=Bedroom(111), separation='wall'),
]`,
  },
  {
    label: "Example 3",
    plan: `{
    Bedroom(1742): BBox(xs=5, ys=9, xe=14, ye=16),
    Hall(1743): BBox(xs=5, ys=0, xe=14, ye=9),
    Living(1744): BBox(xs=5, ys=-10, xe=12, ye=0),
    Entryway(1745): BBox(xs=0, ys=0, xe=5, ye=6),
    Bedroom(1746): BBox(xs=19, ys=6, xe=26, ye=16),
    Dressing(1747): BBox(xs=0, ys=10, xe=5, ye=16),
    WC(1748): BBox(xs=0, ys=6, xe=5, ye=10),
    DiningKitchen(1749): BBox(xs=12, ys=-10, xe=19, ye=0),
    CorridorV(1750): BBox(xs=14, ys=0, xe=19, ye=11),
    Dressing(1751): BBox(xs=19, ys=-10, xe=26, ye=-4),
    Bedroom(1752): BBox(xs=19, ys=-4, xe=26, ye=6),
    Shower(1753): BBox(xs=14, ys=11, xe=19, ye=16)
}`,
    graph: `[
    Edge(i=Entryway(1745), j=Hall(1743), separation='door'),
    Edge(i=CorridorV(1750), j=Hall(1743), separation='void'),
    Edge(i=CorridorV(1750), j=Bedroom(1742), separation='door'),
    Edge(i=CorridorV(1750), j=Bedroom(1752), separation='door'),
    Edge(i=Bedroom(1742), j=Dressing(1747), separation='door'),
    Edge(i=Bedroom(1752), j=Dressing(1751), separation='door'),
    Edge(i=CorridorV(1750), j=Bedroom(1746), separation='door'),
    Edge(i=Hall(1743), j=Living(1744), separation='void'),
    Edge(i=Living(1744), j=DiningKitchen(1749), separation='void'),
    Edge(i=CorridorV(1750), j=Shower(1753), separation='door'),
    Edge(i=Hall(1743), j=WC(1748), separation='door')
]`,
  },
];

// Edge(i=Bedroom(111), j=DiningKitchen(109), separation='door'),

interface Room3DProps {
  roomData: RoomOutput;
}

const Room3D: React.FC<Room3DProps> = ({ roomData }) => {
  const { bboxMM, name } = roomData;
  const width = bboxMM.xe - bboxMM.xs;
  const depth = bboxMM.ye - bboxMM.ys; // R3F depth is along Z axis (data Y)

  // Calculate area in square meters
  const areaMM2 = width * depth;
  const areaM2 = areaMM2 / 1000000; // Convert mm^2 to m^2
  const formattedArea = areaM2.toFixed(2); // Format to 2 decimal places

  const displayText = `${name} \n${formattedArea} m²`; // Combine name and area

  const centerX = bboxMM.xs + width / 2;
  const centerZ = bboxMM.ys + depth / 2;
  const floorY = ROOM_FLOOR_THICKNESS_MM / 2;
  const textY = floorY + 12;

  return (
    <group position={[0, 0, 0]}>
      {" "}
      {/* Use a group to contain floor and text */}
      {/* Floor Box */}
      <Box
        args={[width, ROOM_FLOOR_THICKNESS_MM, depth]}
        position={[centerX, floorY, centerZ]}
      >
        <meshStandardMaterial color="lightcyan" transparent opacity={0.6} />
      </Box>
      {/* Room Name Text with Area*/}
      <Text
        position={[centerX, textY, centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={150}
        color="black"
        anchorX="center"
        anchorY="middle"
        maxWidth={width * 0.9} // Adjust maxWidth if needed for longer text
        material-side={DoubleSide}
      >
        {displayText} {/* Use the combined display text */}
      </Text>
    </group>
  );
};

interface Wall3DProps {
  wallData: WallRect;
}

const Wall3D: React.FC<Wall3DProps> = ({ wallData }) => {
  const width = wallData.xe - wallData.xs; // This is the dimension along X
  const depth = wallData.ye - wallData.ys; // This is the dimension along Z (data Y)

  // Position is the center of the wall's footprint, raised by half its height
  const position: [number, number, number] = [
    wallData.xs + width / 2,
    WALL_HEIGHT_MM / 2,
    wallData.ys + depth / 2,
  ];

  let materialColor = "#888888"; // Default inner wall color
  switch (wallData.type) {
    case "outer_main":
      materialColor = "#A52A2A"; // Brown
      break;
    case "outer_facade":
      materialColor = "#D2B48C"; // Tan
      break;
    case "inner":
      materialColor = "#A9A9A9"; // DarkGray
      break;
  }

  return (
    <Box args={[width, WALL_HEIGHT_MM, depth]} position={position}>
      <meshStandardMaterial color={materialColor} />
    </Box>
  );
};

interface Door3DProps {
  doorData: DoorRect;
}

const Door3D: React.FC<Door3DProps> = ({ doorData }) => {
  const position: [number, number, number] = [
    doorData.x,
    doorData.height / 2, // Anchor at the bottom, raise by half height
    doorData.z,
  ];

  // Define the door mesh consistently:
  // - opening width (doorData.width) along its local X-axis
  // - height (doorData.height) along its local Y-axis
  // - slab thickness (doorData.depth) along its local Z-axis.
  const baseBoxArgs: [number, number, number] = [
    doorData.width,
    doorData.height,
    doorData.depth,
  ];

  // Determine the actual rotation to apply in the scene.
  // doorData.rotationY from the algorithm means:
  // - 0: The wall is vertical (runs along world Z). The door opening should also be along Z.
  //      Our base door (opening along local X) needs to be rotated by PI/2.
  // - PI/2: The wall is horizontal (runs along world X). The door opening should also be along X.
  //      Our base door (opening along local X) needs 0 rotation.
  const actualRotationY = doorData.rotationY === 0 ? Math.PI / 2 : 0;

  return (
    <Box
      args={baseBoxArgs}
      position={position}
      rotation={[0, actualRotationY, 0]}
    >
      <meshStandardMaterial color={DOOR_COLOR} />
    </Box>
  );
};

const FloorPlanViewer: React.FC<{ example: (typeof examples)[number] }> = ({
  example,
}) => {
  const { rooms, walls, doors } = useMemo(() => {
    try {
      const roomInputsData: RoomInput[] = parseRoomPlan(example.plan);
      const graphInputsData: EdgeInput[] = parseGraph(example.graph);
      // Assuming processRoomLayout returns { rooms, walls, doors }
      const layout = processRoomLayout(roomInputsData, graphInputsData);
      return {
        rooms: layout.rooms || [],
        walls: layout.walls || [],
        doors: layout.doors || [], // Ensure doors is initialized
      };
    } catch (error) {
      console.error("Error processing room layout:", error);
      return {
        rooms: [] as RoomOutput[],
        walls: [] as WallRect[],
        doors: [] as DoorRect[],
      }; // Ensure doors is initialized here too
    }
  }, [example]);

  const sceneBounds = useMemo(() => {
    if (rooms.length === 0 && walls.length === 0) {
      return {
        minX: -1000,
        maxX: 1000,
        minZ: -1000,
        maxZ: 1000,
        centerX: 0,
        centerZ: 0,
        sizeX: 2000,
        sizeZ: 2000,
      };
    }
    const allFootprints = [
      ...rooms.map((r) => r.bboxMM),
      ...walls.map((w) => ({ xs: w.xs, ys: w.ys, xe: w.xe, ye: w.ye })),
    ];

    const minX = Math.min(...allFootprints.map((fp) => fp.xs));
    const maxX = Math.max(...allFootprints.map((fp) => fp.xe));
    const minZ = Math.min(...allFootprints.map((fp) => fp.ys)); // data ys is R3F z
    const maxZ = Math.max(...allFootprints.map((fp) => fp.ye)); // data ye is R3F z

    return {
      minX,
      maxX,
      minZ,
      maxZ,
      centerX: (minX + maxX) / 2,
      centerZ: (minZ + maxZ) / 2,
      sizeX: maxX - minX,
      sizeZ: maxZ - minZ,
    };
  }, [rooms, walls]);

  const cameraDistanceFactor = 1.5; // How far out the camera is, relative to scene size
  const cameraPosition: [number, number, number] = [
    sceneBounds.centerX,
    Math.max(sceneBounds.sizeX, sceneBounds.sizeZ, WALL_HEIGHT_MM) *
      cameraDistanceFactor *
      0.7, // Y position (height)
    sceneBounds.centerZ +
      Math.max(sceneBounds.sizeX, sceneBounds.sizeZ) *
        cameraDistanceFactor *
        0.7, // Z position (distance)
  ];

  const canvasStyle = { background: "#e0e0e0" };

  return (
    <Canvas
      style={canvasStyle}
      camera={{
        position: cameraPosition,
        fov: 50,
        near: 10,
        far: Math.max(sceneBounds.sizeX, sceneBounds.sizeZ, WALL_HEIGHT_MM) * 5,
      }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[sceneBounds.sizeX, WALL_HEIGHT_MM * 2, sceneBounds.sizeZ]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[
          -sceneBounds.sizeX,
          WALL_HEIGHT_MM * 1.5,
          -sceneBounds.sizeZ,
        ]}
        intensity={0.5}
      />

      {rooms.map((room) => (
        <Room3D key={`room-${room.id}`} roomData={room} />
      ))}
      {walls.map((wall, index) => (
        <Wall3D
          key={`wall-${index}-${wall.xs}-${wall.ys}-${wall.type}`}
          wallData={wall}
        />
      ))}
      {/* Render Doors */}
      {doors.map((door, index) => (
        <Door3D key={`door-${index}-${door.x}-${door.z}`} doorData={door} />
      ))}

      <OrbitControls
        target={[sceneBounds.centerX, WALL_HEIGHT_MM / 3, sceneBounds.centerZ]}
      />

      <gridHelper
        args={[
          Math.max(sceneBounds.sizeX, sceneBounds.sizeZ) + 2000,
          40,
          "#888888",
          "#BBBBBB",
        ]}
        position={[sceneBounds.centerX, 0, sceneBounds.centerZ]}
      />
      <axesHelper
        args={[Math.max(sceneBounds.sizeX, sceneBounds.sizeZ) / 2 || 500]}
        position={[sceneBounds.minX - 100, 0, sceneBounds.minZ - 100]}
      />
    </Canvas>
  );
};

function Aside({
  example,
  setExample,
}: {
  example: (typeof examples)[number];
  setExample: (example: (typeof examples)[number]) => void;
}) {
  const [plan, setPlan] = React.useState(example.plan);
  const [graph, setGraph] = React.useState(example.graph);
  const [planError, setPlanError] = React.useState(false);
  const [graphError, setGraphError] = React.useState(false);

  React.useEffect(() => {
    setPlan(example.plan);
    setGraph(example.graph);
    setPlanError(false); // Reset errors when example changes
    setGraphError(false);
  }, [example]);

  const handleRender = () => {
    let currentPlanError = false;
    let currentGraphError = false;

    try {
      parseRoomPlan(plan); // Validate plan
      setPlanError(false);
    } catch (e) {
      console.error("Plan validation error:", e);
      setPlanError(true);
      currentPlanError = true;
    }

    try {
      parseGraph(graph); // Validate graph
      setGraphError(false);
    } catch (e) {
      console.error("Graph validation error:", e);
      setGraphError(true);
      currentGraphError = true;
    }

    if (!currentPlanError && !currentGraphError) {
      setExample({ label: example.label, plan, graph });
    }
  };

  return (
    <div className="min-w-md bg-gray-50 p-4 h-full">
      <div className="flex gap-2 justify-between w-full">
        <button
          className="bg-gray-900 text-white p-2 rounded-md w-full text-sm h-10"
          onClick={() => setExample(examples[0])}
        >
          Example 1
        </button>
        <button
          className="bg-gray-900 text-white p-2 rounded-md w-full text-sm  h-10"
          onClick={() => setExample(examples[1])}
        >
          Example 2
        </button>
        <button
          className="bg-gray-900 text-white p-2 rounded-md w-full text-sm  h-10"
          onClick={() => setExample(examples[2])}
        >
          Example 3
        </button>
      </div>
      <div className="flex flex-col gap-2 mt-4" key={JSON.stringify(example)}>
        <p className="text-sm font-bold">Layout Editor</p>
        <p className="text-sm font-bold">Plan</p>
        <div>
          <textarea
            rows={12}
            className={`w-full bg-gray-200 text-sm rounded-md ${
              planError ? "border-red-500 border-2" : "border-gray-300 border-2"
            }`}
            value={plan}
            onChange={(e) => {
              setPlan(e.target.value);
              if (planError) setPlanError(false);
            }}
          />
        </div>
        <p className="text-sm font-bold">Graph</p>
        <div>
          <textarea
            rows={12}
            className={`w-full bg-gray-200 text-sm rounded-md ${
              graphError
                ? "border-red-500 border-2"
                : "border-gray-300 border-2"
            }`}
            value={graph}
            onChange={(e) => {
              setGraph(e.target.value);
              if (graphError) setGraphError(false);
            }}
          />
        </div>
        <div>
          <button
            className="bg-gray-900 text-white p-2 rounded-md text-sm h-10 px-6"
            onClick={handleRender}
          >
            Render
          </button>
        </div>
      </div>
    </div>
  );
}

export function FloorPlanModel() {
  const [example, setExample] = React.useState(examples[0]);

  return (
    <div className="flex bg-white text-black">
      <div className="flex-1">
        <Aside example={example} setExample={setExample} />
      </div>
      <div className="flex-3 min-h-screen">
        <FloorPlanViewer example={example} />
      </div>
    </div>
  );
}
