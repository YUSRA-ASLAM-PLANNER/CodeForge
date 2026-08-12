export type RepositoryFile = {
  path: string;
  extension: string;
  sizeBytes: number;
};

export type RepositorySnapshot = {
  rootPath: string;
  files: RepositoryFile[];
  fileCount: number;
  totalBytes: number;
};
