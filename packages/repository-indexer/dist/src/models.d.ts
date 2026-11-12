export type RepositoryFile = {
    path: string;
    extension: string;
    sizeBytes: number;
    imports?: string[];
    resolvedImports?: string[];
    symbols?: RepositorySymbol[];
    calls?: RepositoryCall[];
    importBindings?: RepositoryImportBinding[];
};
export type RepositoryImportBinding = {
    localName: string;
    importedName?: string;
    moduleSpecifier: string;
    namespace: boolean;
};
export type RepositorySymbol = {
    name: string;
    kind: "class" | "function" | "method" | "interface" | "type" | "enum" | "variable";
    line: number;
};
export type RepositoryCall = {
    caller: string;
    callee: string;
    calleePath?: string;
    calleeQualifier?: string;
    line: number;
};
export type RepositorySnapshot = {
    rootPath: string;
    files: RepositoryFile[];
    fileCount: number;
    totalBytes: number;
    analysisWarnings?: string[];
};
