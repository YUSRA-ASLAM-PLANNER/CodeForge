#!/usr/bin/env node
import { access, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { analyzeRepository } from "./engine";
import { calculateRepositoryImpact, resolveImpactTarget } from "./impact";
import type { AnalysisConfiguration } from "./types";
import { analyzeRepositoryPath, verifyRepositoryPath } from "@codeforge/verification-engine";

type Format = "text" | "json";
type Command = "init" | "verify" | "analyze" | "impact";
type Options = { command: Command; repositoryPath: string; format: Format; specPath?: string; walPath?: string; filePath?: string };

const starterConfiguration = `architecture:
  autoDetectLayers: true
  importBoundaries: []
`;

const starterSpecification = {
  requirements: [{
    requirement_id: "REQ-ARCH-001",
    title: "Repository architecture checks pass",
    constraint_level: "Foundational"
  }],
  criteria: [{
    criterion_id: "CRIT-ARCH-001",
    requirement_id: "REQ-ARCH-001",
    definition: "The repository has no architectural verification violations.",
    structured_predicate: {
      type: "ATTRIBUTE_EQUALS",
      evidence_class: "Structural",
      attribute: "verification_passed",
      expected: true
    },
    applicability: { artifact_ids: ["repository:root"] }
  }],
  evidence_requirements: [{
    evidence_requirement_id: "ER-ARCH-001",
    criterion_id: "CRIT-ARCH-001",
    evidence_class: "Structural",
    sufficiency_conditions: [{
      type: "MIN_COUNT",
      evidence_class: "Structural",
      min_count: 1
    }]
  }]
};

function usage(): void {
  console.log(`CodeForge repository analysis

Usage:
  forge init [repository-path]
  forge verify [repository-path] [--format text|json]
  forge analyze [repository-path] --spec <specification.json> [--wal <path>] [--format text|json]
  forge impact <file-path> [repository-path] [--format text|json]

Commands:
  init                   Create starter config and analysis specification
  verify                 Run architectural verification
  analyze                Run verification, Chapter 14 evaluation, and persist findings
  impact                 List direct and transitive dependents of a changed file

Options:
  --spec <path>          Chapter 14 specification JSON (required for analyze)
  --wal <path>           Findings WAL path (default: .codeforge/findings.wal.jsonl)
  --format <format>      Output as text (default) or JSON
  -h, --help             Show this help

Exit codes:
  0  Completed without verification violations or non-conforming findings
  1  Invalid arguments, specification, configuration, or repository access
  2  Verification violations or non-conforming findings`);
}

function parse(args: string[]): Options {
  const command = args.shift();
  if (command !== "init" && command !== "verify" && command !== "analyze" && command !== "impact") throw new Error('Expected "init", "verify", "analyze", or "impact" command.');
  const positional: string[] = [];
  let specPath: string | undefined;
  let walPath: string | undefined;
  let format: Format = "text";
  for (let i = 0; i < args.length; i += 1) {
    const argument = args[i];
    if (argument.trim().length === 0) {
      throw new Error("Repository path cannot be empty.");
    }
    const getValue = (): string => {
      const value = args[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`Option "${argument}" requires a value.`);
      i += 1;
      return value;
    };
    if (argument === "--format") {
      const value = getValue();
      if (value !== "text" && value !== "json") throw new Error(`Unsupported output format: ${value}`);
      format = value;
    } else if (argument.startsWith("--format=")) {
      const value = argument.slice("--format=".length);
      if (value !== "text" && value !== "json") throw new Error(`Unsupported output format: ${value || "(empty)"}`);
      format = value;
    } else if (argument === "--spec") specPath = getValue();
    else if (argument === "--wal") walPath = getValue();
    else if (argument.startsWith("-")) throw new Error(`Unknown option: ${argument}`);
    else positional.push(argument);
  }
  if (command === "analyze" && !specPath) throw new Error('The "analyze" command requires --spec <path>.');
  if (command !== "analyze" && (specPath || walPath)) throw new Error("--spec and --wal are only valid with analyze.");
  if (command === "impact") {
    if (!positional[0]) throw new Error('The "impact" command requires <file-path>.');
    if (positional.length > 2) throw new Error(`Unexpected extra argument: ${positional[2]}`);
    return { command, filePath: positional[0], repositoryPath: positional[1] ?? ".", format };
  }
  if (positional.length > 1) throw new Error(`Unexpected extra argument: ${positional[1]}`);
  return { command, repositoryPath: positional[0] ?? ".", format, specPath, walPath };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function initializeRepository(repositoryPath: string): Promise<void> {
  const root = resolve(repositoryPath);
  let rootInfo;
  try {
    rootInfo = await stat(root);
  } catch (error) {
    throw new Error(`Unable to read repository directory ${root}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!rootInfo.isDirectory()) throw new Error(`Repository path is not a directory: ${root}`);

  const configPath = resolve(root, ".codeforge.yaml");
  const legacyConfigPath = resolve(root, "codeforge.config.json");
  const specificationPath = resolve(root, "codeforge-spec.json");
  const existingPaths = [];
  if (await pathExists(configPath)) existingPaths.push(configPath);
  if (await pathExists(legacyConfigPath)) existingPaths.push(legacyConfigPath);
  if (await pathExists(specificationPath)) existingPaths.push(specificationPath);
  if (existingPaths.length > 0) {
    throw new Error(`Refusing to overwrite existing file(s): ${existingPaths.join(", ")}`);
  }

  let configCreated = false;
  try {
    await writeFile(configPath, starterConfiguration, { encoding: "utf8", flag: "wx" });
    configCreated = true;
    await writeFile(specificationPath, `${JSON.stringify(starterSpecification, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (configCreated) await unlink(configPath).catch(() => undefined);
    throw error;
  }

  console.log(`Created ${configPath}`);
  console.log(`Created ${specificationPath}`);
  console.log("Next, run these commands from the target directory:");
  const cliPath = resolve(__dirname, "cli.js");
  console.log(`  node "${cliPath}" verify .`);
  console.log(`  node "${cliPath}" analyze . --spec codeforge-spec.json`);
}

async function readSpecification(path: string): Promise<AnalysisConfiguration["specification"]> {
  const absolutePath = resolve(path);
  let value: unknown;
  try { value = JSON.parse(await readFile(absolutePath, "utf8")); }
  catch (error) { throw new Error(`Unable to read specification ${absolutePath}: ${error instanceof Error ? error.message : String(error)}`); }
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Specification root must be a JSON object.");
  const spec = value as Record<string, unknown>;
  if (!Array.isArray(spec.requirements) || !Array.isArray(spec.criteria) || !Array.isArray(spec.evidence_requirements)) {
    throw new Error("Specification must contain requirements, criteria, and evidence_requirements arrays.");
  }
  if (spec.traceability_links !== undefined && !Array.isArray(spec.traceability_links)) throw new Error("Specification traceability_links must be an array.");
  return spec as unknown as AnalysisConfiguration["specification"];
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) { usage(); return; }
  let options: Options;
  try { options = parse(args); }
  catch (error) {
    console.error(`CodeForge: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Run "forge --help" for usage.');
    process.exitCode = 1;
    return;
  }
  try {
    if (options.command === "init") {
      await initializeRepository(options.repositoryPath);
      return;
    }

    if (options.command === "verify") {
      const result = await verifyRepositoryPath(options.repositoryPath);
      const summary = { total: result.violations.length, errors: result.violations.filter((v) => v.severity === "error").length, warnings: result.violations.filter((v) => v.severity === "warning").length, info: result.violations.filter((v) => v.severity === "info").length };
      if (options.format === "json") console.log(JSON.stringify({ repositoryPath: options.repositoryPath, passed: result.passed, summary, violations: result.violations }, null, 2));
      else if (result.passed) console.log(`VERIFICATION PASSED — ${summary.total} violations`);
      else {
        console.log(`VERIFICATION FAILED — ${summary.total} violations (${summary.errors} errors, ${summary.warnings} warnings, ${summary.info} info)`);
        for (const violation of result.violations) console.log(`[${violation.severity}] ${violation.ruleId}${violation.target ? ` (${violation.target})` : ""}: ${violation.message}`);
      }
      if (!result.passed) process.exitCode = 2;
      return;
    }

    if (options.command === "impact") {
      const analysis = await analyzeRepositoryPath(options.repositoryPath);
      const targetFile = resolveImpactTarget(
        analysis.snapshot.rootPath,
        options.filePath!,
        analysis.snapshot
      );
      const impact = calculateRepositoryImpact(
        analysis.snapshot,
        analysis.graph,
        targetFile
      );
      const output = {
        repositoryPath: analysis.snapshot.rootPath,
        ...impact,
        analysisWarnings: analysis.snapshot.analysisWarnings ?? []
      };
      if (options.format === "json") console.log(JSON.stringify(output, null, 2));
      else {
        console.log(`IMPACT ANALYSIS — ${impact.targetFile}`);
        console.log(`Affected files: ${impact.summary.totalAffected} (${impact.summary.direct} direct, ${impact.summary.transitive} transitive)`);
        for (const chain of impact.impactChains) {
          const kind = chain.path.length === 2 ? "direct" : "transitive";
          console.log(`[${kind}] ${chain.path.join(" -> ")}`);
        }
        if (impact.summary.totalAffected === 0) console.log("No dependent files found.");
        for (const warning of output.analysisWarnings) console.log(`WARNING: ${warning}`);
      }
      return;
    }

    const repositoryPath = resolve(options.repositoryPath);
    const specification = await readSpecification(options.specPath!);
    const result = await analyzeRepository({
      repositoryPath,
      baseline: { baseline_id: "BASE-LOCAL", description: "Local repository analysis" },
      specification,
      walPath: options.walPath ?? ".codeforge/findings.wal.jsonl"
    });
    const findingSummary = Object.fromEntries(["Conforming", "Non-Conforming", "Insufficient Evidence", "Not Applicable"].map((state) => [state, result.findings.filter((finding) => finding.result_state === state).length]));
    const failed = !result.verification.passed || findingSummary["Non-Conforming"] > 0;
    const output = { repositoryPath, verification: { passed: result.verification.passed, violations: result.verification.violations }, analysisWarnings: result.repository.analysisWarnings ?? [], findingSummary, findings: result.findings, evidenceCount: result.observedEvidence.length, persistence: result.persistence };
    if (options.format === "json") console.log(JSON.stringify(output, null, 2));
    else {
      for (const warning of result.repository.analysisWarnings ?? []) console.log(`WARNING: ${warning}`);
      console.log(`ANALYSIS ${failed ? "FAILED" : "COMPLETE"} — ${result.observedEvidence.length} evidence items, ${result.findings.length} findings`);
      console.log(`Findings: ${Object.entries(findingSummary).map(([state, count]) => `${state} ${count}`).join(", ")}`);
      console.log(`Persisted ${result.persistence.newlyPersistedCount} new finding(s) to ${result.persistence.walPath}`);
      for (const finding of result.findings.filter((item) => item.result_state === "Non-Conforming" || item.result_state === "Insufficient Evidence")) console.log(`[${finding.result_state}] ${finding.criterion_id} on ${finding.target_artifact_id}: ${finding.rationale}`);
    }
    if (failed) process.exitCode = 2;
  } catch (error) {
    console.error(`CodeForge: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

run().catch((error) => { console.error(`CodeForge: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
