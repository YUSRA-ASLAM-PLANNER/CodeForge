import type { ContextGraph } from "./models";
import type { RepositorySnapshot } from "@codeforge/repository-indexer";
export declare function buildContextGraph(files: Array<{
    path: string;
}>): ContextGraph;
export declare function buildContextGraphFromSnapshot(snapshot: RepositorySnapshot): ContextGraph;
