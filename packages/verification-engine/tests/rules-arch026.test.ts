import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import { circularDependencyDetectionRule026 } from "../src/rules";
import type { VerificationContext } from "../src/models";

function createContext(
  edges: Array<{ from: string; to: string; kind: string }>,
  files: string[]
): VerificationContext {
  return {
    files,
    imports: [],
    architectureImportBoundaries: [],
    graph: {
      nodes: files.map((file) => ({
        id: `file:${file}`,
        kind: "file",
        label: file,
        path: file
      })),
      edges
    }
  };
}

describe("ARCH-026: Circular Dependency Detection", () => {
  it("allows files with no circular dependencies", () => {
    const context = createContext(
      [
        { from: "file:a.ts", to: "file:b.ts", kind: "imports" },
        { from: "file:b.ts", to: "file:c.ts", kind: "imports" }
      ],
      ["a.ts", "b.ts", "c.ts"]
    );

    const violations = circularDependencyDetectionRule026.check(context);

    assert.equal(violations.length, 0);
  });

  it("detects a circular dependency between two files", () => {
    const context = createContext(
      [
        { from: "file:a.ts", to: "file:b.ts", kind: "imports" },
        { from: "file:b.ts", to: "file:a.ts", kind: "imports" }
      ],
      ["a.ts", "b.ts"]
    );

    const violations = circularDependencyDetectionRule026.check(context);

    assert.equal(violations.length, 1);
    assert.equal(violations[0].ruleId, "ARCH-026");
    assert.equal(violations[0].severity, "error");
  });

  it("detects a circular dependency involving three files", () => {
    const context = createContext(
      [
        { from: "file:a.ts", to: "file:b.ts", kind: "imports" },
        { from: "file:b.ts", to: "file:c.ts", kind: "imports" },
        { from: "file:c.ts", to: "file:a.ts", kind: "imports" }
      ],
      ["a.ts", "b.ts", "c.ts"]
    );

    const violations = circularDependencyDetectionRule026.check(context);

    assert.equal(violations.length, 1);
    assert.equal(violations[0].ruleId, "ARCH-026");
    assert.match(violations[0].message, /a\.ts/);
    assert.match(violations[0].message, /b\.ts/);
    assert.match(violations[0].message, /c\.ts/);
  });

  it("detects a self-import cycle in a single file", () => {
    const context = createContext(
      [{ from: "file:a.ts", to: "file:a.ts", kind: "imports" }],
      ["a.ts"]
    );

    const violations = circularDependencyDetectionRule026.check(context);

    assert.equal(violations.length, 1);
    assert.equal(violations[0].ruleId, "ARCH-026");
    assert.equal(violations[0].severity, "error");
    assert.match(violations[0].message, /a\.ts/);
  });

  it("does not report cycles from contains edges alone", () => {
    const context = createContext(
      [
        { from: "file:a.ts", to: "file:b.ts", kind: "contains" },
        { from: "file:b.ts", to: "file:a.ts", kind: "contains" }
      ],
      ["a.ts", "b.ts"]
    );

    const violations = circularDependencyDetectionRule026.check(context);

    assert.equal(violations.length, 0);
  });

  it("detects a circular dependency between Python files", () => {
    const context = createContext(
      [
        { from: "file:main.py", to: "file:helper.py", kind: "imports" },
        { from: "file:helper.py", to: "file:main.py", kind: "imports" }
      ],
      ["main.py", "helper.py"]
    );

    const violations = circularDependencyDetectionRule026.check(context);

    assert.equal(violations.length, 1);
    assert.equal(violations[0].ruleId, "ARCH-026");
    assert.equal(violations[0].severity, "error");
  });

  it("detects multiple independent circular dependencies", () => {
    const context = createContext(
      [
        { from: "file:a.ts", to: "file:b.ts", kind: "imports" },
        { from: "file:b.ts", to: "file:a.ts", kind: "imports" },
        { from: "file:c.ts", to: "file:d.ts", kind: "imports" },
        { from: "file:d.ts", to: "file:c.ts", kind: "imports" }
      ],
      ["a.ts", "b.ts", "c.ts", "d.ts"]
    );

    const violations = circularDependencyDetectionRule026.check(context);

    assert.equal(violations.length, 2);
    assert.ok(violations.every((v) => v.ruleId === "ARCH-026"));
  });

  it("does not include unrelated files in a circular dependency violation", () => {
    const context = createContext(
      [
        { from: "file:a.ts", to: "file:b.ts", kind: "imports" },
        { from: "file:b.ts", to: "file:a.ts", kind: "imports" },
        { from: "file:unrelated.ts", to: "file:a.ts", kind: "imports" }
      ],
      ["a.ts", "b.ts", "unrelated.ts"]
    );

    const violations = circularDependencyDetectionRule026.check(context);

    assert.equal(violations.length, 1);
    assert.match(violations[0].message, /a\.ts/);
    assert.match(violations[0].message, /b\.ts/);
    assert.doesNotMatch(violations[0].message, /unrelated\.ts/);
  });
});
