import test from "node:test";
import assert from "node:assert/strict";
import { buildContextGraph } from "../src/repositoryGraph";

test("builds a graph from indexed repository files", () => {
  const graph = buildContextGraph([
    { path: "src/index.ts" },
    { path: "src/app.ts" }
  ]);

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
