import test from "node:test";
import assert from "node:assert/strict";
import { contextGraphFilesExistInRepositoryRule } from "../src/rules";

test("ARCH-003 passes when every context graph file exists in repository", () => {
  const violations = contextGraphFilesExistInRepositoryRule.check({
    files: ["src/index.ts"],
    graph: {
      nodes: [
        {
          id: "file:src/index.ts",
          kind: "file",
          label: "index.ts",
          path: "src/index.ts"
        }
      ],
      edges: []
    }
  });

  assert.equal(violations.length, 0);
});

test("ARCH-003 detects a context graph file missing from repository index", () => {
  const violations = contextGraphFilesExistInRepositoryRule.check({
    files: ["src/index.ts"],
    graph: {
      nodes: [
        {
          id: "file:src/missing.ts",
          kind: "file",
          label: "missing.ts",
          path: "src/missing.ts"
        }
      ],
      edges: []
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-003");
  assert.equal(violations[0].target, "src/missing.ts");
});
