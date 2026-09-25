import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const packageNames = [
  ["packages/contracts/package.json", "@pgg/contracts"],
  ["packages/hazard-domain/package.json", "@pgg/hazard-domain"],
  ["packages/logging/package.json", "@pgg/logging"],
];
const ignoredDirectories = new Set([
  ".git",
  ".venv",
  "__pycache__",
  "dist",
  "dist-server",
  "node_modules",
]);
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const runtimeDirectories = ["src", "server", "apps", "services"];
const runtimeEntryFiles = ["server.ts", "server.js"];
const serverRuntimeDirectories = ["server", "apps/bff", "services/analytics", "prisma"];
const serverRuntimeEntryFiles = [...runtimeEntryFiles, "prisma.config.ts", "prisma.config.js"];

function listSourceFiles(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(entryPath));
    else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name)))
      files.push(entryPath);
  }
  return files;
}

function readImportSpecifiers(source, filePath) {
  const specifiers = new Set();
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (moduleSpecifier && ts.isStringLiteralLike(moduleSpecifier)) {
        specifiers.add(moduleSpecifier.text);
      }
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      specifiers.add(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function isRuntimeUnit(candidate, root) {
  if (runtimeDirectories.some((directory) => isInside(candidate, path.join(root, directory)))) {
    return true;
  }
  return runtimeEntryFiles.some((file) => candidate === path.join(root, file));
}

function isInside(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

export function checkArchitecture(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const errors = [];

  for (const [relativePath, expectedName] of packageNames) {
    const manifestPath = path.join(root, relativePath);
    const rule =
      expectedName === "@pgg/contracts"
        ? "contracts package"
        : expectedName === "@pgg/logging"
          ? "logging package"
          : "hazard domain package";
    if (!existsSync(manifestPath)) {
      errors.push(`${rule} metadata is missing: ${relativePath}`);
      continue;
    }

    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      errors.push(`${rule} metadata is invalid: ${relativePath}`);
      continue;
    }
    if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
      errors.push(`${rule} metadata is invalid: ${relativePath}`);
      continue;
    }
    if (manifest.name !== expectedName) {
      errors.push(`shared package name is invalid: ${relativePath} (expected ${expectedName})`);
    }
  }

  const hazardEntry = "packages/hazard-domain/src/index.ts";
  if (!existsSync(path.join(root, hazardEntry))) {
    errors.push(`hazard domain package entry is missing: ${hazardEntry}`);
  }

  if (existsSync(path.join(root, "contracts"))) {
    errors.push("root contracts directory must be removed after migration: contracts");
  }

  if (existsSync(path.join(root, "src"))) {
    errors.push("root src directory must be removed after web migration: src");
  }

  if (!existsSync(path.join(root, "apps/bff/index.ts"))) {
    errors.push("BFF entrypoint is missing: apps/bff/index.ts");
  }
  if (existsSync(path.join(root, "server.ts"))) {
    errors.push("root BFF entrypoint must be removed: server.ts");
  }
  if (existsSync(path.join(root, "server"))) {
    errors.push("root BFF directory must be removed: server");
  }

  const analyticsEntry = "services/analytics/main.py";
  if (!existsSync(path.join(root, analyticsEntry))) {
    errors.push(`Analytics entrypoint is missing: ${analyticsEntry}`);
  }
  if (existsSync(path.join(root, "python-analytics-service"))) {
    errors.push("legacy Analytics directory must be removed: python-analytics-service");
  }

  const requiredTooling = [
    "tooling/architecture/check.mjs",
    "tooling/node/with-node-version.sh",
    "infra/persistence/db-ops.mjs",
    "infra/persistence/backup-utils.mjs",
    "services/analytics/start-service.sh",
    "services/analytics/test.sh",
  ];
  for (const relativePath of requiredTooling) {
    if (!existsSync(path.join(root, relativePath))) {
      errors.push(`governance entry is missing: ${relativePath}`);
    }
  }
  const legacyTooling = [
    "scripts/check-architecture.mjs",
    "scripts/with-node-version.sh",
    "scripts/persistence",
    "scripts/start-python-service.sh",
    "scripts/test-python.sh",
  ];
  for (const relativePath of legacyTooling) {
    if (existsSync(path.join(root, relativePath))) {
      errors.push(`legacy tooling path must be removed: ${relativePath}`);
    }
  }

  for (const file of listSourceFiles(path.join(root, "packages"))) {
    if (
      isInside(file, path.join(root, "packages/contracts/tests")) ||
      isInside(file, path.join(root, "packages/logging/tests"))
    ) {
      continue;
    }
    const source = readFileSync(file, "utf8");
    for (const specifier of readImportSpecifiers(source, file)) {
      if (!specifier.startsWith(".")) continue;
      const resolved = path.resolve(path.dirname(file), specifier);
      if (isRuntimeUnit(resolved, root)) {
        errors.push(
          `packages must not import runtime units: ${path.relative(root, file)} -> ${specifier}`,
        );
      }
    }
  }

  const productionFiles = runtimeEntryFiles
    .map((file) => path.join(root, file))
    .filter((file) => existsSync(file));
  for (const directory of ["src", "server", "shared", "apps"]) {
    productionFiles.push(...listSourceFiles(path.join(root, directory)));
  }
  for (const file of productionFiles) {
    const source = readFileSync(file, "utf8");
    for (const specifier of readImportSpecifiers(source, file)) {
      if (!specifier.startsWith(".")) continue;
      const resolved = path.resolve(path.dirname(file), specifier);
      if (
        isInside(file, path.join(root, "apps/web")) &&
        (serverRuntimeDirectories.some((directory) =>
          isInside(resolved, path.join(root, directory)),
        ) ||
          serverRuntimeEntryFiles.some((entry) => resolved === path.join(root, entry)))
      ) {
        errors.push(
          `apps/web must not import server runtime: ${path.relative(root, file)} -> ${specifier}`,
        );
      }
      if (isInside(resolved, path.join(root, "packages/hazard-domain/src"))) {
        errors.push(
          `production code must use a package entrypoint: ${path.relative(root, file)} -> ${specifier}`,
        );
      }
    }
  }

  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = checkArchitecture(process.cwd());
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  }
}
