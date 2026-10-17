import { defineConfig } from "wxt";
import type { Plugin } from "vite";

/**
 * Chrome rejects an extension file containing Unicode noncharacters (U+FDD0-U+FDEF, U+FFFE,
 * U+FFFF) as "isn't UTF-8 encoded", even though they are valid UTF-8. The minifier turns
 * KaTeX's `\uffff` regex escape into the raw character, so write them back as escapes.
 */
function chromeSafeChars(): Plugin {
  const bad = /[\uFDD0-\uFDEF\uFFFE\uFFFF]/g;
  const escape = (c: string) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`;
  return {
    name: "studylens:chrome-safe-chars",
    enforce: "post",
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === "chunk") file.code = file.code.replace(bad, escape);
        else if (typeof file.source === "string") file.source = file.source.replace(bad, escape);
      }
    },
  };
}

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({ plugins: [chromeSafeChars()] }),
  manifest: {
    name: "StudyLens",
    description: "A tutor that knows your courses, checks your work on any page, and learns how you learn.",
    // <all_urls>: the overlay works on any site, captureVisibleTab needs it outside a user
    // gesture, and LMS sync fetches with the student's own session on whatever host their
    // school uses. The worker only ever reaches LMS hosts the student actually visits.
    permissions: ["storage", "tabs", "activeTab"],
    host_permissions: ["<all_urls>"],
    commands: {
      "check-work": { suggested_key: { default: "Alt+Shift+C" }, description: "Check my work on this page" },
      "toggle-dock": { suggested_key: { default: "Alt+Shift+S" }, description: "Show or hide StudyLens" },
    },
  },
});
