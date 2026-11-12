import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { analyzeRepository } from "../src/engine";

function configuration(repositoryPath: string) {
  return {
    repositoryPath,
    baseline: { baseline_id: "BASE-1", description: "Integration fixture" },
    walPath: ".codeforge/findings.wal.jsonl",
    specification: {
      requirements: [{
        requirement_id: "REQ-1",
        title: "Repository imports resolve",
        constraint_level: "Foundational" as const
      }],
      criteria: [{
        criterion_id: "CRIT-1",
        requirement_id: "REQ-1",
        definition: "Repository verification must pass.",
        structured_predicate: {
          type: "ATTRIBUTE_EQUALS" as const,
          evidence_class: "Structural" as const,
          attribute: "verification_passed",
          expected: true
        },
        applicability: { artifact_ids: ["repository:root"] }
      }],
      evidence_requirements: [{
        evidence_requirement_id: "ER-1",
        criterion_id: "CRIT-1",
        evidence_class: "Structural" as const,
        sufficiency_conditions: [{
          type: "MIN_COUNT" as const,
          evidence_class: "Structural" as const,
          min_count: 1
        }]
      }]
    }
  };
}

test("analysis engine integrates verification, evidence, evaluation, and idempotent persistence", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-analysis-"));
  try {
    await writeFile(join(root, "main.ts"), "export const value = 1;\n");
    const config = configuration(root);
    const first = await analyzeRepository(config);

    assert.equal(first.verification.passed, true);
    assert.equal(first.evaluationContext.artifacts.length, 2);
    assert.equal(first.observedEvidence.length, 5);
    assert.ok(first.observedEvidence.every((item) => item.integrity_identifier));
    assert.deepEqual(first.findings.map((finding) => finding.result_state), ["Conforming", "Not Applicable"]);
    assert.equal(first.persistence.newlyPersistedCount, 2);
    assert.equal(first.persistence.alreadyPersistedCount, 0);

    const second = await analyzeRepository(config);
    assert.deepEqual(second.findings.map((finding) => finding.finding_id), first.findings.map((finding) => finding.finding_id));
    assert.equal(second.persistence.newlyPersistedCount, 0);
    assert.equal(second.persistence.alreadyPersistedCount, 2);

    const wal = await readFile(first.persistence.walPath, "utf8");
    assert.equal(wal.trim().split(/\r?\n/).length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("analysis engine carries architectural violations into repository evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-analysis-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "main.ts"), "import './missing';\n");
    const result = await analyzeRepository(configuration(root));

    assert.equal(result.verification.passed, false);
    const dependencyEvidence = result.observedEvidence.find((item) =>
      item.artifact_id === "repository:root" && item.evidence_class === "Dependency"
    );
    assert.ok(dependencyEvidence);
    assert.ok(typeof dependencyEvidence.payload === "object" && dependencyEvidence.payload !== null && !Array.isArray(dependencyEvidence.payload));
    const unresolved = dependencyEvidence.payload.unresolved_imports;
    assert.ok(Array.isArray(unresolved));
    assert.ok(unresolved.some((entry) =>
      typeof entry === "object" && entry !== null && "rule_id" in entry && entry.rule_id === "ARCH-023"
    ));

    const structuralEvidence = result.observedEvidence.find((item) =>
      item.artifact_id === "repository:root" && item.evidence_class === "Structural"
    );
    assert.ok(structuralEvidence);
    assert.ok(typeof structuralEvidence.payload === "object" && structuralEvidence.payload !== null && !Array.isArray(structuralEvidence.payload));
    assert.equal(structuralEvidence.payload.verification_passed, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("analysis engine carries TypeScript AST symbols and cross-file calls into evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-analysis-typescript-"));
  try {
    await writeFile(
      join(root, "main.ts"),
      'import { helper } from "./helper";\nexport function run() { return helper(); }\n'
    );
    await writeFile(
      join(root, "helper.ts"),
      "export function helper() { return 42; }\n"
    );

    const result = await analyzeRepository(configuration(root));
    const structure = result.observedEvidence.find((item) =>
      item.artifact_id === "file:main.ts" && item.evidence_class === "Structural"
    );
    const dependencies = result.observedEvidence.find((item) =>
      item.artifact_id === "file:main.ts" && item.evidence_class === "Dependency"
    );
    const repositoryDependencies = result.observedEvidence.find((item) =>
      item.artifact_id === "repository:root" && item.evidence_class === "Dependency"
    );

    assert.ok(structure?.payload && typeof structure.payload === "object" && !Array.isArray(structure.payload));
    assert.ok(Array.isArray(structure.payload.symbols));
    assert.ok(structure.payload.symbols.some((symbol) =>
      typeof symbol === "object" && symbol !== null && "name" in symbol && symbol.name === "run"
    ));
    assert.ok(dependencies?.payload && typeof dependencies.payload === "object" && !Array.isArray(dependencies.payload));
    assert.ok(Array.isArray(dependencies.payload.calls));
    assert.ok(dependencies.payload.calls.some((call) =>
      typeof call === "object" && call !== null && "calleePath" in call && call.calleePath === "helper.ts"
    ));
    assert.ok(repositoryDependencies?.payload && typeof repositoryDependencies.payload === "object" && !Array.isArray(repositoryDependencies.payload));
    assert.ok(Array.isArray(repositoryDependencies.payload.call_edges));
    assert.ok(repositoryDependencies.payload.call_edges.length > 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("analysis engine carries Python AST symbols and cross-file calls into the graph and evidence", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-analysis-python-"));
  try {
    await writeFile(join(root, "main.py"), "from helper import calculate\ndef main():\n    return calculate()\n");
    await writeFile(join(root, "helper.py"), "def calculate():\n    return 42\n");
    const result = await analyzeRepository(configuration(root));
    if (result.repository.analysisWarnings?.some((warning) => warning.includes("Python symbol analysis was skipped"))) {
      t.skip("A Python interpreter is needed for stdlib AST analysis.");
      return;
    }

    assert.ok(result.dependencyGraph.nodes.some((node) => node.id === "symbol:main.py#main"));
    assert.ok(result.dependencyGraph.edges.some((edge) =>
      edge.from === "symbol:main.py#main" && edge.to === "symbol:helper.py#calculate" && edge.kind === "references"
    ));
    const evidence = result.observedEvidence.find((item) => item.artifact_id === "file:main.py" && item.evidence_class === "Dependency");
    assert.ok(evidence);
    assert.ok(typeof evidence.payload === "object" && evidence.payload !== null && !Array.isArray(evidence.payload));
    assert.ok(Array.isArray(evidence.payload.calls));
    assert.ok(evidence.payload.calls.some((call) =>
      typeof call === "object" && call !== null && "calleePath" in call && call.calleePath === "helper.py"
    ));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
