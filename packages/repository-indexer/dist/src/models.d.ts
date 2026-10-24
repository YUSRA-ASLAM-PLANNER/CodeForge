export type RepositoryFile = {
    path: string;
    extension: string;
    sizeBytes: number;
    imports?: string[];
    resolvedImports?: string[];
};
export type RepositorySnapshot = {
    rootPath: string;
    files: RepositoryFile[];
    fileCount: number;
    totalBytes: number;
};
