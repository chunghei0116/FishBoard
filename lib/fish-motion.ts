export type FishMotion = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  rest: number;
  decisionIn: number;
  seed: number;
  speed: number;
};
const clamp = (value: number) => Math.max(0, Math.min(1, value));
function random(seed: number) {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { seed: next, value: next / 4294967296 };
}
export function createFishMotion(id: string, x: number, y: number): FishMotion {
  let seed = 2166136261;
  for (const letter of id)
    seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619) >>> 0;
  const direction = random(seed),
    pace = random(direction.seed),
    drift = random(pace.seed);
  const speed = 12 + pace.value * 14;
  const vx = direction.value < 0.5 ? -speed : speed;
  return {
    x: clamp(x),
    y: clamp(y),
    vx,
    vy: (drift.value - 0.5) * 9,
    facing: Math.sign(vx),
    rest: 0,
    decisionIn: 3 + drift.value * 5,
    seed: drift.seed,
    speed,
  };
}
// Motion is presentation only. Manual placement remains the saved home position.
export function advanceFish(
  fish: FishMotion,
  elapsed: number,
  width: number,
  height: number,
  paused = false,
): FishMotion {
  if (paused || width <= 0 || height <= 0 || elapsed <= 0) return fish;
  const dt = Math.min(elapsed, 0.05),
    next = { ...fish };
  if (next.rest > 0) {
    next.rest = Math.max(0, next.rest - dt);
    return next;
  }
  next.decisionIn -= dt;
  if (next.decisionIn <= 0) {
    const choice = random(next.seed),
      drift = random(choice.seed),
      timing = random(drift.seed);
    next.seed = timing.seed;
    next.decisionIn = 4 + timing.value * 7;
    if (choice.value < 0.22) {
      next.rest = 0.6 + drift.value * 1.8;
      return next;
    }
    if (choice.value > 0.65) next.vx *= -1;
    next.vy = (drift.value - 0.5) * 12;
  }
  const proposedX = next.x + (next.vx * dt) / width;
  const proposedY = next.y + (next.vy * dt) / height;
  if (proposedX < 0) next.vx = next.speed;
  if (proposedX > 1) next.vx = -next.speed;
  if (proposedY < 0) next.vy = Math.abs(next.vy);
  if (proposedY > 1) next.vy = -Math.abs(next.vy);
  next.x = clamp(proposedX);
  next.y = clamp(proposedY);
  next.facing = Math.sign(next.vx);
  return next;
}
