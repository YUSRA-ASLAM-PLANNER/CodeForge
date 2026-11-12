import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const cliPath = resolve(__dirname, "../../dist/src/cli.js");

function runCli(repositoryPath: string, ...args: string[]) {
  return spawnSync(process.execPath, [cliPath, "verify", repositoryPath, ...args], {
    encoding: "utf8"
  });
}

function createRepository(source: string): string {
  const root = mkdtempSync(join(tmpdir(), "codeforge cli "));
  writeFileSync(join(root, "main.ts"), source, "utf8");
  return root;
}

test("verifier CLI help exits successfully and documents usage", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /forge verify \[repository-path\]/);
  assert.match(result.stdout, /--format <format>/);
});

test("verifier CLI emits machine-readable JSON for a clean repository", () => {
  const root = createRepository("export const value = 42;\n");
  const result = runCli(root, "--format", "json");

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.passed, true);
  assert.deepEqual(output.summary, {
    total: 0,
    errors: 0,
    warnings: 0,
    info: 0
  });
  assert.deepEqual(output.violations, []);
});

test("verifier CLI reports a missing repository path as an access error", () => {
  const root = join(tmpdir(), `codeforge missing repository ${process.pid} ${Date.now()}`);
  const result = runCli(root, "--format", "json");

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Unable to read repository directory/);
  assert.ok(result.stderr.includes(root));
  assert.match(result.stderr, /ENOENT/);
  assert.match(result.stderr, /scandir/);
});

test("verifier JSON explains detected, configured, and effective architecture boundaries", () => {
  const root = mkdtempSync(join(tmpdir(), "codeforge cli architecture "));
  mkdirSync(join(root, "src", "ui"), { recursive: true });
  mkdirSync(join(root, "src", "database"), { recursive: true });
  mkdirSync(join(root, "src", "custom"), { recursive: true });
  writeFileSync(join(root, "src", "ui", "view.ts"), 'import "../database/store";\n', "utf8");
  writeFileSync(join(root, "src", "database", "store.ts"), "export const value = 1;\n", "utf8");
  writeFileSync(join(root, "src", "custom", "adapter.ts"), "export const adapter = true;\n", "utf8");
  writeFileSync(join(root, ".codeforge.yaml"), [
    "architecture:",
    "  autoDetectLayers: true",
    "  importBoundaries:",
    "    - from: custom",
    "      to: database",
    ""
  ].join("\n"), "utf8");

  const result = runCli(root, "--format", "json");
  assert.equal(result.status, 2);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.architecture.layers.map((layer: { name: string }) => layer.name), [
    "custom",
    "database",
    "ui"
  ]);
  assert.equal(output.architecture.autoDetectionEnabled, true);
  assert.deepEqual(output.architecture.configuredBoundaries, [
    { from: "custom", to: "database" }
  ]);
  assert.equal(output.architecture.configuredBoundarySource, ".codeforge.yaml");
  assert.ok(output.architecture.automaticBoundaries.some(
    (boundary: { from: string; to: string }) => boundary.from === "ui" && boundary.to === "database"
  ));
  assert.equal(output.architecture.effectiveBoundaries.length, 3);
});

test("verifier CLI exits with code 2 and reports targets for violations", () => {
  const root = createRepository(
    'import { missing } from "./missing";\nexport const value = missing;\n'
  );
  const result = runCli(root);

  assert.equal(result.status, 2);
  assert.match(result.stdout, /ARCH-023/);
  assert.match(result.stdout, /main\.ts->\.\/missing/);
});

test("verifier CLI rejects unsupported output formats with exit code 1", () => {
  const root = createRepository("export {};\n");
  const result = runCli(root, "--format", "xml");

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unsupported output format: xml/);
  assert.match(result.stderr, /forge --help/);
});
