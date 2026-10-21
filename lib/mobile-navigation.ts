type ScrollState = { lastY: number; travel: number; hidden: boolean };

export function updateAddVisibility(state: ScrollState, scrollY: number, maxY: number): ScrollState {
  const y = Math.max(0, Math.min(scrollY, Math.max(0, maxY)));
  if (y <= 24) return { lastY: y, travel: 0, hidden: false };
  const delta = y - state.lastY;
  const travel = delta === 0 ? state.travel :
    Math.sign(delta) === Math.sign(state.travel) ? state.travel + delta : delta;
  return { lastY: y, travel, hidden: travel >= 12 ? true : travel <= -8 ? false : state.hidden };
}
