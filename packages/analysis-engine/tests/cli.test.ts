import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const executable = join(__dirname, "..", "..", "dist", "src", "cli.js");

function run(args: string[]) {
  return spawnSync(process.execPath, [executable, ...args], { encoding: "utf8" });
}

test("forge help documents verify and analyze commands", () => {
  const result = run(["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /forge verify/);
  assert.match(result.stdout, /forge analyze/);
  assert.match(result.stdout, /forge impact/);
  assert.match(result.stdout, /forge init/);
});

test("forge impact reports direct and transitive file dependents", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-impact-"));
  try {
    await writeFile(join(root, "base.ts"), "export const base = 1;\n");
    await writeFile(join(root, "service.ts"), 'import { base } from "./base";\nexport const service = base + 1;\n');
    await writeFile(join(root, "app.ts"), 'import { service } from "./service";\nexport const app = service + 1;\n');

    const result = run(["impact", "base.ts", root, "--format", "json"]);

    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.targetFile, "base.ts");
    assert.deepEqual(output.directDependents, ["service.ts"]);
    assert.deepEqual(output.transitiveDependents, ["app.ts"]);
    assert.deepEqual(output.impactChains, [
      { file: "service.ts", path: ["base.ts", "service.ts"] },
      { file: "app.ts", path: ["base.ts", "service.ts", "app.ts"] }
    ]);
    assert.deepEqual(output.summary, { direct: 1, transitive: 1, totalAffected: 2 });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("forge impact rejects a file that is not in the repository index", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-impact-missing-"));
  try {
    const result = run(["impact", "missing.ts", root]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Impact target is not an indexed repository file: missing\.ts/);

    const outsidePath = resolve(root, "..", "outside.ts");
    const outside = run(["impact", outsidePath, root]);
    assert.equal(outside.status, 1);
    assert.match(outside.stderr, /Impact target must be a file inside the repository/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("forge init scaffolds a config and a specification accepted by analyze", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-init-"));
  try {
    const initialized = run(["init", root]);
    assert.equal(initialized.status, 0, initialized.stderr);
    assert.match(initialized.stdout, /Created .*\.codeforge\.yaml/);
    assert.match(initialized.stdout, /Created .*codeforge-spec\.json/);

    const config = await readFile(join(root, ".codeforge.yaml"), "utf8");
    const specification = JSON.parse(await readFile(join(root, "codeforge-spec.json"), "utf8"));
    assert.match(config, /autoDetectLayers: true/);
    assert.match(config, /importBoundaries: \[\]/);
    assert.equal(specification.criteria[0].criterion_id, "CRIT-ARCH-001");

    await writeFile(join(root, "main.ts"), "export const value = 1;\n");
    const analyzed = run(["analyze", root, "--spec", join(root, "codeforge-spec.json"), "--format", "json"]);
    assert.equal(analyzed.status, 0, analyzed.stderr);
    const output = JSON.parse(analyzed.stdout);
    assert.equal(output.findingSummary.Conforming, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("forge init refuses to overwrite an existing config", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-init-existing-"));
  const configPath = join(root, ".codeforge.yaml");
  const original = "architecture:\n  autoDetectLayers: false\n";
  try {
    await writeFile(configPath, original);
    const result = run(["init", root]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Refusing to overwrite existing file/);
    assert.equal(await readFile(configPath, "utf8"), original);
    await assert.rejects(readFile(join(root, "codeforge-spec.json"), "utf8"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("forge init rejects an explicitly empty repository path", () => {
  const result = run(["init", ""]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Repository path cannot be empty/);
});

test("forge analyze requires a specification", () => {
  const result = run(["analyze"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires --spec/);
});

test("forge analyze runs Chapter 14 and persists repeat runs idempotently", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-cli-"));
  try {
    await writeFile(join(root, "main.ts"), "export const value = 1;\n");
    const specPath = join(root, "spec.json");
    await writeFile(specPath, JSON.stringify({
      requirements: [{ requirement_id: "REQ-1", title: "Clean repository", constraint_level: "Foundational" }],
      criteria: [{
        criterion_id: "CRIT-1",
        requirement_id: "REQ-1",
        definition: "Repository verification passes.",
        structured_predicate: { type: "ATTRIBUTE_EQUALS", evidence_class: "Structural", attribute: "verification_passed", expected: true },
        applicability: { artifact_ids: ["repository:root"] }
      }],
      evidence_requirements: [{ evidence_requirement_id: "ER-1", criterion_id: "CRIT-1", evidence_class: "Structural", sufficiency_conditions: [{ type: "MIN_COUNT", evidence_class: "Structural", min_count: 1 }] }]
    }));

    const first = run(["analyze", root, "--spec", specPath, "--format", "json"]);
    assert.equal(first.status, 0, first.stderr);
    const firstOutput = JSON.parse(first.stdout) as { findingSummary: Record<string, number>; persistence: { newlyPersistedCount: number; alreadyPersistedCount: number; walPath: string } };
    assert.equal(firstOutput.findingSummary.Conforming, 1);
    assert.equal(firstOutput.persistence.newlyPersistedCount, 3);

    const second = run(["analyze", root, "--spec", specPath, "--format=json"]);
    assert.equal(second.status, 0, second.stderr);
    const secondOutput = JSON.parse(second.stdout) as { persistence: { newlyPersistedCount: number; alreadyPersistedCount: number; walPath: string } };
    assert.equal(secondOutput.persistence.newlyPersistedCount, 0);
    assert.equal(secondOutput.persistence.alreadyPersistedCount, 3);
    assert.equal((await readFile(firstOutput.persistence.walPath, "utf8")).trim().split(/\r?\n/).length, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
