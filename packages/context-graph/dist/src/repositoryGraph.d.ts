import type { ContextGraph } from "./models";
import type { RepositoryCall, RepositoryFile, RepositorySymbol, RepositorySnapshot } from "@codeforge/repository-indexer";
type GraphFile = Pick<RepositoryFile, "path"> & {
    imports?: string[];
    resolvedImports?: string[];
    symbols?: RepositorySymbol[];
    calls?: RepositoryCall[];
};
export declare function buildContextGraph(files: GraphFile[]): ContextGraph;
export declare function buildContextGraphFromSnapshot(snapshot: RepositorySnapshot): ContextGraph;
export {};
