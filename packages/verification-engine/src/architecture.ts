
export type DetectedArchitectureLayer = {
  name: string;
  files: string[];
};

export type DetectedArchitectureBoundary = {
  from: string;
  to: string;
};

const normalizePath = (value: string): string =>
  value
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/");

const DEFAULT_FORBIDDEN_BOUNDARIES: DetectedArchitectureBoundary[] = [
  { from: "ui", to: "database" },
  { from: "ui", to: "infrastructure" },
  { from: "presentation", to: "database" },
  { from: "presentation", to: "infrastructure" },
  { from: "database", to: "ui" },
  { from: "database", to: "presentation" },
  { from: "infrastructure", to: "ui" },
  { from: "infrastructure", to: "presentation" }
];

export function detectArchitectureLayers(
  files: string[]
): DetectedArchitectureLayer[] {
  const layers = new Map<string, string[]>();

  for (const filePath of files) {
    const normalized = normalizePath(filePath);
    const parts = normalized.split("/").filter(Boolean);
    const srcIndex = parts.indexOf("src");

    // Detect the first directory beneath src/.
    // Ignore files directly inside src/.
    if (srcIndex === -1 || srcIndex + 1 >= parts.length - 1) {
      continue;
    }

    const layerName = parts[srcIndex + 1].toLowerCase();
    const existingFiles = layers.get(layerName) ?? [];

    existingFiles.push(normalized);
    layers.set(layerName, existingFiles);
  }

  return Array.from(layers.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, layerFiles]) => ({
      name,
      files: layerFiles.sort()
    }));
}

export function detectDefaultArchitectureBoundaries(
  layers: DetectedArchitectureLayer[]
): DetectedArchitectureBoundary[] {
  const detectedLayerNames = new Set(
    layers.map((layer) => layer.name.toLowerCase())
  );

  return DEFAULT_FORBIDDEN_BOUNDARIES.filter(
    (boundary) =>
      detectedLayerNames.has(boundary.from) &&
      detectedLayerNames.has(boundary.to)
  ).map((boundary) => ({ ...boundary }));
}
