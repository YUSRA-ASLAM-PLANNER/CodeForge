import type { VerificationResult, ArchitectureImportBoundary } from "./models";
import type { RepositorySnapshot } from "@codeforge/repository-indexer";
import type { ContextGraph } from "@codeforge/context-graph";
export type RepositoryVerificationAnalysis = {
    snapshot: RepositorySnapshot;
    graph: ContextGraph;
    architectureImportBoundaries: ArchitectureImportBoundary[];
    architectureConfiguration: {
        autoDetectionEnabled: boolean;
        layers: Array<{
            name: string;
            fileCount: number;
            sampleFiles: string[];
        }>;
        suggestedBoundaries: ArchitectureImportBoundary[];
        automaticBoundaries: ArchitectureImportBoundary[];
        configuredBoundaries: ArchitectureImportBoundary[];
        configuredBoundarySource: ".codeforge.yaml" | "codeforge.config.json" | "analysis options" | "none";
        effectiveBoundaries: ArchitectureImportBoundary[];
    };
    result: VerificationResult;
};
export declare function analyzeRepositoryPath(rootPath: string, architectureImportBoundaries?: ArchitectureImportBoundary[]): Promise<RepositoryVerificationAnalysis>;
export declare function verifyRepositoryPath(rootPath: string, architectureImportBoundaries?: ArchitectureImportBoundary[]): Promise<VerificationResult>;
