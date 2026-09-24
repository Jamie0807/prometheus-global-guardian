import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildManifest,
  makeBackupArtifactName,
  parseBackupArtifact,
  resolveBackupDirectory,
  selectPrunableBackups,
} from "./backup-utils.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const requiredTables = [
  "users",
  "auth_sessions",
  "ai_conversations",
  "ai_messages",
  "ai_memory_items",
  "ai_memory_suggestions",
];

export async function validateBackupDirectory(directory) {
  const absolute = path.resolve(directory);
  let current = absolute;
  while (true) {
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) throw new Error("backup directory cannot contain a symlink");
      if (!stat.isDirectory()) throw new Error("backup directory resolves inside a file");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  const relative = path.relative(projectRoot, absolute);
  const insideProject =
    relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  if (insideProject && relative !== "backups" && !relative.startsWith(`backups${path.sep}`)) {
    throw new Error("backup directory inside repository must be under ignored backups/");
  }
  return absolute;
}

export async function defaultRunner(command, args, { stdoutPath, env } = {}) {
  const output = stdoutPath ? await fs.open(stdoutPath, "wx", 0o600) : undefined;
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ["ignore", output?.fd ?? "pipe", "pipe"],
        env: env ? { ...process.env, ...env } : process.env,
      });
      const chunks = [];
      if (!output) child.stdout.on("data", (chunk) => chunks.push(chunk));
      child.stderr.resume();
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve(Buffer.concat(chunks).toString("utf8"));
        else reject(new Error("Docker Compose command failed"));
      });
    });
  } finally {
    await output?.close();
  }
}

function composeCommand(args, options = {}) {
  const composeFile = options.composeFile;
  const composeProject = options.composeProject ?? process.env.PERSISTENCE_COMPOSE_PROJECT;
  const command = ["compose"];
  if (composeFile) command.push("-f", composeFile);
  if (composeProject) command.push("-p", composeProject);
  command.push(...args);
  return command;
}

export async function runCompose(args, options = {}) {
  return (options.runner ?? defaultRunner)("docker", composeCommand(args, options), {
    stdoutPath: options.stdoutPath,
  });
}

async function runDocker(args, options = {}, runner = defaultRunner) {
  return runner("docker", args, options);
}

async function checkSchema(query, { composeRunner, dockerRunner, containerName } = {}) {
  const failures = [];
  const runQuery = containerName
    ? (sql) =>
        dockerRunner([
          "exec",
          containerName,
          "psql",
          "-X",
          "-At",
          "-v",
          "ON_ERROR_STOP=1",
          "-U",
          "pgg_restore",
          "-d",
          "pgg_restore",
          "-c",
          sql,
        ])
    : (sql) =>
        composeRunner([
          "exec",
          "-T",
          "db",
          "sh",
          "-ec",
          `psql -X -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "${sql}"`,
        ]);

  for (const [label, sql] of [
    ["connection", "SELECT true"],
    ["public schema", "SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public')"],
    ...[...requiredTables, "_prisma_migrations"].map((table) => [
      table,
      `SELECT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = '${table}' AND c.relkind = 'r')`,
    ]),
    [
      "migration history",
      "SELECT EXISTS (SELECT 1 FROM public._prisma_migrations WHERE finished_at IS NOT NULL)",
    ],
  ]) {
    try {
      if ((await runQuery(sql)).trim() !== "t") failures.push(label);
    } catch {
      failures.push(label);
    }
  }
  try {
    const status = await (containerName
      ? dockerRunner(
          composeCommand([
            "run",
            "--rm",
            "--no-deps",
            "-e",
            "DATABASE_URL",
            "web",
            "pnpm",
            "exec",
            "prisma",
            "migrate",
            "status",
          ]),
          { env: { DATABASE_URL: query } },
        )
      : composeRunner([
          "run",
          "--rm",
          "--no-deps",
          "web",
          "pnpm",
          "exec",
          "prisma",
          "migrate",
          "status",
        ]));
    if (!status.includes("Database schema is up to date")) failures.push("Prisma migration status");
  } catch {
    failures.push("Prisma migration status");
  }
  if (failures.length) throw new Error(`Database check failed: ${failures.join(", ")}`);
  console.log(`Verified public schema, ${requiredTables.join(", ")}, and Prisma migrations`);
}

