import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
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
