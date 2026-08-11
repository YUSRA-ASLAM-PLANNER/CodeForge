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
