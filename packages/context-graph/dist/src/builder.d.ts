import type { ContextEdge, ContextEdgeKind, ContextGraph, ContextNode, ContextNodeKind } from "./models";
export declare class ContextGraphBuilder {
    private readonly nodes;
    private readonly edges;
    addNode(id: string, kind: ContextNodeKind, label: string, path?: string): ContextNode;
    addEdge(from: string, to: string, kind: ContextEdgeKind): ContextEdge;
    build(): ContextGraph;
}
