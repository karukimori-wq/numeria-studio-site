import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const assetsDir = "dist/assets";
const assetName = readdirSync(assetsDir).find((name) => /^numeria-app-.*\.js$/.test(name));
if (!assetName) {
  throw new Error("Numeria application bundle was not found in dist/assets.");
}

const assetPath = `${assetsDir}/${assetName}`;
let source = readFileSync(assetPath, "utf8");
const marker = "NumeriaNavigationBridge.v1";
if (source.includes(marker)) {
  throw new Error("Numeria navigation bridge was applied more than once.");
}

const anchor = 'return(0,Z.jsxs)(`div`,{className:`app-shell`,children:[';
if (!source.includes(anchor)) {
  throw new Error("Expected Numeria app-shell render anchor was not found in the restored bundle.");
}

const bridge = `window.NumeriaNavigation={version:"${marker}",go:function(page){k(page)},newReading:function(){di()},openGuide:function(){Fn(!0)},openFeedback:function(){Vn(!0)},signOut:function(){return n()},getPage:function(){return O},getRole:function(){return tr},getPlan:function(){return ar}};`;
source = source.replace(anchor, bridge + anchor);

writeFileSync(assetPath, source);
console.log(`Stable Numeria navigation API exposed in ${assetName}.`);
