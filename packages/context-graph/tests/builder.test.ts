import test from "node:test";
import assert from "node:assert/strict";
import { ContextGraphBuilder } from "../src/builder";

test("builds a deterministic context graph", () => {
  const graph = new ContextGraphBuilder();

  graph.addNode("file:b.ts", "file", "b.ts", "src/b.ts");
  graph.addNode("repo", "repository", "CodeForge");
  graph.addNode("file:a.ts", "file", "a.ts", "src/a.ts");

  graph.addEdge("repo", "file:b.ts", "contains");
  graph.addEdge("repo", "file:a.ts", "contains");

  const result = graph.build();

  assert.deepEqual(
    result.nodes.map((node) => node.id),
    ["file:a.ts", "file:b.ts", "repo"]
  );

  assert.equal(result.edges.length, 2);
});

test("deduplicates nodes and edges", () => {
  const graph = new ContextGraphBuilder();

  const firstNode = graph.addNode(
    "file:a.ts",
    "file",
    "a.ts",
    "src/a.ts"
  );

  const secondNode = graph.addNode(
    "file:a.ts",
    "file",
    "different-label",
    "different/path.ts"
  );

  assert.equal(firstNode, secondNode);

  graph.addNode("repo", "repository", "CodeForge");

  const firstEdge = graph.addEdge(
    "repo",
    "file:a.ts",
    "contains"
  );

  const secondEdge = graph.addEdge(
    "repo",
    "file:a.ts",
    "contains"
  );

  assert.equal(firstEdge, secondEdge);
  assert.equal(graph.build().edges.length, 1);
});

test("rejects edges with missing nodes", () => {
  const graph = new ContextGraphBuilder();

  graph.addNode("repo", "repository", "CodeForge");

  assert.throws(
    () => graph.addEdge("repo", "missing", "contains"),
    /Target node does not exist/
  );
});
