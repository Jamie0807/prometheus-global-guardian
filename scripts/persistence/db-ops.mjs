import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildManifest,
  makeBackupArtifactName,
  resolveBackupDirectory,
  selectPrunableBackups,
} from "./backup-utils.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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

async function defaultRunner(command, args, { stdoutPath } = {}) {
  const output = stdoutPath ? await fs.open(stdoutPath, "wx", 0o600) : undefined;
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ["ignore", output?.fd ?? "pipe", "pipe"],
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

export async function runCompose(args, options = {}) {
  const composeFile = options.composeFile ?? process.env.COMPOSE_FILE;
  const composeProject = options.composeProject ?? process.env.PERSISTENCE_COMPOSE_PROJECT;
  const command = ["compose"];
  if (composeFile) command.push("-f", composeFile);
  if (composeProject) command.push("-p", composeProject);
  command.push(...args);
  return (options.runner ?? defaultRunner)("docker", command, {
    stdoutPath: options.stdoutPath,
  });
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
    else throw new Error("unsupported database operation");
  } catch (error) {
    console.error(`Database operation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
