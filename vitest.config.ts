import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // `import "server-only"` throws outside a React Server Component bundle;
      // swap it for a no-op so server libs can be unit-tested under Node.
      { find: "server-only", replacement: path.join(root, "test/stubs/server-only.ts") },
      // Mirror tsconfig's "@/*" -> "./*" path mapping.
      { find: /^@\/(.*)$/, replacement: path.join(root, "$1") },
    ],
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Force the no-database path so tests are deterministic and hermetic — they
    // never touch a real MongoDB even if MONGODB_URI is set in the shell.
    env: { MONGODB_URI: "" },
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      reporter: ["text", "html"],
    },
  },
});
