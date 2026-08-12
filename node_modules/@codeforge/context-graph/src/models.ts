export type ContextNodeKind =
  | "repository"
  | "file"
  | "directory"
  | "symbol";

export type ContextEdgeKind =
  | "contains"
  | "imports"
  | "exports"
  | "references";

export type ContextNode = {
  id: string;
  kind: ContextNodeKind;
  label: string;
  path?: string;
};

export type ContextEdge = {
  from: string;
  to: string;
  kind: ContextEdgeKind;
};

export type ContextGraph = {
  nodes: ContextNode[];
  edges: ContextEdge[];
};
