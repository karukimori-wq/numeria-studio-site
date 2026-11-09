// Reused unchanged from e59dbcb:kigaku-remaining-pages.js. No text or release approval.
const elements=[null,'water','earth','wood','wood','earth','metal','metal','earth','fire'];
const generates={wood:'fire',fire:'earth',earth:'metal',metal:'water',water:'wood'};
const controls={wood:'earth',earth:'water',water:'fire',fire:'metal',metal:'wood'};
export const KIGAKU_RELATION_VERSION='ns.kigaku.person-pair.v1';
export function kigakuPersonRelation(self,partner) {
 if(!Number.isInteger(self)||self<1||self>9||!Number.isInteger(partner)||partner<1||partner>9)throw TypeError('KIGAKU_PAIR_STAR_INVALID');
 const a=elements[self],b=elements[partner];
 return a===b?'biwa':generates[a]===b?'gasei':generates[b]===a?'seiga':controls[a]===b?'gakoku':'kokuga';
}
