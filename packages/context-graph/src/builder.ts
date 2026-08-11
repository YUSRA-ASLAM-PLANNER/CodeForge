import type {
  ContextEdge,
  ContextEdgeKind,
  ContextGraph,
  ContextNode,
  ContextNodeKind
} from "./models";

export class ContextGraphBuilder {
  private readonly nodes = new Map<string, ContextNode>();
  private readonly edges = new Map<string, ContextEdge>();

  addNode(
    id: string,
    kind: ContextNodeKind,
    label: string,
    path?: string
  ): ContextNode {
    const existing = this.nodes.get(id);

    if (existing) {
      return existing;
    }

    const node: ContextNode = {
      id,
      kind,
      label,
      ...(path !== undefined ? { path } : {})
    };

    this.nodes.set(id, node);
    return node;
  }

  addEdge(from: string, to: string, kind: ContextEdgeKind): ContextEdge {
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

    const edge: ContextEdge = { from, to, kind };
    this.edges.set(id, edge);
    return edge;
  }

  build(): ContextGraph {
    return {
      nodes: [...this.nodes.values()].sort((a, b) =>
        a.id.localeCompare(b.id)
      ),
      edges: [...this.edges.values()].sort((a, b) =>
        `${a.from}|${a.kind}|${a.to}`.localeCompare(
          `${b.from}|${b.kind}|${b.to}`
        )
      )
    };
  }
}
