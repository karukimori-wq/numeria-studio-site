import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
const marker = "NumeriaAppRouteDispatch.v1";
let html = readFileSync(htmlPath, "utf8");

if (html.includes(marker)) {
  throw new Error("App route dispatcher was applied more than once.");
}

const runtime = String.raw`(()=>{
const MARK="NumeriaAppRouteDispatch.v1";
const ROUTES={home:"/app/home",clients:"/app/clients",readings:"/app/readings/new",reports:"/app/reports",settings:"/app/settings/report-formats"};
let dispatching=false,wrapped=false;
function pathForPage(page){return page==="dashboard"?ROUTES.home:page==="appraisalProfiles"?ROUTES.clients:page==="reading"?ROUTES.readings:page==="settings"?ROUTES.settings:page==="account"?"/app/settings":null}
function replaceOrPush(path,replace){if(!path||location.pathname===path)return;(replace?history.replaceState:history.pushState).call(history,{numeriaRoute:path},"",path)}
function focusReports(attempt){var target=document.querySelector(".history-panel,.client-history,.client-history-heading,.customers-page .history-heading")||document.querySelector(".customers-page .customer-record-layout");if(target&&target.scrollIntoView){target.scrollIntoView({block:"start"});return}if((attempt||0)<30)setTimeout(function(){focusReports((attempt||0)+1)},80)}
function spec(path){if(path==="/app"||path==="/app/"||path==="/app/home")return{page:"dashboard"};if(/^\/app\/clients(?:\/[^/]+)?$/.test(path))return{page:"appraisalProfiles"};if(/^\/app\/reports(?:\/[^/]+)?$/.test(path))return{page:"appraisalProfiles",reports:true};if(path==="/app/readings"||path==="/app/readings/new"||/^\/app\/readings\/[^/]+$/.test(path))return{reading:true};if(path==="/app/settings/report-formats")return{page:"settings"};if(/^\/app\/settings(?:\/(?:characters|reading-configs|ai|plan))?$/.test(path))return{page:"account"};return null}
function dispatch(){var desired=spec(location.pathname);if(!desired)return;var api=window.NumeriaNavigation;if(!api)return;dispatching=true;document.documentElement.classList.toggle("numeria-route-reports",!!desired.reports);try{if(desired.reading&&typeof api.newReading==="function")api.newReading();else if(desired.page&&typeof api.go==="function")api.go(desired.page);if(desired.reports)setTimeout(function(){focusReports(0)},60)}finally{queueMicrotask(function(){dispatching=false})}}
function wrap(){if(wrapped||!window.NumeriaNavigation)return false;var api=window.NumeriaNavigation,go=api.go,newReading=api.newReading,signOut=api.signOut;if(typeof go==="function")api.go=function(page){var result=go.apply(api,arguments);if(!dispatching){document.documentElement.classList.remove("numeria-route-reports");replaceOrPush(pathForPage(page),false)}return result};if(typeof newReading==="function")api.newReading=function(){var result=newReading.apply(api,arguments);if(!dispatching)replaceOrPush(ROUTES.readings,false);return result};if(typeof signOut==="function")api.signOut=function(){return Promise.resolve(signOut.apply(api,arguments)).finally(function(){location.assign("/")})};wrapped=true;window.NumeriaAppRoutes={version:MARK,routes:ROUTES,dispatch:dispatch,safeReturnPath:function(value){return typeof value==="string"&&value.startsWith("/app")&&!value.startsWith("//")&&!value.includes("://")?value:ROUTES.home}};return true}
function ready(){if(wrap())dispatch()}
window.addEventListener("numeria-navigation-ready",ready);window.addEventListener("popstate",dispatch);if(!wrap()){var started=Date.now(),timer=setInterval(function(){if(wrap()||Date.now()-started>10000){clearInterval(timer);if(wrapped)dispatch()}},80)}else dispatch();
})();`;

const injection = `<!-- ${marker} --><script id="numeria-app-route-dispatch">${runtime}</script>`;
if (!html.includes("</body>")) throw new Error("Expected </body> in restored Production HTML.");
html = html.replace("</body>", `${injection}</body>`);
writeFileSync(htmlPath, html);
console.log("Numeria /app route dispatcher added to Production HTML.");
