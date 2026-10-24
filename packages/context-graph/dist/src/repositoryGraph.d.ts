import type { ContextGraph } from "./models";
import type { RepositoryFile, RepositorySnapshot } from "@codeforge/repository-indexer";
type GraphFile = Pick<RepositoryFile, "path"> & {
    imports?: string[];
    resolvedImports?: string[];
};
export declare function buildContextGraph(files: GraphFile[]): ContextGraph;
export declare function buildContextGraphFromSnapshot(snapshot: RepositorySnapshot): ContextGraph;
export {};
