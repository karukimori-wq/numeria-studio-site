// Full authenticated host component, with fixture identity/workspace bridges.
// This does not verify the outer Clerk login/boot wrapper or real D1.
import assert from 'node:assert/strict';
import {readFile,readdir,writeFile,rm,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const assets='dist/assets';
const file=(await readdir(assets)).find(n=>/^numeria-app-runtime-.*\.js$/.test(n));
assert.ok(file,'Build first');
const testModule=assets+'/kigaku-host-fixture.js';
await writeFile(testModule,(await readFile(assets+'/'+file,'utf8'))+'\nexport {us as FixtureHost,i as FixtureReact};');
await mkdir('tmp/kigaku-host',{recursive:true});
await writeFile('tmp/kigaku-host/index.html',`<div id="root"></div><script type="module">
import {FixtureHost,FixtureReact as React} from '/dist/assets/kigaku-host-fixture.js';
import {t as domFactory} from '/dist/assets/framework-client-7951bef0cc41.js';
window.Clerk={user:{id:'fixture-user'},session:{getToken:async()=> 'fixture-token'}};
window.NumeriaAccessContextLoad=async()=>({data:{role:'user',plan:'pro',actualPlan:'pro'},error:null});
window.NumeriaUserPreferencesLoad=async()=>({data:{primary_divination:'nine-star-ki',enabled_divinations:['nine-star-ki']},error:null});
window.NumeriaD1WorkspaceLoad=async()=>({data:{appraisal_profiles:[{id:'fixture-profile',name:'通し検査の相談者',birthday:'1990-06-15',history:[],profile:'検証用',status:'受付'}],saved_presets:[],feedback_items:[],app_settings:{}},error:null});
window.NumeriaD1WorkspaceSave=async data=>({data,error:null});
domFactory().createRoot(document.getElementById('root')).render(React.createElement(FixtureHost,{user:{displayName:'検証者',email:'fixture@example.test',primaryDivination:'nine-star-ki'},userId:'fixture-user',onSignOut:()=>{}}));
</script>`);
const server=await createServer({server:{host:'127.0.0.1',port:4181,strictPort:true}});await server.listen();
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on('pageerror',e=>console.error('Host page error:',e.message));
 await page.route('**/api/**',r=>r.fulfill({json:{planId:'pro',subscription:{planId:'pro'},activeDraft:null,completedAppraisals:[]}}));
 await page.goto('http://127.0.0.1:4181/tmp/kigaku-host/index.html');
 await page.getByRole('button',{name:/カルテ/}).first().click({timeout:15000});
 await page.getByText('通し検査の相談者',{exact:true}).first().waitFor({timeout:15000});
 await page.getByText('通し検査の相談者',{exact:true}).first().click();
 await page.getByRole('heading',{name:'鑑定履歴・鑑定書',exact:true}).waitFor({timeout:15000});
 await page.screenshot({path:'tmp/kigaku-print/host-profile-mobile.png',fullPage:true});
 console.log('Full authenticated host: fixture workspace loaded, profile list selected, history section opened. Outer login is not covered.');
}finally{await browser.close();await server.close();await rm(testModule,{force:true});await rm('tmp/kigaku-host',{recursive:true,force:true});}
