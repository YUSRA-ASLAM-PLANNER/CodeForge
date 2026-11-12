import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCodeForgeConfig } from "../src/config";

test("loads architecture boundaries and trims layer names", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-config-boundaries-"));
  await writeFile(
    join(root, "codeforge.config.json"),
    JSON.stringify({
      architecture: {
        autoDetectLayers: false,
        importBoundaries: [{ from: " ui ", to: " database " }]
      }
    }),
    "utf8"
  );

  const config = await loadCodeForgeConfig(root);

  assert.equal(config.architecture?.autoDetectLayers, false);
  assert.deepEqual(config.architecture?.importBoundaries, [
    { from: "ui", to: "database" }
  ]);
});

test("reports the path when CodeForge configuration is malformed JSON", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-config-invalid-"));
  const configPath = join(root, "codeforge.config.json");
  await writeFile(configPath, "{invalid json", "utf8");

  await assert.rejects(
    loadCodeForgeConfig(root),
    new RegExp(`Invalid CodeForge config at .*codeforge\\.config\\.json`)
  );
});

test("loads .codeforge.yaml and reports it as the selected config source", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-config-yaml-"));
  await writeFile(
    join(root, ".codeforge.yaml"),
    [
      "architecture:",
      "  autoDetectLayers: false",
      "  importBoundaries:",
      "    - from: ' ui '",
      "      to: database",
      ""
    ].join("\n"),
    "utf8"
  );

  const config = await loadCodeForgeConfig(root);

  assert.equal(config.source, ".codeforge.yaml");
  assert.equal(config.architecture?.autoDetectLayers, false);
  assert.deepEqual(config.architecture?.importBoundaries, [
    { from: "ui", to: "database" }
  ]);
});

test("reports the path when CodeForge YAML is malformed", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-config-yaml-invalid-"));
  const configPath = join(root, ".codeforge.yaml");
  await writeFile(configPath, "architecture:\n  importBoundaries: [\n", "utf8");

  await assert.rejects(
    loadCodeForgeConfig(root),
    new RegExp(`Invalid CodeForge config at .*\\.codeforge\\.yaml`)
  );
});

test("rejects ambiguous JSON and YAML CodeForge config files", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-config-ambiguous-"));
  await writeFile(join(root, ".codeforge.yaml"), "architecture: {}\n", "utf8");
  await writeFile(join(root, "codeforge.config.json"), "{\"architecture\":{}}\n", "utf8");

  await assert.rejects(
    loadCodeForgeConfig(root),
    /Found both .*\.codeforge\.yaml and .*codeforge\.config\.json/
  );
});

test("loads configured repository scan exclusions", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-config-exclusions-"));
  await writeFile(
    join(root, ".codeforge.yaml"),
    "scan:\n  exclude:\n    - generated/\n    - coverage/**\n",
    "utf8"
  );

  const config = await loadCodeForgeConfig(root);

  assert.deepEqual(config.scan?.exclude, ["generated/", "coverage/**"]);
});

test("rejects empty and negated scan exclusions", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-config-exclusions-invalid-"));
  await writeFile(
    join(root, ".codeforge.yaml"),
    "scan:\n  exclude:\n    - '!generated/keep.ts'\n",
    "utf8"
  );

  await assert.rejects(
    loadCodeForgeConfig(root),
    /scan\.exclude must be an array of non-empty ignore patterns without negations/
  );
});
