export type MotionState = { blend: number; phase: number; yaw: number };
export function smoothAngle(from: number, to: number, dt: number) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * (1 - Math.exp(-12 * Math.min(Math.max(dt, 0), 0.05)));
}
export function updateMotion(
  state: MotionState,
  moving: boolean,
  distance: number,
  targetYaw: number,
  dt: number,
): MotionState {
  const delta = Math.min(Math.max(dt, 0), 0.05);
  return {
    blend:
      state.blend +
      ((moving ? 1 : 0) - state.blend) *
        (1 - Math.exp(-(moving ? 12 : 9) * delta)),
    phase: state.phase + Math.max(0, distance) * 5.3,
    yaw: smoothAngle(state.yaw, targetYaw, delta),
  };
}
export function sampleGait(state: MotionState, time: number, reduced: boolean) {
  const { phase } = state,
    b = reduced ? 0 : state.blend;
  return {
    legs: [Math.sin(phase) * 0.5 * b, Math.sin(phase + Math.PI) * 0.5 * b],
    knees: [
      Math.max(0, -Math.sin(phase)) * 0.65 * b,
      Math.max(0, -Math.sin(phase + Math.PI)) * 0.65 * b,
    ],
    arms: [-Math.sin(phase) * 0.3 * b, -Math.sin(phase + Math.PI) * 0.3 * b],
    bob: (1 - Math.cos(phase * 2)) * 0.019 * b,
    sway: Math.sin(phase) * 0.025 * b,
    lean: 0.065 * b,
    breath: reduced ? 0 : Math.sin(time * 1.8) * 0.008 * (1 - state.blend),
  };
}
