"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.containsEdgesMustMatchPathsRule022 = exports.directoryNodesMustMatchRepositoryStructureRule = exports.fileNodesMustMatchRepositoryFilesRule = exports.containsEdgesMustMatchPathsRule = exports.containsEdgesMustPointParentToChildRule = exports.fileNodesRequireParentRule = exports.directoryNodesRequireParentRule = exports.directoryNodesRequireValidPathsRule = exports.repositoryContainsAllTopLevelFilesRule = exports.orphanNodeRule = exports.duplicateEdgesRule = exports.selfReferentialEdgeRule = exports.repositoryNodeMustBeRootRule = exports.repositoryNodeIdRule = exports.repositoryNodeRequiredRule = exports.validContextGraphEdgeKindsRule = exports.fileNodesRequireValidPathsRule = exports.duplicateNodeIdsRule = exports.duplicateFileNodesRule = exports.contextGraphFilesExistInRepositoryRule = exports.indexedFilesExistInContextGraphRule = exports.contextGraphReferentialIntegrityRule = void 0;
exports.contextGraphReferentialIntegrityRule = {
    id: "ARCH-001",
    description: "All context graph edges must reference existing nodes",
    severity: "error",
    check: (context) => {
        const nodeIds = new Set(context.graph.nodes.map((node) => node.id));
        const violations = [];
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
exports.indexedFilesExistInContextGraphRule = {
    id: "ARCH-002",
    description: "Every indexed repository file must have a corresponding context graph node",
    severity: "error",
    check: (context) => {
        const nodeIds = new Set(context.graph.nodes.map((node) => node.id));
        const violations = [];
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
exports.contextGraphFilesExistInRepositoryRule = {
    id: "ARCH-003",
    description: "Every file node in the context graph must correspond to an indexed repository file",
    severity: "error",
    check: (context) => {
        const indexedFiles = new Set(context.files);
        const violations = [];
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
exports.duplicateFileNodesRule = {
    id: "ARCH-004",
    description: "Every repository file must have at most one corresponding file node",
    severity: "error",
    check: (context) => {
        const seen = new Set();
        const violations = [];
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
            }
            else {
                seen.add(node.path);
            }
        }
        return violations;
    }
};
exports.duplicateNodeIdsRule = {
    id: "ARCH-005",
    description: "Every context graph node must have a unique node ID",
    severity: "error",
    check: (context) => {
        const seen = new Set();
        const violations = [];
        for (const node of context.graph.nodes) {
            if (seen.has(node.id)) {
                violations.push({
                    ruleId: "ARCH-005",
                    severity: "error",
                    message: `Duplicate context graph node ID: ${node.id}`,
                    target: node.id
                });
            }
            else {
                seen.add(node.id);
            }
        }
        return violations;
    }
};
exports.fileNodesRequireValidPathsRule = {
    id: "ARCH-006",
    description: "Every file node in the context graph must have a non-empty path",
    severity: "error",
    check: (context) => {
        const violations = [];
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
exports.validContextGraphEdgeKindsRule = {
    id: "ARCH-007",
    description: "Every context graph edge must use a supported edge kind",
    severity: "error",
    check: (context) => {
        const validKinds = new Set([
            "contains",
            "imports",
            "exports",
            "references"
        ]);
        const violations = [];
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
exports.repositoryNodeRequiredRule = {
    id: "ARCH-008",
    description: "The context graph must contain exactly one repository node",
    severity: "error",
    check: (context) => {
        const repositoryNodes = context.graph.nodes.filter((node) => node.kind === "repository");
        if (repositoryNodes.length === 1) {
            return [];
        }
        return [
            {
                ruleId: "ARCH-007",
                severity: "error",
                message: repositoryNodes.length === 0
                    ? "Context graph is missing the repository node"
                    : `Context graph contains multiple repository nodes: ${repositoryNodes.length}`,
                target: "repository"
            }
        ];
    }
};
exports.repositoryNodeIdRule = {
    id: "ARCH-009",
    description: "The repository node must use the canonical ID repository:root",
    severity: "error",
    check: (context) => {
        const repositoryNodes = context.graph.nodes.filter((node) => node.kind === "repository");
        const violations = [];
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
exports.repositoryNodeMustBeRootRule = {
    id: "ARCH-010",
    description: "The repository node must not have any incoming edges",
    severity: "error",
    check: (context) => {
        const violations = [];
        for (const edge of context.graph.edges) {
            if (edge.to === "repository:root") {
                violations.push({
                    ruleId: "ARCH-010",
                    severity: "error",
                    message: `Repository node must not have an incoming edge from: ${edge.from}`,
                    target: edge.from
                });
            }
        }
        return violations;
    }
};
exports.selfReferentialEdgeRule = {
    id: "ARCH-011",
    description: "Context graph edges must not connect a node to itself",
    severity: "error",
    check: (context) => {
        const violations = [];
        for (const edge of context.graph.edges) {
            if (edge.from === edge.to) {
                violations.push({
                    ruleId: "ARCH-011",
                    severity: "error",
                    message: `Context graph edge cannot reference the same node: ${edge.from}`,
                    target: edge.from
                });
            }
        }
        return violations;
    }
};
exports.duplicateEdgesRule = {
    id: "ARCH-012",
    description: "Context graph edges must be unique by source, target, and kind",
    severity: "error",
    check: (context) => {
        const seen = new Set();
        const violations = [];
        for (const edge of context.graph.edges) {
            const key = `${edge.from}|${edge.kind}|${edge.to}`;
            if (seen.has(key)) {
                violations.push({
                    ruleId: "ARCH-012",
                    severity: "error",
                    message: `Duplicate context graph edge: ${edge.from} -> ${edge.to} (${edge.kind})`,
                    target: key
                });
            }
            else {
                seen.add(key);
            }
        }
        return violations;
    }
};
exports.orphanNodeRule = {
    id: "ARCH-013",
    description: "Every non-repository node must be connected to at least one edge",
    severity: "error",
    check: (context) => {
        const connectedNodeIds = new Set();
        for (const edge of context.graph.edges) {
            connectedNodeIds.add(edge.from);
            connectedNodeIds.add(edge.to);
        }
        const violations = [];
        for (const node of context.graph.nodes) {
            if (node.kind === "repository") {
                continue;
            }
            if (!connectedNodeIds.has(node.id)) {
                violations.push({
                    ruleId: "ARCH-013",
                    severity: "error",
                    message: `Context graph node is orphaned and has no connected edges: ${node.id}`,
                    target: node.id
                });
            }
        }
        return violations;
    }
};
exports.repositoryContainsAllTopLevelFilesRule = {
    id: "ARCH-014",
    description: "Every top-level file node must be connected to the repository node",
    severity: "error",
    check: (context) => {
        const violations = [];
        const repositoryContainsEdges = new Set(context.graph.edges
            .filter((edge) => edge.from === "repository:root" &&
            edge.kind === "contains")
            .map((edge) => edge.to));
        for (const node of context.graph.nodes) {
            if (node.kind !== "file") {
                continue;
            }
            if (!repositoryContainsEdges.has(node.id)) {
                violations.push({
                    ruleId: "ARCH-014",
                    severity: "error",
                    message: `Top-level file is not connected to repository: ${node.id}`,
                    target: node.id
                });
            }
        }
        return violations;
    }
};
exports.directoryNodesRequireValidPathsRule = {
    id: "ARCH-015",
    description: "Every directory node in the context graph must have a non-empty path",
    severity: "error",
    check: (context) => {
        const violations = [];
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
exports.directoryNodesRequireParentRule = {
    id: "ARCH-016",
    description: "Every directory node must have a contains edge from its parent directory or repository node",
    severity: "error",
    check: (context) => {
        const violations = [];
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
            const hasParentEdge = context.graph.edges.some((edge) => edge.from === expectedParentId &&
                edge.to === node.id &&
                edge.kind === "contains");
            if (!hasParentEdge) {
                violations.push({
                    ruleId: "ARCH-016",
                    severity: "error",
                    message: `Directory node is not connected to its parent: ${node.id}`,
                    target: node.id
                });
            }
        }
        return violations;
    }
};
exports.fileNodesRequireParentRule = {
    id: "ARCH-017",
    description: "Every file node must have a contains edge from its parent directory or repository node",
    severity: "error",
    check: (context) => {
        const violations = [];
        for (const node of context.graph.nodes) {
            if (node.kind !== "file") {
                continue;
            }
            const filePath = node.path;
            if (!filePath || filePath.trim().length === 0) {
                continue;
            }
            const lastSlash = filePath.lastIndexOf("/");
            const expectedParentId = lastSlash === -1
                ? "repository:root"
                : `directory:${filePath.slice(0, lastSlash)}`;
            const hasParentEdge = context.graph.edges.some((edge) => edge.from === expectedParentId &&
                edge.to === node.id &&
                edge.kind === "contains");
            if (!hasParentEdge) {
                violations.push({
                    ruleId: "ARCH-017",
                    severity: "error",
                    message: `File node is not connected to its parent: ${node.id}`,
                    target: node.id
                });
            }
        }
        return violations;
    }
};
exports.containsEdgesMustPointParentToChildRule = {
    id: "ARCH-018",
    description: "Every contains edge must connect a parent node to a child node",
    severity: "error",
    check: (context) => {
        const violations = [];
        for (const edge of context.graph.edges) {
            if (edge.kind !== "contains") {
                continue;
            }
            const fromNode = context.graph.nodes.find((node) => node.id === edge.from);
            const toNode = context.graph.nodes.find((node) => node.id === edge.to);
            if (!fromNode || !toNode) {
                continue;
            }
            const validParentChild = (fromNode.kind === "repository" &&
                (toNode.kind === "directory" || toNode.kind === "file")) ||
                (fromNode.kind === "directory" &&
                    (toNode.kind === "directory" || toNode.kind === "file"));
            if (!validParentChild) {
                violations.push({
                    ruleId: "ARCH-018",
                    severity: "error",
                    message: `Contains edge does not represent a valid parent-child relationship: ${edge.from} -> ${edge.to}`,
                    target: `${edge.from}->${edge.to}`
                });
            }
        }
        return violations;
    }
};
exports.containsEdgesMustMatchPathsRule = {
    id: "ARCH-019",
    description: "Every contains edge between directories and files must match the nodes' paths",
    severity: "error",
    check: (context) => {
        const violations = [];
        for (const edge of context.graph.edges) {
            if (edge.kind !== "contains") {
                continue;
            }
            const fromNode = context.graph.nodes.find((node) => node.id === edge.from);
            const toNode = context.graph.nodes.find((node) => node.id === edge.to);
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
            const isDirectChild = toNode.kind === "directory"
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
                    message: `Contains edge does not match parent-child paths: ${edge.from} -> ${edge.to}`,
                    target: `${edge.from}->${edge.to}`
                });
            }
        }
        return violations;
    }
};
exports.fileNodesMustMatchRepositoryFilesRule = {
    id: "ARCH-020",
    description: "Every file node in the context graph must correspond to an indexed repository file",
    severity: "error",
    check: (context) => {
        const repositoryFiles = new Set(context.files);
        const violations = [];
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
                    message: `File node does not correspond to an indexed repository file: ${node.id}`,
                    target: node.id
                });
            }
        }
        return violations;
    }
};
exports.directoryNodesMustMatchRepositoryStructureRule = {
    id: "ARCH-021",
    description: "Every directory node must correspond to a directory represented by repository files",
    severity: "error",
    check: (context) => {
        const violations = [];
        const repositoryDirectories = new Set();
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
                    message: `Directory node does not correspond to repository structure: ${node.id}`,
                    target: node.id
                });
            }
        }
        return violations;
    }
};
exports.containsEdgesMustMatchPathsRule022 = {
    id: "ARCH-022",
    description: "Every contains edge between directories or files must match the parent-child paths",
    severity: "error",
    check: (context) => {
        const violations = [];
        for (const edge of context.graph.edges) {
            if (edge.kind !== "contains") {
                continue;
            }
            const fromNode = context.graph.nodes.find((node) => node.id === edge.from);
            const toNode = context.graph.nodes.find((node) => node.id === edge.to);
            if (!fromNode || !toNode) {
                continue;
            }
            if (fromNode.kind === "repository") {
                continue;
            }
            if (fromNode.kind === "directory" && toNode.kind === "directory") {
                const expectedParent = toNode.path?.includes("/")
                    ? toNode.path.slice(0, toNode.path.lastIndexOf("/"))
                    : null;
                if (expectedParent !== fromNode.path) {
                    violations.push({
                        ruleId: "ARCH-022",
                        severity: "error",
                        message: `Directory contains edge does not match paths: ${edge.from} -> ${edge.to}`,
                        target: `${edge.from}->${edge.to}`
                    });
                }
            }
            if (fromNode.kind === "directory" && toNode.kind === "file") {
                const expectedParent = toNode.path?.includes("/")
                    ? toNode.path.slice(0, toNode.path.lastIndexOf("/"))
                    : null;
                if (expectedParent !== fromNode.path) {
                    violations.push({
                        ruleId: "ARCH-022",
                        severity: "error",
                        message: `File contains edge does not match paths: ${edge.from} -> ${edge.to}`,
                        target: `${edge.from}->${edge.to}`
                    });
                }
            }
        }
        return violations;
    }
};
