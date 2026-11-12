import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { RepositorySnapshot } from "@codeforge/repository-indexer";
import { analyzeRepository } from "./engine";
import { computeImpactAnalysis } from "./impact";
import type { AnalysisConfiguration } from "./types";

function printHelp(): void {
  console.log(`
Usage: forge <command> [options]

Commands:
  analyze   Perform end-to-end repository analysis & evaluation
  impact    Compute direct and transitive file dependents
  init      Scaffold initial CodeForge configuration and specification files
  help      Display help information

Options:
  --repo <path>         Path to repository root directory (default: current directory)
  --spec <path>         Path to specification file (JSON or YAML)
  --remediate           Generate AI remediation patches for non-conforming findings
  --file <path>         Target file for impact analysis
  --help, -h            Show help documentation
`);
}

function parseJsonFile<T>(filePath: string): T {
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse JSON file at ${filePath}: ${message}`);
  }
}

export async function runCli(args: string[] = process.argv.slice(2)): Promise<number> {
  if (args.length === 0 || args.includes("--help") || args.includes("-h") || args[0] === "help") {
    printHelp();
    return 0;
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  if (command === "analyze") {
    const { values } = parseArgs({
      args: commandArgs,
      options: {
        repo: { type: "string" },
        spec: { type: "string" },
        wal: { type: "string" },
        remediate: { type: "boolean", default: false }
      },
      allowPositionals: true
    });

    const repoPath = resolve(values.repo || ".");
    if (!values.spec) {
      console.error("Error: --spec parameter is required for analyze command.");
      return 1;
    }

    const specPath = isAbsolute(values.spec) ? values.spec : resolve(repoPath, values.spec);
    const specification = parseJsonFile<AnalysisConfiguration["specification"]>(specPath);

    const configuration: AnalysisConfiguration & { remediate?: boolean } = {
      repositoryPath: repoPath,
      specification,
      baseline: {
        baseline_id: "baseline:initial",
        description: "Initial automated repository snapshot baseline"
      },
      walPath: values.wal || resolve(repoPath, ".codeforge/wal.jsonl"),
      remediate: values.remediate
    };

    console.log(`Starting analysis for repository: ${repoPath}`);
    const result = await analyzeRepository(configuration);

    console.log(`\nAnalysis Completed Successfully!`);
    console.log(`- Files Processed    : ${result.repository.files.length}`);
    console.log(`- Total Findings     : ${result.findings.length}`);
    console.log(`- Persisted Findings : ${result.persistence.newlyPersistedCount}`);

    if (result.remediations && result.remediations.length > 0) {
      console.log(`\n==================================================`);
      console.log(`  AI Remediation Patches (${result.remediations.length})`);
      console.log(`==================================================\n`);
      for (const patch of result.remediations) {
        console.log(`Finding ID   : ${patch.findingId}`);
        console.log(`Rule ID      : ${patch.ruleId}`);
        console.log(`Target File  : ${patch.targetFile}`);
        console.log(`Confidence   : ${(patch.confidenceScore * 100).toFixed(0)}%`);
        console.log(`Suggested Fix:\n${patch.suggestedFix}`);
        console.log(`Explanation  : ${patch.explanation}`);
        console.log("-".repeat(50));
      }
    }

    return 0;
  }

  if (command === "impact") {
    const { values } = parseArgs({
      args: commandArgs,
      options: {
        repo: { type: "string" },
        file: { type: "string" }
      },
      allowPositionals: true
    });

    const repoPath = resolve(values.repo || ".");
    if (!values.file) {
      console.error("Error: --file parameter is required for impact command.");
      return 1;
    }

    const result = computeImpactAnalysis(repoPath, values.file);
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  return 1;
}

if (process.argv[1] && process.argv[1].endsWith("cli.js")) {
  runCli().then((code) => process.exit(code));
}