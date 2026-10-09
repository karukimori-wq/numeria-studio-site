import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const patchPath = resolve("scripts/patch-mobile-bottom-navigation.mjs");
const directory = mkdtempSync(join(tmpdir(), "numeria-bottom-menu-"));
try {
  mkdirSync(join(directory, "dist"));
  const htmlPath = join(directory, "dist/original.html");
  const original = '<html><head><style id="existing-style">nav{display:flex}</style></head><body><nav class="original-bottom-menu">Original menu</nav><script id="existing-runtime">window.originalMenu=true;</script></body></html>';
  const overlayStyle = '<style id="numeria-mobile-bottom-navigation-style">/* NumeriaMobileBottomNavigation.v1 */ .overlay{position:fixed}</style>';
  const overlayRuntime = '<script id="numeria-mobile-bottom-navigation-runtime">/* NumeriaMobileBottomNavigation.v1 */ document.body.appendChild(document.createElement("nav"));</script>';
  const stale = original.replace("</head>", overlayStyle + "</head>").replace("</body>", overlayRuntime + "</body>");

  for (const input of [original, stale]) {
    writeFileSync(htmlPath, input);
    execFileSync(process.execPath, [patchPath], { cwd: directory });
    assert.equal(readFileSync(htmlPath, "utf8"), original, "Keep the original menu and unrelated styles/scripts, without an overlay");
    execFileSync(process.execPath, [patchPath], { cwd: directory });
    assert.equal(readFileSync(htmlPath, "utf8"), original, "Repeated builds must not add another menu");
  }
  console.log("Bottom navigation verified: original retained, foreground overlay removed, repeated builds unchanged.");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
