import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const assetsDir = "dist/assets";
const assetName = readdirSync(assetsDir).find((name) => /^numeria-app-.*\.js$/.test(name));
if (!assetName) {
  throw new Error("Numeria application bundle was not found in dist/assets.");
}

const assetPath = `${assetsDir}/${assetName}`;
let source = readFileSync(assetPath, "utf8");
const marker = "NumeriaNavigationBridge.v3";
if (source.includes(marker)) {
  throw new Error("Numeria navigation bridge was applied more than once.");
}

const anchor = 'return(0,Z.jsxs)(`div`,{className:`app-shell`,children:[';
if (!source.includes(anchor)) {
  throw new Error("Expected Numeria app-shell render anchor was not found in the restored bundle.");
}

const bridge = `window.__NumeriaNavigationHandlers={go:function(page){k(page)},newReading:function(){di()},openClient:function(clientRef){let client=d.find(function(item){return String(item.id)===String(clientRef)});if(!client)return!1;Bt(client.id),k(\`appraisalProfiles\`);return{...client}},resumeSession:function(clientRef,session){if(!session||!session.snapshot)return!1;let resolvedRef=clientRef||session.snapshot.selectedCustomerId||\`\`;Y(resolvedRef,{...session,date:session.date||new Date().toISOString().slice(0,10).replaceAll(\`-\`,\`.\`)});return!0},openGuide:function(){Fn(!0)},openFeedback:function(){Vn(!0)},signOut:function(){return n()},getPage:function(){return O},getRole:function(){return tr},getPlan:function(){return ar},getClients:function(){return d.map(function(item){return{...item}})},getSessionState:function(){return{clientRef:zt||null,sessionId:Dn||null,divination:l||null,page:O||null}}};if(!window.NumeriaNavigation||window.NumeriaNavigation.version!==\`${marker}\`){let call=function(name,args){let handlers=window.__NumeriaNavigationHandlers,fn=handlers&&handlers[name];if(typeof fn!==\`function\`)return;return fn.apply(handlers,args)};window.NumeriaNavigation={version:\`${marker}\`,go:function(){return call(\`go\`,arguments)},newReading:function(){return call(\`newReading\`,arguments)},openClient:function(){return call(\`openClient\`,arguments)},resumeSession:function(){return call(\`resumeSession\`,arguments)},openGuide:function(){return call(\`openGuide\`,arguments)},openFeedback:function(){return call(\`openFeedback\`,arguments)},signOut:function(){return call(\`signOut\`,arguments)},getPage:function(){return call(\`getPage\`,arguments)},getRole:function(){return call(\`getRole\`,arguments)},getPlan:function(){return call(\`getPlan\`,arguments)},getClients:function(){return call(\`getClients\`,arguments)},getSessionState:function(){return call(\`getSessionState\`,arguments)}}}if(window.__numeriaNavigationReadyVersion!==\`${marker}\`){window.__numeriaNavigationReadyVersion=\`${marker}\`;queueMicrotask(function(){window.dispatchEvent(new CustomEvent(\`numeria-navigation-ready\`,{detail:{version:\`${marker}\`,stable:!0}}))})};`;
source = source.replace(anchor, bridge + anchor);

writeFileSync(assetPath, source);
console.log(`Stable Numeria navigation API ${marker} exposed in ${assetName}.`);
