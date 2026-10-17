import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @studylens/core ships TypeScript source; Next compiles it with the app.
  transpilePackages: ["@studylens/core"],
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
