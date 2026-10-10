import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
let html = readFileSync(htmlPath, "utf8");
const marker = "NumeriaRuntimeBootDiagnostics.v5";

if (html.includes(marker)) throw new Error("Runtime boot diagnostics patch was applied more than once.");
if (!html.includes("<head>")) throw new Error("Expected <head> in Production HTML.");

const script = `<script id="numeria-runtime-boot-diagnostics">/* ${marker} */(()=>{
  const state=window.NumeriaRuntimeBootDiagnostics={marker:"${marker}",startedAt:new Date().toISOString(),startedAtMs:Date.now(),errors:[]};
  function clean(value){return String(value==null?"":value).replace(/\\s+/g," ").slice(0,500)}
  function record(kind,message,source,line,column){
    state.errors.push({kind,message:clean(message),source:clean(source),line:line||null,column:column||null,at:new Date().toISOString()});
    if(state.errors.length>8)state.errors.shift();
  }
  window.addEventListener("error",event=>record("error",event.message||event.error&&event.error.message,event.filename,event.lineno,event.colno),true);
  window.addEventListener("unhandledrejection",event=>record("unhandledrejection",event.reason&&event.reason.message||event.reason||"Promise rejected","",null,null),true);
  function authMounted(){
    const bodyText=(document.body&&document.body.innerText||"");
    return /はじめての方はこちら|新規登録|パスワードを忘れた方|メールアドレス|ログイン/.test(bodyText) &&
      !!document.querySelector("input,button,a");
  }
  function appMounted(){
    const bodyText=(document.body&&document.body.innerText||"");
    if(authMounted())return true;
    return !!document.querySelector(".app-shell,.dashboard,.page,.main-area,[data-numeria-app]") &&
      !(/^\\s*☰\\s*メニュー\\s*$/.test(bodyText.trim()));
  }
  function hide(){
    const el=document.getElementById("numeria-runtime-boot-failure");
    if(el)el.remove();
  }
  function show(){
    if(appMounted()){hide();return;}
    const failed=state.recovery==="failed"&&state.directMount==="failed";
    const timedOut=Date.now()-state.startedAtMs>=30000;
    let el=document.getElementById("numeria-runtime-boot-failure");
    if(!el){el=document.createElement("section");el.id="numeria-runtime-boot-failure";(document.body||document.documentElement).appendChild(el)}
    el.style.cssText="position:fixed;left:16px;right:16px;top:120px;z-index:2147483646;padding:16px;border:1px solid #d7d0c4;border-radius:16px;background:#fffdf8;color:#241b3a;font:14px/1.6 system-ui,-apple-system,sans-serif;box-shadow:0 12px 36px rgba(36,27,58,.14);word-break:break-word";
    el.setAttribute("role","status");
    el.setAttribute("aria-live","polite");
    if(!failed&&!timedOut){
      el.innerHTML="<strong>読み込み中です…</strong><p style='margin:6px 0 0'>画面を準備しています。しばらくお待ちください。</p>";
      return;
    }
    const last=state.errors[state.errors.length-1];
    const resources=performance.getEntriesByType("resource").map(entry=>entry.name).filter(name=>/index-|numeria-app-|framework-|rolldown-runtime-/.test(name));
    const nodes=[".app-shell","aside.sidebar",".page",".main-area",".auth-loading","input","button"].map(selector=>selector+"="+document.querySelectorAll(selector).length).join(" / ");
    const rsc="RSC done="+String(!!window.__VINEXT_RSC_DONE__)+" chunks="+String((window.__VINEXT_RSC_CHUNKS__||[]).length);
    const nav="Navigation="+String(!!window.NumeriaNavigation);
    const recovery="recovery="+String(state.recovery||"pending");
    const directMount="directMount="+String(state.directMount||"pending");
    const loaded="runtime resources="+String(resources.length)+" "+resources.slice(-3).map(url=>url.split("/").pop()).join(", ");
    const lastError=last?(last.kind+": "+last.message+(last.source?" @ "+last.source:"")):"error=none";
    const detail=[lastError,nav,rsc,recovery,directMount,nodes,loaded].join("\\n");
    const title=failed?"アプリを読み込めませんでした":"読み込みに時間がかかっています";
    el.innerHTML="<strong style='display:block;font-size:15px;margin-bottom:6px'>"+title+"</strong><p>通信環境を確認して、もう一度お試しください。</p><button type='button' id='numeria-runtime-boot-retry'>再読み込み</button><details style='margin-top:12px'><summary>詳しい情報</summary><code style='display:block;white-space:pre-wrap'>"+detail.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))+"</code></details>";
    const retry=document.getElementById("numeria-runtime-boot-retry");
    if(retry)retry.addEventListener("click",()=>window.location.reload());
  }
  function recoverFromCachedLegacyIndex(){
    if(appMounted()||state.recovery==="started"||state.recovery==="done")return;
    if(!window.__VINEXT_RSC_DONE__)return;
    state.recovery="started";
    import("/assets/index-CYZnnbch.js?numeria-recovery=${marker}-"+Date.now()).then(()=>{state.recovery="done";setTimeout(show,1200)}).catch(error=>{state.recovery="failed";record("recovery",error&&error.message||error,"/assets/index-CYZnnbch.js",null,null);show()});
  }
  function ensureDirectRoot(){
    let root=document.getElementById("numeria-direct-root");
    if(root)return root;
    root=document.createElement("div");
    root.id="numeria-direct-root";
    root.setAttribute("data-numeria-direct-root","true");
    const loading=document.querySelectorAll(".auth-loading");
    loading.forEach(node=>node.remove());
    (document.body||document.documentElement).appendChild(root);
    return root;
  }
  function directMountApp(){
    if(appMounted()||state.directMount==="started"||state.directMount==="done")return;
    if(!window.__VINEXT_RSC_DONE__)return;
    state.directMount="started";
    Promise.all([
      import("/assets/framework-CXnKph_e.js"),
      import("/assets/numeria-app-Cckhajir.js?numeria-direct=${marker}-"+Date.now())
    ]).then(([framework,app])=>{
      // The normal bootstrap may finish while the fallback dependencies load.
      if(appMounted()){state.directMount="skipped";hide();return;}
      const React=framework.i&&framework.i();
      const client=framework.t&&framework.t();
      const Component=app.default||app;
      if(!React||!client||(!client.createRoot&&!client.hydrateRoot)||!Component)throw new Error("direct mount dependencies unavailable");
      window.__NUMERIA_DIRECT_MOUNT_STARTED__=Date.now();
      if(window.__VINEXT_RSC_ROOT__){
        window.__VINEXT_RSC_ROOT__.unmount();
        window.__VINEXT_RSC_ROOT__=null;
      }
      const root=ensureDirectRoot();
      root.innerHTML="";
      if(typeof client.createRoot==="function"){
        window.__NUMERIA_DIRECT_ROOT__=client.createRoot(root);
        window.__NUMERIA_DIRECT_ROOT__.render(React.createElement(Component));
      }else{
        window.__NUMERIA_DIRECT_ROOT__=client.hydrateRoot(root,React.createElement(Component));
      }
      state.directMount="done";
      setTimeout(()=>{if(appMounted()){window.__NUMERIA_DIRECT_MOUNT_DONE__=Date.now();hide()}else show()},1200);
    }).catch(error=>{state.directMount="failed";record("direct-mount",error&&error.message||error,"/assets/numeria-app-Cckhajir.js",null,null);show()});
  }
  window.addEventListener("numeria-navigation-ready",()=>{state.navigationReady=true;hide()});
  // The auth shell can be rendered by the server before the client app finishes mounting.
  // Remove any stale diagnostic overlay as soon as the login form becomes usable.
  const authRecoveryTimer=setInterval(()=>{if(appMounted()){hide();clearInterval(authRecoveryTimer)}},250);
  setTimeout(recoverFromCachedLegacyIndex,1800);
  setTimeout(recoverFromCachedLegacyIndex,3600);
  setTimeout(directMountApp,5200);
  setTimeout(show,1200);
  setTimeout(show,5000);
  setTimeout(recoverFromCachedLegacyIndex,6500);
  setTimeout(directMountApp,7600);
  setTimeout(show,10000);
  setTimeout(show,30000);
})();</script>`;

html = html.replace("<head>", `<head>${script}`);
writeFileSync(htmlPath, html);
console.log("Runtime boot diagnostics installed before Numeria module startup.");
