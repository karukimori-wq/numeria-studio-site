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
    `import React, { useEffect, useMemo, useState } from "react";`,
    `import React, { useEffect, useMemo, useRef, useState } from "react";`,
  ],
  [
    `  const growthEngineExternalReferences = useMemo(\n    () => toGrowthEngineExternalReferences(growthEngineHandoff),\n    [growthEngineHandoff]\n  );\n  const [usage, setUsage] = useState(createUsageSnapshot());`,
    `  const growthEngineExternalReferences = useMemo(\n    () => toGrowthEngineExternalReferences(growthEngineHandoff),\n    [growthEngineHandoff]\n  );\n  const growthHandoffStartedRef = useRef(false);\n  const [usage, setUsage] = useState(createUsageSnapshot());`,
  ],
  [
    `  useEffect(() => {\n    if (!usage.activeDraft) return;\n    setCurrentCase((current) => ({\n      ...current,\n      ...usage.activeDraft,\n      id: usage.activeDraft.id || current.id,\n    }));\n  }, [usage.activeDraft]);\n\n  async function startSession() {`,
    `  useEffect(() => {\n    if (!usage.activeDraft) return;\n    setCurrentCase((current) => ({\n      ...current,\n      ...usage.activeDraft,\n      id: usage.activeDraft.id || current.id,\n    }));\n  }, [usage.activeDraft]);\n\n  useEffect(() => {\n    if (!growthEngineExternalReferences || growthHandoffStartedRef.current || loading) return;\n    growthHandoffStartedRef.current = true;\n    if (usage.activeDraft) {\n      setNotice({\n        type: "warning",\n        title: "Growth Engineの予約を受け取りました",\n        body: "未完了の鑑定があるため自動開始していません。現在の案件を完成してから予約を開き直してください。",\n      });\n      return;\n    }\n    startSession();\n  }, [growthEngineExternalReferences, loading, usage.activeDraft]);\n\n  async function startSession() {`,
  ],
  [
    `        body: "この時点では月20件の鑑定数にも未完了案件数にも加算されません。途中保存した時点で未完了1案件として扱います。",`,
    `        body: nextCase.externalReferences\n          ? \`Growth Engineの予約 \${nextCase.externalReferences.reservationId} を参照して鑑定を開始しました。途中保存した時点で未完了1案件として扱います。\`\n          : "この時点では月20件の鑑定数にも未完了案件数にも加算されません。途中保存した時点で未完了1案件として扱います。",`,
  ],
]);

console.log("Automatic Growth Engine handoff start patch applied.");
