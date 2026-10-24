import type { VerificationResult, ArchitectureImportBoundary } from "./models";
export declare function verifyRepositoryPath(rootPath: string, architectureImportBoundaries?: ArchitectureImportBoundary[]): Promise<VerificationResult>;
