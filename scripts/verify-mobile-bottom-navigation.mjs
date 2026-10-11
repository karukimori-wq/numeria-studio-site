import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";

const patchPath = resolve("scripts/patch-mobile-bottom-navigation.mjs");
const directory = mkdtempSync(join(tmpdir(), "numeria-bottom-menu-"));
try {
  mkdirSync(join(directory, "dist"));
  const htmlPath = join(directory, "dist/original.html");
  const original = '<html><head><style id="existing-style">nav{display:flex}</style></head><body><nav class="original-bottom-menu">Original menu</nav><script id="existing-runtime">window.originalMenu=true;function ensureSupportNav(){}function ensureChrome(){}</script></body></html>';
  const overlayStyle = '<style id="numeria-mobile-bottom-navigation-style">/* NumeriaMobileBottomNavigation.v1 */ .overlay{position:fixed}</style>';
  const overlayRuntime = '<script id="numeria-mobile-bottom-navigation-runtime">/* NumeriaMobileBottomNavigation.v1 */ document.body.appendChild(document.createElement("nav"));</script>';
  const stale = original.replace("</head>", overlayStyle + "</head>").replace("</body>", overlayRuntime + "</body>");

  for (const input of [original, stale]) {
    writeFileSync(htmlPath, input);
    execFileSync(process.execPath, [patchPath], { cwd: directory });
    const result = readFileSync(htmlPath, "utf8");
    assert.ok(result.includes('<nav class="original-bottom-menu">Original menu</nav>'), "Retain the original menu");
    assert.ok(result.includes('window.originalMenu=true;'), "Retain unrelated runtime");
    assert.ok(result.includes('(orientation:portrait)') && result.includes('(orientation:landscape)'), "Handle portrait and landscape separately");
    assert.ok(result.includes('grid-template-columns:repeat(5,minmax(0,1fr))'), "Use five equal columns");
    assert.ok(!result.includes('content:"7"') && !result.includes('.nav-icon{font-size:0'), "Do not replace the native divination symbol with a fixed 7");
    assert.ok(result.includes('class="numeria-settings-icon"') && result.includes('stroke="currentColor"'), "Settings uses palette-matching SVG line art");
    assert.ok(!result.includes('>⚙</span>'), "Do not use platform-dependent gear emoji");
    assert.ok(result.includes('openSettings()'), "Settings must not open the old support sheet");
    assert.ok(result.includes('api.go("appraisalProfiles")'), "The bottom 鑑定書 entry must route to the report history list, not format settings");
    assert.ok(result.includes('.history-panel,.client-history,.client-history-heading'), "Report navigation must focus an existing history target");
    assert.ok(!result.includes('numeria-mobile-bottom-navigation-runtime'), "Do not recreate the removed overlay");
    execFileSync(process.execPath, [patchPath], { cwd: directory });
    assert.equal(readFileSync(htmlPath, "utf8"), result, "Repeated builds must not add another menu");

    const runtime = result.match(/<script id="numeria-retained-navigation-runtime">([\s\S]*?)<\/script>/)[1];
    const classes = new Set(), properties = {}, listeners = {}, calls = [];
    const root = { classList: { toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); } }, style: { setProperty(k,v) { properties[k]=v; } } };
    const portrait = { matches: true, addEventListener(type, fn) { listeners.media=fn; } };
    const view = { height: 800, addEventListener(type,fn) { listeners.viewport=fn; } };
    const reportsButton = { textContent:'鑑定書', matches:()=>false };
    const buttons = [{ textContent:'ホーム', matches:()=>false }, { textContent:'カルテ', matches:()=>false }, { textContent:'鑑定', matches:()=>false }, reportsButton, { textContent:'設定', matches:()=>true }];
    const reportTarget = { scrollIntoView(){ calls.push('focus-history'); } };
    const document = {
      documentElement:root,
      activeElement:null,
      readyState:'complete',
      body:{},
      querySelector(selector) {
        if (selector === '.history-panel,.client-history,.client-history-heading') return reportTarget;
        return {getBoundingClientRect(){return {top:700,height:72}}};
      },
      querySelectorAll(selector) { return selector === 'aside.sidebar nav button' ? buttons : []; },
      addEventListener(type,fn) { listeners[type]=fn; }
    };
    const window = { innerHeight:800, visualViewport:view, matchMedia(){return portrait;}, NumeriaNavigation:{ go(page){ calls.push(page); } }, addEventListener(type,fn){listeners[type]=fn;} };
    runInNewContext(runtime,{document,window,setTimeout:fn=>fn()});
    assert.equal(properties['--numeria-navigation-clearance'],'136px');
    document.activeElement={matches:()=>true};view.height=480;listeners.viewport();
    assert.ok(classes.has('numeria-input-keyboard'),"Hide the existing bottom bar while editing with the keyboard open");
    assert.equal(properties['--numeria-navigation-clearance'],'0px');
    view.height=800;listeners.viewport();assert.ok(!classes.has('numeria-input-keyboard'),"Restore after keyboard closes");
    portrait.matches=false;listeners.media();assert.equal(properties['--numeria-navigation-clearance'],'0px');
    // A toolbar resize without an active input must not be mistaken for a keyboard.
    portrait.matches=true;document.activeElement=null;view.height=480;listeners.viewport();assert.ok(!classes.has('numeria-input-keyboard'));
    listeners.click({
      target: { closest: selector => selector === 'aside.sidebar nav button' ? reportsButton : null },
      preventDefault(){ calls.push('prevent'); },
      stopPropagation(){ calls.push('stop'); },
      stopImmediatePropagation(){ calls.push('stop-immediate'); }
    });
    assert.deepEqual(calls.slice(0, 4), ['prevent','stop','stop-immediate','appraisalProfiles'], 'Bottom 鑑定書 opens appraisal history without triggering the native settings button');
    assert.ok(calls.includes('focus-history'), 'Report navigation scrolls to the history panel when it exists');
  }
  console.log("Bottom navigation verified: single retained menu, portrait/landscape, native divination symbol, line-art settings, report route and keyboard clearance.");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
