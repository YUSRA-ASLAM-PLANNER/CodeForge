
import test from "node:test";
import assert from "node:assert/strict";
import { buildContextGraph } from "../src/repositoryGraph";

test("builds a graph from indexed repository files", () => {
  const graph = buildContextGraph([
    { path: "src/index.ts" },
    { path: "src/app.ts" }
  ]);

  assert.equal(graph.nodes.length, 4);
  assert.equal(graph.edges.length, 3);

  assert.deepEqual(
    graph.nodes.map((node) => node.id),
    [
      "directory:src",
      "file:src/app.ts",
      "file:src/index.ts",
      "repository:root"
    ]
  );
});

test("creates import edges between internal repository files", () => {
  const graph = buildContextGraph([
    {
      path: "src/main.ts",
      imports: ["./helper", "express"]
    },
    {
      path: "src/helper.ts",
      imports: []
    }
  ]);

  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.from === "file:src/main.ts" &&
        edge.to === "file:src/helper.ts" &&
        edge.kind === "imports"
    )
  );

  assert.ok(
    !graph.edges.some(
      (edge) =>
        edge.from === "file:src/main.ts" &&
        edge.to.includes("express") &&
        edge.kind === "imports"
    )
  );
});

test("creates import edges from resolved alias paths", () => {
  const graph = buildContextGraph([
    {
      path: "src/index.ts",
      imports: ["@database/query"],
      resolvedImports: ["src/database/query.ts"]
    },
    {
      path: "src/database/query.ts",
      imports: []
    }
  ]);

  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.from === "file:src/index.ts" &&
        edge.to === "file:src/database/query.ts" &&
        edge.kind === "imports"
    )
  );
});
