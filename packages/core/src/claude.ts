// What the student says to their own Claude in Claude mode (no server-side model). Short on
// purpose so it can be typed as easily as pasted; the MCP server's instructions tell Claude
// which StudyLens tools each phrase means.

export const CLAUDE_PROMPTS = {
  check: "Check my work with StudyLens",
  ask: (question: string, withScreen: boolean) => `StudyLens: ${question.trim()}${withScreen ? " (look at my screen)" : ""}`,
  practice: (focus: string) => `Make me a StudyLens practice set on ${focus}`,
} as const;

/** Opens the Claude desktop app if installed; claude.ai otherwise needs a public connector. */
export const CLAUDE_APP_URL = "claude://claude.ai/new";
