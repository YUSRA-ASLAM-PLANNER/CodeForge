import type { RepositorySnapshot } from "./models";
export declare function indexRepository(rootPath: string, ignoredDirectories?: Set<string>): Promise<RepositorySnapshot>;
