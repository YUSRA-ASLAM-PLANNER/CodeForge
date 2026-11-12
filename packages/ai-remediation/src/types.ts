export interface RemediationPatch {
  findingId: string;
  ruleId: string;
  targetFile: string;
  suggestedFix: string;
  explanation: string;
  confidenceScore: number;
}

export interface RemediationOptions {
  apiKey?: string;
  modelName?: string;
}
