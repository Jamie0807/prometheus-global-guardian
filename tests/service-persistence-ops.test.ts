import { describe, expect, it } from "vitest";

import {
  buildManifest,
  makeBackupArtifactName,
  parseBackupArtifact,
  resolveBackupDirectory,
  selectPrunableBackups,
} from "../scripts/persistence/backup-utils.mjs";

describe("persistence backup artifacts", () => {
  it("creates and parses a deterministic timestamped filename", () => {
    const name = makeBackupArtifactName(new Date("2026-09-23T08:09:10.000Z"));
    expect(name).toBe("pgg-postgres-20260923-080910.dump");
    expect(parseBackupArtifact(name)?.dumpName).toBe(name);
  });

  it("prunes only matching artifacts older than seven local calendar days", () => {
    const entries = [
      "pgg-postgres-20260923-010000.dump",
      "pgg-postgres-20260917-235959.dump",
      "pgg-postgres-20260916-150000.dump",
      "pgg-postgres-20260916-235959.dump",
      "pgg-postgres-20260915-010000.dump",
      "pgg-postgres-20260915-010000.dump.sha256",
      "notes.txt",
    ];
    const prunable = selectPrunableBackups(entries, new Date("2026-09-23T12:00:00+08:00"));
    expect(prunable).toEqual([
      "pgg-postgres-20260916-150000.dump",
      "pgg-postgres-20260915-010000.dump",
      "pgg-postgres-20260915-010000.dump.sha256",
    ]);
    expect(prunable).not.toContain("pgg-postgres-20260916-235959.dump");
    expect(prunable).not.toContain("pgg-postgres-20260917-235959.dump");
  });

  it("resolves the default and configured backup directories", () => {
    expect(resolveBackupDirectory(undefined, "/srv/prometheus")).toBe("/srv/prometheus/backups");
    expect(resolveBackupDirectory("archive/db", "/srv/prometheus")).toBe(
      "/srv/prometheus/archive/db",
    );
    expect(resolveBackupDirectory("/var/backups/pgg", "/srv/prometheus")).toBe("/var/backups/pgg");
  });

  it("manifest contains only operational metadata", () => {
    const manifest = JSON.parse(
      buildManifest({
        dumpName: "pgg-postgres-20260923-080910.dump",
        sizeBytes: 12,
        sha256: "a".repeat(64),
        database: "prometheus",
        schema: "public",
        createdAt: "2026-09-23T08:09:10.000Z",
      }),
    );
    expect(manifest).toEqual({
      version: 1,
      dumpName: "pgg-postgres-20260923-080910.dump",
      sizeBytes: 12,
      sha256: "a".repeat(64),
      database: "prometheus",
      schema: "public",
      createdAt: "2026-09-23T08:09:10.000Z",
    });
    expect(JSON.stringify(manifest)).not.toMatch(/password|DATABASE_URL|token/i);
  });

  it("rejects negative sizes and malformed SHA-256 values", () => {
    const base = {
      dumpName: "pgg-postgres-20260923-080910.dump",
      sizeBytes: 12,
      sha256: "a".repeat(64),
      database: "prometheus",
      schema: "public",
      createdAt: "2026-09-23T08:09:10.000Z",
    };

    expect(() => buildManifest({ ...base, sizeBytes: -1 })).toThrow(TypeError);
    expect(() => buildManifest({ ...base, sha256: "not-a-hash" })).toThrow(TypeError);
  });
});
