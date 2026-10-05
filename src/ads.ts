// Manual slots remain inert. The public site's head loads the AdSense tag;
// Auto ads and consent messaging are configured separately in AdSense.
export const AD_CONFIG = {
  enabled: false,
  publisherId: "ca-pub-4197964753033984",
  betweenMatches: false,
} as const;
export const AD_PLACEMENTS = {
  "home-inline": "banner",
  "home-bottom": "banner",
  "game-left": "rail",
  "game-right": "rail",
  "game-bottom": "banner",
  results: "banner",
  lobby: "banner",
} as const;
export function adPlaceholder(id: keyof typeof AD_PLACEMENTS) {
  if (import.meta.env.MODE === "crazygames") return "";
  const format = AD_PLACEMENTS[id];
  return `<aside class="ad-space ad-${format} ad-${id}" data-ad-placement="${id}" aria-label="Advertisement space"><span>ADVERTISEMENT</span><small>Reserved ad space</small></aside>`;
}
export const gameAdRails = () =>
  adPlaceholder("game-left") + adPlaceholder("game-right");
// Manual units require real slot IDs and consent integration, never inside game.ts.
