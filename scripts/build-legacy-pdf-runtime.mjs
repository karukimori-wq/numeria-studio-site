import { build } from "vite";

const entries = [
  ["src/legacy-pdf-jspdf-entry.js", "jspdf.es.min-BfRqlasZ.js"],
  ["src/legacy-pdf-image-entry.js", "es-CqqE0H6X.js"],
];

for (const [entry, fileName] of entries) {
  await build({
    configFile: false,
    publicDir: false,
    build: {
      copyPublicDir: false,
      emptyOutDir: false,
      minify: true,
      codeSplitting: false,
      outDir: "dist/assets",
      lib: { entry, formats: ["es"], fileName: () => fileName },
    },
  });
}

console.log("Legacy PDF runtime chunks built with their original import names.");
