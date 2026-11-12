import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
// Load compiled workspace entrypoints by URL so the benchmark works before
// npm has materialized workspace links in node_modules.
const { analyzeRepository } = await import(
  new URL("../packages/analysis-engine/dist/src/engine.js", import.meta.url).href
);
const { indexRepository } = await import(
  new URL("../packages/repository-indexer/dist/src/indexer.js", import.meta.url).href
);

const astHeavyMode = process.argv.includes("--ast-heavy");
const sizes = [100, 500, 1000];

async function createRepository(root, fileCount, declarationsPerFile = 1, linesPerFile = 0) {
  const packageSize = 50;
  for (let index = 0; index < fileCount; index += 1) {
    const packageId = String(Math.floor(index / packageSize)).padStart(3, "0");
    const localIndex = index % packageSize;
    const directory = join(root, "packages", `service-${packageId}`, "src");
    await mkdir(directory, { recursive: true });
    const current = String(localIndex).padStart(4, "0");
    const previous = String(localIndex - 1).padStart(4, "0");
    const sourceLines = [];
    if (localIndex > 0) sourceLines.push(`import { fn${previous} } from "./module-${previous}";`);
    for (let declaration = 0; declaration < declarationsPerFile; declaration += 1) {
      const name = declaration === 0 ? `fn${current}` : `fn${current}_${declaration}`;
      const expression = declaration === 0 && localIndex > 0 ? `fn${previous}() + 1` : "1";
      sourceLines.push(`export function ${name}() { return ${expression}; }`);
    }
    const base = `${sourceLines.join("\n")}\n`;
    const baseLineCount = base.split("\n").length - 1;
    const content = base + "// monorepo benchmark filler\n".repeat(Math.max(0, linesPerFile - baseLineCount));
    await writeFile(join(directory, `module-${current}.ts`), content);
  }
}

const specification = {
  requirements: [{ requirement_id: "REQ-PERF", title: "Repository checks pass", constraint_level: "Foundational" }],
  criteria: [{
    criterion_id: "CRIT-PERF",
    requirement_id: "REQ-PERF",
    definition: "The repository has no architectural verification violations.",
    structured_predicate: { type: "ATTRIBUTE_EQUALS", evidence_class: "Structural", attribute: "verification_passed", expected: true },
    applicability: { artifact_ids: ["repository:root"] }
  }],
  evidence_requirements: [{
    evidence_requirement_id: "ER-PERF",
    criterion_id: "CRIT-PERF",
    evidence_class: "Structural",
    sufficiency_conditions: [{ type: "MIN_COUNT", evidence_class: "Structural", min_count: 1 }]
  }]
};

const scenarios = sizes.map((fileCount) => ({ fileCount, declarationsPerFile: 1, linesPerFile: 0, iterations: 3 }));
if (astHeavyMode) scenarios.push({ fileCount: 500, declarationsPerFile: 100, linesPerFile: 2_000, iterations: 2 });

const results = [];
for (const scenario of scenarios) {
  const root = await mkdtemp(join(tmpdir(), `codeforge-pipeline-${scenario.fileCount}-`));
  try {
    await createRepository(root, scenario.fileCount, scenario.declarationsPerFile, scenario.linesPerFile);
    const configuration = (walName) => ({
      repositoryPath: root,
      baseline: { baseline_id: "BASE-PERF", description: "Synthetic performance benchmark" },
      specification,
      walPath: `.codeforge/${walName}.wal.jsonl`
    });

    const warmup = await analyzeRepository(configuration("warmup"));
    if (!warmup.verification.passed) throw new Error(`Synthetic repository failed verification: ${JSON.stringify(warmup.verification.violations.slice(0, 3))}`);
    globalThis.gc?.();

    const indexerSamples = [];
    const pipelineSamples = [];
    let latest;
    for (let iteration = 0; iteration < scenario.iterations; iteration += 1) {
      globalThis.gc?.();
      let started = performance.now();
      await indexRepository(root);
      indexerSamples.push(performance.now() - started);

      globalThis.gc?.();
      started = performance.now();
      latest = await analyzeRepository(configuration(`run-${iteration}`));
      pipelineSamples.push(performance.now() - started);
    }
    const median = (values) => {
      const ordered = [...values].sort((a, b) => a - b);
      return Number(ordered[Math.floor(ordered.length / 2)].toFixed(2));
    };
    const symbols = latest.repository.files.reduce((sum, file) => sum + (file.symbols?.length ?? 0), 0);
    const calls = latest.repository.files.reduce((sum, file) => sum + (file.calls?.length ?? 0), 0);
    results.push({
      fileCount: scenario.fileCount,
      ...(scenario.linesPerFile ? { sourceLines: scenario.fileCount * scenario.linesPerFile } : {}),
      packageCount: Math.ceil(scenario.fileCount / 50),
      declarationsPerFile: scenario.declarationsPerFile,
      iterations: scenario.iterations,
      indexerSamplesMs: indexerSamples.map((value) => Number(value.toFixed(2))),
      indexerMedianMs: median(indexerSamples),
      pipelineSamplesMs: pipelineSamples.map((value) => Number(value.toFixed(2))),
      pipelineMedianMs: median(pipelineSamples),
      pipelineAddedMedianMs: Number((median(pipelineSamples) - median(indexerSamples)).toFixed(2)),
      symbols,
      calls,
      findingCount: latest.findings.length,
      verificationPassed: latest.verification.passed
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

console.log(JSON.stringify({ node: process.version, platform: process.platform, astHeavyMode, results }, null, 2));
