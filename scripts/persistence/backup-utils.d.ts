export interface BackupManifestInput {
  dumpName: string;
  sizeBytes: number;
  sha256: string;
  database: string;
  schema: string;
  createdAt: string;
}

export interface ParsedBackupArtifact {
  timestamp: Date;
  dumpName: string;
  manifestName: string;
}

export function resolveBackupDirectory(
  configuredPath: string | undefined,
  projectRoot: string,
): string;
export function makeBackupArtifactName(now: Date): string;
export function parseBackupArtifact(filename: string): ParsedBackupArtifact | undefined;
export function selectPrunableBackups(
  entries: string[],
  now: Date,
  retentionDays?: number,
): string[];
export function buildManifest(input: BackupManifestInput): string;
