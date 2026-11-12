import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDocument } from "yaml";

import type { ArchitectureImportBoundary } from "./models";

export type CodeForgeConfig = {
  source?: ".codeforge.yaml" | "codeforge.config.json";
  scan?: {
    exclude?: string[];
  };
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

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return false;
    throw error;
  }
}

function parseConfig(contents: string, configPath: string, isYaml: boolean): unknown {
  if (!isYaml) {
    try {
      return JSON.parse(contents) as unknown;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid CodeForge config at ${configPath}: ${message}`);
    }
  }

  try {
    const document = parseDocument(contents);
    if (document.errors.length > 0) {
      throw new Error(document.errors.map((error) => error.message).join("; "));
    }
    return document.toJS({ maxAliasCount: 100 }) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid CodeForge config at ${configPath}: ${message}`);
  }
}

export async function loadCodeForgeConfig(
  rootPath: string
): Promise<CodeForgeConfig> {
  const yamlPath = join(rootPath, ".codeforge.yaml");
  const jsonPath = join(rootPath, "codeforge.config.json");
  const yamlExists = await pathExists(yamlPath);
  const jsonExists = await pathExists(jsonPath);

  if (yamlExists && jsonExists) {
    throw new Error(
      `Found both ${yamlPath} and ${jsonPath}. Keep one CodeForge configuration file to avoid ambiguity.`
    );
  }
  if (!yamlExists && !jsonExists) return {};

  const configPath = yamlExists ? yamlPath : jsonPath;
  const source = yamlExists ? ".codeforge.yaml" : "codeforge.config.json";
  const contents = await readFile(configPath, "utf8");
  const parsed = parseConfig(contents, configPath, yamlExists);

  if (!isRecord(parsed)) {
    throw new Error(
      `Invalid CodeForge config at ${configPath}: the root must be an object`
    );
  }

  const architecture = parsed.architecture;

  const scan = parsed.scan;
  let exclude: string[] | undefined;
  if (scan !== undefined) {
    if (!isRecord(scan)) {
      throw new Error(
        `Invalid CodeForge config at ${configPath}: scan must be an object`
      );
    }
    if (scan.exclude !== undefined) {
      if (
        !Array.isArray(scan.exclude) ||
        scan.exclude.some((pattern) =>
          typeof pattern !== "string" || pattern.trim() === "" || pattern.trim().startsWith("!")
        )
      ) {
        throw new Error(
          `Invalid CodeForge config at ${configPath}: scan.exclude must be an array of non-empty ignore patterns without negations`
        );
      }
      exclude = scan.exclude.map((pattern) => (pattern as string).trim());
    }
  }

  if (architecture === undefined) {
    return {
      source,
      ...(exclude === undefined ? {} : { scan: { exclude } })
    };
  }

  if (!isRecord(architecture)) {
    throw new Error(
      `Invalid CodeForge config at ${configPath}: architecture must be an object`
    );
  }

  if (
    architecture.autoDetectLayers !== undefined &&
    typeof architecture.autoDetectLayers !== "boolean"
  ) {
    throw new Error(
      `Invalid CodeForge config at ${configPath}: architecture.autoDetectLayers must be a boolean`
    );
  }

  const boundaries = architecture.importBoundaries;
  let importBoundaries: ArchitectureImportBoundary[] | undefined;

  if (boundaries !== undefined) {
    if (!Array.isArray(boundaries)) {
      throw new Error(
        `Invalid CodeForge config at ${configPath}: architecture.importBoundaries must be an array`
      );
    }

    importBoundaries = boundaries.map((boundary) => {
      if (
        !isRecord(boundary) ||
        typeof boundary.from !== "string" ||
        typeof boundary.to !== "string" ||
        boundary.from.trim() === "" ||
        boundary.to.trim() === ""
      ) {
        throw new Error(
          `Invalid CodeForge config at ${configPath}: each architecture.importBoundaries item needs non-empty from and to strings`
        );
      }

      return {
        from: boundary.from.trim(),
        to: boundary.to.trim()
      };
    });
  }

  return {
    source,
    ...(exclude === undefined ? {} : { scan: { exclude } }),
    architecture: {
      autoDetectLayers: architecture.autoDetectLayers as
        | boolean
        | undefined,
      importBoundaries
    }
  };
}
