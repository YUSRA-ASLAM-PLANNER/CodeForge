
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import { importBoundaryEnforcementRule024 } from "../src/rules";

import type { VerificationContext } from "../src/models";

function createContext(
  filePath: string,
  specifiers: string[],
  boundaries: Array<{ from: string; to: string }>
): VerificationContext {
  return {
    files: [filePath],
    imports: [
      {
        path: filePath,
        specifiers
      }
    ],
    architectureImportBoundaries: boundaries,
    graph: {
      nodes: [],
      edges: []
    }
  };
}

describe("ARCH-024: Import Boundary Enforcement", () => {
  it("reports a violation when ui imports database", () => {
    const context = createContext(
      "src/ui/page.ts",
      ["../database/query"],
      [{ from: "ui", to: "database" }]
    );

    const violations =
      importBoundaryEnforcementRule024.check(context);

    assert.equal(violations.length, 1);
    assert.equal(violations[0].ruleId, "ARCH-024");
    assert.equal(violations[0].severity, "error");
  });

  it("allows imports when no prohibited boundary is crossed", () => {
    const context = createContext(
      "src/ui/page.ts",
      ["./button"],
      [{ from: "ui", to: "database" }]
    );

    const violations =
      importBoundaryEnforcementRule024.check(context);

    assert.equal(violations.length, 0);
  });

  it("reports no violations when no boundaries are configured", () => {
    const context = createContext(
      "src/ui/page.ts",
      ["../database/query"],
      []
    );

    const violations =
      importBoundaryEnforcementRule024.check(context);

    assert.equal(violations.length, 0);
  });
});
