// Fixture data for the staged Canvas demo (/demo/canvas and /api/v1/* when DEMO_MODE=1).
const day = (n: number, h = 23, m = 59) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const DEMO_COURSES = [
  { id: 4101, name: "Algebra 1", course_code: "MATH-101", score: 84.5 },
  { id: 4102, name: "Chemistry", course_code: "CHEM-110", score: 91.2 },
  { id: 4103, name: "World History", course_code: "HIST-120", score: 88.0 },
];

export const DEMO_ASSIGNMENTS: Record<number, { id: number; name: string; due: string; points: number; score?: number; submitted?: boolean; missing?: boolean }[]> = {
  4101: [
    { id: 9001, name: "Worksheet 4: Solving Linear Equations", due: day(1), points: 20 },
    { id: 9002, name: "Quiz 2: Two-step equations", due: day(4, 9, 0), points: 30 },
    { id: 9003, name: "Worksheet 3: Inverse Operations", due: day(-3), points: 20, score: 14, submitted: true },
  ],
  4102: [
    { id: 9101, name: "Lab report: Reaction rates", due: day(2), points: 50 },
    { id: 9102, name: "Balancing equations practice", due: day(6), points: 15 },
  ],
  4103: [
    { id: 9201, name: "Essay outline: Causes of WWI", due: day(3), points: 25 },
    { id: 9202, name: "Reading quiz: Chapter 7", due: day(-1), points: 10, missing: true },
  ],
};

export const DEMO_PAGES: Record<number, { url: string; title: string; body: string }[]> = {
  4101: [
    {
      url: "solving-equations-notes",
      title: "Notes: Solving equations with inverse operations",
      body: "<h2>Inverse operations</h2><p>To isolate a variable, undo each operation in reverse order. Undo addition by subtracting the same number from both sides. Undo multiplication by dividing both sides.</p><p>Example: 3x + 5 = 20. Subtract 5 from both sides to get 3x = 15, then divide by 3 to get x = 5. Always check by substituting: 3(5) + 5 = 20.</p>",
    },
  ],
};
