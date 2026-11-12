
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
  files: string[],
  additionalLayerNames: readonly string[] = []
): DetectedArchitectureLayer[] {
  const layers = new Map<string, string[]>();
  const recognizedLayerNames = new Set([
    ...DEFAULT_FORBIDDEN_BOUNDARIES.flatMap(({ from, to }) => [from, to]),
    ...additionalLayerNames.map((name) => name.toLowerCase())
  ]);

  for (const filePath of files) {
    const normalized = normalizePath(filePath);
    const parts = normalized.split("/").filter(Boolean);
    const srcIndexes = parts.flatMap((part, index) => part === "src" ? [index] : []);
    const layerName = srcIndexes
      .filter((srcIndex) => srcIndex + 1 < parts.length - 1)
      .map((srcIndex) => parts[srcIndex + 1]!.toLowerCase())
      .find((name) => recognizedLayerNames.has(name));
    if (!layerName) continue;

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
