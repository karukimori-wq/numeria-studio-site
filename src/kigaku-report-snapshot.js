import {createKigakuFixedPages} from './kigaku-fixed-pages.js';
export const KIGAKU_REPORT_SCHEMA = 'numeria.kigaku.report.v1';
const stable = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key,item[key]])) : item);
async function digest(value) {
 const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stable(value)));
 return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}
// Only the server creates this envelope. Client supplied page text is never accepted.
export async function createKigakuReportSnapshot(reading, planId, subjectName = '', subjectProfileId = null) {
 const payload = {schemaVersion:KIGAKU_REPORT_SCHEMA,createdAt:new Date().toISOString(),subjectName,subjectProfileId,planId,reading:structuredClone(reading),pages:createKigakuFixedPages(reading,planId),publicationStatus:'draft',exportAllowed:false};
 return {...payload,integrity:await digest(payload)};
}
// Check stored bytes, not the current catalog or calculator: historical text stays frozen.
export async function validateKigakuReportSnapshot(report,reading) {
 if(!report || report.schemaVersion!==KIGAKU_REPORT_SCHEMA) throw Error('KIGAKU_REPORT_SCHEMA_INVALID');
 const {integrity,...payload}=report;
 if(await digest(payload)!==integrity || stable(report.reading)!==stable(reading) || report.publicationStatus!=='draft' || report.exportAllowed!==false || report.pages?.length!==14) throw Error('KIGAKU_REPORT_INTEGRITY_INVALID');
 return structuredClone(report);
}
export function sameKigakuReading(a,b) {return stable(a)===stable(b);}