export async function checkDatabase({ composeRunner = runCompose } = {}) {
  await checkSchema(undefined, { composeRunner });
}

async function selectBackup(backupDirectory) {
  const directory = await validateBackupDirectory(backupDirectory);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const artifacts = entries
    .filter((entry) => entry.isFile() && parseBackupArtifact(entry.name)?.dumpName === entry.name)
    .map((entry) => entry.name)
    .sort()
    .reverse();
  for (const name of artifacts) {
    const candidate = path.join(directory, name);
    try {
      await verifyBackupManifest(candidate);
      return candidate;
    } catch {
      // A newer incomplete or corrupt artifact does not hide an older verified one.
    }
  }
  throw new Error("no verified backup artifact found");
}

export async function restoreVerify({
  dumpPath,
  backupDirectory = resolveBackupDirectory(process.env.PERSISTENCE_BACKUP_DIR, projectRoot),
  dockerRunner = (args, options) => runDocker(args, options),
} = {}) {
  const verifiedDump = dumpPath ?? (await selectBackup(backupDirectory));
  await verifyBackupManifest(verifiedDump);

  const suffix = randomBytes(12).toString("hex");
  const containerName = `pgg-restore-${suffix}`;
  const volumeName = `pgg-restore-${suffix}-data`;
  const password = randomBytes(24).toString("hex");
  const databaseUrl = `postgresql://pgg_restore:${password}@${containerName}:5432/pgg_restore?schema=public`;
  let volumeCreated = false;
  let containerCreated = false;
  let operationError;
  try {
    const config = JSON.parse(await dockerRunner(composeCommand(["config", "--format", "json"])));
    if (typeof config.name !== "string" || !/^[a-z0-9][a-z0-9_-]*$/.test(config.name)) {
      throw new Error("invalid Compose project name");
    }
    await dockerRunner(["volume", "create", volumeName]);
    volumeCreated = true;
    await dockerRunner(
      [
        "create",
        "--name",
        containerName,
        "--network",
        `${config.name}_default`,
        "-v",
        `${volumeName}:/var/lib/postgresql/data`,
        "-e",
        "POSTGRES_DB=pgg_restore",
        "-e",
        "POSTGRES_USER=pgg_restore",
        "-e",
        "POSTGRES_PASSWORD",
        "postgres:16-alpine",
      ],
      { env: { POSTGRES_PASSWORD: password } },
    );
    containerCreated = true;
    await dockerRunner(["start", containerName]);
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        await dockerRunner([
          "exec",
          containerName,
          "pg_isready",
          "-U",
          "pgg_restore",
          "-d",
          "pgg_restore",
        ]);
        ready = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    if (!ready) throw new Error("temporary PostgreSQL did not become ready");
    await dockerRunner(["cp", verifiedDump, `${containerName}:/tmp/restore.dump`]);
    await dockerRunner([
      "exec",
      containerName,
      "pg_restore",
      "--no-owner",
      "--no-acl",
      "-U",
      "pgg_restore",
      "-d",
      "pgg_restore",
      "/tmp/restore.dump",
    ]);
    await checkSchema(databaseUrl, { dockerRunner, containerName });
  } catch (error) {
    operationError = error;
  } finally {
    const cleanupErrors = [];
    if (containerCreated) {
      try {
        await dockerRunner(["rm", "-f", containerName]);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (volumeCreated) {
      try {
        await dockerRunner(["volume", "rm", volumeName]);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (cleanupErrors.length) {
      throw new AggregateError(
        [operationError, ...cleanupErrors].filter(Boolean),
        `restore cleanup failed for container ${containerName} and volume ${volumeName}`,
      );
    }
  }
  if (operationError) throw operationError;
  console.log("Restore rehearsal completed; temporary container and volume removed");
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  const file = await fs.open(filePath, "r");
  try {
    for await (const chunk of file.createReadStream()) hash.update(chunk);
  } finally {
    await file.close();
  }
  return hash.digest("hex");
}

export async function verifyBackupManifest(dumpPath, manifestPath = `${dumpPath}.sha256`) {
  const dumpStat = await fs.lstat(dumpPath);
  const manifestStat = await fs.lstat(manifestPath);
  if (!dumpStat.isFile() || !manifestStat.isFile()) {
    throw new Error("backup artifact must be a regular file");
  }
  if (dumpStat.size === 0) throw new Error("backup is empty");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (manifest.dumpName !== path.basename(dumpPath) || manifest.sizeBytes !== dumpStat.size) {
    throw new Error("backup manifest size or name mismatch");
  }
  const actual = await sha256File(dumpPath);
  if (manifest.sha256 !== actual) throw new Error("backup checksum mismatch");
  return manifest;
}

async function ensureDatabaseReady(composeRunner) {
  return (
    await composeRunner([
      "exec",
      "-T",
      "db",
      "sh",
      "-ec",
      'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null; printf "%s" "$POSTGRES_DB"',
    ])
  ).trim();
}

export async function backup({
  backupDirectory = resolveBackupDirectory(process.env.PERSISTENCE_BACKUP_DIR, projectRoot),
  now = new Date(),
  composeRunner = runCompose,
} = {}) {
  const backupDir = await validateBackupDirectory(backupDirectory);
  const artifactName = makeBackupArtifactName(now);
  const dumpPath = path.join(backupDir, artifactName);
  const manifestPath = `${dumpPath}.sha256`;
  let temporaryDirectory;
  let publishedDump = false;
  try {
    const database = await ensureDatabaseReady(composeRunner);
    await fs.mkdir(backupDir, { recursive: true, mode: 0o700 });
    temporaryDirectory = await fs.mkdtemp(path.join(backupDir, `.${artifactName}-`));
    const tempPath = path.join(temporaryDirectory, artifactName);
    const temporaryManifest = path.join(temporaryDirectory, `${artifactName}.sha256`);
    const pgDumpCommand =
      'exec pg_dump --format=custom --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"';
    await composeRunner(["exec", "-T", "db", "sh", "-ec", pgDumpCommand], {
      stdoutPath: tempPath,
    });
    const stat = await fs.stat(tempPath);
    if (stat.size === 0) throw new Error("backup is empty");
    const sha256 = await sha256File(tempPath);
    await fs.writeFile(
      temporaryManifest,
      buildManifest({
        dumpName: artifactName,
        sizeBytes: stat.size,
        sha256,
        database,
        schema: "public",
        createdAt: now.toISOString(),
      }),
      { flag: "wx", mode: 0o600 },
    );
    // link fails with EEXIST and never replaces an existing artifact.
    await fs.link(tempPath, dumpPath);
    publishedDump = true;
    await fs.link(temporaryManifest, manifestPath);
    publishedDump = false;
    console.log(`Created ${artifactName} and checksum manifest`);
  } catch (error) {
    if (publishedDump) await fs.unlink(dumpPath);
    throw error;
  } finally {
    if (temporaryDirectory) await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function prune() {
  const backupDir = await validateBackupDirectory(
    resolveBackupDirectory(process.env.PERSISTENCE_BACKUP_DIR, projectRoot),
  );
  let entries;
  try {
    entries = await fs.readdir(backupDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("Backup directory is absent; removed 0 files");
      return;
    }
    throw error;
  }
  const regularNames = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const selected = selectPrunableBackups(regularNames, new Date());
  for (const name of selected) {
    const filePath = path.join(backupDir, name);
    if ((await fs.lstat(filePath)).isFile()) await fs.unlink(filePath);
  }
  console.log(`Removed ${selected.length} of ${regularNames.length} regular files`);
}

async function main() {
  try {
    if (process.argv[2] === "backup") await backup();
    else if (process.argv[2] === "prune") await prune();
    else if (process.argv[2] === "check") await checkDatabase();
    else if (process.argv[2] === "restore-verify")
      await restoreVerify({ dumpPath: process.argv[3] });
    else throw new Error("unsupported database operation");
  } catch (error) {
    console.error(`Database operation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
