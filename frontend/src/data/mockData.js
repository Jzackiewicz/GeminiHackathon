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
    postedDate: "2026-03-20",
    description: "Join Vercel's frontend platform team to build the next generation of web development tools. You'll work on the dashboard, deployment pipelines, and developer experience features used by millions of developers worldwide.",
    requirements: [
      "5+ years of experience with React and modern JavaScript",
      "Strong TypeScript skills and understanding of type systems",
      "Experience with Next.js or similar SSR/SSG frameworks",
      "Understanding of web performance optimization techniques",
      "Familiarity with CI/CD pipelines and deployment workflows",
    ],
    responsibilities: [
      "Design and implement new features for the Vercel dashboard",
      "Optimize build and deployment performance for enterprise customers",
      "Collaborate with the design team on developer experience improvements",
      "Mentor junior engineers and contribute to technical decision-making",
      "Write technical documentation and contribute to open-source projects",
    ],
    benefits: [
      "Fully remote with flexible hours",
      "Competitive equity package and annual bonuses",
      "$5,000 annual learning and development budget",
      "Health, dental, and vision insurance",
    ],
  },
  {
    id: 2,
    title: "Staff Engineer",
    company: "Linear",
    location: "Remote (EU)",
    matchScore: 87,
    salary: "$160k – $200k",
    tags: ["React", "GraphQL", "Node.js"],
    postedDate: "2026-03-18",
    description: "Linear is looking for a Staff Engineer to lead the development of our real-time collaboration features. You'll architect systems that handle millions of concurrent updates while maintaining sub-100ms latency.",
    requirements: [
      "7+ years of software engineering experience",
      "Deep expertise in React and state management patterns",
      "Experience with GraphQL APIs and real-time data syncing",
      "Strong background in Node.js and server-side rendering",
      "Track record of leading technical projects end-to-end",
    ],
    responsibilities: [
      "Lead architecture decisions for the collaboration engine",
      "Build and optimize real-time sync infrastructure",
      "Define technical standards and best practices for the team",
      "Drive cross-team initiatives to improve system reliability",
    ],
    benefits: [
      "Remote-first (EU timezone preferred)",
      "Generous equity and competitive salary",
      "Unlimited PTO with minimum 4 weeks encouraged",
    ],
  },
  {
    id: 3,
    title: "Frontend Developer",
    company: "Raycast",
    location: "Remote",
    matchScore: 82,
    salary: "$130k – $160k",
    tags: ["React", "Swift", "Electron"],
    postedDate: "2026-03-15",
    description: "Help build the future of productivity tools at Raycast. You'll work on our cross-platform launcher app, creating extensions and UI components that developers love to use every day.",
    requirements: [
      "3+ years of experience with React or similar frameworks",
      "Interest in or experience with Swift and native macOS development",
      "Experience with Electron or similar cross-platform frameworks",
      "Strong attention to UI/UX detail and animation",
    ],
    responsibilities: [
      "Develop new extensions and UI components for the Raycast platform",
      "Improve cross-platform rendering performance",
      "Collaborate with the community on extension APIs",
      "Ship pixel-perfect interfaces with smooth animations",
    ],
    benefits: [
      "Fully remote with annual team offsites",
      "Latest MacBook Pro and home office budget",
      "Health insurance and wellness stipend",
    ],
  },
  {
    id: 4,
    title: "Full Stack Engineer",
    company: "Stripe",
    location: "San Francisco",
    matchScore: 76,
    salary: "$170k – $210k",
    tags: ["React", "Ruby", "Go"],
    postedDate: "2026-03-12",
    description: "Stripe is hiring Full Stack Engineers to work on our payments infrastructure dashboard. You'll build tools that help businesses manage billions in transactions securely and efficiently.",
    requirements: [
      "4+ years of full-stack development experience",
      "Proficiency in React for frontend and Ruby or Go for backend",
      "Experience with payment systems or financial software is a plus",
      "Strong understanding of security best practices",
      "Experience with distributed systems and microservices",
    ],
    responsibilities: [
      "Build and maintain payment dashboard features",
      "Design APIs for merchant integrations",
      "Ensure PCI compliance across the payment stack",
      "Optimize transaction processing pipelines",
    ],
    benefits: [
      "Hybrid work (3 days in SF office)",
      "Top-tier health, dental, and vision coverage",
      "$10,000 annual wellness and learning budget",
      "401(k) match and equity refresh grants",
    ],
  },
  {
    id: 5,
    title: "React Developer",
    company: "Figma",
    location: "Remote (US)",
    matchScore: 71,
    salary: "$140k – $170k",
    tags: ["React", "C++", "WebGL"],
    postedDate: "2026-03-10",
    description: "Figma is looking for a React Developer to work on our browser-based design tool. You'll push the boundaries of what's possible in the browser, working with WebGL and high-performance rendering.",
    requirements: [
      "3+ years of React experience with performance-critical applications",
      "Experience with WebGL, Canvas API, or similar graphics technologies",
      "C++ experience is a strong plus for our WASM rendering engine",
      "Understanding of 2D graphics, coordinate systems, and transforms",
    ],
    responsibilities: [
      "Build interactive UI components for the design editor",
      "Optimize rendering performance for complex design files",
      "Contribute to the WebAssembly-based rendering pipeline",
      "Work with the design systems team on component libraries",
    ],
    benefits: [
      "Remote-first (US timezones)",
      "Competitive salary and equity",
      "Home office stipend and learning budget",
    ],
  },
  {
    id: 6,
    title: "UI Engineer",
    company: "Notion",
    location: "New York",
    matchScore: 68,
    salary: "$145k – $175k",
    tags: ["React", "TypeScript", "Prosemirror"],
    postedDate: "2026-03-08",
    description: "Join Notion's editor team to build the most versatile workspace tool. You'll work on our rich text editor, block system, and collaborative editing features used by millions of teams.",
    requirements: [
      "4+ years of frontend engineering experience",
      "Strong TypeScript and React skills",
      "Experience with rich text editors (Prosemirror, Slate, or similar)",
      "Understanding of CRDT or OT for collaborative editing",
      "Experience with complex state management",
    ],
    responsibilities: [
      "Extend and maintain the Notion block editor",
      "Build new block types and inline components",
      "Improve collaborative editing reliability and performance",
      "Work on accessibility and internationalization",
    ],
    benefits: [
      "Hybrid work (NYC office 2 days/week)",
      "Comprehensive health and wellness benefits",
      "Annual team retreats and learning stipend",
    ],
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

export const mockSkillMatch = {
  1: {
    overall: 94,
    skills: [
      { name: "React", status: "match", note: "3+ years across 8 projects" },
      { name: "TypeScript", status: "match", note: "Used in 12 repositories" },
      { name: "Next.js", status: "partial", note: "Some exposure, not primary framework" },
      { name: "Web Performance", status: "match", note: "Lighthouse optimization experience" },
      { name: "CI/CD", status: "match", note: "GitHub Actions in multiple projects" },
    ],
  },
  2: {
    overall: 87,
    skills: [
      { name: "React", status: "match", note: "3+ years across 8 projects" },
      { name: "GraphQL", status: "partial", note: "Basic query experience, no schema design" },
      { name: "Node.js", status: "match", note: "Backend projects in portfolio" },
      { name: "Real-time Systems", status: "missing", note: "No WebSocket experience detected" },
      { name: "Technical Leadership", status: "partial", note: "Some open-source maintainer activity" },
    ],
  },
  3: {
    overall: 82,
    skills: [
      { name: "React", status: "match", note: "3+ years across 8 projects" },
      { name: "Swift", status: "missing", note: "No Swift projects found" },
      { name: "Electron", status: "partial", note: "One desktop app project" },
      { name: "UI/UX Detail", status: "match", note: "Strong portfolio of polished UIs" },
    ],
  },
  4: {
    overall: 76,
    skills: [
      { name: "React", status: "match", note: "3+ years across 8 projects" },
      { name: "Ruby", status: "missing", note: "No Ruby experience detected" },
      { name: "Go", status: "missing", note: "No Go experience detected" },
      { name: "Security", status: "partial", note: "Basic auth implementation experience" },
      { name: "Distributed Systems", status: "partial", note: "Some microservice patterns" },
    ],
  },
  5: {
    overall: 71,
    skills: [
      { name: "React", status: "match", note: "3+ years across 8 projects" },
      { name: "C++", status: "missing", note: "No C++ projects found" },
      { name: "WebGL", status: "missing", note: "No graphics programming experience" },
      { name: "Canvas API", status: "partial", note: "Basic chart rendering" },
    ],
  },
  6: {
    overall: 68,
    skills: [
      { name: "React", status: "match", note: "3+ years across 8 projects" },
      { name: "TypeScript", status: "match", note: "Used in 12 repositories" },
      { name: "Prosemirror", status: "missing", note: "No rich text editor experience" },
      { name: "CRDT/OT", status: "missing", note: "No collaborative editing experience" },
      { name: "State Management", status: "match", note: "Redux and Zustand experience" },
    ],
  },
};

export const mockApplicationStatus = {
  1: { status: "not_applied" },
  2: { status: "applied", date: "2026-03-21" },
  3: { status: "interview", date: "2026-03-16" },
  4: { status: "rejected", date: "2026-03-14" },
  5: { status: "not_applied" },
  6: { status: "not_applied" },
};

export const applicationStatuses = {
  applied: { label: "Applied", color: "bg-secondary-container text-on-secondary-container" },
  interview: { label: "Interview", color: "bg-warning-light text-amber-700" },
  offer: { label: "Offer", color: "bg-tertiary-fixed-dim/20 text-on-tertiary-container" },
  rejected: { label: "Rejected", color: "bg-error-container text-on-error-container" },
};
