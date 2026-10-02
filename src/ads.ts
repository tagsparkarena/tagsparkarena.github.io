// Inert by design. Real advertising requires approval and consent integration.
export const AD_CONFIG = {
  enabled: false,
  publisherId: "ca-pub-4197964753033984",
  betweenMatches: false,
} as const;
export const adPlaceholder = () =>
  '<aside class="ad-space" aria-label="Reserved advertising area"><span>ADVERTISEMENT</span></aside>';
// Future provider: production only, after consent, never inside game.ts.
