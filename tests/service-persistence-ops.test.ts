import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildManifest,
  makeBackupArtifactName,
  parseBackupArtifact,
  resolveBackupDirectory,
  selectPrunableBackups,
} from "../scripts/persistence/backup-utils.mjs";
import {
  backup,
  runCompose,
  validateBackupDirectory,
  verifyBackupManifest,
} from "../scripts/persistence/db-ops.mjs";

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

describe("persistence command boundaries", () => {
  const now = new Date("2026-09-23T08:09:10.000Z");
  const dumpName = makeBackupArtifactName(now);

  async function withBackupDirectory(test: (directory: string) => Promise<void>) {
    const directory = await mkdtemp(path.join(await realpath(os.tmpdir()), "pgg-backup-test-"));
    try {
      await test(directory);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  async function fakeCompose(args: string[], options?: { stdoutPath?: string }) {
    if (args.some((arg) => arg.includes("pg_isready"))) return "prometheus";
    if (options?.stdoutPath) await writeFile(options.stdoutPath, "new dump");
    return "";
  }

  it("rejects backup directories nested inside a project file", async () => {
    await expect(
      validateBackupDirectory(resolveBackupDirectory("package.json/backups", process.cwd())),
    ).rejects.toThrow(/directory|file/i);
  });

  it("rejects custom backup directories inside the repository", async () => {
    await expect(validateBackupDirectory(path.join(process.cwd(), "archive/db"))).rejects.toThrow(
      /ignored|repository/i,
    );
    await expect(validateBackupDirectory(path.join(process.cwd(), "backups/nested"))).resolves.toBe(
      path.join(process.cwd(), "backups/nested"),
    );
  });

  it("keeps an existing dump and manifest when the timestamp repeats", async () => {
    await withBackupDirectory(async (directory) => {
      const dumpPath = path.join(directory, dumpName);
      const manifestPath = `${dumpPath}.sha256`;
      await writeFile(dumpPath, "original dump");
      await writeFile(manifestPath, "original manifest");

      await expect(
        backup({ backupDirectory: directory, now, composeRunner: fakeCompose }),
      ).rejects.toMatchObject({ code: "EEXIST" });
      expect(await readFile(dumpPath, "utf8")).toBe("original dump");
      expect(await readFile(manifestPath, "utf8")).toBe("original manifest");
      expect(await readdir(directory)).toEqual([dumpName, `${dumpName}.sha256`]);
    });
  });

  it("removes only its own temporary files when dump generation fails", async () => {
    await withBackupDirectory(async (directory) => {
      const unrelatedTemp = path.join(directory, `.${dumpName}.tmp`);
      await writeFile(unrelatedTemp, "another process");
      await expect(
        backup({
          backupDirectory: directory,
          now,
          composeRunner: async (args, options) => {
            if (args.some((arg) => arg.includes("pg_isready"))) return "prometheus";
            if (options?.stdoutPath) await writeFile(options.stdoutPath, "partial dump");
            throw new Error("pg_dump failed");
          },
        }),
      ).rejects.toThrow("pg_dump failed");
      expect(await readFile(unrelatedTemp, "utf8")).toBe("another process");
      expect(await readdir(directory)).toEqual([`.${dumpName}.tmp`]);
    });
  });

  it("preserves a competing manifest and cleans its own staged files", async () => {
    await withBackupDirectory(async (directory) => {
      const dumpPath = path.join(directory, dumpName);
      const manifestPath = `${dumpPath}.sha256`;
      await expect(
        backup({
          backupDirectory: directory,
          now,
          composeRunner: async (args, options) => {
            if (args.some((arg) => arg.includes("pg_isready"))) return "prometheus";
            if (options?.stdoutPath) await writeFile(options.stdoutPath, "new dump");
            await writeFile(manifestPath, "competing manifest", { flag: "wx" });
            return "";
          },
        }),
      ).rejects.toMatchObject({ code: "EEXIST" });
      expect(await readFile(manifestPath, "utf8")).toBe("competing manifest");
      expect(await readdir(directory)).toEqual([`${dumpName}.sha256`]);
    });
  });

  it("includes both Task 1 utility files in the format check", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    expect(packageJson.scripts["format:check"]).toContain("scripts/persistence/backup-utils.mjs");
    expect(packageJson.scripts["format:check"]).toContain("scripts/persistence/backup-utils.d.ts");
  });

  it("preserves files outside the fixed artifact pattern during pruning", () => {
    expect(
      selectPrunableBackups(
        ["pgg-postgres-20260901-010203.dump", "pgg-postgres-20260901-010203.dump.bak", "notes.txt"],
        new Date("2026-09-23T12:00:00+08:00"),
      ),
    ).toEqual(["pgg-postgres-20260901-010203.dump"]);
  });

  it("rejects a manifest whose checksum differs from the dump", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "pgg-backup-test-"));
    const dumpName = "pgg-postgres-20260923-080910.dump";
    const dumpPath = path.join(directory, dumpName);
    const manifestPath = `${dumpPath}.sha256`;
    try {
      await writeFile(dumpPath, "dump bytes");
      await writeFile(
        manifestPath,
        buildManifest({
          dumpName,
          sizeBytes: 10,
          sha256: createHash("sha256").update("different!").digest("hex"),
          database: "prometheus",
          schema: "public",
          createdAt: "2026-09-23T08:09:10.000Z",
        }),
      );
      await expect(verifyBackupManifest(dumpPath, manifestPath)).rejects.toThrow(/checksum/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("passes Compose project and file options to the injected runner", async () => {
    const invocations: Array<{ command: string; args: string[] }> = [];
    await runCompose(["ps", "--status", "running"], {
      composeProject: "pgg-test",
      composeFile: "docker-compose.test.yml",
      runner: async (command: string, args: string[]) => {
        invocations.push({ command, args });
      },
    });
    expect(invocations).toEqual([
      {
        command: "docker",
        args: [
          "compose",
          "-f",
          "docker-compose.test.yml",
          "-p",
          "pgg-test",
          "ps",
          "--status",
          "running",
        ],
      },
    ]);
  });
});
