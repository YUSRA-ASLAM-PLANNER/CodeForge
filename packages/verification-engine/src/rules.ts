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
        ruleId: "ARCH-008",
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

      const filePath = (node.path ?? node.id.slice("file:".length))
        .replace(/\\/g, "/");

      if (filePath.includes("/")) {
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
export const fileNodesRequireParentRule: VerificationRule = {
  id: "ARCH-017",
  description:
    "Every file node must have a contains edge from its parent directory or repository node",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const violations: VerificationViolation[] = [];

    for (const node of context.graph.nodes) {
      if (node.kind !== "file") {
        continue;
      }

      const filePath = node.path;

      if (!filePath || filePath.trim().length === 0) {
        continue;
      }

      const lastSlash = filePath.lastIndexOf("/");

      const expectedParentId =
        lastSlash === -1
          ? "repository:root"
          : `directory:${filePath.slice(0, lastSlash)}`;

      const hasParentEdge = context.graph.edges.some(
        (edge) =>
          edge.from === expectedParentId &&
          edge.to === node.id &&
          edge.kind === "contains"
      );

      if (!hasParentEdge) {
        violations.push({
          ruleId: "ARCH-017",
          severity: "error",
          message:
            `File node is not connected to its parent: ${node.id}`,
          target: node.id
        });
      }
    }

    return violations;
  }
};
export const containsEdgesMustPointParentToChildRule: VerificationRule = {
  id: "ARCH-018",
  description:
    "Every contains edge must connect a parent node to a child node",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const violations: VerificationViolation[] = [];

    for (const edge of context.graph.edges) {
      if (edge.kind !== "contains") {
        continue;
      }

      const fromNode = context.graph.nodes.find(
        (node) => node.id === edge.from
      );

      const toNode = context.graph.nodes.find(
        (node) => node.id === edge.to
      );

      if (!fromNode || !toNode) {
        continue;
      }

      const validParentChild =
        (fromNode.kind === "repository" &&
          (toNode.kind === "directory" || toNode.kind === "file")) ||
        (fromNode.kind === "directory" &&
          (toNode.kind === "directory" || toNode.kind === "file"));

      if (!validParentChild) {
        violations.push({
          ruleId: "ARCH-018",
          severity: "error",
          message:
            `Contains edge does not represent a valid parent-child relationship: ${edge.from} -> ${edge.to}`,
          target: `${edge.from}->${edge.to}`
        });
      }
    }

    return violations;
  }
};
export const containsEdgesMustMatchPathsRule: VerificationRule = {
  id: "ARCH-019",
  description:
    "Every contains edge between directories and files must match the nodes' paths",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const violations: VerificationViolation[] = [];

    for (const edge of context.graph.edges) {
      if (edge.kind !== "contains") {
        continue;
      }

      const fromNode = context.graph.nodes.find(
        (node) => node.id === edge.from
      );

      const toNode = context.graph.nodes.find(
        (node) => node.id === edge.to
      );

      if (!fromNode || !toNode) {
        continue;
      }

      if (fromNode.kind === "repository") {
        continue;
      }

      if (fromNode.kind !== "directory") {
        continue;
      }

      if (!fromNode.path || !toNode.path) {
        continue;
      }

      const expectedParentPath = fromNode.path;

      const toPath = toNode.path;

      const isDirectChild =
        toNode.kind === "directory"
          ? toPath.startsWith(`${expectedParentPath}/`) &&
            !toPath
              .slice(expectedParentPath.length + 1)
              .includes("/")
          : toPath.startsWith(`${expectedParentPath}/`) &&
            !toPath
              .slice(expectedParentPath.length + 1)
              .includes("/");

      if (!isDirectChild) {
        violations.push({
          ruleId: "ARCH-019",
          severity: "error",
          message:
            `Contains edge does not match parent-child paths: ${edge.from} -> ${edge.to}`,
          target: `${edge.from}->${edge.to}`
        });
      }
    }

    return violations;
  }
};
export const fileNodesMustMatchRepositoryFilesRule: VerificationRule = {
  id: "ARCH-020",
  description:
    "Every file node in the context graph must correspond to an indexed repository file",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const repositoryFiles = new Set(context.files);
    const violations: VerificationViolation[] = [];

    for (const node of context.graph.nodes) {
      if (node.kind !== "file") {
        continue;
      }

      if (!node.path || node.path.trim().length === 0) {
        continue;
      }

      if (!repositoryFiles.has(node.path)) {
        violations.push({
          ruleId: "ARCH-020",
          severity: "error",
          message:
            `File node does not correspond to an indexed repository file: ${node.id}`,
          target: node.id
        });
      }
    }

    return violations;
  }
};
export const directoryNodesMustMatchRepositoryStructureRule: VerificationRule = {
  id: "ARCH-021",
  description:
    "Every directory node must correspond to a directory represented by repository files",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const violations: VerificationViolation[] = [];

    const repositoryDirectories = new Set<string>();

    for (const filePath of context.files) {
      const parts = filePath.split("/");

      for (let i = 1; i < parts.length; i++) {
        repositoryDirectories.add(parts.slice(0, i).join("/"));
      }
    }

    for (const node of context.graph.nodes) {
      if (node.kind !== "directory") {
        continue;
      }

      if (!node.path || node.path.trim().length === 0) {
        continue;
      }

      if (!repositoryDirectories.has(node.path)) {
        violations.push({
          ruleId: "ARCH-021",
          severity: "error",
          message:
            `Directory node does not correspond to repository structure: ${node.id}`,
          target: node.id
        });
      }
    }

    return violations;
  }
};
export const containsEdgesMustMatchPathsRule022: VerificationRule = {
  id: "ARCH-022",
  description:
    "Every contains edge between directories or files must match the parent-child paths",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const violations: VerificationViolation[] = [];

    for (const edge of context.graph.edges) {
      if (edge.kind !== "contains") {
        continue;
      }

      const fromNode = context.graph.nodes.find(
        (node) => node.id === edge.from
      );

      const toNode = context.graph.nodes.find(
        (node) => node.id === edge.to
      );

      if (!fromNode || !toNode) {
        continue;
      }

      if (fromNode.kind === "repository") {
        continue;
      }

      if (fromNode.kind === "directory" && toNode.kind === "directory") {
        const expectedParent =
          toNode.path?.includes("/")
            ? toNode.path.slice(0, toNode.path.lastIndexOf("/"))
            : null;

        if (expectedParent !== fromNode.path) {
          violations.push({
            ruleId: "ARCH-022",
            severity: "error",
            message:
              `Directory contains edge does not match paths: ${edge.from} -> ${edge.to}`,
            target: `${edge.from}->${edge.to}`
          });
        }
      }

      if (fromNode.kind === "directory" && toNode.kind === "file") {
        const expectedParent =
          toNode.path?.includes("/")
            ? toNode.path.slice(0, toNode.path.lastIndexOf("/"))
            : null;

        if (expectedParent !== fromNode.path) {
          violations.push({
            ruleId: "ARCH-022",
            severity: "error",
            message:
              `File contains edge does not match paths: ${edge.from} -> ${edge.to}`,
            target: `${edge.from}->${edge.to}`
          });
        }
      }
    }

    return violations;
  }
};

