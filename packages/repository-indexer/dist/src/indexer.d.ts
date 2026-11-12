import type { RepositorySnapshot } from "./models";
export type RepositoryIndexTiming = {
    fileCount: number;
    walkMs: number;
    sourceIoCumulativeMs: number;
    sourceParseMs: number;
    pythonAstMs: number;
    configMs: number;
    importResolutionMs: number;
    callResolutionMs: number;
    totalMs: number;
};
export declare function indexRepository(rootPath: string, ignoredDirectories?: Set<string>, onTiming?: (timing: RepositoryIndexTiming) => void, additionalIgnorePatterns?: string[]): Promise<RepositorySnapshot>;
