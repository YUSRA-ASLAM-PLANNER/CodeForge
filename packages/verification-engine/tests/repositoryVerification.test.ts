import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyRepositoryPath } from "../src/repositoryVerification";

test("verifies a real repository path end-to-end", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-"));

  await writeFile(
    join(root, "index.ts"),
    "export const value = 42;\n",
    "utf8"
  );

  const result = await verifyRepositoryPath(root);

  assert.equal(result.passed, true);
  assert.deepEqual(result.violations, []);
});

test("verifies internal imports through the real repository workflow", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-import-graph-"));

  await writeFile(
    join(root, "main.ts"),
    'import { helper } from "./helper";\nexport const result = helper();\n',
    "utf8"
  );

  await writeFile(
    join(root, "helper.ts"),
    "export function helper() { return 42; }\n",
    "utf8"
  );

  const { indexRepository } = await import("@codeforge/repository-indexer");
  const { buildContextGraphFromSnapshot } = await import("@codeforge/context-graph");

  const snapshot = await indexRepository(root);
  const mainFile = snapshot.files.find((file) => file.path === "main.ts");

  assert.ok(mainFile);
  assert.deepEqual(mainFile.imports, ["./helper"]);

  const graph = buildContextGraphFromSnapshot(snapshot);

  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.from === "file:main.ts" &&
        edge.to === "file:helper.ts" &&
        edge.kind === "imports"
    )
  );

  const result = await verifyRepositoryPath(root);

  assert.equal(result.passed, true);
  assert.deepEqual(result.violations, []);
});

test("ARCH-023 detects missing internal imports", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-missing-import-"));

  await writeFile(
    join(root, "main.ts"),
    'import { helper } from "./missing";\nexport const result = helper();\n',
    "utf8"
  );

  const result = await verifyRepositoryPath(root);

  assert.equal(result.passed, false);

  assert.ok(
    result.violations.some((violation) => violation.ruleId === "ARCH-023"),
    "Expected ARCH-023 to report the unresolved internal import"
  );
});

test("ARCH-024 detects a prohibited UI-to-database import end-to-end", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-arch024-"));

  await mkdir(join(root, "src", "ui"), { recursive: true });
  await mkdir(join(root, "src", "database"), { recursive: true });

  await writeFile(
    join(root, "src", "ui", "page.ts"),
    'import { query } from "../database/query";\nexport const page = query();\n',
    "utf8"
  );

  await writeFile(
    join(root, "src", "database", "query.ts"),
    "export function query() { return 42; }\n",
    "utf8"
  );

  const result = await verifyRepositoryPath(root, [
    { from: "ui", to: "database" }
  ]);

  assert.equal(result.passed, false);

  assert.ok(
    result.violations.some(
      (violation) =>
        violation.ruleId === "ARCH-024" &&
        violation.message.includes("ui must not import database")
    ),
    "Expected ARCH-024 to report the prohibited UI-to-database import"
  );
});

test("ARCH-025 resolves an alias and detects a prohibited UI-to-database import", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-arch025-"));

  await mkdir(join(root, "src", "ui"), { recursive: true });
  await mkdir(join(root, "src", "database"), { recursive: true });

  await writeFile(
    join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        baseUrl: ".",
        paths: {
          "@database/*": ["src/database/*"]
        }
      }
    }),
    "utf8"
  );

  await writeFile(
    join(root, "src", "ui", "page.ts"),
    'import { query } from "@database/query";\nexport const page = query();\n',
    "utf8"
  );

  await writeFile(
    join(root, "src", "database", "query.ts"),
    "export function query() { return 42; }\n",
    "utf8"
  );

  const { indexRepository } = await import("@codeforge/repository-indexer");
  const { buildContextGraphFromSnapshot } = await import("@codeforge/context-graph");

  const snapshot = await indexRepository(root);
  const pageFile = snapshot.files.find(
    (file) => file.path === "src/ui/page.ts"
  );

  assert.ok(pageFile);
  assert.deepEqual(pageFile.imports, ["@database/query"]);
  assert.deepEqual(pageFile.resolvedImports, ["src/database/query.ts"]);

  const graph = buildContextGraphFromSnapshot(snapshot);

  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.from === "file:src/ui/page.ts" &&
        edge.to === "file:src/database/query.ts" &&
        edge.kind === "imports"
    ),
    "Expected the alias to create an internal import edge"
  );

  const result = await verifyRepositoryPath(root, [
    { from: "ui", to: "database" }
  ]);

  assert.equal(result.passed, false);

  assert.ok(
    result.violations.some(
      (violation) =>
        violation.ruleId === "ARCH-024" &&
        violation.message.includes("ui must not import database")
    ),
    "Expected ARCH-024 to detect the prohibited alias import"
  );
});

test("automatically detects a prohibited UI-to-database import", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-auto-arch-"));

  await mkdir(join(root, "src", "ui"), { recursive: true });
  await mkdir(join(root, "src", "database"), { recursive: true });

  await writeFile(
    join(root, "src", "ui", "page.ts"),
    'import { query } from "../database/query";\nexport const page = query();\n',
    "utf8"
  );

  await writeFile(
    join(root, "src", "database", "query.ts"),
    "export function query() { return 42; }\n",
    "utf8"
  );

  await writeFile(
    join(root, "codeforge.config.json"),
    JSON.stringify({
      architecture: {
        autoDetectLayers: true
      }
    }),
    "utf8"
  );

  const result = await verifyRepositoryPath(root);

  assert.equal(result.passed, false);

  assert.ok(
    result.violations.some(
      (violation) =>
        violation.ruleId === "ARCH-024" &&
        violation.message.includes("ui must not import database")
    ),
    "Expected automatic architecture detection to report ARCH-024"
  );
});

test("disables automatically detected boundaries when configured off", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-no-auto-arch-"));

  await mkdir(join(root, "src", "ui"), { recursive: true });
  await mkdir(join(root, "src", "database"), { recursive: true });

  await writeFile(
    join(root, "src", "ui", "page.ts"),
    'import { query } from "../database/query";\nexport const page = query();\n',
    "utf8"
  );

  await writeFile(
    join(root, "src", "database", "query.ts"),
    "export function query() { return 42; }\n",
    "utf8"
  );

  await writeFile(
    join(root, "codeforge.config.json"),
    JSON.stringify({
      architecture: {
        autoDetectLayers: false
      }
    }),
    "utf8"
  );

  const result = await verifyRepositoryPath(root);

  assert.equal(
    result.violations.some(
      (violation) => violation.ruleId === "ARCH-024"
    ),
    false,
    "Automatic boundaries should be disabled"
  );
});