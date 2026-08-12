import test from "node:test";
import assert from "node:assert/strict";
import { buildContextGraphFromSnapshot } from "../src/repositoryGraph";

test("builds context graph from repository snapshot", () => {
  const graph = buildContextGraphFromSnapshot({
    rootPath: "C:/project",
    files: [
      {
        path: "src/app.ts",
        extension: ".ts",
        sizeBytes: 100
      },
      {
        path: "src/index.ts",
        extension: ".ts",
        sizeBytes: 200
      }
    ],
    fileCount: 2,
    totalBytes: 300
  });

  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.edges.length, 2);

  assert.deepEqual(
    graph.nodes.map((node) => node.id),
    [
      "file:src/app.ts",
      "file:src/index.ts",
      "repository"
    ]
  );
});
