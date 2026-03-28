export const mockJobApplications = [
  {
    id: 1,
    title: "Senior Frontend Engineer",
    company: "Vercel",
    status: "interview",
    appliedDate: "2026-03-22",
    logo: "V",
  },
  {
    id: 2,
    title: "Full Stack Developer",
    company: "Linear",
    status: "applied",
    appliedDate: "2026-03-20",
    logo: "L",
  },
  {
    id: 3,
    title: "React Developer",
    company: "Raycast",
    status: "offer",
    appliedDate: "2026-03-15",
    logo: "R",
  },
  {
    id: 4,
    title: "Software Engineer",
    company: "Stripe",
    status: "rejected",
    appliedDate: "2026-03-10",
    logo: "S",
  },
];

export const mockROIActions = [
  {
    id: 1,
    type: "skill-up",
    title: "Learn TypeScript Advanced Patterns",
    description:
      "Generics, conditional types, and template literals are frequently tested in senior-level interviews. Focus on real-world utility types.",
    icon: "BookOpen",
    priority: "high",
  },
  {
    id: 2,
    type: "project",
    title: "Build a Real-time Dashboard",
    description:
      "Demonstrates WebSocket handling, state management, and data visualization — key skills employers look for.",
    icon: "Code",
    priority: "medium",
  },
  {
    id: 3,
    type: "visibility",
    title: "Publish a Technical Blog Post",
    description:
      "Write about React Server Components or your latest project. Increases LinkedIn visibility and positions you as a thought leader.",
    icon: "Eye",
    priority: "medium",
  },
  {
    id: 4,
    type: "skill-up",
    title: "System Design Fundamentals",
    description:
      "Practice designing distributed systems — load balancers, caching, message queues. Common in senior interviews.",
    icon: "TrendingUp",
    priority: "high",
  },
  {
    id: 5,
    type: "project",
    title: "Contribute to Open Source",
    description:
      "Find a popular React library and submit a meaningful PR. Shows collaboration skills and community engagement.",
    icon: "GitBranch",
    priority: "low",
  },
];

export const mockJobOffers = [
  {
    id: 1,
    title: "Senior Frontend Engineer",
    company: "Vercel",
    location: "Remote",
    matchScore: 94,
    salary: "$150k – $180k",
    tags: ["React", "TypeScript", "Next.js"],
  },
  {
    id: 2,
    title: "Staff Engineer",
    company: "Linear",
    location: "Remote (EU)",
    matchScore: 87,
    salary: "$160k – $200k",
    tags: ["React", "GraphQL", "Node.js"],
  },
  {
    id: 3,
    title: "Frontend Developer",
    company: "Raycast",
    location: "Remote",
    matchScore: 82,
    salary: "$130k – $160k",
    tags: ["React", "Swift", "Electron"],
  },
  {
    id: 4,
    title: "Full Stack Engineer",
    company: "Stripe",
    location: "San Francisco",
    matchScore: 76,
    salary: "$170k – $210k",
    tags: ["React", "Ruby", "Go"],
  },
  {
    id: 5,
    title: "React Developer",
    company: "Figma",
    location: "Remote (US)",
    matchScore: 71,
    salary: "$140k – $170k",
    tags: ["React", "C++", "WebGL"],
  },
  {
    id: 6,
    title: "UI Engineer",
    company: "Notion",
    location: "New York",
    matchScore: 68,
    salary: "$145k – $175k",
    tags: ["React", "TypeScript", "Prosemirror"],
  },
];

export const mockPreInterviewTips = [
  "Research the company's recent projects and tech blog posts",
  "Prepare 2–3 thoughtful questions to ask the interviewer",
  "Review the job description and match requirements to your experience",
  "Practice the STAR method for behavioral questions",
  "Test your microphone and internet connection before starting",
  "Keep a notepad ready for jotting down key points",
];

export const mockSelectedJobOffer = mockJobOffers[0];

export const mockInterviewHistory = [
  { id: 1, jobOfferId: 1, date: "2026-03-27", score: 72, personality: "Professional", type: "Technical", duration: "24 min" },
  { id: 2, jobOfferId: 1, date: "2026-03-25", score: 65, personality: "Tough", type: "Behavioral", duration: "18 min" },
  { id: 3, jobOfferId: 1, date: "2026-03-22", score: 58, personality: "Friendly", type: "System Design", duration: "31 min" },
  { id: 4, jobOfferId: 1, date: "2026-03-20", score: 81, personality: "Professional", type: "Mixed", duration: "27 min" },
];

export const mockLastAnalysis = {
  overall: 72,
  date: "2026-03-27",
  good: [
    "Strong understanding of React component lifecycle",
    "Clear communication of system design trade-offs",
    "Good use of technical vocabulary",
  ],
  bad: [
    "Could improve on time complexity analysis",
    "Missed edge case in the coding question",
  ],
  suggestions: [
    "Practice LeetCode medium-difficulty array problems",
    "Review common system design patterns (caching, load balancing)",
    "Work on structuring answers with the STAR framework",
  ],
  summary:
    "Solid technical interview performance. Demonstrated strong React and frontend knowledge. Could improve on algorithmic thinking and edge case handling.",
};

export const applicationStatuses = {
  applied: { label: "Applied", color: "bg-accent-light text-accent" },
  interview: { label: "Interview", color: "bg-warning-light text-amber-700" },
  offer: { label: "Offer", color: "bg-success-light text-emerald-700" },
  rejected: { label: "Rejected", color: "bg-danger-light text-red-700" },
};
