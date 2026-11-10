import { selectedNumerologyName } from "./numerology-name-input.js";
import { createNumerologySnapshot } from "./numerology-copy-calculation.js";
import { assembleNumerologyPageDraft, pageCopyContext, restrictNumerologyPageDraft } from "./numerology-page-copy.js";
import { reportPageDefinitionsFor } from "./report-page-definitions.js";

export async function buildNumerologyRegisteredDraft(reading, planId = "free") {
  if (reading?.divination !== "numerology" || typeof reading.id !== "string" || !reading.id.trim() || reading.id.length > 140) return null;
  const person = (role, birthday) => {
    const name = selectedNumerologyName(reading, role);
    return createNumerologySnapshot({ birthDate: birthday, referenceDate: reading.visitDate,
      selectedName: name.romanName, romanNameConfirmed: name.romanNameConfirmed, selectedNameSource: name.nameKind });
  };
  const family = reading.numerologyFamilyInput;
  const familyContext = ["parent-child", "partners", "other-family"].includes(family?.context) ? family.context : null;
  const relationType = { "parent-child": "親子", partners: "夫婦・パートナー", "other-family": "その他の家族" }[familyContext] || null;
  const context = pageCopyContext({ sessionRef: reading.id, subjectA: `${reading.id}:person-a`, subjectB: `${reading.id}:person-b`,
    snapshotA: person("subject", reading.birthday), snapshotB: reading.includeCompatibility === true ? person("partner", reading.partnerBirthday) : null,
    relationType, familyContext, parentDirection: ["a-parent", "b-parent"].includes(family?.parentDirection) ? family.parentDirection : null });
  // Scope/values are derived from inputs. Incoming copy/figure/approval fields are ignored.
  const draft = await assembleNumerologyPageDraft(context);
  const titles = new Map(reportPageDefinitionsFor("numerology", "pro").map(page => [page.pageDefinitionId, page.title]));
  return restrictNumerologyPageDraft({ ...draft, pages: draft.pages.map(page => ({ ...page, title: titles.get(page.pageId) })) }, planId);
}

// Persist IDs/provenance only at this stage. Draft text is returned by the
// authenticated preview endpoint, under the current server-side plan.
export async function withNumerologyRegisteredSelection(reading, planId) {
  if (!reading || typeof reading !== "object") return reading;
  const { numerologyRegisteredDraft, numerologyRegisteredSelection, ...input } = reading;
  if (input.numerologyRegisteredPagesEnabled !== true) return input;
  const draft = await buildNumerologyRegisteredDraft(input, planId);
  if (!draft) return input;
  return { ...input, numerologyRegisteredSelection: { adapterVersion: draft.adapterVersion, registryId: draft.registryId,
    manifestId: draft.manifestId, copyVersion: draft.copyVersion, officialAllowed: false,
    pages: draft.pages.map(page => ({ pageId: page.pageId, state: page.state, issues: page.issues,
      frames: page.frames.map(frame => ({ frameId: frame.frameId, segments: frame.segments.map(({ text, ...references }) => references) })) })) } };
}
