import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @studylens/core ships TypeScript source; Next compiles it with the app.
  transpilePackages: ["@studylens/core"],
  // The extension download route reads the prebuilt zip from disk.
  outputFileTracingIncludes: { "/studylens-extension.zip": ["./extension/studylens-extension.zip"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
