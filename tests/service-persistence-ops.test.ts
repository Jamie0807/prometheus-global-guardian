import { describe, expect, it } from "vitest";

import {
  buildManifest,
  makeBackupArtifactName,
  parseBackupArtifact,
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
      "pgg-postgres-20260916-235959.dump",
      "pgg-postgres-20260915-010000.dump",
      "pgg-postgres-20260915-010000.dump.sha256",
      "notes.txt",
    ];
    expect(selectPrunableBackups(entries, new Date("2026-09-23T12:00:00+08:00"))).toEqual([
      "pgg-postgres-20260915-010000.dump",
      "pgg-postgres-20260915-010000.dump.sha256",
    ]);
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
});
