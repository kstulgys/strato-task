import type { Route } from "./+types/home";
import { FloorPlanModel } from "~/lib/FloorPlanModel";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Room Planner" },
    { name: "description", content: "Welcome to Room Planner" },
  ];
}

export default function Home() {
  return <FloorPlanModel />;
}

// export function Example1() {
//   return <FloorPlanModel />;
// }
