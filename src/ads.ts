// Inert by design. Real advertising requires approval and consent integration.
export const AD_CONFIG = {
  enabled: false,
  publisherId: "",
  betweenMatches: false,
} as const;
export const adPlaceholder = () =>
  '<aside class="ad-space" aria-label="Reserved advertising area"><span>ADVERTISEMENT</span><small>A little breathing room between chases.</small></aside>';
// Future provider: production only, after consent, never inside game.ts.
