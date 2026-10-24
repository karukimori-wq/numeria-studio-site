import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

const legacyAssetsRoot = resolve(process.cwd(), "assets");

function serveLegacyAssets() {
  return {
    name: "serve-legacy-assets-as-is",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
        if (!pathname.startsWith("/assets/")) return next();

        const relativePath = decodeURIComponent(pathname.slice("/assets/".length));
        const assetPath = resolve(legacyAssetsRoot, relativePath);
        if (!assetPath.startsWith(`${legacyAssetsRoot}${sep}`)) return next();

        try {
          const asset = await readFile(assetPath);
          if (assetPath.endsWith(".js")) response.setHeader("Content-Type", "text/javascript");
          if (assetPath.endsWith(".css")) response.setHeader("Content-Type", "text/css");
          response.statusCode = 200;
          response.end(asset);
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [serveLegacyAssets(), react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
