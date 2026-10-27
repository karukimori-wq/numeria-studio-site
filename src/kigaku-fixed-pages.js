import {createKigakuBasicPages} from './kigaku-basic-pages.js';
import {createKigakuCurrentPages} from './kigaku-current-pages.js';
import {createKigakuDayPage} from './kigaku-day-page.js';
import {createKigakuDirectionPage} from './kigaku-direction-page.js';
import {createKigakuPeriodPages} from './kigaku-period-pages.js';
import {createKigakuRemainingPages} from './kigaku-remaining-pages.js';
export function createKigakuFixedPages(snapshot,planId='free') {
 return [...createKigakuBasicPages(snapshot),...createKigakuCurrentPages(snapshot),createKigakuDayPage(snapshot,planId),createKigakuDirectionPage(snapshot,planId),...createKigakuPeriodPages(snapshot,planId),...createKigakuRemainingPages(snapshot,planId)].sort((a,b)=>a.pageId.localeCompare(b.pageId));
}
