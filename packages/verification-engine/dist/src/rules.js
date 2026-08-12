"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextGraphReferentialIntegrityRule = void 0;
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
