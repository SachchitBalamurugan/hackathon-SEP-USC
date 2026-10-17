import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["test/**/*.test.ts"], environment: "node" },
  resolve: {
    alias: {
      // "server-only" throws outside a React Server Components bundle; tests run plain Node.
      "server-only": fileURLToPath(new URL("./test/stubs/empty.ts", import.meta.url)),
      "@/": fileURLToPath(new URL("./web/src/", import.meta.url)),
    },
  },
});
