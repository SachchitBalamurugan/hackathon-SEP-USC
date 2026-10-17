import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
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
