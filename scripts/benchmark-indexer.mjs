import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
// Load the compiled workspace entrypoint without relying on npm workspace links.
const { indexRepository } = await import(
  new URL("../packages/repository-indexer/dist/src/indexer.js", import.meta.url).href
);

const sizes = [100, 500, 1000];
const largeMode = process.argv.includes("--large");
const astHeavyMode = process.argv.includes("--ast-heavy");

async function createRepository(root, fileCount, linesPerFile = 0, declarationsPerFile = 1) {
  const sourceDir = join(root, "src");
  await mkdir(sourceDir, { recursive: true });
  for (let index = 0; index < fileCount; index += 1) {
    const current = String(index).padStart(5, "0");
    const previous = String(index - 1).padStart(5, "0");
    const lines = [];
    if (index > 0) lines.push(`import { fn${previous} } from "./module${previous}";`);
    for (let declaration = 0; declaration < declarationsPerFile; declaration += 1) {
      const name = declaration === 0 ? `fn${current}` : `fn${current}_${declaration}`;
      const body = declaration === 0 && index > 0 ? `fn${previous}() + 1` : "1";
      lines.push(`export function ${name}() { return ${body}; }`);
    }
    const base = `${lines.join("\n")}\n`;
    const baseLines = base.split("\n").length - 1;
    const source = base + "// benchmark filler\n".repeat(Math.max(0, linesPerFile - baseLines));
    await writeFile(join(sourceDir, `module${current}.ts`), source);
  }
}

const scenarios = sizes.map((fileCount) => ({ fileCount, linesPerFile: 0, declarationsPerFile: 1, iterations: 5, warmups: 1 }));
if (largeMode) scenarios.push({ fileCount: 500, linesPerFile: 10_000, declarationsPerFile: 1, iterations: 1, warmups: 0 });
if (astHeavyMode) scenarios.push({ fileCount: 500, linesPerFile: 2_000, declarationsPerFile: 100, iterations: 3, warmups: 1 });

const results = [];
for (const scenario of scenarios) {
  const { fileCount, linesPerFile, declarationsPerFile, iterations, warmups } = scenario;
  const root = await mkdtemp(join(tmpdir(), `codeforge-benchmark-${fileCount}-`));
  try {
    await createRepository(root, fileCount, linesPerFile, declarationsPerFile);
    for (let warmup = 0; warmup < warmups; warmup += 1) {
      await indexRepository(root);
      globalThis.gc?.();
    }
    const samples = [];
    const stageSamples = [];
    let latest;
    let latestTiming;
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      globalThis.gc?.();
      const started = performance.now();
      latest = await indexRepository(root, undefined, (timing) => { latestTiming = timing; });
      samples.push(performance.now() - started);
      stageSamples.push(latestTiming);
    }
    const sortedSamples = [...samples].sort((a, b) => a - b);
    const medianMs = Number(sortedSamples[Math.floor(sortedSamples.length / 2)].toFixed(2));
    const minMs = Number(sortedSamples[0].toFixed(2));
    const maxMs = Number(sortedSamples.at(-1).toFixed(2));
    const stageNames = ["walkMs", "sourceIoCumulativeMs", "sourceParseMs", "pythonAstMs", "configMs", "importResolutionMs", "callResolutionMs"];
    const stageTimingMedians = Object.fromEntries(stageNames.map((name) => {
      const stageValues = stageSamples.map((timing) => timing[name]).sort((a, b) => a - b);
      return [name, Number(stageValues[Math.floor(stageValues.length / 2)].toFixed(2))];
    }));
    const symbols = latest.files.reduce((sum, file) => sum + (file.symbols?.length ?? 0), 0);
    const calls = latest.files.reduce((sum, file) => sum + (file.calls?.length ?? 0), 0);
    results.push({
      fileCount,
      ...(linesPerFile ? { sourceLines: fileCount * linesPerFile } : {}),
      declarationsPerFile,
      totalBytes: latest.totalBytes,
      samplesMs: samples.map((sample) => Number(sample.toFixed(2))),
      minMs,
      medianMs,
      maxMs,
      stageTimingMedians,
      filesPerSecond: Math.round(fileCount / (medianMs / 1000)),
      ...(linesPerFile ? { linesPerSecond: Math.round((fileCount * linesPerFile) / (medianMs / 1000)) } : {}),
      symbols,
      calls
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

console.log(JSON.stringify({ node: process.version, platform: process.platform, largeMode, astHeavyMode, results }, null, 2));
