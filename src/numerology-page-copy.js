import { createNumerologySnapshot, NUMEROLOGY_VERSION, NAME_NORMALIZATION_VERSION } from "./numerology-copy-calculation.js";
import { NUMEROLOGY_COPY_DATA } from "./numerology-copy-data.js";
import { attachNumerologyFigures } from "./numerology-figures.js";

export const PAGE_COPY_VERSION = "ns.num.page-copy-adapter.current-calculator.2026-11-10.1";
const OPTIONAL_COMPARISON = ["birthdayNumber", "attitude", "destiny", "soul", "personality"];

function fail(code, detail = {}) {
  throw Object.assign(new Error(code), { code, ...detail });
}

export function stableJson(value) {
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stableJson(value[key])).join(",") + "}";
  return JSON.stringify(value);
}

async function revision(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableJson(value)));
  return "num-result-" + Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
}

async function validatedSubject(person, slot) {
  if (!person || typeof person !== "object") fail("person_required", { slot });
  if (typeof person.subjectRef !== "string" || !person.subjectRef.trim() || person.subjectRef.length > 180) fail("subject_ref_required", { slot });
  const snapshot = person.snapshot;
  if (snapshot?.schemaVersion !== 1 || snapshot.calculationVersion !== NUMEROLOGY_VERSION
    || snapshot.nameNormalizationVersion !== NAME_NORMALIZATION_VERSION) fail("calculation_version_mismatch", { slot });
  if (!["birth", "current", "activity"].includes(snapshot.selectedNameSource)) fail("name_source_invalid", { slot });
  const canonical = createNumerologySnapshot(snapshot);
  if (stableJson(canonical) !== stableJson(snapshot)) fail("result_snapshot_mismatch", { slot });
  const resultRevision = await revision({ subjectRef: person.subjectRef, snapshot: canonical });
  if (person.resultRevision && person.resultRevision !== resultRevision) fail("result_revision_mismatch", { slot });
  return { subjectRef: person.subjectRef, resultRevision, snapshot: canonical };
}

