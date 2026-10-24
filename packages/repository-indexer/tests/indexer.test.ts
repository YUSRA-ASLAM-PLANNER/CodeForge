import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { indexRepository } from "../src/indexer";

test("indexes repository files deterministically", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-indexer-"));

  await mkdir(join(root, "src"));
  await mkdir(join(root, "node_modules"));

  await writeFile(join(root, "README.md"), "# CodeForge");
  await writeFile(join(root, "src", "index.ts"), "export const x = 1;");
  await writeFile(join(root, "node_modules", "ignored.js"), "ignored");

  const snapshot = await indexRepository(root);

  assert.equal(snapshot.fileCount, 2);
  assert.deepEqual(
    snapshot.files.map((file) => file.path),
    ["README.md", "src/index.ts"]
  );
  assert.equal(snapshot.files[0].extension, ".md");
  assert.equal(snapshot.files[1].extension, ".ts");
});

test("returns files in sorted path order", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-indexer-"));

  await writeFile(join(root, "z.ts"), "z");
  await writeFile(join(root, "a.ts"), "a");
  await writeFile(join(root, "m.ts"), "m");

  const snapshot = await indexRepository(root);

  assert.deepEqual(
    snapshot.files.map((file) => file.path),
    ["a.ts", "m.ts", "z.ts"]
  );
});

test("detects static, re-export, and dynamic imports", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-imports-"));

  await writeFile(
    join(root, "main.ts"),
    [
      'import { helper } from "./helper";',
      'export { value } from "./values";',
      'const lazy = import("./lazy");',
      "const result = helper;"
    ].join("\n")
  );

  const snapshot = await indexRepository(root);
  const mainFile = snapshot.files.find((file) => file.path === "main.ts");

  assert.ok(mainFile);
  assert.deepEqual(mainFile.imports, [
    "./helper",
    "./lazy",
    "./values"
  ]);
});

test("preserves TypeScript path alias import specifiers", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-alias-"));

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
    })
  );

  await writeFile(
    join(root, "src", "database", "query.ts"),
    "export const query = () => true;"
  );

  await writeFile(
    join(root, "src", "index.ts"),
    'import { query } from "@database/query";\nexport { query };'
  );

  const snapshot = await indexRepository(root);
  const indexFile = snapshot.files.find(
    (file) => file.path === "src/index.ts"
  );

  assert.ok(indexFile);
  assert.deepEqual(indexFile.imports, ["@database/query"]);
  assert.deepEqual(indexFile.resolvedImports, ["src/database/query.ts"]);
});

test("continues to detect relative imports alongside aliases", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-mixed-imports-"));

  await writeFile(
    join(root, "main.ts"),
    [
      'import { helper } from "./helper";',
      'import { query } from "@database/query";'
    ].join("\n")
  );

  const snapshot = await indexRepository(root);
  const mainFile = snapshot.files.find((file) => file.path === "main.ts");

  assert.ok(mainFile);
  assert.deepEqual(mainFile.imports, [
    "./helper",
    "@database/query"
  ]);
});