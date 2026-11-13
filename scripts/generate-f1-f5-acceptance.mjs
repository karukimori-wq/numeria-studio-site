import { writeFileSync } from 'node:fs';
import { REPORT_PAGE_DEFINITIONS } from '../src/report-page-definitions.js';
import { REPORT_RESULT_REFERENCES } from '../src/report-result-references.js';
import { KIGAKU_PAGE_SOURCE_PATHS, KIGAKU_PAGE_INPUT_REQUIREMENTS } from '../src/kigaku-page-data.js';
import { FOUR_PILLARS_PAGE_SOURCE_PATHS } from '../src/four-pillars-page-data.js';
import { execFileSync } from 'node:child_process';
const base = execFileSync('git', ['rev-parse', 'origin/main'], { encoding: 'utf8' }).trim();
const rows = REPORT_PAGE_DEFINITIONS.map(definition => {
  const id = definition.pageDefinitionId;
  const reference = REPORT_RESULT_REFERENCES.find(item => item.pageDefinitionId === id);
  const paths = KIGAKU_PAGE_SOURCE_PATHS[id] || FOUR_PILLARS_PAGE_SOURCE_PATHS[id] || [];
  return {
    pageId: id, method: definition.methodKey, title: definition.title,
    tier: definition.tier, requiredInput: KIGAKU_PAGE_INPUT_REQUIREMENTS[id]?.required ?? reference.resultReference,
    optionalInput: KIGAKU_PAGE_INPUT_REQUIREMENTS[id]?.optional ?? 'See per-page publication rule; not independently accepted',
    publicationRule: reference.publicationRule, resultKey: definition.requiredResultKeys,
    resultKeyStatus: 'binding requirement only; formal page acceptance pending',
    implementedSourcePaths: paths,
    calculationState: paths.length || definition.methodKey === 'numerology' ? 'partial' : 'formal-page-unconnected',
    calculationVersion: definition.methodKey === 'four-pillars' ? 'ns.bazi-pillars-lunar-typescript-1.8.6.v1' : definition.methodKey === 'nine-star-ki' ? 'See kigaku page envelope solar/day/relation versions' : 'See calculator; page evidence pending',
    textIdVersionApproval: 'not-approved; formal publication blocked',
    figureTypes: reference.figureTypes,
    assetIdVersionApproval: 'unverified; formal publication blocked',
    standardScreen: 'unverified', magazineScreen: 'unverified', mobile: 'unverified', pdf: 'unverified',
    plan: 'Free/Pro authenticated acceptance pending',
    abnormalCases: 'Automated contracts only; per-page browser acceptance pending',
    baseSHA: base, developmentVerdict: '未完了', userConfirmation: 'untouched; not recorded by Codex',
  };
});
const ledger = { date: '2026-11-13', baseSHA: base, definition: '85 acceptance targets, not 85 accepted pages. source paths and required bindings never imply formal connection or approval.', rows };
writeFileSync('docs/block-editor/f1-f5-acceptance-85.json', JSON.stringify(ledger, null, 2) + '\n');
const columns = Object.keys(rows[0]);
const escape = value => String(Array.isArray(value) ? value.join('; ') : value ?? 'unconnected').replaceAll('|', '\\|').replaceAll('\n', ' ');
writeFileSync('docs/block-editor/f1-f5-acceptance-85.md', '# F1–F5 85ページ受入台帳｜2026-11-13\n\n合格0/85。認証付き画面・2レイアウト・スマホ・正式PDF・承認済み原文／素材が未確認。定義のresultKeyは必要契約であり実計算の接続証拠ではない。利用者確認欄はNotionの正本を維持する。\n\n|' + columns.join('|') + '|\n|' + columns.map(() => '---').join('|') + '|\n' + rows.map(row => '|' + columns.map(column => escape(row[column])).join('|') + '|').join('\n') + '\n');
console.log('Generated 85 acceptance targets with explicit evidence/approval gaps. No pages marked accepted.');