// Pure selection layer. HTTP callers use assembleNumerologyPageDraft() so result
// validation and provenance cannot be bypassed by injecting calculated values.
export function selectNumerologyCopies(input, calculate, records, manifest) {
  const a=calculate(input.personA||{}),b=input.personB?calculate(input.personB):null;
  const domains=manifest.valueDomains, core=["lifePath","birthdayNumber","attitude","destiny","soul","personality","maturity","personalYear"];
  const optional=["birthdayNumber","attitude","destiny","soul","personality"];
  const persons={a,b};
  const sourceInput={a:input.personA,b:input.personB};
  const get=(who,key)=>{
    const r=persons[who]?.[key];if(!r)throw{code:"missing_input",key,who};
    if(r.state!=="ready")throw{code:r.state,key,who,reason:r.reason};
    if(domains[key]&&!domains[key].includes(r.value))throw{code:"unsupported_value",key,who};
    return r.value;
  };
  const result={kind:"numerology-copy-selection",manifestId:manifest.manifestId,registryId:manifest.registryId,copyVersion:manifest.copyVersion,officialAllowed:false,officialBlockReason:"DRAFT_COPY_NOT_FORMAL_REPORT",pages:[]};
  for(const p of manifest.pages) {
    const out={pageId:p.pageId,expectedFrameCount:p.frameCount,independentComment:p.independentComment,systemExplanationAlways:p.systemExplanationAlways,state:"preview_ready",frames:[],issues:[],officialAllowed:false};
    let frame;
    const start=id=>{frame={frameId:id,segments:[],labels:[]};out.frames.push(frame);};
    const emit=(id,field="body",who="a",resultKeys=[],periodRef=null)=>{
      const hits=records.filter(r=>r.copyId===id&&r.copyVersion===manifest.copyVersion);
      if(hits.length!==1)throw{code:hits.length?"copy_ambiguous":records.some(r=>r.copyId===id)?"copy_version_mismatch":"copy_missing",copyId:id};
      const r=hits[0];if(!["draft","approved"].includes(r.reviewStatus))throw{code:"copy_not_previewable",copyId:id};if(typeof r[field]!=="string"||!r[field])throw{code:"copy_missing",copyId:id,field};
      if(!sourceInput[who]?.subjectRef)throw{code:"subject_ref_required",who};
      frame.segments.push({copyId:id,copyVersion:r.copyVersion,source:structuredClone(r.source),role:r.role,shortOrigin:field==="short"?r.shortOrigin:null,field,text:r[field],subjectRef:sourceInput[who]?.subjectRef,resultKeys,periodRef,reviewStatus:r.reviewStatus,releaseEnabled:r.releaseEnabled});
    };
    const label=(who,key)=>{const value=get(who,key);frame.labels.push({who,key,value});return value;};
    const num=(who,key,field="short")=>emit(`num.number.${label(who,key)}.basic`,field,who,[key]);
    const compareList=()=>{
      get("a","lifePath");get("b","lifePath");
      const included=["lifePath"],missing=[];
      for(const key of optional){
        const aa=a[key],bb=b?.[key];
        if(aa?.state==="ready"&&bb?.state==="ready"){get("a",key);get("b",key);included.push(key);}
        else if([aa?.state,bb?.state].some(s=>["invalid_input","error","unsupported"].includes(s)))throw{code:"invalid_comparison_result",key};
        else missing.push(key);
      }return{included,missing};
    };
    try {
      switch(p.pageId){
      case "NUM-01":
        core.forEach(k=>get("a",k));
        for(const k of core){start(k);if(k==="personalYear"){const n=label("a",k);emit(`num.year.${n}.meaning`,"short","a",[k],input.personA.referenceDate.slice(0,4));}else num("a",k);}
        break;
      case "NUM-02":
      case "NUM-03":
        for(const f of p.frames){start(f.frameId);const k=f.source;get("a",k);emit(`num.role.${k}`,"body","a",[k]);if(k==="personalYear")emit(`num.year.${label("a",k)}.meaning`,"short","a",[k],input.personA.referenceDate.slice(0,4));else num("a",k,"body");}
        break;
      case "NUM-04":
        ["lifePath","destiny","maturity","personalYear"].forEach(k=>get("a",k));
        start("connections");emit("num.connections.maturity","body","a",["lifePath","destiny","maturity"]);["lifePath","destiny","maturity"].forEach(k=>label("a",k));
        start("cycle");emit(`num.cycle.position.${label("a","personalYear")}`,"body","a",["personalYear"],input.personA.referenceDate.slice(0,4));break;
      case "NUM-05":{
        const counts=get("a","nameDigitCounts"),missing=get("a","missingDigits"),most=get("a","mostFrequentDigits");
        if(counts.length!==9||counts.some(n=>!Number.isInteger(n)||n<0)||counts.reduce((s,n)=>s+n,0)<1)throw{code:"inconsistent_counts"};
        const zero=counts.flatMap((n,i)=>n===0?[i+1]:[]),max=Math.max(...counts),top=counts.flatMap((n,i)=>n===max?[i+1]:[]);
        if(JSON.stringify(zero)!==JSON.stringify(missing)||JSON.stringify(top)!==JSON.stringify(most))throw{code:"inconsistent_counts"};
        start("name-digits");emit("num.name-digits.intro","body","a",["nameDigitCounts"]);
        if(missing.length)missing.forEach(n=>emit(`num.name-digits.missing.${n}`,"body","a",["missingDigits"]));else emit("num.name-digits.missing.none","body","a",["missingDigits"]);
        most.forEach(n=>emit(`num.name-digits.most.${n}`,"body","a",["mostFrequentDigits"]));
        if(most.length===9)emit("num.name-digits.most.uniform","body","a",["nameDigitCounts"]);
        else if(most.length>1)emit("num.name-digits.most.tie","body","a",["mostFrequentDigits"]);break;}
      case "NUM-06":{
        const seq=get("a","personalYearSequence"),yr=Number(input.personA.referenceDate.slice(0,4));
        if(seq.length!==9||seq.some((x,i)=>x.year!==yr-4+i||x.state!=="ready"||!domains.personalYear.includes(x.value)))throw{code:"inconsistent_year_sequence"};
        seq.forEach((x,i)=>{start(p.frames[i].frameId);emit(`num.year.${x.value}.meaning`,"body","a",["personalYearSequence"],String(x.year));frame.labels.push({year:x.year,value:x.value,current:x.year===yr});});break;}
      case "NUM-07":
        core.forEach(k=>get("a",k));start("map");emit("num.map.reading","body","a",core);core.forEach(k=>label("a",k));break;
      case "NUM-08":{
        const cmp=compareList();start("comparison");emit("num.compare.intro","body","a",["comparison.lifePath"]);
        for(const k of cmp.included){num("a",k);num("b",k);emit(`num.compare.${get("a",k)===get("b",k)?"same":"different"}`,"body","a",[`comparison.${k}`]);}
        if(cmp.missing.length)emit("num.compare.optional-unavailable","body","a",["comparison.items"]);
        start("dialogue");emit("num.compare.dialogue","body","a",["comparison.items"]);break;}
      case "NUM-09":
      case "NUM-10":
      case "NUM-11":
        p.requiredResults.forEach(k=>get("a",k));
        for(const f of p.frames){start(f.frameId);for(const k of f.sources||[f.source])emit(`num.theme.${f.theme}.${k}.${label("a",k)}`,"body","a",[k]);}break;
      case "NUM-12":{
        const cmp=compareList(),relation=input.familyContext;
        if(({"親子":"parent-child","夫婦・パートナー":"partners","その他の家族":"other-family"})[input.relationType]!==relation||!relation)throw{code:"missing_family_context"};
        if(relation==="parent-child"&&!["a-parent","b-parent"].includes(input.parentDirection))throw{code:"missing_parent_direction"};
        for(const who of ["a","b"]){start(`person-${who}`);for(const k of cmp.included)num(who,k);}
        start("family");for(const k of cmp.included)emit(`num.compare.${get("a",k)===get("b",k)?"same":"different"}`,"body","a",[`comparison.${k}`]);
        emit(`num.family.${relation}`,"body","a",["comparison.relationType"]);
        frame.labels.push({relationType:input.relationType,familyContext:relation,parentDirection:input.parentDirection||null});
        if(cmp.missing.length)emit("num.compare.optional-unavailable","body","a",["comparison.items"]);break;}
      case "NUM-13":{
        const nums=get("a","pinnacleNumbers"),ch=get("a","challengeNumbers"),lp=get("a","lifePath");
        if(nums.length!==4||ch.length!==4||nums.some(n=>!domains.lifePath.includes(n))||ch.some(n=>!Number.isInteger(n)||n<0||n>8))throw{code:"invalid_period_values"};
        const periods=get("a","pinnaclePeriods");
        if(periods.length!==4||periods.some((period,index)=>period.stage!==index+1||period.value!==nums[index]||period.dateBoundaryStatus!=="resolved"))throw{code:"unsupported",reason:"PINNACLE_DATE_RANGE"};
        const dates=periods.slice(1).map(period=>period.startDate),age=periods[1].startAge;
        start("pinnacles");emit("num.pinnacle.reading","body","a",["pinnacles"]);
        const starts=[input.personA.birthDate,...dates],ends=[...dates,null];
        nums.forEach((n,i)=>{emit(`num.pinnacle.${n}.meaning`,"body","a",["pinnacles"],`pinnacle-${i+1}`);frame.labels.push({stage:i+1,startAge:i===0?0:age+9*(i-1),endAgeExclusive:i===3?null:age+9*i,startInclusive:starts[i],endExclusive:ends[i],openEnded:i===3,value:n});});
        start("challenges");emit("num.challenge.reading","body","a",["challengeNumbers"]);
        ch.forEach((n,i)=>{emit(`num.challenge.${n}.meaning`,"body","a",["challengeNumbers"],null);frame.labels.push({stage:i+1,value:n,lifelongMain:i===2});});break;}
      case "NUM-14":
        get("a","personalMonth");start("month-reading");emit("num.month.reading","body","a",["personalMonth"],input.personA.referenceDate.slice(0,7));label("a","personalMonth");
        start("month-theme");emit(`num.month.${get("a","personalMonth")}.meaning`,"body","a",["personalMonth"],input.personA.referenceDate.slice(0,7));break;
      default:throw{code:"unsupported_page"};
      }
      if(out.frames.length!==p.frameCount||out.frames.some((f,i)=>f.frameId!==p.frames[i].frameId))throw{code:"frame_count_mismatch"};
    }catch(error){out.state="unavailable";out.frames=[];out.issues.push(error.code?error:{code:"reference_error",message:String(error)});}
    result.pages.push(out);
  }
  return result;
}

