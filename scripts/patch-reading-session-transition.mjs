import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const file = readdirSync('dist/assets').find(name => /^numeria-app-.*\.js$/.test(name));
if (!file) throw new Error('Reading bundle was not found.');
const path = `dist/assets/${file}`;
let source = readFileSync(path, 'utf8');
function replaceOne(before, after) {
  if (source.split(before).length !== 2) throw new Error(`Expected one session transition anchor: ${before}`);
  source = source.replace(before, after);
}
// A dashboard row represents the most recent saved reading, not a new one.
replaceOne('return(0,Z.jsxs)(`button`,{onClick:()=>hi(e.id),children:[',
  'return(0,Z.jsxs)(`button`,{onClick:()=>{if(n?.snapshot?.id){window.NumeriaAppRoutes.navigate(`/app/readings/${encodeURIComponent(n.snapshot.id)}`);return}let method=na.find(item=>item.id===(n?.divination??`numerology`));u(method?.id??`numerology`);hi(e.id);Ce(method?.defaultMenuName??`数秘術鑑定`);Te(method?.defaultPrice??0)},children:[');
// A customer-only / legacy history entry starts a new session. Clear all
// person-specific writing and comparison input before selecting that customer.
replaceOne('hi=e=>{', 'hi=e=>{ut(``);ft(``);Rt([]);le(!1);ue(``);fe(``);me(``);ge(``);ve(`パートナー`);Fe(``);Le({points:``,realization:``,encouragement:``});ze([`人生全体`]);Ve({});Ge({overview:``,balance:``,relation:``});Ue({meishiki:``,elements:``,tenGods:``,twelveStages:``,timing:``,guidance:``});qe({intro:``,calculation:``,aspects:``,elementQuality:``,personality:``,themes:``,timing:``,action:``,glossary:``});je(``);Ne(``);De(`未定`);ke(`引越し・旅行・仕事など`);');
// The mantic preparation button used to allocate a new ID even after resume.
// Reuse the complete editor save path (ID, version, full snapshot, ACK) instead.
replaceOne('Ci=async()=>{', 'Ci=async()=>{if(Dn)return Ii();');

// Restore blank/missing personal values as blank, never as the previous person.
const resumeStart = source.indexOf('Y=(e,t)=>{');
const resumeEnd = source.indexOf(',Li=', resumeStart);
if (resumeStart < 0 || resumeEnd < 0) throw new Error('Session restore handler not found.');
let resume = source.slice(resumeStart, resumeEnd);
const replacements = [
  ['n.divination&&u(n.divination)', 'u(n.divination||`numerology`)'],
  ['n.manticBirthTime&&je(n.manticBirthTime)', 'je(n.manticBirthTime||``)'],
  ['n.manticBirthPlace&&Ne(n.manticBirthPlace)', 'Ne(n.manticBirthPlace||``)'],
  ['n.kiDirection&&De(n.kiDirection)', 'De(n.kiDirection||`未定`)'],
  ['n.kiPurpose&&ke(n.kiPurpose)', 'ke(n.kiPurpose||`引越し・旅行・仕事など`)'],
  ['typeof n.manticReadingText==`string`&&Fe(n.manticReadingText)', 'Fe(typeof n.manticReadingText===`string`?n.manticReadingText:``)'],
  ['n.manticReadingSections&&Le({...Ie,...n.manticReadingSections})', 'Le({points:``,realization:``,encouragement:``,...n.manticReadingSections})'],
  ['n.manticReadingCategories&&ze([...n.manticReadingCategories])', 'ze([...(n.manticReadingCategories||[`人生全体`])])'],
  ['n.manticCategoryComments&&Ve({...n.manticCategoryComments})', 'Ve({...n.manticCategoryComments})'],
  ['n.manticVisualComments&&Ge({...We,...n.manticVisualComments})', 'Ge({overview:``,balance:``,relation:``,...n.manticVisualComments})'],
  ['n.fourPillarsComments&&Ue({...He,...n.fourPillarsComments})', 'Ue({meishiki:``,elements:``,tenGods:``,twelveStages:``,timing:``,guidance:``,...n.fourPillarsComments})'],
  ['n.astrologyReadingSections&&qe({...Ke,...n.astrologyReadingSections})', 'qe({intro:``,calculation:``,aspects:``,elementQuality:``,personality:``,themes:``,timing:``,action:``,glossary:``,...n.astrologyReadingSections})'],
];
for (const [setter, key] of [['ie','name'],['oe','birthName'],['se','birthday'],['ye','theme'],['ut','intro'],['ft','advice'],['ue','partnerCustomerId'],['fe','partnerName'],['me','partnerBirthName'],['ge','partnerBirthday'],['ve','partnerRelation']]) {
  replacements.push([`${setter}(n.${key})`, `${setter}(typeof n.${key}===\`string\`?n.${key}:\`\`)`]);
}
replacements.push(['le(n.includeCompatibility)', 'le(n.includeCompatibility===!0)']);
replacements.push(['n.customReportItems.map', '(n.customReportItems||[]).map']);
for (const [before, after] of replacements) {
  if (resume.split(before).length !== 2) throw new Error(`Expected one restore anchor: ${before}`);
  resume = resume.replace(before, after);
}
source = source.slice(0, resumeStart) + resume + source.slice(resumeEnd);
writeFileSync(path, source);
console.log('Recent reading resumes its snapshot; customer-only transitions clear previous writing and comparison data.');
