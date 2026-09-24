import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as hazardDomain from "../packages/hazard-domain/src/index.js";
import { checkArchitecture } from "../scripts/check-architecture.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

function withFixture(run: (root: string) => void) {
  const root = mkdtempSync(path.join(tmpdir(), "pgg-architecture-"));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeFixture(root: string, relativePath: string, contents: string) {
  const file = path.join(root, relativePath);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

describe("workspace architecture", () => {
  it("uses apps/web as the browser entrypoint", () => {
    const viteConfig = readFileSync(path.join(repositoryRoot, "vite.config.ts"), "utf8");
    expect(existsSync(path.join(repositoryRoot, "apps/web/index.html"))).toBe(true);
    expect(existsSync(path.join(repositoryRoot, "apps/web/src/index.tsx"))).toBe(true);
    expect(existsSync(path.join(repositoryRoot, "src"))).toBe(false);
    expect(viteConfig).toContain('root: "apps/web"');
    expect(viteConfig).toContain("envDir: repositoryRoot");
    expect(viteConfig).toContain('outDir: path.resolve(repositoryRoot, "dist")');
  });

  it("declares the package workspace and shared package entrypoints", () => {
    const workspace = readFileSync(path.join(repositoryRoot, "pnpm-workspace.yaml"), "utf8");
    const contracts = JSON.parse(
      readFileSync(path.join(repositoryRoot, "packages/contracts/package.json"), "utf8"),
    );
    const hazardPackage = JSON.parse(
      readFileSync(path.join(repositoryRoot, "packages/hazard-domain/package.json"), "utf8"),
    );
    const rootPackage = JSON.parse(readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));

    expect(workspace).toContain("packages/*");
    expect(contracts).toMatchObject({ name: "@pgg/contracts" });
    expect(hazardPackage).toMatchObject({ name: "@pgg/hazard-domain" });
    expect(existsSync(path.join(repositoryRoot, "packages/hazard-domain/src/index.ts"))).toBe(true);
    expect(rootPackage.scripts["check:architecture"]).toBeDefined();
    expect(existsSync(path.join(repositoryRoot, "scripts/check-architecture.mjs"))).toBe(true);
  });

  it("exports the existing hazard event and layer API", () => {
    expect(hazardDomain.createHazardEventId("usgs", "event-1")).toBe("usgs:event-1");
    expect(hazardDomain.resolveHazardLayerId("EARTHQUAKE")).toBe("earthquake");
    expect(hazardDomain.HAZARD_LAYER_REGISTRY.length).toBeGreaterThan(0);
  });

  it("reports missing contracts metadata with a stable rule", () => {
    withFixture((root) => {
      expect(checkArchitecture(root)).toContain(
        "contracts package metadata is missing: packages/contracts/package.json",
      );
    });
  });

  it.each([
    ["contracts", "packages/contracts/package.json", "contracts package metadata is invalid"],
    [
      "hazard domain",
      "packages/hazard-domain/package.json",
      "hazard domain package metadata is invalid",
    ],
  ])("reports invalid %s metadata without throwing", (_label, manifestPath, rule) => {
    withFixture((root) => {
      writeFixture(root, manifestPath, "{broken json");
      expect(checkArchitecture(root)).toContain(`${rule}: ${manifestPath}`);
    });
  });

  it("rejects package imports into runtime units", () => {
    withFixture((root) => {
      writeFixture(root, "packages/demo/src/index.ts", 'import value from "../../../src/App";');
      expect(checkArchitecture(root)).toContain(
        "packages must not import runtime units: packages/demo/src/index.ts -> ../../../src/App",
      );
    });
  });

  it("rejects package imports into the root BFF entrypoint", () => {
    withFixture((root) => {
      writeFixture(root, "server.ts", "export const server = true;");
      writeFixture(root, "packages/demo/src/index.ts", 'import value from "../../../server.js";');
      expect(checkArchitecture(root)).toContain(
        "packages must not import runtime units: packages/demo/src/index.ts -> ../../../server.js",
      );
    });
  });

  it("does not treat comments as imports and handles comments in imports", () => {
    withFixture((root) => {
      writeFixture(
        root,
        "packages/demo/src/comment.ts",
        '// import value from "../../../src/App";',
      );
      writeFixture(
        root,
        "packages/demo/src/side-effect.ts",
        'import /* runtime boundary */ "../../../src/App";',
      );
      const errors = checkArchitecture(root);
      expect(errors).not.toContain(
        "packages must not import runtime units: packages/demo/src/comment.ts -> ../../../src/App",
      );
      expect(errors).toContain(
        "packages must not import runtime units: packages/demo/src/side-effect.ts -> ../../../src/App",
      );
    });
  });

  it("only reports actual import declarations", () => {
    withFixture((root) => {
      writeFixture(
        root,
        "packages/demo/src/string.ts",
        "export const example = 'import value from \"../../../src/App\"';",
      );
      writeFixture(
        root,
        "packages/demo/src/after-statement.ts",
        'export const enabled = true; import "../../../src/App";',
      );
      const errors = checkArchitecture(root);
      expect(errors).not.toContain(
        "packages must not import runtime units: packages/demo/src/string.ts -> ../../../src/App",
      );
      expect(errors).toContain(
        "packages must not import runtime units: packages/demo/src/after-statement.ts -> ../../../src/App",
      );
    });
  });

  it("parses TypeScript files using their extension", () => {
    withFixture((root) => {
      writeFixture(
        root,
        "packages/demo/src/generic.ts",
        'export const identity = <T>(value: T) => value; import "../../../src/App";',
      );
      expect(checkArchitecture(root)).toContain(
        "packages must not import runtime units: packages/demo/src/generic.ts -> ../../../src/App",
      );
    });
  });

  it("rejects production imports into package internals", () => {
    withFixture((root) => {
      writeFixture(root, "src/example.ts", 'export { x } from "../packages/hazard-domain/src/x";');
      expect(checkArchitecture(root)).toContain(
        "production code must use a package entrypoint: src/example.ts -> ../packages/hazard-domain/src/x",
      );
    });
  });

  it("rejects apps/web imports into the server runtime", () => {
    withFixture((root) => {
      writeFixture(root, "apps/web/src/forbidden.ts", 'import "../../../server/server.ts";');
      expect(checkArchitecture(root)).toContain(
        "apps/web must not import server runtime: apps/web/src/forbidden.ts -> ../../../server/server.ts",
      );
    });
  });

  it.each([
    "server.ts",
    "server.js",
    "apps/bff/client.ts",
    "services/analytics/app/main.py",
    "python-analytics-service/app/main.py",
    "server/db/client.ts",
    "prisma.config.ts",
    "prisma/client.ts",
  ])("rejects apps/web imports into %s", (runtimePath) => {
    withFixture((root) => {
      const specifier = `../../../${runtimePath}`;
      writeFixture(root, "apps/web/src/forbidden.ts", `import "${specifier}";`);
      expect(checkArchitecture(root)).toContain(
        `apps/web must not import server runtime: apps/web/src/forbidden.ts -> ${specifier}`,
      );
    });
  });

  it.each([
    'export { server } from "../../../server/server.ts";',
    'const server = import("../../../server/server.ts");',
    'import /* server boundary */ "../../../server/server.ts";',
  ])("checks apps/web module references: %s", (source) => {
    withFixture((root) => {
      writeFixture(root, "apps/web/src/forbidden.ts", source);
      expect(checkArchitecture(root)).toContain(
        "apps/web must not import server runtime: apps/web/src/forbidden.ts -> ../../../server/server.ts",
      );
    });
  });

  it("allows browser imports and ignores comments and strings in apps/web", () => {
    withFixture((root) => {
      writeFixture(
        root,
        "apps/web/src/allowed.ts",
        [
          'import "@pgg/hazard-domain";',
          'import "./services/analytics/analyticsService";',
          'import "../../../server-browser/utils";',
          '// import "../../../server/server.ts";',
          '/* export * from "../../../packages/hazard-domain/src/hazard-event"; */',
          "export const example = 'import(\"../../../apps/bff/client.ts\")';",
        ].join("\n"),
      );
      const violations = checkArchitecture(root).filter(
        (error) => error.startsWith("apps/web") || error.startsWith("production code"),
      );
      expect(violations).toEqual([]);
    });
  });

  it("reports a remaining root src directory with a stable rule", () => {
    withFixture((root) => {
      mkdirSync(path.join(root, "src"));
      expect(checkArchitecture(root)).toContain(
        "root src directory must be removed after web migration: src",
      );
    });
  });

  it.each([".git", ".venv", "__pycache__", "dist", "dist-server", "node_modules"])(
    "ignores apps/web generated directory %s",
    (directory) => {
      withFixture((root) => {
        writeFixture(
          root,
          `apps/web/${directory}/forbidden.ts`,
          'import "../../../server/server.ts";',
        );
        expect(checkArchitecture(root).filter((error) => error.startsWith("apps/web"))).toEqual([]);
      });
    },
  );

  it("rejects apps/web imports into package internals", () => {
    withFixture((root) => {
      writeFixture(
        root,
        "apps/web/src/internal.ts",
        'import "../../../packages/hazard-domain/src/hazard-event";',
      );
      expect(checkArchitecture(root)).toContain(
        "production code must use a package entrypoint: apps/web/src/internal.ts -> ../../../packages/hazard-domain/src/hazard-event",
      );
    });
  });

  it("scans the root BFF entrypoint for package-internal imports", () => {
    withFixture((root) => {
      writeFixture(root, "server.ts", 'export { x } from "./packages/hazard-domain/src/x";');
      expect(checkArchitecture(root)).toContain(
        "production code must use a package entrypoint: server.ts -> ./packages/hazard-domain/src/x",
      );
    });
  });

  it("checks new files under the compatibility directory", () => {
    withFixture((root) => {
      writeFixture(
        root,
        "shared/hazards/new-consumer.ts",
        'export { x } from "../../packages/hazard-domain/src/x";',
      );
      expect(checkArchitecture(root)).toContain(
        "production code must use a package entrypoint: shared/hazards/new-consumer.ts -> ../../packages/hazard-domain/src/x",
      );
    });
  });

  it("allows compatibility re-exports and ignores generated directories", () => {
    withFixture((root) => {
      writeFixture(
        root,
        "shared/hazards/hazard-event.ts",
        'export * from "../../packages/hazard-domain/src/hazard-event.js";',
      );
      writeFixture(root, "packages/demo/node_modules/index.ts", 'import "../../../src/App";');
      expect(checkArchitecture(root).filter((error) => error.includes("must not"))).toEqual([]);
    });
  });
});
