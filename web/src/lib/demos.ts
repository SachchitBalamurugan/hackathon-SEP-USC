// Demo videos rendered by demo/remotion into web/public/demos. Each key is one walkthrough.
export const DEMOS = {
  intro: { title: "What StudyLens is", caption: "A tutor that knows your courses and checks your work on any page." },
  setup: { title: "Get set up in two minutes", caption: "Create an account, add the extension, pair it, and connect Claude." },
  sync: { title: "Your courses, synced", caption: "Open Canvas or Classroom once. Deadlines, grades and materials come in on their own." },
  check: { title: "Check my work", caption: "One click finds the mistake, circles it on the page, and asks the question that fixes it." },
  ask: { title: "Explanations you can watch", caption: "Ask about anything on screen and get steps, graphs and diagrams that animate in." },
  practice: { title: "Practice that targets you", caption: "Problems aimed at the belief behind your last mistake, spaced so they stick." },
  skills: { title: "See what you know", caption: "Your skills map and profile update as you work, and you stay in control of your data." },
  learning: { title: "How it learns how you learn", caption: "Course updates, Claude conversations and your work all feed one profile." },
  claude: { title: "Works with Claude", caption: "Claude reads your profile before teaching and saves what it learns about you." },
} as const;

export type DemoKey = keyof typeof DEMOS;

export const demoSrc = (k: DemoKey) => ({ mp4: `/demos/${k}.mp4`, webm: `/demos/${k}.webm`, poster: `/demos/${k}.jpg` });
