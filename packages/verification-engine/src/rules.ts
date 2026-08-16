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

export const duplicateFileNodesRule: VerificationRule = {
  id: "ARCH-004",
  description:
    "Every repository file must have at most one corresponding file node",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const seen = new Set<string>();
    const violations: VerificationViolation[] = [];

    for (const node of context.graph.nodes) {
      if (node.kind !== "file" || !node.path) {
        continue;
      }

      if (seen.has(node.path)) {
        violations.push({
          ruleId: "ARCH-004",
          severity: "error",
          message: `Duplicate context graph file node: ${node.path}`,
          target: node.path
        });
      } else {
        seen.add(node.path);
      }
    }

    return violations;
  }
};
export const duplicateNodeIdsRule: VerificationRule = {
  id: "ARCH-005",
  description:
    "Every context graph node must have a unique node ID",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const seen = new Set<string>();
    const violations: VerificationViolation[] = [];

    for (const node of context.graph.nodes) {
      if (seen.has(node.id)) {
        violations.push({
          ruleId: "ARCH-005",
          severity: "error",
          message: `Duplicate context graph node ID: ${node.id}`,
          target: node.id
        });
      } else {
        seen.add(node.id);
      }
    }

    return violations;
  }
};

export const fileNodesRequireValidPathsRule: VerificationRule = {
  id: "ARCH-006",
  description:
    "Every file node in the context graph must have a non-empty path",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const violations: VerificationViolation[] = [];

    for (const node of context.graph.nodes) {
      if (node.kind !== "file") {
        continue;
      }

      if (!node.path || node.path.trim().length === 0) {
        violations.push({
          ruleId: "ARCH-006",
          severity: "error",
          message: `File node has missing or empty path: ${node.id}`,
          target: node.id
        });
      }
    }

    return violations;
  }
};

export const validContextGraphEdgeKindsRule: VerificationRule = {
  id: "ARCH-007",
  description:
    "Every context graph edge must use a supported edge kind",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const validKinds = new Set([
      "contains",
      "imports",
      "exports",
      "references"
    ]);

    const violations: VerificationViolation[] = [];

    for (const edge of context.graph.edges) {
      if (!validKinds.has(edge.kind)) {
        violations.push({
          ruleId: "ARCH-007",
          severity: "error",
          message: `Unsupported context graph edge kind: ${edge.kind}`,
          target: edge.kind
        });
      }
    }

    return violations;
  }
};
export const repositoryNodeRequiredRule: VerificationRule = {
  id: "ARCH-008",
  description:
    "The context graph must contain exactly one repository node",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const repositoryNodes = context.graph.nodes.filter(
      (node) => node.kind === "repository"
    );

    if (repositoryNodes.length === 1) {
      return [];
    }

    return [
      {
        ruleId: "ARCH-007",
        severity: "error",
        message:
          repositoryNodes.length === 0
            ? "Context graph is missing the repository node"
            : `Context graph contains multiple repository nodes: ${repositoryNodes.length}`,
        target: "repository"
      }
    ];
  }
};
export const repositoryNodeIdRule: VerificationRule = {
  id: "ARCH-009",
  description:
    "The repository node must use the canonical ID repository:root",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const repositoryNodes = context.graph.nodes.filter(
      (node) => node.kind === "repository"
    );

    const violations: VerificationViolation[] = [];

    for (const node of repositoryNodes) {
      if (node.id !== "repository:root") {
        violations.push({
          ruleId: "ARCH-009",
          severity: "error",
          message: `Repository node has invalid ID: ${node.id}`,
          target: node.id
        });
      }
    }

    return violations;
  }
};
export const repositoryNodeMustBeRootRule: VerificationRule = {
  id: "ARCH-010",
  description:
    "The repository node must not have any incoming edges",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const violations: VerificationViolation[] = [];

    for (const edge of context.graph.edges) {
      if (edge.to === "repository:root") {
        violations.push({
          ruleId: "ARCH-010",
          severity: "error",
          message:
            `Repository node must not have an incoming edge from: ${edge.from}`,
          target: edge.from
        });
      }
    }

    return violations;
  }
};

