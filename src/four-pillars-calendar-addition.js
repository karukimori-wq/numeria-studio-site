import {parseYunInstant} from './four-pillars-yun-instant.js';

// Internal JST calendar arithmetic. Callers validate the domain-specific offset.
export function addJapanStandardCalendar(instant,offset){
 let standard=new Date(parseYunInstant(instant)+9*3600000);
 const steps=[];
 for(const unit of ['years','months']){
  const amount=offset[unit]||0,from=standard.toISOString().slice(0,19);
  if(!Number.isSafeInteger(amount)||amount<0||amount>2100)throw Error('CALENDAR_OFFSET_INVALID');
  const target=new Date(Date.UTC(standard.getUTCFullYear()+(unit==='years'?amount:0),standard.getUTCMonth()+(unit==='months'?amount:0),1,standard.getUTCHours(),standard.getUTCMinutes(),standard.getUTCSeconds()));
  const lastDay=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
  const day=Math.min(standard.getUTCDate(),lastDay),clamped=day!==standard.getUTCDate();target.setUTCDate(day);standard=target;
  steps.push({unit,amount,from,to:standard.toISOString().slice(0,19),clamped});
 }
 for(const unit of ['days','hours']){
  const amount=offset[unit]||0,from=standard.toISOString().slice(0,19);
  if(!Number.isSafeInteger(amount)||amount<0||amount>2100)throw Error('CALENDAR_OFFSET_INVALID');
  if(unit==='days')standard.setUTCDate(standard.getUTCDate()+amount);else standard.setUTCHours(standard.getUTCHours()+amount);
  steps.push({unit,amount,from,to:standard.toISOString().slice(0,19),clamped:false});
 }
 return{standardDateTime:standard.toISOString().slice(0,19)+'+09:00',startInstant:new Date(standard.getTime()-9*3600000).toISOString(),steps};
}
