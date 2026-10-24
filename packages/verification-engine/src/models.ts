
export type VerificationSeverity =
  | "info"
  | "warning"
  | "error";

export type ArchitectureImportBoundary = {
  from: string;
  to: string;
};

export type VerificationRule = {
  id: string;
  description: string;
  severity: VerificationSeverity;
  check: (context: VerificationContext) => VerificationViolation[];
};

export type VerificationContext = {
  files: string[];
  imports?: Array<{
    path: string;
    specifiers: string[];
  }>;
  architectureImportBoundaries?: ArchitectureImportBoundary[];
  graph: {
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
};

export type VerificationViolation = {
  ruleId: string;
  severity: VerificationSeverity;
  message: string;
  target?: string;
};

export type VerificationResult = {
  passed: boolean;
  violations: VerificationViolation[];
};
