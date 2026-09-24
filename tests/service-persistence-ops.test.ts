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
  checkDatabase,
  defaultRunner,
  restoreVerify,
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

describe("persistence health and restore rehearsal", () => {
  const dumpName = "pgg-postgres-20260923-080910.dump";

  it("passes an ephemeral secret to the spawned process without adding it to argv", async () => {
    const secret = "temporary-test-secret";
    const result = await defaultRunner(
      process.execPath,
      [
        "-e",
        "process.stdout.write(JSON.stringify({argv:process.argv.slice(1),secret:process.env.PGG_TEST_SECRET}))",
        "safe",
      ],
      { env: { PGG_TEST_SECRET: secret } },
    );
    expect(JSON.parse(result)).toEqual({ argv: ["safe"], secret });
  });

  async function withVerifiedDump(test: (dumpPath: string) => Promise<void>) {
    const directory = await mkdtemp(path.join(await realpath(os.tmpdir()), "pgg-restore-test-"));
    const dumpPath = path.join(directory, dumpName);
    const bytes = "test dump bytes";
    try {
      await writeFile(dumpPath, bytes);
      await writeFile(
        `${dumpPath}.sha256`,
        buildManifest({
          dumpName,
          sizeBytes: Buffer.byteLength(bytes),
          sha256: createHash("sha256").update(bytes).digest("hex"),
          database: "prometheus",
          schema: "public",
          createdAt: "2026-09-23T08:09:10.000Z",
        }),
      );
      await test(dumpPath);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  it("fails health checks when a required table is missing", async () => {
    const calls: string[][] = [];
    await expect(
      checkDatabase({
        composeRunner: async (args: string[]) => {
          calls.push(args);
          if (args.includes("run")) return "Database schema is up to date";
          if (args.some((arg) => arg.includes("'ai_messages'"))) return "f\n";
          return "t\n";
        },
      }),
    ).rejects.toThrow(/ai_messages/);
    expect(calls.some((args) => args.includes("run") && args.includes("web"))).toBe(true);
  });

  it("rejects a same-named view in place of a required ordinary table", async () => {
    await expect(
      checkDatabase({
        composeRunner: async (args: string[]) => {
          if (args.includes("run")) return "Database schema is up to date";
          if (args.some((arg) => arg.includes("relkind") && arg.includes("'users'"))) return "f\n";
          return "t\n";
        },
      }),
    ).rejects.toThrow(/users/);
  });

  it("fails health checks for unavailable database, absent migration history, or pending migrations", async () => {
    for (const failure of ["connection", "history", "pending"] as const) {
      await expect(
        checkDatabase({
          composeRunner: async (args: string[]) => {
            if (failure === "connection" && args.includes("exec")) throw new Error("unavailable");
            if (failure === "history" && args.some((arg) => arg.includes("_prisma_migrations")))
              return "f\n";
            if (args.includes("run"))
              return failure === "pending"
                ? "1 migration pending"
                : "Database schema is up to date";
            return "t\n";
          },
        }),
      ).rejects.toThrow();
    }
  });

  it("rejects a bad checksum before any Docker command", async () => {
    await withVerifiedDump(async (dumpPath) => {
      await writeFile(dumpPath, "corrupt dump");
      const calls: string[][] = [];
      await expect(
        restoreVerify({
          dumpPath,
          backupDirectory: path.dirname(dumpPath),
          dockerRunner: async (args: string[]) => {
            calls.push(args);
            return "";
          },
        }),
      ).rejects.toThrow(/checksum|size/i);
      expect(calls).toEqual([]);
    });
  });

  it("rejects an empty dump with a matching manifest before Docker", async () => {
    const directory = await mkdtemp(
      path.join(await realpath(os.tmpdir()), "pgg-empty-restore-test-"),
    );
    const dumpPath = path.join(directory, dumpName);
    const calls: string[][] = [];
    try {
      await writeFile(dumpPath, "");
      await writeFile(
        `${dumpPath}.sha256`,
        buildManifest({
          dumpName,
          sizeBytes: 0,
          sha256: createHash("sha256").update("").digest("hex"),
          database: "prometheus",
          schema: "public",
          createdAt: "2026-09-23T08:09:10.000Z",
        }),
      );
      await expect(
        restoreVerify({
          dumpPath,
          backupDirectory: directory,
          dockerRunner: async (args: string[]) => {
            calls.push(args);
            return "";
          },
        }),
      ).rejects.toThrow(/empty/i);
      expect(calls).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects a relative path that escapes the backup directory before Docker", async () => {
    await withVerifiedDump(async (dumpPath) => {
      const calls: string[][] = [];
      await expect(
        restoreVerify({
          dumpPath: `../${dumpName}`,
          backupDirectory: path.join(path.dirname(dumpPath), "backups"),
          dockerRunner: async (args: string[]) => {
            calls.push(args);
            return "";
          },
        }),
      ).rejects.toThrow(/backup directory/i);
      expect(calls).toEqual([]);
    });
  });

  it("rejects an absolute path outside the backup directory before Docker", async () => {
    await withVerifiedDump(async (dumpPath) => {
      const calls: string[][] = [];
      await expect(
        restoreVerify({
          dumpPath,
          backupDirectory: path.join(path.dirname(dumpPath), "backups"),
          dockerRunner: async (args: string[]) => {
            calls.push(args);
            return "";
          },
        }),
      ).rejects.toThrow(/backup directory/i);
      expect(calls).toEqual([]);
    });
  });

  it("rejects a custom dump filename before Docker", async () => {
    const directory = await mkdtemp(
      path.join(await realpath(os.tmpdir()), "pgg-custom-restore-test-"),
    );
    const customName = "manual.dump";
    const dumpPath = path.join(directory, customName);
    const bytes = "test dump bytes";
    const calls: string[][] = [];
    try {
      await writeFile(dumpPath, bytes);
      await writeFile(
        `${dumpPath}.sha256`,
        buildManifest({
          dumpName: customName,
          sizeBytes: Buffer.byteLength(bytes),
          sha256: createHash("sha256").update(bytes).digest("hex"),
          database: "prometheus",
          schema: "public",
          createdAt: "2026-09-23T08:09:10.000Z",
        }),
      );
      await expect(
        restoreVerify({
          dumpPath: customName,
          backupDirectory: directory,
          dockerRunner: async (args: string[]) => {
            calls.push(args);
            return "";
          },
        }),
      ).rejects.toThrow(/filename|name|pattern/i);
      expect(calls).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("restores only to a temporary container and volume, then cleans both", async () => {
    await withVerifiedDump(async (dumpPath) => {
      const calls: string[][] = [];
      const dockerRunner = async (args: string[]) => {
        calls.push(args);
        if (args[0] === "compose" && args.includes("config"))
          return JSON.stringify({ name: "pgg-test" });
        if (args[0] === "compose" && args.includes("run")) return "Database schema is up to date";
        if (args[0] === "exec" && args.some((arg) => arg.includes("pg_isready"))) return "";
        if (args[0] === "exec" && args.includes("psql")) return "t\n";
        return "";
      };
      await restoreVerify({
        dumpPath: dumpName,
        backupDirectory: path.dirname(dumpPath),
        dockerRunner,
      });
      const create = calls.find(
        (args) => args[0] === "create" && args.includes("postgres:16-alpine"),
      );
      expect(create).toBeDefined();
      const name = create?.[create.indexOf("--name") + 1];
      const volume = calls.find((args) => args[0] === "volume" && args[1] === "create")?.at(-1);
      expect(name).toMatch(/^pgg-restore-/);
      expect(name).not.toBe("prometheus-global-guardian-db-1");
      expect(create).toContain("pgg-test_default");
      expect(create).toContain("POSTGRES_PASSWORD");
      expect(create?.some((arg) => arg.startsWith("POSTGRES_PASSWORD="))).toBe(false);
      const migrate = calls.find((args) => args[0] === "compose" && args.includes("run"));
      expect(migrate).toContain("DATABASE_URL");
      expect(migrate?.some((arg) => arg.startsWith("DATABASE_URL="))).toBe(false);
      expect(
        calls.some((args) => args[0] === "cp" && args.includes(`${name}:/tmp/restore.dump`)),
      ).toBe(true);
      expect(calls.find((args) => args[0] === "cp")?.[1]).toBe(dumpPath);
      expect(
        calls.some(
          (args) =>
            args.includes("pg_restore") && args.includes("--no-owner") && args.includes("--no-acl"),
        ),
      ).toBe(true);
      expect(calls.some((args) => args[0] === "rm" && args.includes(name!))).toBe(true);
      expect(
        calls.some((args) => args[0] === "volume" && args[1] === "rm" && args.includes(volume!)),
      ).toBe(true);
      expect(calls.flat().join(" ")).not.toMatch(/\b(dropdb|DROP|TRUNCATE|--clean)\b/);
    });
  });

  it("propagates cleanup failure", async () => {
    await withVerifiedDump(async (dumpPath) => {
      let containerName = "";
      let volumeName = "";
      let failure: unknown;
      try {
        await restoreVerify({
          dumpPath,
          backupDirectory: path.dirname(dumpPath),
          dockerRunner: async (args: string[]) => {
            if (args[0] === "compose" && args.includes("config"))
              return JSON.stringify({ name: "pgg-test" });
            if (args[0] === "create") containerName = args[args.indexOf("--name") + 1];
            if (args[0] === "volume" && args[1] === "create") volumeName = args.at(-1)!;
            if (args[0] === "rm") throw new Error("container cleanup failed");
            if (args[0] === "compose" && args.includes("run"))
              return "Database schema is up to date";
            return "t\n";
          },
        });
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(AggregateError);
      expect((failure as Error).message).toContain(containerName);
      expect((failure as Error).message).toContain(volumeName);
    });
  });

  it("uses the configured Compose project for both restore Compose commands", async () => {
    await withVerifiedDump(async (dumpPath) => {
      const oldProject = process.env.PERSISTENCE_COMPOSE_PROJECT;
      const oldFile = process.env.COMPOSE_FILE;
      process.env.PERSISTENCE_COMPOSE_PROJECT = "pgg-custom";
      process.env.COMPOSE_FILE = "docker-compose.yml:docker-compose.test.yml";
      const calls: string[][] = [];
      try {
        await restoreVerify({
          dumpPath,
          backupDirectory: path.dirname(dumpPath),
          dockerRunner: async (args: string[]) => {
            calls.push(args);
            if (args.includes("config")) return JSON.stringify({ name: "pgg-custom" });
            if (args.includes("run")) return "Database schema is up to date";
            if (args.includes("psql")) return "t\n";
            return "";
          },
        });
      } finally {
        if (oldProject === undefined) delete process.env.PERSISTENCE_COMPOSE_PROJECT;
        else process.env.PERSISTENCE_COMPOSE_PROJECT = oldProject;
        if (oldFile === undefined) delete process.env.COMPOSE_FILE;
        else process.env.COMPOSE_FILE = oldFile;
      }
      for (const args of calls.filter((args) => args.includes("config") || args.includes("run"))) {
        expect(args.slice(0, 3)).toEqual(["compose", "-p", "pgg-custom"]);
        expect(args).not.toContain("-f");
        expect(args.some((arg) => arg.startsWith("DATABASE_URL="))).toBe(false);
      }
    });
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

  it("lets Docker parse COMPOSE_FILE while passing the persistence project", async () => {
    const oldProject = process.env.PERSISTENCE_COMPOSE_PROJECT;
    const oldFile = process.env.COMPOSE_FILE;
    process.env.PERSISTENCE_COMPOSE_PROJECT = "pgg-custom";
    process.env.COMPOSE_FILE = "docker-compose.yml:docker-compose.test.yml";
    const invocations: string[][] = [];
    try {
      await runCompose(["ps", "db"], {
        runner: async (_command: string, args: string[]) => {
          invocations.push(args);
        },
      });
    } finally {
      if (oldProject === undefined) delete process.env.PERSISTENCE_COMPOSE_PROJECT;
      else process.env.PERSISTENCE_COMPOSE_PROJECT = oldProject;
      if (oldFile === undefined) delete process.env.COMPOSE_FILE;
      else process.env.COMPOSE_FILE = oldFile;
    }
    expect(invocations).toEqual([["compose", "-p", "pgg-custom", "ps", "db"]]);
  });
});