export const internalImportsMustResolveRule023: VerificationRule = {
  id: "ARCH-023",
  description: "Internal relative imports must resolve to existing repository files",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const violations: VerificationViolation[] = [];
    const graphFilePaths = new Set(
      context.graph.nodes
        .filter((node) => node.kind === "file" && node.id.startsWith("file:"))
        .map((node) => node.id.slice("file:".length).replace(/\\/g, "/"))
    );

    const normalize = (value: string): string =>
      value.replace(/\\/g, "/").replace(/^\.\/+/, "");

    for (const entry of context.imports ?? []) {
      for (const specifier of entry.specifiers) {
        if (!specifier.startsWith(".")) {
          continue;
        }

        const parts = normalize(entry.path).split("/");
        parts.pop();

        let escapesRoot = false;

        for (const part of specifier.replace(/\\/g, "/").split("/")) {
          if (!part || part === ".") continue;

          if (part === "..") {
            if (parts.length === 0) {
              escapesRoot = true;
              break;
            }
            parts.pop();
          } else {
            parts.push(part);
          }
        }

        if (escapesRoot) continue;

        const basePath = parts.join("/");
        const candidates = [
          basePath,
          `${basePath}.ts`,
          `${basePath}.tsx`,
          `${basePath}.js`,
          `${basePath}.jsx`,
          `${basePath}.mts`,
          `${basePath}.cts`,
          `${basePath}.mjs`,
          `${basePath}.cjs`,
          `${basePath}/index.ts`,
          `${basePath}/index.tsx`,
          `${basePath}/index.js`,
          `${basePath}/index.jsx`
        ].map(normalize);

        if (candidates.some((candidate) => graphFilePaths.has(candidate))) {
          continue;
        }

        violations.push({
          ruleId: "ARCH-023",
          severity: "error",
          message: `Unresolved internal import: ${specifier}`,
          target: `${entry.path}->${specifier}`
        });
      }
    }

    return violations;
  }
};

