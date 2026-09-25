import path from "node:path";

const BACKUP_NAME_PATTERN = /^pgg-postgres-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.dump$/;

export function resolveBackupDirectory(configuredPath, projectRoot) {
  return path.resolve(projectRoot, configuredPath ?? "backups");
}

export function makeBackupArtifactName(now) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError("now must be a valid Date");
  }

  const timestamp = now.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  return `pgg-postgres-${timestamp}.dump`;
}

export function parseBackupArtifact(filename) {
  const dumpName = filename.endsWith(".sha256") ? filename.slice(0, -7) : filename;
  const match = BACKUP_NAME_PATTERN.exec(dumpName);
  if (!match) return undefined;

  const [, year, month, day, hour, minute, second] = match;
  const timestamp = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ),
  );

  if (
    timestamp.getUTCFullYear() !== Number(year) ||
    timestamp.getUTCMonth() !== Number(month) - 1 ||
    timestamp.getUTCDate() !== Number(day) ||
    timestamp.getUTCHours() !== Number(hour) ||
    timestamp.getUTCMinutes() !== Number(minute) ||
    timestamp.getUTCSeconds() !== Number(second)
  ) {
    return undefined;
  }

  return { timestamp, dumpName, manifestName: `${dumpName}.sha256` };
}

export function selectPrunableBackups(entries, now, retentionDays = 7) {
  if (!Number.isInteger(retentionDays) || retentionDays < 0) {
    throw new TypeError("retentionDays must be a non-negative integer");
  }

  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - retentionDays + 1);
  const cutoffDate = [cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate()];

  return entries.filter((entry) => {
    const artifact = parseBackupArtifact(entry);
    if (!artifact) return false;

    const created = artifact.timestamp;
    const artifactDate = [created.getFullYear(), created.getMonth(), created.getDate()];
    return (
      artifactDate[0] < cutoffDate[0] ||
      (artifactDate[0] === cutoffDate[0] && artifactDate[1] < cutoffDate[1]) ||
      (artifactDate[0] === cutoffDate[0] &&
        artifactDate[1] === cutoffDate[1] &&
        artifactDate[2] < cutoffDate[2])
    );
  });
}

export function buildManifest({ dumpName, sizeBytes, sha256, database, schema, createdAt }) {
  if (!Number.isInteger(sizeBytes) || sizeBytes < 0) {
    throw new TypeError("sizeBytes must be a non-negative integer");
  }
  if (typeof sha256 !== "string" || !/^[a-f\d]{64}$/i.test(sha256)) {
    throw new TypeError("sha256 must be a 64-character hexadecimal value");
  }

  return JSON.stringify({
    version: 1,
    dumpName,
    sizeBytes,
    sha256,
    database,
    schema,
    createdAt,
  });
}