function bindProvenance(draft, subjects, context) {
  for (const page of draft.pages) for (const frame of page.frames) for (const segment of frame.segments) {
    const comparison = segment.resultKeys.some(key => key.startsWith("comparison."));
    const slots = comparison ? ["a", "b"] : [segment.subjectRef === subjects.a.subjectRef ? "a" : "b"];
    const bindings = slots.flatMap(slot => {
      const subject = subjects[slot];
      if (!subject) fail("comparison_person_required");
      const keys = segment.resultKeys.flatMap(key => {
        if (key === "pinnacles") return ["pinnacleNumbers"];
        if (key === "comparison.items" || key === "comparison.relationType") {
          return ["lifePath", ...OPTIONAL_COMPARISON.filter(k =>
            subjects.a.snapshot.results[k].state === "ready" && subjects.b.snapshot.results[k].state === "ready")];
        }
        return [key.replace(/^comparison\./, "")];
      });
      return [...new Set(keys)].map(key => {
        const result = subject.snapshot.results[key];
        if (result?.state !== "ready") fail("unresolved_result_binding", { slot, key });
        return { subjectRef: subject.subjectRef, resultRevision: subject.resultRevision,
          calculationVersion: subject.snapshot.calculationVersion, valueResultRef: "num." + key,
          value: structuredClone(result.value) };
      });
    });
    segment.subjectRefs = slots.map(slot => subjects[slot].subjectRef);
    segment.resultBindings = bindings;
    segment.manifestId = draft.manifestId;
    segment.registryId = draft.registryId;
    const period = segment.periodRef;
    if (typeof period === "string" && /^\d{4}$/.test(period)) {
      segment.periodRef = { kind: "calendar-year", year: Number(period), referenceDate: subjects.a.snapshot.referenceDate };
    } else if (typeof period === "string" && /^\d{4}-\d{2}$/.test(period)) {
      segment.periodRef = { kind: "calendar-month", yearMonth: period, referenceDate: subjects.a.snapshot.referenceDate };
    } else if (typeof period === "string" && period.startsWith("pinnacle-")) {
      const stage = Number(period.split("-")[1]);
      const interval = frame.labels.find(label => label.stage === stage);
      if (!interval) fail("unresolved_period_binding");
      segment.periodRef = { kind: "pinnacle", ...interval };
    }
    if (comparison) segment.relationship = { relationType: context.relationType ?? null,
      familyContext: context.familyContext ?? null, parentDirection: context.parentDirection ?? null };
  }
  return draft;
}

