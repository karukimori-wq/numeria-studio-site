import { readFile, writeFile } from "node:fs/promises";

async function patchFile(path, replacements) {
  let source = await readFile(path, "utf8");
  for (const [before, after] of replacements) {
    if (!source.includes(before)) {
      throw new Error(`Expected patch anchor not found in ${path}: ${before.slice(0, 120)}`);
    }
    source = source.replace(before, after);
  }
  await writeFile(path, source);
}

await patchFile("src/main.jsx", [
  [
    `} from "./plan-config.js";\nimport "./styles.css";`,
    `} from "./plan-config.js";\nimport { parseGrowthEngineHandoff, toGrowthEngineExternalReferences } from "./growth-handoff.js";\nimport "./styles.css";`,
  ],
  [
    `  const scope = useMemo(() => ({ workspaceId, userId }), [workspaceId, userId]);\n  const [usage, setUsage] = useState(createUsageSnapshot());`,
    `  const scope = useMemo(() => ({ workspaceId, userId }), [workspaceId, userId]);\n  const growthEngineHandoff = useMemo(() => parseGrowthEngineHandoff(window.location), []);\n  const growthEngineExternalReferences = useMemo(\n    () => toGrowthEngineExternalReferences(growthEngineHandoff),\n    [growthEngineHandoff]\n  );\n  const [usage, setUsage] = useState(createUsageSnapshot());`,
  ],
  [
    `  function createEmptyCase() {\n    return {\n      id: \`case_\${Date.now()}\`,\n      clientName: "",\n      birthDate: "",\n      question: "",\n      notes: "",\n      resultSummary: "",\n    };\n  }`,
    `  function createEmptyCase({ includeGrowthHandoff = true } = {}) {\n    return {\n      id: \`case_\${Date.now()}\`,\n      clientName: "",\n      birthDate: "",\n      question: "",\n      notes: "",\n      resultSummary: "",\n      externalReferences: includeGrowthHandoff ? growthEngineExternalReferences : null,\n    };\n  }`,
  ],
  [
    `        body: { sessionId: nextCase.id },`,
    `        body: { sessionId: nextCase.id, ...(nextCase.externalReferences || {}) },`,
  ],
  [
    `        ...createEmptyCase(),\n        clientName: appraisal.clientName || "",`,
    `        ...createEmptyCase({ includeGrowthHandoff: false }),\n        clientName: appraisal.clientName || "",`,
  ],
  [
    `      setCurrentCase(createEmptyCase());\n      setNotice({\n        type: "success",\n        title: "鑑定を完成として記録しました",`,
    `      setCurrentCase(createEmptyCase({ includeGrowthHandoff: false }));\n      setNotice({\n        type: "success",\n        title: "鑑定を完成として記録しました",`,
  ],
]);

await patchFile("src/worker.js", [
  [
    `import { createUsageSnapshot, evaluateUsageLimit, getBillingMonth, isUnlimited, normalizePlanId, PLAN_CONFIG, PLAN_IDS } from "./plan-config.js";`,
    `import { createUsageSnapshot, evaluateUsageLimit, getBillingMonth, isUnlimited, normalizePlanId, PLAN_CONFIG, PLAN_IDS } from "./plan-config.js";\nimport { normalizeGrowthEngineExternalReferences } from "./growth-handoff.js";`,
  ],
  [
    `  if (url.pathname === "/api/sessions/start" && request.method === "POST") {\n    const sessionId = body.sessionId || \`ses_\${Date.now()}\`;\n    await saveUsageRecord(env, workspaceId, userId, record);`,
    `  if (url.pathname === "/api/sessions/start" && request.method === "POST") {\n    const sessionId = body.sessionId || \`ses_\${Date.now()}\`;\n    const externalReferences = normalizeGrowthEngineExternalReferences(body);\n    await saveUsageRecord(env, workspaceId, userId, record);`,
  ],
  [
    `      metadata: {\n        sessionId,\n        countPolicy: "completion-button-only",\n        draftPolicy: "not-counted-until-draft-save",\n      },`,
    `      metadata: {\n        sessionId,\n        externalReferences,\n        countPolicy: "completion-button-only",\n        draftPolicy: "not-counted-until-draft-save",\n      },`,
  ],
  [
    `      eventName: "studio.session.started.v1",\n      correlationId,\n      countPolicy: "completion-button-only",`,
    `      eventName: "studio.session.started.v1",\n      correlationId,\n      externalReferences,\n      countPolicy: "completion-button-only",`,
  ],
  [
    `      resultSummary: String(body.resultSummary || currentDraft?.resultSummary || "").trim(),\n      updatedAt: new Date().toISOString(),`,
    `      resultSummary: String(body.resultSummary || currentDraft?.resultSummary || "").trim(),\n      externalReferences: normalizeGrowthEngineExternalReferences(body) || currentDraft?.externalReferences || null,\n      updatedAt: new Date().toISOString(),`,
  ],
  [
    `      resultSummary: String(body.resultSummary || currentDraft?.resultSummary || "").trim(),\n      completedAt,`,
    `      resultSummary: String(body.resultSummary || currentDraft?.resultSummary || "").trim(),\n      externalReferences: normalizeGrowthEngineExternalReferences(body) || currentDraft?.externalReferences || null,\n      completedAt,`,
  ],
]);

console.log("Growth Engine handoff source patch applied.");
