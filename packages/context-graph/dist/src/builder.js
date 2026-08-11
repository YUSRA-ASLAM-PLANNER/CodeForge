"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextGraphBuilder = void 0;
class ContextGraphBuilder {
    nodes = new Map();
    edges = new Map();
    addNode(id, kind, label, path) {
        const existing = this.nodes.get(id);
        if (existing) {
            return existing;
        }
        const node = {
            id,
            kind,
            label,
            ...(path !== undefined ? { path } : {})
        };
        this.nodes.set(id, node);
        return node;
    }
    addEdge(from, to, kind) {
        if (!this.nodes.has(from)) {
            throw new Error(`Source node does not exist: ${from}`);
        }
        if (!this.nodes.has(to)) {
            throw new Error(`Target node does not exist: ${to}`);
        }
        const id = `${from}|${kind}|${to}`;
        const existing = this.edges.get(id);
        if (existing) {
            return existing;
        }
        const edge = { from, to, kind };
        this.edges.set(id, edge);
        return edge;
    }
    build() {
        return {
            nodes: [...this.nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
            edges: [...this.edges.values()].sort((a, b) => `${a.from}|${a.kind}|${a.to}`.localeCompare(`${b.from}|${b.kind}|${b.to}`))
        };
    }
}
exports.ContextGraphBuilder = ContextGraphBuilder;
