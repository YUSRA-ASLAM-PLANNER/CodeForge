
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { ArchitectureImportBoundary } from "./models";

export type CodeForgeConfig = {
  architecture?: {
    autoDetectLayers?: boolean;
    importBoundaries?: ArchitectureImportBoundary[];
  };
};

const isRecord = (
  value: unknown
): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value);

export async function loadCodeForgeConfig(
  rootPath: string
): Promise<CodeForgeConfig> {
  const configPath = join(rootPath, "codeforge.config.json");

  let contents: string;

  try {
    contents = await readFile(configPath, "utf8");
  } catch (error) {
    if (
      isRecord(error) &&
      error.code === "ENOENT"
    ) {
      return {};
    }

    throw error;
  }

  const parsed: unknown = JSON.parse(contents);

  if (!isRecord(parsed)) {
    throw new Error(
      "Invalid CodeForge config: the root must be a JSON object"
    );
  }

  const architecture = parsed.architecture;

  if (architecture === undefined) {
    return {};
  }

  if (!isRecord(architecture)) {
    throw new Error(
      "Invalid CodeForge config: architecture must be an object"
    );
  }

  if (
    architecture.autoDetectLayers !== undefined &&
    typeof architecture.autoDetectLayers !== "boolean"
  ) {
    throw new Error(
      "Invalid CodeForge config: architecture.autoDetectLayers must be a boolean"
    );
  }

  const boundaries = architecture.importBoundaries;

  if (boundaries !== undefined) {
    if (!Array.isArray(boundaries)) {
      throw new Error(
        "Invalid CodeForge config: architecture.importBoundaries must be an array"
      );
    }

    for (const boundary of boundaries) {
      if (
        !isRecord(boundary) ||
        typeof boundary.from !== "string" ||
        typeof boundary.to !== "string" ||
        boundary.from.trim() === "" ||
        boundary.to.trim() === ""
      ) {
        throw new Error(
          "Invalid CodeForge config: each import boundary needs non-empty from and to strings"
        );
      }
    }
  }

  return {
    architecture: {
      autoDetectLayers: architecture.autoDetectLayers as
        | boolean
        | undefined,
      importBoundaries: boundaries as
        | ArchitectureImportBoundary[]
        | undefined
    }
  };
}
