// Full authenticated host component, with fixture identity/workspace bridges.
// This does not verify the outer Clerk login/boot wrapper or real D1.
import assert from 'node:assert/strict';
import {readFile,readdir,writeFile,rm,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const assets='dist/assets';
const file=(await readdir(assets)).find(n=>/^numeria-app-runtime-.*\.js$/.test(n));
assert.ok(file,'Build first');
const testModule=assets+'/kigaku-host-fixture.js';
await writeFile(testModule,(await readFile(assets+'/'+file,'utf8'))+'\nexport {us as FixtureHost,i as FixtureReact};');
await mkdir('tmp/kigaku-host',{recursive:true});
await writeFile('tmp/kigaku-host/index.html',`<meta charset="utf-8"><div id="root"></div><script type="module">
import {FixtureHost,FixtureReact as React} from '/dist/assets/kigaku-host-fixture.js';
import {t as domFactory} from '/dist/assets/framework-client-7951bef0cc41.js';
localStorage.setItem('numeria-onboarding-seen:fixture%40example.test','1');
localStorage.setItem('numeria-appraisal-profile-history:fixture%40example.test',JSON.stringify([{id:'fixture-profile',name:'通し検査の相談者',birthday:'1990-06-15',history:[],profile:'検証用',status:'受付'}]));
window.Clerk={user:{id:'fixture-user'},session:{getToken:async()=> 'fixture-token'}};
window.NumeriaAccessContextLoad=async()=>({data:{role:'user',plan:'pro',actualPlan:'pro'},error:null});
window.NumeriaUserPreferencesLoad=async()=>({data:{primary_divination:'nine-star-ki',enabled_divinations:['nine-star-ki']},error:null});
window.NumeriaD1WorkspaceLoad=async()=>({data:{appraisal_profiles:[{id:'fixture-profile',name:'通し検査の相談者',birthday:'1990-06-15',history:[],profile:'検証用',status:'受付'}],saved_presets:[],feedback_items:[],app_settings:{}},error:null});
window.NumeriaD1WorkspaceSave=async data=>({data,error:null});
domFactory().createRoot(document.getElementById('root')).render(React.createElement(FixtureHost,{user:{displayName:'検証者',email:'fixture@example.test',primaryDivination:'nine-star-ki'},userId:'fixture-user',onSignOut:()=>{}}));
</script>`);
const server=createServer(async(req,res)=>{try{const path=resolve('.'+new URL(req.url,'http://localhost').pathname);assert.ok(path.startsWith(process.cwd()+'/'));const data=await readFile(path);res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css'})[extname(path)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(4181,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on('pageerror',e=>console.error('Host page error:',e.message));
 page.on('console',m=>{if(m.type()==='error')console.error('Browser:',m.text());});
 await page.route('**/api/**',r=>r.fulfill({json:{planId:'pro',subscription:{planId:'pro'},activeDraft:null,completedAppraisals:[]}}));
 await page.goto('http://127.0.0.1:4181/tmp/kigaku-host/index.html');
 await page.getByText('クラウド同期済み',{exact:true}).waitFor({timeout:15000});
 await page.getByRole('button',{name:/鑑定カルテ$/}).first().click({timeout:15000});
 await page.getByText('通し検査の相談者',{exact:true}).first().waitFor({timeout:15000});
 await page.getByText('通し検査の相談者',{exact:true}).first().click();
 await page.getByRole('heading',{name:'鑑定履歴・鑑定書',exact:true}).waitFor({timeout:15000});
 await page.screenshot({path:'tmp/kigaku-print/host-profile-mobile.png',fullPage:true});
 console.log('Full authenticated host: fixture workspace loaded, profile list selected, history section opened. Outer login is not covered.');
}catch(error){for(const page of browser.contexts().flatMap(c=>c.pages())){console.error('Host visible text:',(await page.locator('body').innerText()).slice(0,8000));await page.screenshot({path:'tmp/kigaku-print/host-failure.png',fullPage:true});}throw error;}finally{await browser.close();await new Promise(r=>server.close(r));await rm(testModule,{force:true});await rm('tmp/kigaku-host',{recursive:true,force:true});}
