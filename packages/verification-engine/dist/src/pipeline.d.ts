import type { VerificationResult } from "./models";
export type IndexedRepository = {
    files: string[];
};
export type RepositoryGraph = {
    nodes: Array<{
        id: string;
        kind: string;
        label: string;
        path?: string;
    }>;
    edges: Array<{
        from: string;
        to: string;
        kind: string;
    }>;
};
export declare function verifyRepository(repository: IndexedRepository, graph: RepositoryGraph): VerificationResult;
