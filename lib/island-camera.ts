export function isMobileIslandViewport(width: number, height: number, coarse: boolean) {
  return width <= 700 || (coarse && width <= 1000 && height <= 500);
}

/** Give the island a brief establishing view, then ease into the player's space. */
export function mobileIslandZoom(elapsed: number, reduced: boolean) {
  const progress = reduced ? 1 : Math.max(0, Math.min(1, (elapsed - 0.35) / 1.65));
  return 1 + 1.2 * progress * progress * (3 - 2 * progress);
}
