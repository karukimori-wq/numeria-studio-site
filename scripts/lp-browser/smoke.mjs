import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "playwright";

const root=resolve("lp-preview-dist");
const screenshots=resolve("lp-browser-evidence");
assert.ok(existsSync(join(root,"index.html")),"Build the preview assets first");
mkdirSync(screenshots,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".txt":"text/plain; charset=utf-8"};
const server=createServer((req,res)=>{
  const url=new URL(req.url||"/","http://localhost");
  const asset=url.pathname==="/"||url.pathname==="/welcome"?"index.html":url.pathname.replace(/^\/+/,"");
  const filepath=resolve(root,normalize(asset));
  if(filepath!==root&&!filepath.startsWith(root+sep)){res.writeHead(403);res.end();return}
  if(!existsSync(filepath)){res.writeHead(404);res.end("missing");return}
  res.writeHead(200,{"Content-Type":mime[extname(filepath)]||"application/octet-stream","Cache-Control":"no-store"});
  res.end(readFileSync(filepath));
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true});
let tested=0;
try{
  const devices=[
    {name:"desktop-1440",width:1440,height:900,isMobile:false,hasTouch:false},
    {name:"mobile-390",width:390,height:844,isMobile:true,hasTouch:true},
    {name:"mobile-360",width:360,height:780,isMobile:true,hasTouch:true},
    {name:"mobile-320",width:320,height:690,isMobile:true,hasTouch:true}
  ];
  for(const device of devices){
    const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},deviceScaleFactor:1,isMobile:device.isMobile,hasTouch:device.hasTouch,locale:"ja-JP"});
    const page=await ctx.newPage();
    const errors=[];
    const external=[];
    page.on("pageerror",e=>errors.push(e.message));
    page.on("request",r=>{if(!r.url().startsWith(base))external.push(r.url())});
    const response=await page.goto(base+"/welcome",{waitUntil:"networkidle"});
    assert.equal(response.status(),200,"Preview must load at "+device.name);
    assert.equal(await page.locator("section").count(),9);
    const headlineLines=await page.locator("#hero-title").evaluate(el=>el.getBoundingClientRect().height/parseFloat(getComputedStyle(el).lineHeight));
    assert.ok(headlineLines<=2.45,device.name+" hero headline should remain two lines, actual "+headlineLines.toFixed(2));
    assert.equal(await page.locator("#demo").isVisible(),true);
    const before=await page.locator("#cover").evaluate(el=>({background:getComputedStyle(el).backgroundImage,bg:getComputedStyle(el).backgroundColor}));
    await page.locator('[data-theme="pearl"]').click();
    assert.equal(await page.locator('[data-theme="pearl"]').getAttribute("aria-pressed"),"true");
    const after=await page.locator("#cover").evaluate(el=>({background:getComputedStyle(el).backgroundImage,bg:getComputedStyle(el).backgroundColor}));
    assert.notDeepEqual(after,before,"Pearl theme must visibly change the cover");
    await page.locator('[data-method="tarot"]').click();
    assert.equal(await page.locator("#method-name").textContent(),"タロット");
    const image=page.locator("#demo-tarot-image");
    assert.equal(await image.isVisible(),true,"Tarot selection must show a real published card asset");
    assert.equal(await image.evaluate(e=>e.complete&&e.naturalWidth>0),true,"Tarot image must load");
    await page.locator('[data-layout="magazine"]').click();
    assert.equal(await page.locator("#sheet").evaluate(e=>e.classList.contains("magazine")),true);
    assert.match(await page.locator("#demo-state").textContent(),/タロット・Pearl・マガジン/);
    await page.locator("#next").click();
    assert.equal((await page.locator("#page-count").textContent()).trim(),"2 / 3");
    await page.locator("#report-preview").focus();
    await page.keyboard.press("ArrowRight");
    assert.equal((await page.locator("#page-count").textContent()).trim(),"3 / 3");
    await page.locator('[data-method="numerology"]').click();
    assert.equal(await image.isVisible(),false);
    assert.equal(await page.locator("#symbol").isVisible(),true);
    await page.locator('[data-pain="1"]').click();
    assert.match(await page.locator("#pain-result").textContent(),/レイアウトを選ぶだけ/);
    if(device.isMobile){
      assert.equal(await page.locator("#menu").isVisible(),true);
      await page.locator("#menu").click();
      assert.equal(await page.locator("#site-nav").isVisible(),true);
      await page.locator("#site-nav a[href='#pricing']").click();
      assert.equal(await page.locator("#site-nav").isVisible(),false);
    }
    const overflow=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:innerWidth}));
    assert.ok(overflow.scrollWidth<=overflow.innerWidth+1,device.name+" horizontal overflow: "+JSON.stringify(overflow));
    const jsTest=await page.locator("details").first();
    await jsTest.locator("summary").click();
    assert.equal(await jsTest.getAttribute("open"),"");
    await page.locator('[data-step="3"]').click();
    assert.equal(await page.locator('[data-step="3"]').getAttribute("aria-pressed"),"true");
    assert.match(await page.locator("#step-detail-body").textContent(),/確定した結果/);
    await page.locator('[data-pending]').first().click();
    assert.equal(await page.locator("#toast").isVisible(),true);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#toast").isVisible(),false);
    await page.emulateMedia({reducedMotion:"reduce"});
    assert.equal(await page.locator(".book-scene").evaluate(e=>getComputedStyle(e).animationName),"none","Reduced motion must stop floating animation");
    await page.emulateMedia({reducedMotion:"no-preference"});
    assert.deepEqual(errors,[],"No uncaught JS errors allowed on "+device.name);
    assert.deepEqual(external,[],"LP demo must not call remote services on "+device.name);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.waitForTimeout(150);
    await page.screenshot({path:join(screenshots,device.name+".png"),fullPage:true,animations:"disabled"});
    tested++;console.log("PASS",device.name,JSON.stringify(overflow));
    await ctx.close();
  }
  // Simulate missing local artwork: content and report preview must remain usable.
  const noImages=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const imagePage=await noImages.newPage();
  const broken=[];
  imagePage.on("pageerror",e=>broken.push(e.message));
  await imagePage.route("**/assets/tarot-decks/cards/**",route=>route.abort());
  await imagePage.route("**/assets/divination-visuals/**",route=>route.abort());
  await imagePage.goto(base+"/welcome",{waitUntil:"domcontentloaded"});
  await imagePage.locator('[data-method="tarot"]').click();
  await imagePage.locator("#demo-tarot-fallback").waitFor({state:"visible"});
  await imagePage.locator("#gallery").scrollIntoViewIfNeeded();
  await imagePage.locator("#gallery-tarot-fallback").waitFor({state:"visible"});
  await imagePage.locator("#gallery-astro-fallback").waitFor({state:"visible"});
  assert.deepEqual(broken,[],"Broken images must not cause JS errors");
  await noImages.close();
  const noJs=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false,isMobile:true});
  const staticPage=await noJs.newPage();
  await staticPage.goto(base+"/welcome",{waitUntil:"domcontentloaded"});
  assert.equal(await staticPage.locator("main section").count(),9,"Static LP content must exist without JavaScript");
  assert.equal(await staticPage.locator("#hero-title").isVisible(),true);
  assert.ok(await staticPage.getByRole("link",{name:"鑑定書を体験する"}).isVisible(),"Core navigation must work without JS");
  await noJs.close();
  console.log("PASS degraded modes: broken images, JavaScript disabled");
}finally{await browser.close();server.close()}
console.log("PASS",tested,"Chromium viewports; screenshots in lp-browser-evidence");