export const selfReferentialEdgeRule: VerificationRule = {
  id: "ARCH-011",
  description:
    "Context graph edges must not connect a node to itself",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const violations: VerificationViolation[] = [];

    for (const edge of context.graph.edges) {
      if (edge.from === edge.to) {
        violations.push({
          ruleId: "ARCH-011",
          severity: "error",
          message:
            `Context graph edge cannot reference the same node: ${edge.from}`,
          target: edge.from
        });
      }
    }

    return violations;
  }
};

export const duplicateEdgesRule: VerificationRule = {
  id: "ARCH-012",
  description:
    "Context graph edges must be unique by source, target, and kind",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const seen = new Set<string>();
    const violations: VerificationViolation[] = [];

    for (const edge of context.graph.edges) {
      const key = `${edge.from}|${edge.kind}|${edge.to}`;

      if (seen.has(key)) {
        violations.push({
          ruleId: "ARCH-012",
          severity: "error",
          message:
            `Duplicate context graph edge: ${edge.from} -> ${edge.to} (${edge.kind})`,
          target: key
        });
      } else {
        seen.add(key);
      }
    }

    return violations;
  }
};
export const orphanNodeRule: VerificationRule = {
  id: "ARCH-013",
  description:
    "Every non-repository node must be connected to at least one edge",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const connectedNodeIds = new Set<string>();

    for (const edge of context.graph.edges) {
      connectedNodeIds.add(edge.from);
      connectedNodeIds.add(edge.to);
    }

    const violations: VerificationViolation[] = [];

    for (const node of context.graph.nodes) {
      if (node.kind === "repository") {
        continue;
      }

      if (!connectedNodeIds.has(node.id)) {
        violations.push({
          ruleId: "ARCH-013",
          severity: "error",
          message:
            `Context graph node is orphaned and has no connected edges: ${node.id}`,
          target: node.id
        });
      }
    }

    return violations;
  }
};

export const repositoryContainsAllTopLevelFilesRule: VerificationRule = {
  id: "ARCH-014",
  description:
    "Every top-level file node must be connected to the repository node",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const violations: VerificationViolation[] = [];

    const repositoryContainsEdges = new Set(
      context.graph.edges
        .filter(
          (edge) =>
            edge.from === "repository:root" &&
            edge.kind === "contains"
        )
        .map((edge) => edge.to)
    );

    for (const node of context.graph.nodes) {
      if (node.kind !== "file") {
        continue;
      }

      if (!repositoryContainsEdges.has(node.id)) {
        violations.push({
          ruleId: "ARCH-014",
          severity: "error",
          message:
            `Top-level file is not connected to repository: ${node.id}`,
          target: node.id
        });
      }
    }

    return violations;
  }
};
export const directoryNodesRequireValidPathsRule: VerificationRule = {
  id: "ARCH-015",
  description:
    "Every directory node in the context graph must have a non-empty path",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const violations: VerificationViolation[] = [];

    for (const node of context.graph.nodes) {
      if (node.kind !== "directory") {
        continue;
      }

      if (!node.path || node.path.trim().length === 0) {
        violations.push({
          ruleId: "ARCH-015",
          severity: "error",
          message: `Directory node has missing or empty path: ${node.id}`,
          target: node.id
        });
      }
    }

    return violations;
  }
};
export const directoryNodesRequireParentRule: VerificationRule = {
  id: "ARCH-016",
  description:
    "Every directory node must have a contains edge from its parent directory or repository node",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const violations: VerificationViolation[] = [];

    for (const node of context.graph.nodes) {
      if (node.kind !== "directory") {
        continue;
      }

      const parentPath = node.path?.includes("/")
        ? node.path.slice(0, node.path.lastIndexOf("/"))
        : null;

      const expectedParentId = parentPath
        ? `directory:${parentPath}`
        : "repository:root";

      const hasParentEdge = context.graph.edges.some(
        (edge) =>
          edge.from === expectedParentId &&
          edge.to === node.id &&
          edge.kind === "contains"
      );

      if (!hasParentEdge) {
        violations.push({
          ruleId: "ARCH-016",
          severity: "error",
          message:
            `Directory node is not connected to its parent: ${node.id}`,
          target: node.id
        });
      }
    }

    return violations;
  }
};