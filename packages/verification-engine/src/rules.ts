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

export const indexedFilesExistInContextGraphRule: VerificationRule = {
  id: "ARCH-002",
  description:
    "Every indexed repository file must have a corresponding context graph node",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const nodeIds = new Set(
      context.graph.nodes.map((node) => node.id)
    );

    const violations: VerificationViolation[] = [];

    for (const file of context.files) {
      const expectedNodeId = `file:${file}`;

      if (!nodeIds.has(expectedNodeId)) {
        violations.push({
          ruleId: "ARCH-002",
          severity: "error",
          message: `Indexed file is missing from context graph: ${file}`,
          target: file
        });
      }
    }

    return violations;
  }
};

export const contextGraphFilesExistInRepositoryRule: VerificationRule = {
  id: "ARCH-003",
  description:
    "Every file node in the context graph must correspond to an indexed repository file",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const indexedFiles = new Set(context.files);
    const violations: VerificationViolation[] = [];

    for (const node of context.graph.nodes) {
      if (node.kind !== "file" || !node.path) {
        continue;
      }

      if (!indexedFiles.has(node.path)) {
        violations.push({
          ruleId: "ARCH-003",
          severity: "error",
          message: `Context graph file is missing from repository index: ${node.path}`,
          target: node.path
        });
      }
    }

    return violations;
  }
};
