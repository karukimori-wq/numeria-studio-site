// Internal second-precision instant contract shared by Yun projections.
export function parseYunInstant(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.000)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value))throw Error('SECOND_PRECISION_INSTANT_REQUIRED');
 const date=new Date(value.slice(0,10)+'T00:00:00Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value.slice(0,10))throw Error('DATE_INVALID');
 const milliseconds=Date.parse(value);if(!Number.isFinite(milliseconds))throw Error('INSTANT_INVALID');return milliseconds;
}