/** A draft renderer input, never a formal release or content approval authority. */
export async function assembleNumerologyPageDraft(context = {}, data = NUMEROLOGY_COPY_DATA) {
  const base = { schemaVersion: 1, kind: "numerology-page-draft", adapterVersion: PAGE_COPY_VERSION,
    sessionRef: context.sessionRef, manifestId: data.manifest.manifestId,
    registryId: data.registryId, copyVersion: data.manifest.copyVersion,
    exampleOnly: context.exampleOnly === true,
    officialAllowed: false, officialBlockReasons: ["DRAFT_COPY_REGISTRY", "FORMAL_PAGE_ACCEPTANCE_REQUIRED"] };
  try {
    if (context.schemaVersion !== 1) fail("page_context_version_mismatch");
    if (typeof context.sessionRef !== "string" || !context.sessionRef.trim() || context.sessionRef.length > 180) fail("session_ref_required");
    if (context.manifestId !== data.manifest.manifestId || context.registryId !== data.registryId
      || context.copyVersion !== data.manifest.copyVersion) fail("copy_contract_version_mismatch");
    if (data.registryId !== data.manifest.registryId) fail("registry_manifest_mismatch");
    const a = await validatedSubject(context.personA, "a");
    const b = context.personB ? await validatedSubject(context.personB, "b") : null;
    if (b && a.subjectRef === b.subjectRef) fail("comparison_subjects_not_distinct");
    if (b && a.snapshot.referenceDate !== b.snapshot.referenceDate) fail("comparison_reference_date_mismatch");
    const subjects = { a, b };
    const input = { ...context, personA: { ...a.snapshot, subjectRef: a.subjectRef },
      personB: b ? { ...b.snapshot, subjectRef: b.subjectRef } : null };
    const selected = selectNumerologyCopies(input,
      person => person.subjectRef === a.subjectRef ? a.snapshot.results : b.snapshot.results,
      data.records, data.manifest);
    const draft = bindProvenance(selected, subjects, context);
    return attachNumerologyFigures({ ...draft, ...base, state: "draft", subjects, issues: [] });
  } catch (error) {
    const issue = { code: error.code || "page_assembly_error", ...(error.slot ? { slot: error.slot } : {}) };
    return { ...base, state: "unavailable", subjects: null, issues: [issue],
      pages: data.manifest.pages.map(p => ({ pageId: p.pageId, expectedFrameCount: p.frameCount,
        state: "unavailable", frames: [], issues: [issue], officialAllowed: false })) };
  }
}

export function pageCopyContext({ sessionRef, subjectA, subjectB, snapshotA, snapshotB,
  relationType = null, familyContext = null, parentDirection = null }) {
  return { schemaVersion: 1, sessionRef,
    manifestId: NUMEROLOGY_COPY_DATA.manifest.manifestId, registryId: NUMEROLOGY_COPY_DATA.registryId,
    copyVersion: NUMEROLOGY_COPY_DATA.manifest.copyVersion,
    personA: { subjectRef: subjectA, snapshot: snapshotA },
    personB: snapshotB ? { subjectRef: subjectB, snapshot: snapshotB } : null,
    relationType, familyContext, parentDirection };
}

export function restrictNumerologyPageDraft(draft, planId) {
  if (planId === "pro") return draft;
  const basic = new Set(["NUM-01", "NUM-02", "NUM-03", "NUM-06"]);
  return { ...draft, pages: draft.pages.map(page => basic.has(page.pageId) ? page : {
    ...page, state: "plan_required", frames: [], figures: [], issues: [{ code: "pro_required" }], officialAllowed: false,
  }) };
}
