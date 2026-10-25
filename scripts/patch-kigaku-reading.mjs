import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const path = 'dist/assets/numeria-app-Cckhajir.js';
let source = readFileSync(path, 'utf8');
const replace = (old, next) => { if (source.split(old).length !== 2) throw new Error(`Kigaku mount anchor mismatch: ${old}`); source = source.replace(old, next); };
const edit = 'O===`reading`&&Cr&&A===`edit`&&';
replace(edit, 'O===`reading`&&l===`nine-star-ki`&&(0,Z.jsx)(window.NumeriaKigakuReadingComponent||(window.NumeriaKigakuReadingComponent=window.NumeriaCreateKigakuReadingComponent(i)),{profiles:d,onSaved:s=>{if(!s.clientProfileId)return;f(profiles=>profiles.map(profile=>profile.id!==s.clientProfileId?profile:{...profile,status:`下書き`,updated:`たった今`,history:[{id:s.draftId,date:s.input.referenceInstant.slice(0,10).replaceAll(`-`,`.`),theme:s.input.question||`九星鑑定`,status:`下書き`,menuName:`九星気学鑑定`,price:0,divination:`nine-star-ki`,snapshot:s.reading},...profile.history.filter(row=>row.id!==s.draftId)]}))}}),O===`reading`&&Cr&&l!==`nine-star-ki`&&A===`edit`&&');
replace('O===`reading`&&Cr&&A===`preview`&&', 'O===`reading`&&Cr&&l!==`nine-star-ki`&&A===`preview`&&');
replace('if(!t.snapshot){hi(e),R(`古い履歴', 'if(t.snapshot?.schemaVersion===`numeria.kigaku.reading.v1`){window.NumeriaKigakuPendingRestore=t.id;u(`nine-star-ki`);k(`reading`);re(`edit`);return}if(!t.snapshot){hi(e),R(`古い履歴');
const client = readFileSync('src/kigaku-reading-client.js', 'utf8').replace('export function ', 'function ');
const ui = readFileSync('src/kigaku-reading-ui.js', 'utf8').replace('export function ', 'function ');
const runtime = `;(()=>{${client}\n${ui}\nwindow.NumeriaCreateKigakuReadingComponent=createKigakuReadingComponent;})();`;
new vm.Script(runtime);
// Factory registration runs before the host app module mounts.
source = runtime + '\n' + source;
writeFileSync(path, source);
let html = readFileSync('dist/original.html', 'utf8');
html = html.replace('</head>', `<style id="numeria-kigaku-reading-style">
.kigaku-reading{max-width:960px;margin:auto;padding-bottom:160px!important}
.kigaku-step{margin:16px 0;padding:18px;border:1px solid #ddd3c4;border-radius:16px;background:#fffdf9}
.kigaku-step summary{font-size:18px;font-weight:700;cursor:pointer;margin-bottom:14px}
.kigaku-field{display:grid;gap:6px;margin:14px 0;min-width:0}
.kigaku-field input,.kigaku-field textarea,.kigaku-field select{box-sizing:border-box;width:100%;max-width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;font:inherit;background:white;color:#241b3a}
.kigaku-field textarea{min-height:100px}.kigaku-reading button{min-height:44px;padding:10px 16px;cursor:pointer;white-space:normal;margin:5px 0}.kigaku-reading button:disabled{opacity:.5;cursor:default}
.kigaku-reading p{line-height:1.7;overflow-wrap:anywhere}.kigaku-table-wrap{overflow:auto;margin:18px 0}.kigaku-reading table{width:100%;border-collapse:collapse;min-width:320px}.kigaku-reading th,.kigaku-reading td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.kigaku-reading caption{text-align:left;font-weight:bold}.kigaku-reading [role=alert]{color:#a22626}
@media(max-width:600px){.kigaku-step{padding:12px}.kigaku-reading{padding-left:12px!important;padding-right:12px!important}}
</style></head>`);
writeFileSync('dist/original.html', html);
console.log('Rebuilt nine-star input replaces legacy edit and preview routes; API calculation and acknowledged draft persistence connected.');
