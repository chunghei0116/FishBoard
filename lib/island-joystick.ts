/** Radial dead zone prevents drift; thumb travel and walking speed stay bounded. */
export function joystickPosition(dx: number, dy: number, radius: number) {
  if (![dx, dy, radius].every(Number.isFinite) || radius <= 0)
    return { thumbX: 0, thumbY: 0, x: 0, z: 0 };
  const distance = Math.hypot(dx, dy);
  const travel = Math.min(distance, radius);
  const speed = Math.max(0, (travel / radius - 0.14) / 0.86);
  const unitX = distance ? dx / distance : 0;
  const unitY = distance ? dy / distance : 0;
  return {
    thumbX: unitX * travel,
    thumbY: unitY * travel,
    x: unitX * speed,
    z: unitY * speed,
  };
}
