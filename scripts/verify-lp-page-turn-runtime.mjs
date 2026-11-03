import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function setup(reducedMotion) {
  const listeners = new Map(), queued = [], classes = new Set();
  let mutations = () => {}, trackTop = 600;
  function node(extra={}) { return { dataset:{}, style:{setProperty(k,v){this[k]=v}}, addEventListener(k,v){this[k]=v}, setAttribute(k,v){this[k]=v}, ...extra }; }
  const root=node({scrollHeight:4000,classList:{contains:k=>classes.has(k),add:k=>classes.add(k),toggle(k,on){on?classes.add(k):classes.delete(k);mutations()}}});
  const button=node(), progress=node(), book=node({offsetWidth:188}), cover=node(), leaf1=node(), leaf2=node();
  const track=node({offsetHeight:1400,getBoundingClientRect:()=>({top:trackTop})});
  const scene=node({offsetHeight:530,getBoundingClientRect:()=>({top:70,width:350,height:530}),querySelector:s=>({'.flip-book':book,'.flip-cover':cover,'.flip-leaf-one':leaf1,'.flip-leaf-two':leaf2}[s])});
  const prev=node(),next=node(),position=node();
  const canvas=node({getContext:()=>null}), story=node({getBoundingClientRect:()=>({top:1700,height:1800})}), caption=node();
  const nodes={'.motion-scene':scene,'.motion-canvas':canvas,'.motion-story':story,'.story-caption':caption,'.hero-book-scroll':track,'.scroll-progress':progress,'[data-book-prev]':prev,'[data-book-next]':next,'.book-position':position};
  const document={documentElement:root,hidden:true,querySelector:s=>nodes[s],querySelectorAll:()=>[],getElementById:id=>id==='motion-toggle'?button:null,addEventListener(){}};
  const context={document,innerHeight:844,innerWidth:390,scrollY:0,devicePixelRatio:1,localStorage:{getItem:()=>null,setItem(){}},matchMedia:q=>({matches:q.includes('reduced-motion')&&reducedMotion,addEventListener(){}}),addEventListener:(k,v)=>listeners.set(k,v),requestAnimationFrame:fn=>(queued.push(fn),queued.length),cancelAnimationFrame(){},MutationObserver:class{constructor(cb){this.cb=cb}observe(){mutations=this.cb}},console};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(scripts.find(s=>s.includes('var reduced=window.matchMedia')),context);
  vm.runInContext(scripts.find(s=>s.includes('function updateBook()')),context);
  return {scene,root,button,book,prev,next,flush(){for(let i=0;i<3;i++){const pending=queued.splice(0);pending.forEach(fn=>fn(0))}},scroll(top){trackTop=top;listeners.get('scroll')?.();const pending=queued.splice(0);pending.forEach(fn=>fn(0));},resume(){button.click();const pending=queued.splice(0);pending.forEach(fn=>fn(0));}};
}
const normal=setup(false);normal.scroll(-500);assert.ok(Number(normal.scene.dataset.bookProgress)>.3,'Normal scroll must turn pages');normal.scroll(600);assert.equal(Number(normal.scene.dataset.bookProgress),0,'Reverse scrolling closes the book');
const reduced=setup(true);reduced.scroll(-500);assert.equal(Number(reduced.scene.dataset.bookProgress),0,'Reduced motion initially stays still');reduced.resume();reduced.scroll(-500);assert.ok(Number(reduced.scene.dataset.bookProgress)>.3,'Explicit motion resume must allow page turning even with OS reduced motion');
const controls=setup(false);controls.next.click();controls.flush();assert.ok(Number(controls.scene.dataset.bookProgress)>.3,'Next control turns a page without window scroll');controls.prev.click();controls.flush();assert.equal(Number(controls.scene.dataset.bookProgress),0,'Previous control restores cover');
const hosted=setup(false);hosted.scene.touchstart({touches:[{clientY:650}]});hosted.scene.touchmove({touches:[{clientY:300}]});hosted.flush();assert.ok(Number(hosted.scene.dataset.bookProgress)>.3,'Touch gesture turns pages when the outer host scrolls instead of this window');
console.log('LP page-turn runtime: scroll/reverse, reduced-motion opt-in, controls and outer-host gesture passed.');
