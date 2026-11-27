import { readFileSync, writeFileSync } from "node:fs";
const path = "dist/assets/numeria-app-Cckhajir.js";
let source = readFileSync(path, "utf8");
function replaceOne(before, after) {
  if (source.split(before).length !== 2) throw Error(`Common numerology calculation anchor: ${before.slice(0, 80)}`);
  source = source.replace(before, after);
}
replaceOne('numeriaNameInputsRef=(0,i.useRef)', '[numeriaNameRevision,setNumeriaNameRevision]=(0,i.useState)(0),numeriaNameInputsRef=(0,i.useRef)');
replaceOne('if(result.ok){numeriaNameInputsRef.current=result.value;', 'if(result.ok){numeriaNameInputsRef.current=result.value;setNumeriaNameRevision(value=>value+1);');
replaceOne('F=(0,i.useMemo)(()=>Qo(M,ae),[M,ae])', 'F=numerologyLegacyViewNumbers({divination:l,name:j,birthName:ae,birthday:M,visitDate:be,numerologyNameInputs:numeriaNameInputsRef.current})');
replaceOne('ot=ce&&de&&he?{name:de,birthName:pe,birthday:he,relation:_e}:null', 'ot=ce&&de&&he?{name:de,birthName:pe,birthday:he,relation:_e,numbers:numerologyLegacyPartnerNumbers({partnerName:de,partnerBirthName:pe,partnerBirthday:he,visitDate:be,numerologyNameInputs:numeriaNameInputsRef.current})}:null');
replaceOne('le=x?Qo(x.birthday,x.birthName):null', 'le=x?.numbers||null');
// Keep other old consumers (including comparison helpers) on the same dated
// calculator. A missing explicit date cannot silently mean 2026 or today.
const start = source.indexOf('function Qo('), end = source.indexOf('function $o(', start);
if (start < 0 || end < 0) throw Error('Legacy numerology calculator boundaries missing');
source = source.slice(0, start) + 'function Qo(birthday,romanName,referenceDate){const result=calculateNumerology({birthday,romanName,referenceDate});return Object.fromEntries(["lifePath","birthdayNumber","attitude","destiny","soul","personality","maturity","personalYear"].map(key=>[key,result.coreNumbers?.[key]??0]))}' + source.slice(end);
replaceOne('function $o(e){', 'function $o(e){if(!numerologyLegacyNumbersReady(e))return{overview:"",gifts:"",work:"",relationships:"",growth:"",yearly:""};');
// Empty inputs must not borrow the interpretation of number 1.
source = source.replace(/\$\[([^\[\]]+)\]\?\?\$\[1\]/g, '$[$1]??{title:"未確定",body:"必要な入力を確認してください。",keyword:"未確定"}');
replaceOne('yearly:`2026年はパーソナルイヤー', 'yearly:`基準年はパーソナルイヤー');
source = source.replaceAll('note:`2026年の流れ`', 'note:`基準年の流れ`');
replaceOne('onClick:async()=>{Tn(`AIで下書きを作成しています…`);', 'onClick:async()=>{if(l!=="numerology"||!numerologyLegacyNumbersReady(F)){Tn("生年月日・基準日・確認済みローマ字氏名から計算できる数秘術の鑑定を開いてください");return}Tn(`AIで下書きを作成しています…`);');
const runtime = readFileSync("src/numerology-legacy-bridge.js", "utf8").replace(/^import .*;\s*/gm, "").replaceAll("export function ", "function ");
writeFileSync(path, source + "\n" + runtime);
console.log("Legacy number display/AI/report numbers use confirmed-name and saved-reference-date calculation; unavailable numbers remain unavailable.");
