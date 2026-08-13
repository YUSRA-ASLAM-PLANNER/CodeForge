"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repositoryNodeMustBeRootRule = exports.repositoryNodeIdRule = exports.repositoryNodeRequiredRule = exports.validContextGraphEdgeKindsRule = exports.fileNodesRequireValidPathsRule = exports.duplicateNodeIdsRule = exports.duplicateFileNodesRule = exports.contextGraphFilesExistInRepositoryRule = exports.indexedFilesExistInContextGraphRule = exports.contextGraphReferentialIntegrityRule = void 0;
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
