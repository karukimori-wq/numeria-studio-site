import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
const html = readFileSync(htmlPath, "utf8");

// The original application already renders its own bottom menu. The v1
// runtime appended a second, foreground menu to document.body. Keep the
// original menu and remove only that overlay from any restored build input.
const cleaned = html
  .replace(/<style\b[^>]*\bid=["']numeria-mobile-bottom-navigation-style["'][^>]*>[\s\S]*?<\/style>\s*/gi, "")
  .replace(/<script\b[^>]*\bid=["']numeria-mobile-bottom-navigation-runtime["'][^>]*>[\s\S]*?<\/script>\s*/gi, "");

writeFileSync(htmlPath, cleaned);
console.log("Original bottom menu retained; duplicate foreground navigation is no longer injected.");
