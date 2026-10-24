import type { VerificationResult, ArchitectureImportBoundary } from "./models";
import type { RepositorySnapshot } from "@codeforge/repository-indexer";
import type { ContextGraph } from "@codeforge/context-graph";
export declare function verifyRepository(repository: RepositorySnapshot, graph: ContextGraph, architectureImportBoundaries?: ArchitectureImportBoundary[]): VerificationResult;
