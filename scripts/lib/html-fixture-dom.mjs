// Small DOM test double fed by Python's standard HTML parser. This verifies
// emitted HTML content; it cannot measure browser layout and makes no claim to.
import {execFileSync} from 'node:child_process';
const parser=String.raw`
import json,sys
from html.parser import HTMLParser
class Tree(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True);self.root={'tag':'root','attrs':{},'nodes':[]};self.stack=[self.root]
 def handle_starttag(self,tag,attrs):
  node={'tag':tag,'attrs':dict(attrs),'nodes':[]};self.stack[-1]['nodes'].append(node)
  if tag not in {'br','hr','img','meta','link','input','col','wbr','source'}:self.stack.append(node)
 def handle_startendtag(self,tag,attrs):
  self.stack[-1]['nodes'].append({'tag':tag,'attrs':dict(attrs),'nodes':[]})
 def handle_endtag(self,tag):
  for index in range(len(self.stack)-1,0,-1):
   if self.stack[index]['tag']==tag:self.stack=self.stack[:index];break
 def handle_data(self,data):self.stack[-1]['nodes'].append(data)
t=Tree();t.feed(sys.stdin.read());print(json.dumps(t.root))
`;
export class FixtureElement{
 constructor(tag,attrs={}){this.tagName=tag.toUpperCase();this.attrs={...attrs};this.childNodes=[];this.parent=null;}
 get children(){return this.childNodes.filter(node=>node instanceof FixtureElement);}
 get textContent(){return this.childNodes.map(node=>typeof node==='string'?node:node.textContent).join('');}
 set className(value){this.attrs.class=value;}
 append(...nodes){for(const node of nodes){this.childNodes.push(node);if(node instanceof FixtureElement)node.parent=this;}}
 remove(){if(this.parent)this.parent.childNodes=this.parent.childNodes.filter(node=>node!==this);}
 removeAttribute(name){delete this.attrs[name];}
 cloneNode(deep=false){const node=new FixtureElement(this.tagName,this.attrs);if(deep)node.append(...this.childNodes.map(child=>typeof child==='string'?child:child.cloneNode(true)));return node;}
 matches(selector){if(selector.startsWith('.'))return(this.attrs.class||'').split(/\s+/).includes(selector.slice(1));if(selector.startsWith('['))return Object.hasOwn(this.attrs,selector.slice(1,-1));return this.tagName===selector.toUpperCase();}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 querySelectorAll(selector){
  if(selector.includes(','))return selector.split(',').flatMap(part=>this.querySelectorAll(part.trim()));
  if(selector.startsWith(':scope > '))return this.children.filter(node=>node.matches(selector.slice(9)));
  if(selector.includes(' > ')){const [parent,child]=selector.split(' > ');return this.querySelectorAll(parent).flatMap(node=>node.children.filter(item=>item.matches(child)));}
  return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);
 }
}
export function fixtureDocument(html){
 const parsed=JSON.parse(execFileSync('python3',['-c',parser],{input:html,encoding:'utf8',maxBuffer:4*1024*1024}));
 const from=node=>{if(typeof node==='string')return node;const element=new FixtureElement(node.tag,node.attrs);element.append(...node.nodes.map(from));return element;};
 return{root:from(parsed),createElement:tag=>new FixtureElement(tag)};
}