export const importBoundaryEnforcementRule024: VerificationRule = {
  id: "ARCH-024",
  description: "Imports must not cross explicitly prohibited architectural boundaries",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const violations: VerificationViolation[] = [];
    const boundaries = context.architectureImportBoundaries ?? [];

    if (boundaries.length === 0) return violations;

    const normalize = (value: string): string =>
      value.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\.\/+/, "");

    const getLayer = (filePath: string): string | undefined => {
      const parts = normalize(filePath).split("/");

      for (const part of parts) {
        for (const boundary of boundaries) {
          if (boundary.from.toLowerCase() === part.toLowerCase()) {
            return boundary.from;
          }
          if (boundary.to.toLowerCase() === part.toLowerCase()) {
            return boundary.to;
          }
        }
      }

      return undefined;
    };

    const reported = new Set<string>();

    const checkImport = (sourcePath: string, targetPath: string): void => {
      sourcePath = normalize(sourcePath);
      targetPath = normalize(targetPath);

      const sourceLayer = getLayer(sourcePath);
      const targetLayer = getLayer(targetPath);

      if (!sourceLayer || !targetLayer) return;

      const prohibited = boundaries.find(
        (boundary) =>
          boundary.from.toLowerCase() === sourceLayer.toLowerCase() &&
          boundary.to.toLowerCase() === targetLayer.toLowerCase()
      );

      if (!prohibited) return;

      const key = `${sourcePath}->${targetPath}:${prohibited.from}:${prohibited.to}`;
      if (reported.has(key)) return;
      reported.add(key);

      violations.push({
        ruleId: "ARCH-024",
        severity: "error",
        message: `Architectural boundary violation: ${prohibited.from} must not import ${prohibited.to}`,
        target: `${sourcePath}->${targetPath}`
      });
    };

    // Check resolved graph edges, including path-alias imports.
    for (const edge of context.graph.edges) {
      if (edge.kind !== "imports") continue;
      if (!edge.from.startsWith("file:") || !edge.to.startsWith("file:")) continue;

      checkImport(
        edge.from.slice("file:".length),
        edge.to.slice("file:".length)
      );
    }

    // Also check raw relative imports for contexts without graph edges.
    for (const entry of context.imports ?? []) {
      for (const specifier of entry.specifiers) {
        if (!specifier.startsWith(".")) continue;

        const parts = normalize(entry.path).split("/");
        parts.pop();

        for (const part of normalize(specifier).split("/")) {
          if (!part || part === ".") continue;

          if (part === "..") {
            if (parts.length > 0) parts.pop();
          } else {
            parts.push(part);
          }
        }

        checkImport(entry.path, parts.join("/"));
      }
    }

    return violations;
  }
};

export const circularDependencyDetectionRule026: VerificationRule = {
  id: "ARCH-026",
  description: "Detect circular dependencies between repository files",
  severity: "error",

  check: (context): VerificationViolation[] => {
    const adjacency = new Map<string, string[]>();

    for (const edge of context.graph.edges) {
      if (edge.kind !== "imports") continue;
      if (!edge.from.startsWith("file:")) continue;
      if (!edge.to.startsWith("file:")) continue;

      const source = edge.from.slice("file:".length);
      const target = edge.to.slice("file:".length);

      const targets = adjacency.get(source) ?? [];
      targets.push(target);
      adjacency.set(source, targets);
    }

    const allFiles = new Set<string>();

    for (const node of context.graph.nodes) {
      if (node.kind === "file" && node.id.startsWith("file:")) {
        allFiles.add(node.id.slice("file:".length));
      }
    }

    for (const [source, targets] of adjacency) {
      allFiles.add(source);
      for (const target of targets) allFiles.add(target);
    }

    let nextIndex = 0;
    const indices = new Map<string, number>();
    const lowLinks = new Map<string, number>();
    const stack: string[] = [];
    const onStack = new Set<string>();
    const violations: VerificationViolation[] = [];

    const strongConnect = (file: string): void => {
      indices.set(file, nextIndex);
      lowLinks.set(file, nextIndex);
      nextIndex++;

      stack.push(file);
      onStack.add(file);

      for (const dependency of adjacency.get(file) ?? []) {
        if (!indices.has(dependency)) {
          strongConnect(dependency);
          lowLinks.set(
            file,
            Math.min(lowLinks.get(file)!, lowLinks.get(dependency)!)
          );
        } else if (onStack.has(dependency)) {
          lowLinks.set(
            file,
            Math.min(lowLinks.get(file)!, indices.get(dependency)!)
          );
        }
      }

      if (lowLinks.get(file) !== indices.get(file)) return;

      const component: string[] = [];
      let member: string;

      do {
        member = stack.pop()!;
        onStack.delete(member);
        component.push(member);
      } while (member !== file);

      const hasSelfLoop = (adjacency.get(file) ?? []).includes(file);

      if (component.length > 1 || hasSelfLoop) {
        component.sort((a, b) => a.localeCompare(b));

        violations.push({
          ruleId: "ARCH-026",
          severity: "error",
       message: `Circular dependency detected between files: ${component.join(", ")}`,
          target: component.join(", ")
        });
      }
    };

    for (const file of [...allFiles].sort((a, b) => a.localeCompare(b))) {
      if (!indices.has(file)) strongConnect(file);
    }

    return violations;
  }
};
