import type {
  VerificationRule,
  VerificationViolation
} from "./models";

export const contextGraphReferentialIntegrityRule: VerificationRule = {
  id: "ARCH-001",
  description: "All context graph edges must reference existing nodes",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const nodeIds = new Set(
      context.graph.nodes.map((node) => node.id)
    );

    const violations: VerificationViolation[] = [];

    for (const edge of context.graph.edges) {
      if (!nodeIds.has(edge.from)) {
        violations.push({
          ruleId: "ARCH-001",
          severity: "error",
          message: `Edge references missing source node: ${edge.from}`,
          target: edge.from
        });
      }

      if (!nodeIds.has(edge.to)) {
        violations.push({
          ruleId: "ARCH-001",
          severity: "error",
          message: `Edge references missing target node: ${edge.to}`,
          target: edge.to
        });
      }
    }

    return violations;
  }
};
