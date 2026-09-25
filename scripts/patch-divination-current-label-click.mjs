import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/index.html";
let html = readFileSync(htmlPath, "utf8");
const marker = "NumeriaDivinationCurrentMenuLabelClick.v1";
if (html.includes(marker)) {
  throw new Error("Current divination menu label click patch was applied more than once.");
}

const source = String.raw`(()=>{
const MARK="NumeriaDivinationCurrentMenuLabelClick.v1";
function normalizedText(node){return String(node&&node.textContent||"").replace(/\s+/g,"").trim()}
function matchesCurrentDivinationLabel(node){
  const text=normalizedText(node);
  return text.indexOf("占術の設定")>=0||text.indexOf("占術の設定・変更")>=0;
}
function findMenuNode(target){
  if(!target||!target.closest)return target;
  return target.closest("button,a,[role=button],li,div,span,h1,h2,h3,p");
}
document.addEventListener("click",function(event){
  const node=findMenuNode(event.target);
  if(!node||!matchesCurrentDivinationLabel(node))return;
  event.preventDefault();
  event.stopPropagation();
  if(typeof window.NumeriaOpenDivinationSettingsFallback==="function"){
    window.NumeriaOpenDivinationSettingsFallback();
    return;
  }
  const notice=document.createElement("div");
  notice.textContent="占術設定パネルを読み込み中です。もう一度押してください。";
  notice.style.cssText="position:fixed;left:16px;right:16px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:2147483647;background:#171326;color:#fff;padding:12px 14px;border-radius:14px;font:700 13px system-ui,-apple-system,BlinkMacSystemFont,sans-serif;text-align:center;box-shadow:0 12px 34px rgba(0,0,0,.24)";
  document.body.appendChild(notice);
  setTimeout(()=>notice.remove(),1800);
},true);
})();`;

const injection = `<!-- ${marker} --><script id="numeria-divination-current-label-click">${source}</script>`;
if (html.includes("</body>")) {
  html = html.replace("</body>", `${injection}</body>`);
} else {
  html += injection;
}
writeFileSync(htmlPath, html);
console.log("Current divination menu label click patch injected into production HTML.");
