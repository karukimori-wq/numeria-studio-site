import { calculateNumerology, normalizeNumerologyRomanName } from "./numerology-calculator.js";

export const NUMEROLOGY_NAME_INPUT_VERSION = "numeria-numerology-name-input.v1";

export function normalizeNumerologyNameInputs(value) {
  const source = value?.version === NUMEROLOGY_NAME_INPUT_VERSION ? value : {};
  const person = input => ({ selected: input?.selected === "current" ? "current" : "birth",
    ...Object.fromEntries(["birth", "current"].map(kind => [kind, {
      romanName: typeof input?.[kind]?.romanName === "string" ? input[kind].romanName : "",
      confirmation: typeof input?.[kind]?.confirmation?.identity === "string" && typeof input?.[kind]?.confirmation?.value === "string"
        ? { identity: input[kind].confirmation.identity, value: input[kind].confirmation.value } : null,
    }])),
  });
  return { version: NUMEROLOGY_NAME_INPUT_VERSION, subject: person(source.subject), partner: person(source.partner) };
}

function numerologyNameIdentity(snapshot, role) {
  const partner = role === "partner";
  return JSON.stringify([role, partner ? snapshot?.partnerName : snapshot?.name,
    partner ? snapshot?.partnerBirthday : snapshot?.birthday, partner ? snapshot?.partnerBirthName : snapshot?.birthName]);
}

export function selectedNumerologyName(snapshot, role = "subject") {
  const person = normalizeNumerologyNameInputs(snapshot?.numerologyNameInputs)[role];
  if (!person) return { romanName: "", romanNameConfirmed: false, nameKind: "birth" };
  const entry = person[person.selected], normalized = normalizeNumerologyRomanName(entry.romanName);
  const confirmed = Boolean(normalized && entry.confirmation?.value === normalized && entry.confirmation.identity === numerologyNameIdentity(snapshot, role));
  return { romanName: confirmed ? normalized : "", romanNameConfirmed: confirmed, nameKind: person.selected };
}

export function updateNumerologyNameInputs(value, change, snapshot) {
  const next = normalizeNumerologyNameInputs(value);
  if (!["subject", "partner"].includes(change?.role)) return { ok: false, message: "本人または相手を指定してください" };
  const person = next[change.role];
  if (change.operation === "select") {
    if (!["birth", "current"].includes(change.kind)) return { ok: false, message: "使用する氏名を選択してください" };
    person.selected = change.kind;
  } else if (change.operation === "edit") {
    if (typeof change.romanName !== "string" || change.romanName.length > 256) return { ok: false, message: "氏名は256文字以内で入力してください" };
    person[person.selected] = { romanName: change.romanName, confirmation: null };
  } else if (change.operation === "confirm") {
    const entry = person[person.selected], normalized = normalizeNumerologyRomanName(entry.romanName);
    if (!normalized) return { ok: false, message: "ローマ字フルネームをA〜Zで入力してください" };
    const birthday = change.role === "partner" ? snapshot?.partnerBirthday : snapshot?.birthday;
    if (calculateNumerology({ birthday, referenceDate: snapshot?.visitDate }).status !== "calculated") return { ok: false, message: "生年月日と鑑定の基準日を確認してください" };
    entry.confirmation = { identity: numerologyNameIdentity(snapshot, change.role), value: normalized };
  } else return { ok: false, message: "氏名の操作を確認してください" };
  return { ok: true, value: next };
}
