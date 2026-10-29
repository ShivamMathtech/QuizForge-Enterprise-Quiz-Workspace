import type { Quiz, Question, User, Attempt } from "./domain.js";
import { grade } from "./domain.js";

function q(
  id: string,
  prompt: string,
  choices: string[],
  answer: number | number[],
  explanation: string,
): Question {
  const indexes = Array.isArray(answer) ? answer : [answer];
  return {
    id,
    prompt,
    type: Array.isArray(answer) ? "multiple" : "single",
    options: choices.map((text, i) => ({ id: `o${i}`, text })),
    correct: indexes.map((i) => `o${i}`),
    explanation,
    points: 1,
  };
}
const sets: {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: Quiz["difficulty"];
  questions: Question[];
}[] = [
  {
    id: "web-foundations",
    title: "Web Development Foundations",
    description:
      "From semantic HTML to the browser request cycle. Build confidence in the foundations of the modern web.",
    category: "Development",
    difficulty: "Beginner",
    questions: [
      q(
        "web1",
        "Which HTML element represents the main content of a document?",
        ["<section>", "<main>", "<div>", "<aside>"],
        1,
        "The main element identifies the dominant content of the document for accessibility and document structure.",
      ),
      q(
        "web2",
        "Which CSS layout system is designed for two-dimensional layouts?",
        ["Flexbox", "CSS Grid", "Float", "Inline layout"],
        1,
        "CSS Grid controls rows and columns together. Flexbox focuses on a single primary axis.",
      ),
      q(
        "web3",
        "What does an HTTP 404 response indicate?",
        [
          "Authentication required",
          "Resource not found",
          "Successful creation",
          "Server temporarily unavailable",
        ],
        1,
        "404 Not Found means the requested resource could not be found.",
      ),
      q(
        "web4",
        "Which JavaScript declaration is block-scoped and cannot be reassigned?",
        ["var", "let", "const", "static"],
        2,
        "const prevents reassignment of the binding. The contents of a referenced object can still change.",
      ),
      q(
        "web5",
        "Select all practices that improve web accessibility.",
        [
          "Meaningful alternative text",
          "Keyboard navigation",
          "Using color as the only indicator",
          "Associated form labels",
        ],
        [0, 1, 3],
        "Alternative text, keyboard access, and labels support different ways of using a website. Color alone is insufficient.",
      ),
      q(
        "web6",
        "Which method reads a JSON response body using the Fetch API?",
        [
          "response.json()",
          "response.parse()",
          "JSON.fetch()",
          "response.body()",
        ],
        0,
        "response.json() reads the stream and returns a promise for the parsed JSON.",
      ),
      q(
        "web7",
        "What is the primary purpose of HTTPS?",
        [
          "Compress every image",
          "Encrypt transport and authenticate the server",
          "Store browser cookies",
          "Prevent all application bugs",
        ],
        1,
        "HTTPS uses TLS to protect data in transit and authenticate the server via certificates.",
      ),
      q(
        "web8",
        "Which CSS unit is relative to the root element font size?",
        ["px", "em", "rem", "vh"],
        2,
        "rem is based on the root element font size; em depends on the relevant element context.",
      ),
      q(
        "web9",
        "What does preventDefault() do on a DOM event?",
        [
          "Stops all JavaScript",
          "Stops event propagation",
          "Cancels the default browser action",
          "Removes the event listener",
        ],
        2,
        "preventDefault cancels an applicable default action. stopPropagation controls propagation.",
      ),
      q(
        "web10",
        "Which browser storage normally persists after closing a browser tab?",
        [
          "A local variable",
          "sessionStorage",
          "localStorage",
          "The call stack",
        ],
        2,
        "localStorage persists across sessions unless the user or browser clears it.",
      ),
    ],
  },
  {
    id: "react-essentials",
    title: "React & JavaScript Essentials",
    description:
      "Put your component thinking to the test with state, effects, immutable updates, and everyday JavaScript.",
    category: "Development",
    difficulty: "Intermediate",
    questions: [
      q(
        "react1",
        "What is the correct way to update an array stored in React state?",
        [
          "Mutate it with push and reuse it",
          "Create a new array and set state",
          "Change the DOM directly",
          "Use a global variable",
        ],
        1,
        "Immutable updates produce a new reference that React can use to detect changes.",
      ),
      q(
        "react2",
        "Why should list items have stable keys in React?",
        [
          "To style the elements",
          "To preserve identity between renders",
          "To make arrays sortable",
          "To enable CSS Grid",
        ],
        1,
        "Keys help React match children across renders and preserve their state correctly.",
      ),
      q(
        "react3",
        "Which hook stores a mutable value without triggering a render when it changes?",
        ["useState", "useEffect", "useRef", "useId"],
        2,
        "Changing ref.current does not cause a rerender.",
      ),
      q(
        "react4",
        "Which expression creates a shallow copy of an object?",
        [
          "const b = a",
          "const b = {...a}",
          "const b = Object.freeze(a)",
          "const b = a.valueOf()",
        ],
        1,
        "Object spread copies enumerable own properties. Nested objects remain shared references.",
      ),
      q(
        "react5",
        "Select the valid reasons to use an Effect.",
        [
          "Subscribe to a browser event",
          "Derive a full name from props",
          "Connect to an external service",
          "Calculate an array length",
        ],
        [0, 2],
        "Effects synchronize with external systems. Simple derived values usually belong in rendering.",
      ),
      q(
        "react6",
        "What is returned by an async function?",
        ["Always a string", "A Promise", "Only undefined", "A callback"],
        1,
        "Async functions always return a promise, adopting returned promises or wrapping values.",
      ),
      q(
        "react7",
        "What is a controlled input in React?",
        [
          "An input whose value comes from React state",
          "An input with only a defaultValue",
          "An input inside a table",
          "A disabled input",
        ],
        0,
        "A controlled input receives its value from state and updates that state through an event handler.",
      ),
      q(
        "react8",
        "Why use setCount(previous => previous + 1)?",
        [
          "It avoids rendering",
          "It uses the latest pending state",
          "It changes props",
          "It disables batching",
        ],
        1,
        "Functional updaters calculate from the prior pending state, which is useful with queued updates.",
      ),
    ],
  },
  {
    id: "data-structures",
    title: "Data Structures & Algorithms",
    description:
      "Explore complexity, searching, stacks, trees, and the building blocks of efficient problem solving.",
    category: "Computer Science",
    difficulty: "Advanced",
    questions: [
      q(
        "dsa1",
        "What is the worst-case time complexity of binary search on a sorted array?",
        ["O(1)", "O(log n)", "O(n)", "O(n²)"],
        1,
        "Each comparison halves the remaining search interval, yielding logarithmic time.",
      ),
      q(
        "dsa2",
        "Which data structure naturally supports undo operations?",
        ["Queue", "Stack", "Hash set", "Heap"],
        1,
        "A stack follows last-in, first-out order, matching the reversal of recent actions.",
      ),
      q(
        "dsa3",
        "Which traversal finds shortest paths in an unweighted graph?",
        [
          "Depth-first search",
          "Breadth-first search",
          "In-order traversal",
          "Binary search",
        ],
        1,
        "BFS explores vertices in layers of increasing distance from the source.",
      ),
      q(
        "dsa4",
        "What is the average lookup time in a well-designed hash table?",
        ["O(1)", "O(log n)", "O(n log n)", "O(n²)"],
        0,
        "A well-distributed hash function and controlled load factor allow expected constant-time lookup.",
      ),
      q(
        "dsa5",
        "Select the properties of a binary search tree with unique keys.",
        [
          "Left subtree keys are smaller",
          "Right subtree keys are larger",
          "Every node has two children",
          "In-order traversal is sorted",
        ],
        [0, 1, 3],
        "BST ordering yields sorted in-order traversal. Nodes may have zero, one, or two children.",
      ),
      q(
        "dsa6",
        "What is the worst-case time complexity of merge sort?",
        ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
        1,
        "There are logarithmically many merge levels and linear work at each level.",
      ),
      q(
        "dsa7",
        "Which structure efficiently retrieves the minimum item repeatedly?",
        ["Min-heap", "Unsorted array", "Stack", "Singly linked list"],
        0,
        "A min-heap provides constant-time minimum lookup and logarithmic extraction.",
      ),
      q(
        "dsa8",
        "What condition is required for standard Dijkstra shortest-path correctness?",
        [
          "All edge weights are negative",
          "No negative edge weights",
          "The graph must be a tree",
          "Exactly one path exists",
        ],
        1,
        "Dijkstra relies on nonnegative weights to finalize the closest unsettled vertex safely.",
      ),
    ],
  },
  {
    id: "product-design",
    title: "UI/UX Design Principles",
    description:
      "Make thoughtful design decisions with visual hierarchy, accessible interfaces, research, and usability.",
    category: "Design",
    difficulty: "Beginner",
    questions: [
      q(
        "design1",
        "What is the purpose of visual hierarchy?",
        [
          "Make every element equally prominent",
          "Guide attention by relative importance",
          "Use as many fonts as possible",
          "Remove all whitespace",
        ],
        1,
        "Hierarchy directs attention and makes information easier to scan and understand.",
      ),
      q(
        "design2",
        "Which activity best validates whether users can complete a task?",
        [
          "Usability testing",
          "Choosing a brand color",
          "Compressing images",
          "Naming layers",
        ],
        0,
        "Usability testing observes representative users attempting realistic tasks.",
      ),
      q(
        "design3",
        "What does a wireframe primarily communicate?",
        [
          "Final typography",
          "Layout and content structure",
          "Production animation timing",
          "Database constraints",
        ],
        1,
        "Wireframes focus on structure and flows without requiring final visual styling.",
      ),
      q(
        "design4",
        "Which feedback best supports an invalid form submission?",
        [
          "A red border with no explanation",
          "A specific error near the affected field",
          "An empty page",
          "Deleting the user input",
        ],
        1,
        "Specific, accessible error text helps people understand and correct a problem.",
      ),
      q(
        "design5",
        "Select helpful practices for a mobile interface.",
        [
          "Adequate touch targets",
          "Responsive layouts",
          "Tiny unlabeled icons only",
          "Readable text sizes",
        ],
        [0, 1, 3],
        "Mobile interfaces should accommodate touch input and smaller screens without sacrificing readability.",
      ),
      q(
        "design6",
        "What is the main goal of a design system?",
        [
          "Eliminate all research",
          "Provide shared reusable patterns and standards",
          "Require identical page layouts",
          "Replace source control",
        ],
        1,
        "Design systems support consistency through shared components, guidance, and design decisions.",
      ),
    ],
  },
  {
    id: "database-core",
    title: "Database & SQL Fundamentals",
    description:
      "Work through joins, keys, transactions, and indexing with practical relational database questions.",
    category: "Computer Science",
    difficulty: "Intermediate",
    questions: [
      q(
        "sql1",
        "Which SQL clause filters groups after aggregation?",
        ["WHERE", "HAVING", "ORDER BY", "LIMIT"],
        1,
        "HAVING filters aggregated groups, while WHERE filters rows before grouping.",
      ),
      q(
        "sql2",
        "What is a primary key used for?",
        [
          "Encrypting records",
          "Uniquely identifying each row",
          "Sorting every query",
          "Storing passwords",
        ],
        1,
        "A primary key uniquely identifies a row and cannot be null.",
      ),
      q(
        "sql3",
        "Which join preserves all rows from the left table?",
        ["INNER JOIN", "LEFT JOIN", "CROSS JOIN only", "SELF JOIN only"],
        1,
        "A LEFT JOIN returns every left-side row, using nulls when no right-side row matches.",
      ),
      q(
        "sql4",
        "Which technique helps prevent SQL injection?",
        [
          "Concatenate raw user input",
          "Use parameterized queries",
          "Hide the database name",
          "Disable indexes",
        ],
        1,
        "Parameterized queries keep input data separate from SQL structure.",
      ),
      q(
        "sql5",
        "Select the properties represented by ACID.",
        ["Atomicity", "Consistency", "Isolation", "Durability"],
        [0, 1, 2, 3],
        "ACID describes Atomicity, Consistency, Isolation, and Durability of transactions.",
      ),
      q(
        "sql6",
        "What is a common tradeoff of adding a database index?",
        [
          "Faster reads but additional storage and write work",
          "All queries become constant time",
          "No additional storage",
          "Foreign keys stop working",
        ],
        0,
        "Indexes can speed reads but must be maintained during writes and occupy storage.",
      ),
    ],
  },
  {
    id: "quantitative",
    title: "Quantitative Aptitude",
    description:
      "Sharpen your numerical reasoning with probability, percentages, arithmetic, and logical problem solving.",
    category: "Mathematics",
    difficulty: "Intermediate",
    questions: [
      q(
        "math1",
        "If a price increases by 20% and then decreases by 20%, what is the net change?",
        ["No change", "4% decrease", "4% increase", "40% decrease"],
        1,
        "Starting at 100, the price becomes 120 and then 96, a 4% decrease.",
      ),
      q(
        "math2",
        "What is the probability of rolling an even number on a fair six-sided die?",
        ["1/6", "1/3", "1/2", "2/3"],
        2,
        "Three of the six outcomes (2, 4, 6) are even, so the probability is 3/6.",
      ),
      q(
        "math3",
        "What is the arithmetic mean of 4, 8, 12, and 16?",
        ["8", "10", "12", "14"],
        1,
        "The sum is 40, divided by four values gives 10.",
      ),
      q(
        "math4",
        "A train travels 180 km in 3 hours. What is its average speed?",
        ["30 km/h", "45 km/h", "60 km/h", "90 km/h"],
        2,
        "Average speed is distance divided by time: 180/3 = 60 km/h.",
      ),
      q(
        "math5",
        "Which of these numbers are prime?",
        ["2", "9", "13", "21"],
        [0, 2],
        "2 and 13 have exactly two positive divisors. 9 and 21 are composite.",
      ),
      q(
        "math6",
        "How many ways can three distinct books be arranged on a shelf?",
        ["3", "6", "9", "12"],
        1,
        "There are 3! = 3 × 2 × 1 = 6 possible arrangements.",
      ),
    ],
  },
];
export function seedQuizzes(owner = "demo-instructor"): Quiz[] {
  return sets.map((s, i) => ({
    ...s,
    questions: structuredClone(s.questions),
    createdBy: owner,
    updatedAt: "2026-10-01T09:00:00.000Z",
    revision: 1,
    duration: i === 0 ? 15 : 12,
    passPercent: 70,
    maxAttempts: 5,
    shuffle: true,
    status: "published",
    featured: i < 2,
  }));
}
export function seedUsers(): User[] {
  return [
    {
      id: "demo-learner",
      name: "Shivam Singh",
      email: "learner@quizforge.local",
      role: "learner",
      active: true,
      joinedAt: "2026-10-01T00:00:00.000Z",
    },
    {
      id: "demo-instructor",
      name: "Alex Morgan",
      email: "instructor@quizforge.local",
      role: "instructor",
      active: true,
      joinedAt: "2026-10-01T00:00:00.000Z",
    },
    {
      id: "demo-admin",
      name: "Workspace Admin",
      email: "admin@quizforge.local",
      role: "admin",
      active: true,
      joinedAt: "2026-10-01T00:00:00.000Z",
    },
    ...["Priya Sharma", "Arjun Mehta", "Neha Kapoor", "Rohan Das"].map(
      (name, i) => ({
        id: `sample-${i}`,
        name,
        email: `sample${i}@example.test`,
        role: "learner" as const,
        active: true,
        joinedAt: "2026-10-01T00:00:00.000Z",
      }),
    ),
  ];
}
export function seedAttempts(quizzes: Quiz[]): Attempt[] {
  const out: Attempt[] = [];
  for (let user = 0; user < 5; user++) {
    const uid = user === 0 ? "demo-learner" : `sample-${user - 1}`;
    for (let i = 0; i < (user === 0 ? 3 : 4); i++) {
      const quiz = quizzes[(i + 2) % quizzes.length];
      const answers = Object.fromEntries(
        quiz.questions.map((q, j) => [
          q.id,
          j % (4 + user) === 0
            ? [
                q.options.find((o) => !q.correct.includes(o.id))?.id ??
                  q.options[0].id,
              ]
            : q.correct,
        ]),
      );
      const result = grade(quiz.questions, answers);
      const start = new Date(
        Date.now() - (7 - i * 2) * 86400000 - user * 3600000,
      ).toISOString();
      out.push({
        id: `sample-attempt-${user}-${i}`,
        userId: uid,
        quizId: quiz.id,
        quizTitle: quiz.title,
        category: quiz.category,
        questions: structuredClone(quiz.questions),
        answers,
        flagged: [],
        startedAt: start,
        deadline: new Date(
          Date.parse(start) + quiz.duration * 60000,
        ).toISOString(),
        submittedAt: new Date(Date.parse(start) + 230000).toISOString(),
        status: "completed",
        version: 1,
        passPercent: quiz.passPercent,
        ...result,
        passed: result.score >= quiz.passPercent,
        reason: "submitted",
      });
    }
  }
  return out;
}
