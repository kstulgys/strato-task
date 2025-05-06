## Getting Started

### Installation

Install the dependencies:

```bash
bun install
```

### Development

Start the development server with HMR:

```bash
bun dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
bun build
```

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `bun build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

---

# Task

Create walls from room plan.

**What you need to know:**

- Room plan -- layout of rooms without any objects in special grid units.
- `grid unit = 600 mm`
- Let's say there is two types of walls: outer and inner.
  - outer wall width = 380 mm, combines a wall of two elements 80 mm (inner part) and 300 mm (outer part)
  - inner wall size = 90 mm
- Room graph -- defines connections between rooms.
  - wall -- there is a wall between two rooms
  - door -- there should be a door between two rooms (i.e. you should create a wall, skip putting doors)
  - void -- rooms are connected, but there is no wall between them
- Rooms are always rectangular defined by bounding boxes, `xs,ys,xe,ye` format.
- Assume this room types exist: Living, DiningKitchen, Dining, Kitchen, Bedroom, Office, Shower, WC, Dressing, Entryway, CorridorV, CorridorH, Hall

**Expected output:**

- Rooms dictionary like room plan, in mm.
- Walls, in mm.
- Visualize results in 3D model, best with "React Three Fiber"
- Creating API endpoints to construct walls and visualize plans will be a plus.
- Anything else you deem necessary.

**Inputs:**

It's just some examples, the algorithm should work for any plan.

```ts
room_plan = [
    DiningKitchen(109): BBox(xs=5, ys=5, xe=10, ye=13),
    Hall(110): BBox(xs=3, ys=0, xe=10, ye=5),
    Bedroom(111): BBox(xs=10, ys=3, xe=15, ye=10),
    Shower(112): BBox(xs=10, ys=0, xe=15, ye=3),
    Living(113): BBox(xs=0, ys=5, xe=5, ye=13),
    Entryway(114): BBox(xs=0, ys=0, xe=3, ye=5)
}
graph = {
    Edge(i=Entryway(114), j=Hall(110), separation='door'),
    Edge(i=Hall(110), j=Living(113), separation='void'),
    Edge(i=Living(113), j=DiningKitchen(109), separation='void'),
    Edge(i=Hall(110), j=Bedroom(111), separation='door'),
    Edge(i=Hall(110), j=Shower(112), separation='door'),
    Edge(i=Shower(112), j=Bedroom(111), separation='wall'),
]
```

```ts
room_plan = {
    DiningKitchen(110): BBox(xs=0, ys=6, xe=6, ye=15),
    Bedroom(111): BBox(xs=9, ys=8, xe=14, ye=13),
    Entryway(112): BBox(xs=9, ys=5, xe=14, ye=8),
    Shower(113): BBox(xs=6, ys=10, xe=9, ye=15),
    CorridorV(114): BBox(xs=6, ys=6, xe=9, ye=10),
    Dressing(115): BBox(xs=9, ys=13, xe=14, ye=15),
    Living(116): BBox(xs=0, ys=0, xe=9, ye=6)
}
graph = [
    Edge(i=Entryway(112), j=CorridorV(114), separation='door'),
    Edge(i=CorridorV(114), j=Living(116), separation='void'),
    Edge(i=Living(116), j=DiningKitchen(110), separation='void'),
    Edge(i=CorridorV(114), j=Bedroom(111), separation='door'),
    Edge(i=Bedroom(111), j=Dressing(115), separation='door'),
    Edge(i=CorridorV(114), j=Shower(113), separation='door'),
    Edge(i=Shower(113), j=Bedroom(111), separation='wall'),
]
```

```ts
room_plan = {
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
}
graph = [
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
]
```
