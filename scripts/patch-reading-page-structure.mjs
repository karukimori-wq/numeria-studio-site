import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
let html = readFileSync(htmlPath, "utf8");
const marker = "NumeriaReadingPageStructure.v6";

if (html.includes(marker)) {
  throw new Error("Reading page structure patch was applied more than once.");
}

if (!html.includes("</head>") || !html.includes("</body>")) {
  throw new Error("Expected closing head/body tags were not found.");
}

const style = `<style id="numeria-reading-page-structure-style">/* ${marker} */
.reading-flow-guide-unified,.reading-flow-guide{display:none!important}
.reading-unified-step-card{border:1px solid #e4dfe8;border-radius:18px;background:#fffdfd;margin:0 0 14px;box-shadow:0 10px 28px rgba(35,28,52,.04);overflow:hidden}
.reading-unified-step-card.is-open{border-color:#d2b15f;box-shadow:0 12px 32px rgba(166,133,62,.1)}
.reading-unified-step-head{width:100%;min-height:64px;border:0;background:#fff;display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px 18px;text-align:left;color:#1d1830;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:rgba(166,133,62,.16)}
.reading-unified-step-number{width:38px;height:38px;border-radius:999px;background:#1f1839;color:#d9bd70;display:grid;place-items:center;font:800 15px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.reading-unified-step-title{display:block;font:700 18px/1.35 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.01em}
.reading-unified-step-subtitle{display:block;margin-top:4px;color:#8e8792;font-size:12px;line-height:1.45;font-weight:600}
.reading-unified-step-toggle{color:#8e6e34;font-size:12px;font-weight:900;white-space:nowrap}
.reading-unified-step-body{padding:0 18px 18px}
.reading-step-collapsed>.reading-unified-step-body{display:none!important}
.reading-step-collapsed>.reading-unified-step-head .reading-unified-step-toggle::before{content:"開く"}
.reading-unified-step-card.is-open>.reading-unified-step-head .reading-unified-step-toggle::before{content:"閉じる"}
.reading-unified-step-body>.reading-unified-step-head,.reading-unified-step-card .reading-unified-step-card{margin-top:12px}
.reading-question-note{border:1px dashed #d8d1de;border-radius:14px;background:#fbfafc;color:#756e7d;font-size:12px;line-height:1.65;padding:12px 14px;margin:0 0 14px}
.reading-ai-assist-button{border:0!important;background:transparent!important;padding:0!important;margin:0 0 14px!important}
.reading-ai-assist-button summary{list-style:none;width:100%;min-height:52px;border:0;border-radius:15px;background:linear-gradient(135deg,#b99042,#dfc472);color:#171326;display:flex;align-items:center;justify-content:center;gap:8px;font:900 15px/1.25 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 12px 28px rgba(166,133,62,.18);cursor:pointer;touch-action:manipulation}
.reading-ai-assist-button summary::-webkit-details-marker{display:none}
.reading-ai-assist-button summary::after{content:"→";font-size:16px}
.reading-ai-assist-button[open] summary{border-radius:15px 15px 0 0}
.reading-ai-assist-button>div,.reading-ai-assist-button>section,.reading-ai-assist-button>article{border:1px solid #e6dfd1;border-top:0;border-radius:0 0 15px 15px;background:#fffdf8;padding:14px}
.reading-report-items-summary{border:1px solid #e6dfd1;border-radius:14px;background:#fbfaf6;padding:12px 14px;margin:12px 0;color:#655e69;font-size:12px;line-height:1.65}
@media (width <= 760px){
  .reading-workspace .editor-panel{gap:0!important}
  .reading-unified-step-card{border-radius:16px;margin-bottom:10px}
  .reading-unified-step-head{min-height:56px;grid-template-columns:38px minmax(0,1fr) auto;padding:12px 13px;gap:10px}
  .reading-unified-step-number{width:32px;height:32px;font-size:13px}
  .reading-unified-step-title{font-size:16px}
  .reading-unified-step-subtitle{font-size:11px}
  .reading-unified-step-body{padding:0 13px 14px}
}
</style>`;

