import "server-only";

// Canned model output for DEMO_FIXTURES, written for /demo/worksheet at a 1440x900 viewport.
// The rest of the pipeline (verifiers, learner model, overlay) runs for real on these answers.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const CHECK = {
  summary: "Your setup is right on all three problems. One slip in problem 1 changes the answer, so start there.",
  subject: "Algebra 1: solving linear equations",
  question: "In problem 1, what do you do to both sides to undo the \"+ 5\"?",
  marks: [
    { kind: "error", note: "+5 should become −5 on the other side: 3x = 20 − 5", nx: 0.392, ny: 0.332, w: 0.115, h: 0.061, shape: "circle", skill: "inverse operations when isolating a variable", misconception: "A term keeps its sign when it moves across the equals sign." },
    { kind: "correct", note: "Clean: add 4, then divide by 2.", nx: 0.365, ny: 0.618, w: 0.06, h: 0.055, shape: "circle", skill: "two-step equations", misconception: "" },
    { kind: "uncertain", note: "Is this an 8 or a 3?", nx: 0.372, ny: 0.794, w: 0.075, h: 0.055, shape: "circle", skill: "combining like terms", misconception: "" },
  ],
};

export async function cannedStructured(system: string, content: unknown): Promise<unknown> {
  const text = typeof content === "string" ? content : JSON.stringify(content);
  if (system.includes("DIAGNOSE BEFORE YOU CORRECT")) {
    await sleep(3200);
    return CHECK;
  }
  if (system.includes("locate a specific detail")) {
    await sleep(900);
    // Centre of the crop, sized to the original mark (refineWindow pads it to about 0.355 x 0.3).
    return { found: true, nx: 0.5, ny: 0.5, w: 0.324, h: 0.203 };
  }
  if (system.includes("You write practice problems")) {
    await sleep(2200);
    const focus = /Focus: ([^\n"\\]+)/.exec(text)?.[1]?.trim() || "inverse operations when isolating a variable";
    return {
      questions: [
        { skill: focus, question: "Solve for x: $x + 7 = 12$", type: "short_answer", options: [], answer: "5", explanation: "Undo + 7 by subtracting 7 from both sides: x = 12 − 7 = 5." },
        { skill: focus, question: "In $4x + 9 = 21$, what is the first step to isolate $x$?", type: "multiple_choice", options: ["Add 9 to both sides", "Subtract 9 from both sides", "Divide both sides by 9", "Subtract 4 from both sides"], answer: "Subtract 9 from both sides", explanation: "The + 9 is undone by subtracting 9 from both sides; dividing by 4 comes after." },
        { skill: focus, question: "Solve for x: $3x + 5 = 20$", type: "short_answer", options: [], answer: "5", explanation: "Subtract 5: 3x = 15. Divide by 3: x = 5. Check: 3(5) + 5 = 20." },
      ],
    };
  }
  if (system.includes("You grade one student answer")) {
    await sleep(700);
    const key = /Answer key: (.*)/.exec(text)?.[1]?.trim() ?? "";
    const ans = /<untrusted[^>]*>\n?([\s\S]*?)\n?<\/untrusted>/.exec(text)?.[1]?.trim() ?? "";
    const correct = ans.replace(/\s+/g, "").toLowerCase() === key.replace(/\s+/g, "").toLowerCase();
    return correct ? { correct, score: 1, feedback: "Your steps are clean." } : { correct, score: 0, feedback: "Not quite. Check what happens to the sign when you undo the addition." };
  }
  if (system.includes("maintain a learning profile")) {
    return { traits: { pace: "Steady", preferred_format: "One worked example, then a try", active_hours: "Weeknights", stuck_patterns: ["signs when moving terms"], focus_habits: "", goals: ["B+ in Algebra 1"] }, skill_evidence: [] };
  }
  return {
    mind_doc:
      "**Goal:** A B+ or better in Algebra 1.\n\n**Learns best:** One short worked example, then a single question to try.\n\n**Where they get stuck:** Signs when moving a term across the equals sign; it showed up again in Worksheet 4.\n\n**Avoid:** Giving the full solution first.",
  };
}

const EXPLAIN = [
  "Let's look at the first line of problem 1. ",
  "You had $3x + 5 = 20$ and wrote $3x = 20 + 5$. ",
  "The $+5$ is stuck to the $3x$, so to move it you undo it: do the opposite operation, to both sides.\n\n",
  '```draw\n[{"type":"steps","title":"Undo +5 on both sides","steps":[{"latex":"3x + 5 = 20"},{"latex":"3x + 5 - 5 = 20 - 5","note":"subtract 5 from both sides"},{"latex":"3x = 15","note":"the +5 is gone"}]},{"type":"graph","title":"Where 3x + 5 meets 20","xRange":[0,8],"yRange":[0,30],"curves":[{"expr":"3*x+5","label":"3x + 5"},{"expr":"20","label":"20"}],"points":[{"x":5,"y":20,"label":"?"}]}]\n```\n\n',
  "Now you try: from $3x = 15$, what one step gets $x$ by itself?",
];

export async function* cannedStream(): AsyncGenerator<string> {
  await sleep(800);
  for (const part of EXPLAIN) {
    if (part.startsWith("```")) {
      yield part;
      await sleep(400);
      continue;
    }
    for (const word of part.split(/(?<= )/)) {
      yield word;
      await sleep(45);
    }
  }
}
