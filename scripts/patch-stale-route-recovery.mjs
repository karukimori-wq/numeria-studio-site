import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
let html = readFileSync(htmlPath, "utf8");
const marker = "NumeriaStaleRouteRecovery.v1";

if (html.includes(marker)) {
  throw new Error("Stale route recovery patch was applied more than once.");
}
if (!html.includes("<head>")) {
  throw new Error("Expected <head> in restored Production HTML.");
}

const recovery = `<script id="numeria-stale-route-recovery">/* ${marker} */(()=>{
  const staleHashes=["#/support","#/plan"];
  const staleHash=staleHashes.some((prefix)=>String(location.hash||"").startsWith(prefix));
  const staleState=Boolean(history.state&&history.state.numeriaDedicatedPage);
  if(staleHash||staleState){
    history.replaceState(null,"",location.pathname+location.search);
  }
  function cleanup(){
    document.documentElement.classList.remove("numeria-dedicated-page-open");
    if(document.body)document.body.classList.remove("numeria-dedicated-page-open");
    const staleRoot=document.getElementById("numeria-dedicated-pages");
    if(staleRoot)staleRoot.remove();
  }
  cleanup();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",cleanup,{once:true});
  window.addEventListener("pageshow",cleanup);
})();</script>`;

html = html.replace("<head>", `<head>${recovery}`);

for (const token of [
  marker,
  'startsWith(prefix)',
  'history.replaceState(null,"",location.pathname+location.search)',
  'numeria-dedicated-page-open',
  'numeria-dedicated-pages',
]) {
  if (!html.includes(token)) {
    throw new Error(`Stale route recovery output is missing ${token}`);
  }
}

writeFileSync(htmlPath, html);
console.log("Stale dedicated-page routes and DOM state are cleared before Numeria app startup.");
