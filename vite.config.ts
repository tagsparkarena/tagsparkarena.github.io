import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const crazyGames = mode === "crazygames";
  const base = crazyGames ? "./" : env.VITE_BASE_PATH || "/";
  const origin = crazyGames ? undefined : env.VITE_SITE_URL?.replace(/\/$/, "");
  if (origin) {
    const parsed = new URL(origin);
    if (
      !["https:", "http:"].includes(parsed.protocol) ||
      parsed.origin !== origin
    )
      throw new Error(
        "VITE_SITE_URL must be an http(s) origin without a path or query.",
      );
  }
  return {
    base,
    server: { watch: { usePolling: true, interval: 500 } },
    build: {
      chunkSizeWarningLimit: 1600,
      outDir: crazyGames ? "dist-crazygames" : "dist",
    },
    plugins: [
      {
        name: "public-metadata",
        transformIndexHtml(html) {
          if (crazyGames) {
            html = html
              .replace(
                /<script id="tagspark-adsense-loader">[\s\S]*?<\/script>/,
                "",
              )
              .replace(/<meta name="google-adsense-account"[^>]*\/>/, "")
              .replace(/<link rel="manifest"[^>]*\/>/, "");
          }
          return origin
            ? html.replace(
                "</head>",
                `<link rel="canonical" href="${origin}${base}"><meta property="og:url" content="${origin}${base}"><meta property="og:image" content="${origin}${base}social-preview.png"><meta property="og:image:alt" content="TagSpark Arena: four colorful characters chase the spark"><meta name="twitter:card" content="summary_large_image"></head>`,
              )
            : html;
        },
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "sitemap.xml",
            source: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${origin ? `<url><loc>${origin}${base}</loc></url>` : ""}</urlset>`,
          });
        },
      },
    ],
  };
});