const runtime = `<script id="numeria-reading-page-structure-runtime">/* ${marker} */(()=>{
const STEPS=[
  {key:"client",number:"1",title:"相談者を選ぶ",subtitle:"カルテから呼び出しか新規登録、基本情報を入力します"},
  {key:"question",number:"2",title:"相談内容",subtitle:"相談テーマ、相手がいる相談、Session情報を入力します"},
  {key:"format",number:"3",title:"鑑定書選択",subtitle:"鑑定書フォーマットと掲載項目を選びます"},
  {key:"results",number:"4",title:"鑑定計算結果の確認",subtitle:"占術ごとの計算結果と構成素材を確認します"},
  {key:"writing",number:"5",title:"鑑定結果入力",subtitle:"AI補助と鑑定本文の入力を行います"},
];
const STEP_BY_KEY=STEPS.reduce(function(map,step){map[step.key]=step;return map},{});
function q(root,selector){return root&&root.querySelector?root.querySelector(selector):null}
function qa(root,selector){return root&&root.querySelectorAll?Array.from(root.querySelectorAll(selector)):[]}
function topChild(container,node){if(!container||!node)return null;var current=node;while(current&&current.parentElement!==container)current=current.parentElement;return current&&current.parentElement===container?current:null}
function indexOfChild(node){return node&&node.parentElement?Array.prototype.indexOf.call(node.parentElement.children,node):-1}
function firstTop(container,selectors){var found=[];selectors.forEach(function(selector){var node=q(container,selector);var child=topChild(container,node);if(child)found.push(child)});found.sort(function(a,b){return indexOfChild(a)-indexOfChild(b)});return found[0]||null}
function blockByText(container,text){var nodes=qa(container,"section,details,article,div,label,fieldset");var best=null;for(var i=0;i<nodes.length;i++){var node=nodes[i];if(node.closest(".reading-unified-step-card"))continue;if(!String(node.textContent||"").includes(text))continue;var child=topChild(container,node);if(!child)continue;if(!best||String(child.textContent||"").length<String(best.textContent||"").length)best=child}return best}
function escapeHtml(value){return String(value).replace(/[&<>\"]/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[ch]})}
function headHtml(step){return '<button type="button" class="reading-unified-step-head" aria-expanded="true"><span class="reading-unified-step-number">'+escapeHtml(step.number)+'</span><span><span class="reading-unified-step-title">'+escapeHtml(step.title)+'</span><span class="reading-unified-step-subtitle">'+escapeHtml(step.subtitle)+'</span></span><span class="reading-unified-step-toggle" aria-hidden="true"></span></button>'}
function createCard(key){var step=STEP_BY_KEY[key];var card=document.createElement("section");card.className="reading-unified-step-card reading-step-"+key+" is-open";card.dataset.readingStep=key;card.innerHTML=headHtml(step)+'<div class="reading-unified-step-body"></div>';return card}
function ensureHeader(card,key){if(!card||card.dataset.readingStep)return null;var step=STEP_BY_KEY[key];card.classList.add("reading-unified-step-card","reading-step-"+key,"is-open");card.dataset.readingStep=key;var body=document.createElement("div");body.className="reading-unified-step-body";var nodes=Array.from(card.childNodes);card.insertAdjacentHTML("afterbegin",headHtml(step));nodes.forEach(function(node){body.appendChild(node)});card.appendChild(body);return card}
function setCollapsed(card,collapsed){if(!card)return;card.classList.toggle("reading-step-collapsed",!!collapsed);card.classList.toggle("is-open",!collapsed);var head=q(card,":scope>.reading-unified-step-head");if(head)head.setAttribute("aria-expanded",collapsed?"false":"true")}
function bindCollapse(root){qa(root,".reading-unified-step-card").forEach(function(card){if(card.dataset.readingCollapseBound)return;card.dataset.readingCollapseBound="1";var head=q(card,":scope>.reading-unified-step-head");if(!head)return;head.addEventListener("click",function(event){event.preventDefault();setCollapsed(card,!card.classList.contains("reading-step-collapsed"))})})}
function wrapRange(container,start,end,key){if(!container||!start||start.closest(".reading-unified-step-card"))return null;var card=createCard(key);container.insertBefore(card,start);var body=q(card,":scope>.reading-unified-step-body");var node=start;var guard=0;while(node&&node!==end&&guard<80){var next=node.nextSibling;body.appendChild(node);node=next;guard++}return card}
function normalizeGuide(root){qa(root,".reading-flow-guide,.reading-flow-guide-unified").forEach(function(node){node.classList.add("reading-flow-guide-unified");node.setAttribute("aria-hidden","true")})}
function buttonizeAiAssist(root){qa(root,".ai-assist-editor").forEach(function(node){node.classList.add("reading-ai-assist-button");var summary=q(node,"summary");if(summary){summary.innerHTML="<span>AI 鑑定補助</span>";summary.setAttribute("role","button");summary.setAttribute("aria-label","AI 鑑定補助を開く")}else{var button=q(node,"button");if(button&&String(button.textContent||"").includes("AI")){button.textContent="AI 鑑定補助";button.classList.add("reading-ai-assist-button-control")}}})}
function addReportItemsSummary(root){var format=q(root,'.reading-step-format .reading-unified-step-body');if(!format||q(format,".reading-report-items-summary"))return;var note=document.createElement("div");note.className="reading-report-items-summary";note.textContent="鑑定書フォーマットを選び、フォーマットに入れる項目をここで確認します。プレビューでも文章を直接編集できます。";format.appendChild(note)}
function prepareNumerology(){var root=q(document,".reading-workspace:not(.tarot-reading-workspace)");if(!root)return;var panel=q(root,".editor-panel")||root;if(panel.dataset.readingUnifiedReady==="1"){buttonizeAiAssist(panel);bindCollapse(panel);return}
normalizeGuide(panel);
var title=q(root,"h2");if(title&&String(title.textContent||"").match(/相談者情報|鑑定素材/))title.textContent="鑑定入力";
var lead=q(root,".page-lead,.editor-panel>p");if(lead&&String(lead.textContent||"").includes("生年月日"))lead.textContent="相談者、相談内容、鑑定書、計算結果、鑑定本文の順に作成します。";
var step2Start=blockByText(panel,"今回の相談テーマ")||blockByText(panel,"相談テーマ");
var step1Start=firstTop(panel,[".customer-picker",".client-profile-card",".form-grid"])||blockByText(panel,"鑑定カルテから呼び出す");
var clientCard=wrapRange(panel,step1Start,step2Start,"client");
var hardStops=qa(panel,".design-section,.report-composer-materials,.deep-reading-editor,.ai-assist-editor").map(function(node){return topChild(panel,node)}).filter(Boolean).sort(function(a,b){return indexOfChild(a)-indexOfChild(b)});
var step2End=hardStops.find(function(node){return !step2Start||indexOfChild(node)>indexOfChild(step2Start)})||null;
var questionCard=wrapRange(panel,step2Start,step2End,"question");
if(questionCard){var body=q(questionCard,":scope>.reading-unified-step-body");var compatibility=blockByText(panel,"特定の相手との相性を追加");if(body&&compatibility&&!questionCard.contains(compatibility)){body.appendChild(compatibility)}var note=document.createElement("div");note.className="reading-question-note";note.textContent="特定の相手との相談内容もこのセクションで入力します。";body.insertBefore(note,body.firstChild)}
var design=q(panel,".design-section");if(design)ensureHeader(design,"format");
var materials=q(panel,".report-composer-materials");if(materials)ensureHeader(materials,"results");
var writing=q(panel,".deep-reading-editor")||q(panel,".ai-assist-editor");if(writing){var writingCard=ensureHeader(topChild(panel,writing)||writing,"writing")||q(panel,'.reading-step-writing');var body=q(writingCard,":scope>.reading-unified-step-body");qa(panel,".ai-assist-editor,.writing-section,.report-writing-section").forEach(function(node){var child=topChild(panel,node)||node;if(body&&child!==writingCard&&!writingCard.contains(child))body.appendChild(child)})}
buttonizeAiAssist(panel);
addReportItemsSummary(panel);
qa(panel,".reading-unified-step-card").forEach(function(card,index){setCollapsed(card,index>0)});
panel.dataset.readingUnifiedReady="1";
bindCollapse(panel)}
function prepareTarot(){var root=q(document,".tarot-reading-workspace");if(!root)return;var panel=q(root,".editor-panel")||root;if(panel.dataset.readingUnifiedReady==="1"){buttonizeAiAssist(panel);bindCollapse(panel);return}
normalizeGuide(panel);
var cards=qa(panel,".tarot-editor-card").filter(function(card){return !card.closest(".reading-unified-step-card")});
if(cards[0])ensureHeader(cards[0],"client");
if(cards[1])ensureHeader(cards[1],"format");
if(cards[2])ensureHeader(cards[2],"results");
if(cards[3])ensureHeader(cards[3],"writing");
var clientBody=cards[0]&&q(cards[0],":scope>.reading-unified-step-body");if(clientBody&&!q(clientBody,".reading-question-note")){var note=document.createElement("div");note.className="reading-question-note";note.innerHTML="<strong>2 相談内容</strong><br>相談テーマと、特定の相手がいる場合の内容をここで入力します。";clientBody.appendChild(note)}
buttonizeAiAssist(panel);
qa(panel,".reading-unified-step-card").forEach(function(card,index){setCollapsed(card,index>0)});
panel.dataset.readingUnifiedReady="1";
bindCollapse(panel)}
function run(){prepareNumerology();prepareTarot()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();
var observer=new MutationObserver(function(){run()});
if(document.body)observer.observe(document.body,{childList:true,subtree:true});
setInterval(run,900);
})();</script>`;

html = html.replace("</head>", `${style}</head>`);
html = html.replace("</body>", `${runtime}</body>`);

for (const token of [
  marker,
  "相談者を選ぶ",
  "相談内容",
  "鑑定書選択",
  "鑑定計算結果の確認",
  "鑑定結果入力",
  "AI 鑑定補助",
  "特定の相手との相談内容",
  "プレビューでも文章を直接編集できます",
  ".reading-flow-guide-unified",
  ".reading-unified-step-head",
  ".reading-step-collapsed",
  ".reading-report-items-summary",
  ".tarot-reading-workspace",
  ".deep-reading-editor",
  ".report-composer-materials",
  ".design-section",
]) {
  if (!html.includes(token)) {
    throw new Error(`Reading page structure output is missing ${token}`);
  }
}

writeFileSync(htmlPath, html);
console.log("Reading page structure patched with real 5-step accordion sections and AI assist button styling.");
