import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
let html = readFileSync(htmlPath, "utf8");
const marker = "NumeriaRuntimeBootDiagnostics.v3";

if (html.includes(marker)) throw new Error("Runtime boot diagnostics patch was applied more than once.");
if (!html.includes("<head>")) throw new Error("Expected <head> in Production HTML.");

const script = `<script id="numeria-runtime-boot-diagnostics">/* ${marker} */(()=>{
  const state=window.NumeriaRuntimeBootDiagnostics={marker:"${marker}",startedAt:new Date().toISOString(),errors:[]};
  function clean(value){return String(value==null?"":value).replace(/\\s+/g," ").slice(0,500)}
  function record(kind,message,source,line,column){
    state.errors.push({kind,message:clean(message),source:clean(source),line:line||null,column:column||null,at:new Date().toISOString()});
    if(state.errors.length>8)state.errors.shift();
  }
  window.addEventListener("error",event=>record("error",event.message||event.error&&event.error.message,event.filename,event.lineno,event.colno),true);
  window.addEventListener("unhandledrejection",event=>record("unhandledrejection",event.reason&&event.reason.message||event.reason||"Promise rejected","",null,null),true);
  function appMounted(){
    const bodyText=(document.body&&document.body.innerText||"");
    return !!document.querySelector(".app-shell,.dashboard,.page,.main-area,[data-numeria-app]") &&
      !(/^\\s*☰\\s*メニュー\\s*$/.test(bodyText.trim()));
  }
  function show(){
    if(appMounted())return;
    let el=document.getElementById("numeria-runtime-boot-failure");
    if(!el){el=document.createElement("section");el.id="numeria-runtime-boot-failure";(document.body||document.documentElement).appendChild(el)}
    const last=state.errors[state.errors.length-1];
    const resources=performance.getEntriesByType("resource").map(entry=>entry.name).filter(name=>/index-|numeria-app-|framework-|rolldown-runtime-/.test(name));
    const nodes=[".app-shell","aside.sidebar",".page",".main-area",".auth-loading"].map(selector=>selector+"="+document.querySelectorAll(selector).length).join(" / ");
    const rsc="RSC done="+String(!!window.__VINEXT_RSC_DONE__)+" chunks="+String((window.__VINEXT_RSC_CHUNKS__||[]).length);
    const nav="Navigation="+String(!!window.NumeriaNavigation);
    const recovery="recovery="+String(state.recovery||"pending");
    const loaded="runtime resources="+String(resources.length)+" "+resources.slice(-3).map(url=>url.split("/").pop()).join(", ");
    const lastError=last?(last.kind+": "+last.message+(last.source?" @ "+last.source:"")):"error=none";
    const detail=[lastError,nav,rsc,recovery,nodes,loaded].join("\\n");
    el.style.cssText="position:fixed;left:16px;right:16px;top:120px;z-index:2147483646;padding:16px;border:1px solid #d7d0c4;border-radius:16px;background:#fffdf8;color:#241b3a;font:13px/1.6 system-ui,-apple-system,sans-serif;box-shadow:0 12px 36px rgba(36,27,58,.14);word-break:break-word";
    el.innerHTML="<strong style='display:block;font-size:15px;margin-bottom:6px'>Numeria本体の起動を確認できません</strong><span style='display:block;margin-bottom:8px'>起動診断: ${marker}</span><code style='display:block;white-space:pre-wrap'>"+detail.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))+"</code>";
  }
  function recoverFromCachedLegacyIndex(){
    if(appMounted()||state.recovery==="started"||state.recovery==="done")return;
    if(!window.__VINEXT_RSC_DONE__)return;
    state.recovery="started";
    import("/assets/index-CYZnnbch.js?numeria-recovery=${marker}-"+Date.now()).then(()=>{state.recovery="done";setTimeout(show,1200)}).catch(error=>{state.recovery="failed";record("recovery",error&&error.message||error,"/assets/index-CYZnnbch.js",null,null);show()});
  }
  window.addEventListener("numeria-navigation-ready",()=>{state.navigationReady=true;const el=document.getElementById("numeria-runtime-boot-failure");if(el)el.remove()});
  setTimeout(recoverFromCachedLegacyIndex,1800);
  setTimeout(recoverFromCachedLegacyIndex,3600);
  setTimeout(show,5000);
  setTimeout(recoverFromCachedLegacyIndex,6500);
  setTimeout(show,10000);
})();</script>`;

html = html.replace("<head>", `<head>${script}`);
writeFileSync(htmlPath, html);
console.log("Runtime boot diagnostics installed before Numeria module startup.");
