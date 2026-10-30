import assert from "node:assert/strict";
import { rebaseHydratedReportFormat } from "../src/report-format-hydration.js";

const original = { pages: [{ pageId: "cover", pageKind: "cover" }], pageSelection: [] };
const hydrated = structuredClone(original);
hydrated.pageSelection.push({ pageDefinitionId: "NUM-01", visible: true });
hydrated.pages.push({ pageId: "fixed_NUM_01", pageKind: "fixed", pageDefinitionId: "NUM-01" });
let persisted = "";
const baseline = rebaseHydratedReportFormat(JSON.stringify(original), hydrated, (serialized) => { persisted = serialized; });
assert.equal(baseline.changed, true);
assert.equal(persisted, baseline.serialized);

const history = [];
let last = baseline.serialized;
hydrated.pages[0].title = "編集後";
history.push(last);
last = JSON.stringify(hydrated);
const afterUndo = JSON.parse(history.pop());
assert.equal(afterUndo.pages.some((page) => page.pageDefinitionId === "NUM-01"), true);
assert.equal(afterUndo.pageSelection.some((selection) => selection.pageDefinitionId === "NUM-01"), true);

const unchanged = rebaseHydratedReportFormat(last, JSON.parse(last));
assert.equal(unchanged.changed, false);
console.log("Report format hydration establishes an undo-safe persisted baseline.");
