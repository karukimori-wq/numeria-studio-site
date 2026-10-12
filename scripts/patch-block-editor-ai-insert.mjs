import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const directory = "dist/assets";
const asset = readdirSync(directory).find((file) => /^numeria-app-runtime-.*\.js$/.test(file)) || "numeria-app-Cckhajir.js";
const target = `${directory}/${asset}`;
let source = readFileSync(target, "utf8");
source = source.replace(/;\(\(\)=>\{if\(window\.__NumeriaBlockEditorAiInsertV1\)[\s\S]*?\/\* block-editor-ai-insert-end \*\/\}\)\(\);/g, "");

const runtime = String.raw`;(()=>{if(window.__NumeriaBlockEditorAiInsertV1)return;window.__NumeriaBlockEditorAiInsertV1=1;let draft="",mount=()=>{document.querySelectorAll(".numeria-block-editor .nbe-ai").forEach(block=>{let meta=block.querySelector(".nbe-meta");if(!meta||meta.querySelector("[data-ai-insert]"))return;let button=document.createElement("button");button.dataset.aiInsert="1";button.textContent="AI下書きを挿入";button.disabled=!draft;button.title=draft?"空のAIブロックへ挿入します":"鑑定画面でAI下書きを作成すると有効になります";button.onclick=()=>{let field=block.querySelector("textarea[data-edit]");if(!draft||!field)return;if(field.value.trim()){button.title="手入力済みの文章は上書きしません";return}field.value=draft;field.dispatchEvent(new Event("input",{bubbles:true}));button.textContent="AI下書きを挿入済み";button.disabled=true};meta.append(button)})};window.addEventListener("numeria:ai-draft-ready",event=>{draft=String(event.detail?.output||"").trim();mount();document.querySelectorAll("[data-ai-insert]").forEach(button=>{button.disabled=!draft;button.title=draft?"空のAIブロックへ挿入します":"AI下書きがありません"})});new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});mount()/* block-editor-ai-insert-end */})();`;
writeFileSync(target, source + runtime);
console.log(`Block editor AI draft insert patched into ${target}.`);
