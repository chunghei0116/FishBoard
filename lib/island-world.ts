export type Point = { x: number; z: number };
export const stations = [
  {
    id: "aquarium",
    href: "/journal#collection-title",
    name: "The aquarium",
    action: "Meet your fish",
    x: -4.7,
    z: 2.4,
    number: "01",
  },
  {
    id: "journal",
    href: "/journal#catch-log",
    name: "Catch journal",
    action: "Revisit your catches",
    x: 0,
    z: -3,
    number: "02",
  },
  {
    id: "toolbox",
    href: "/add",
    name: "Fishing toolbox",
    action: "Add a new catch",
    x: 5,
    z: 2,
    number: "03",
  },
  {
    id: "map",
    href: "/map",
    name: "Waterside map",
    action: "Explore your waters",
    x: 4,
    z: -4,
    number: "04",
  },
  {
    id: "cabin",
    href: "/settings",
    name: "Fisherman’s cabin",
    action: "Settings & account",
    x: -5,
    z: -2,
    number: "05",
  },
] as const;
export type StationId = (typeof stations)[number]["id"];
export function isWalkable(p: Point) {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return false;
  const onLand = (p.x / 9.1) ** 2 + (p.z / 6.9) ** 2 < 1;
  const onPier = p.x > 5.5 && p.x < 7.2 && p.z > 3 && p.z < 9.7;
  const cabin = p.x > -6.8 && p.x < -3.2 && p.z > -5.1 && p.z < -1.7;
  const tank = p.x > -6.4 && p.x < -3 && p.z > 1.5 && p.z < 3.3;
  return (onLand || onPier) && !cabin && !tank;
}
export function movePlayer(p: Point, d: Point, dt: number): Point {
  const len = Math.hypot(d.x, d.z);
  if (!len) return p;
  const step = (3.1 * Math.min(Math.max(dt, 0), 0.05)) / len;
  const next = { x: p.x + d.x * step, z: p.z + d.z * step };
  if (isWalkable(next)) return next;
  if (isWalkable({ x: next.x, z: p.z })) return { x: next.x, z: p.z };
  if (isWalkable({ x: p.x, z: next.z })) return { x: p.x, z: next.z };
  return p;
}
export function nearestStation(p: Point) {
  return (
    stations
      .map((s) => ({ station: s, distance: Math.hypot(s.x - p.x, s.z - p.z) }))
      .filter((s) => s.distance < 2.25)
      .sort((a, b) => a.distance - b.distance)[0]?.station ?? null
  );
}

/** Small fixed navigation grid keeps click-to-walk off the water and around buildings. */
export function findPath(start: Point, goal: Point): Point[] {
  if (!isWalkable(start) || !isWalkable(goal)) return [];
  const size = 0.4,
    width = 51,
    height = 46;
  const point = (id: number): Point => ({
    x: (id % width) * size - 10,
    z: Math.floor(id / width) * size - 8,
  });
  const gridId = (p: Point) =>
    Math.round((p.z + 8) / size) * width + Math.round((p.x + 10) / size);
  const valid = (id: number) =>
    id >= 0 &&
    id < width * height &&
    [
      [-0.18, 0],
      [0.18, 0],
      [0, -0.18],
      [0, 0.18],
    ].every(([x, z]) => isWalkable({ x: point(id).x + x, z: point(id).z + z }));
  const closest = (p: Point) => {
    const id = gridId(p);
    if (valid(id)) return id;
    for (const d of [
      -1,
      1,
      -width,
      width,
      -width - 1,
      -width + 1,
      width - 1,
      width + 1,
    ])
      if (valid(id + d)) return id + d;
    return -1;
  };
  const first = closest(start),
    last = closest(goal);
  if (first < 0 || last < 0) return [];
  const parents = new Int32Array(width * height).fill(-1),
    queue = [first];
  parents[first] = first;
  for (let head = 0; head < queue.length && parents[last] === -1; head++) {
    const id = queue[head],
      x = id % width,
      z = Math.floor(id / width);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        n = nz * width + nx;
      if (
        nx < 0 ||
        nx >= width ||
        nz < 0 ||
        nz >= height ||
        parents[n] !== -1 ||
        !valid(n)
      )
        continue;
      if (dx && dz && (!valid(z * width + nx) || !valid(nz * width + x)))
        continue;
      parents[n] = id;
      queue.push(n);
    }
  }
  if (parents[last] === -1) return [];
  const path: Point[] = [goal];
  let id = last;
  while (id !== first) {
    path.push(point(id));
    id = parents[id];
  }
  path.reverse();
  return path;
}
