export type IntentType =
  | "coding"
  | "browser"
  | "file"
  | "terminal"
  | "research"
  | "writing"
  | "analysis"
  | "math"
  | "creative"
  | "vision"
  | "data"
  | "scheduling"
  | "general";

export interface Intent {
  type: IntentType;
  needsSubAgent: boolean;
  multiStep: boolean;
  risk: "low" | "medium" | "high";
  tools: string[];
}

export interface TaskPlan {
  intent: Intent;
  steps: string[];
  recommendedRole: "main" | "coding" | "browser" | "research" | "cheap";
  rationale: string;
}

interface IntentPattern {
  type: IntentType;
  patterns: RegExp[];
  role: TaskPlan["recommendedRole"];
  steps: string[];
  tools: string[];
}

const PATTERNS: IntentPattern[] = [
  {
    type: "coding",
    patterns: [/\b(code|coding|refactor|bug|typescript|javascript|python|rust|java|golang|kotlin|swift|sdk|library|framework|api|module|class|function|test|build|compile|debug|stack[- ]?trace|exception|lint)\b/i],
    role: "coding",
    tools: ["file", "terminal"],
    steps: [
      "Analyse request",
      "Inspect relevant files",
      "Plan changes",
      "Implement edits",
      "Run lint/tests where available",
      "Report",
    ],
  },
  {
    type: "browser",
    patterns: [/\b(browser|chromium|chrome|website|web\b|halaman|tab|click|screenshot|form|url|buka|bukain|search|cari|scrape|crawl|youtube|google|navigate)\b/i],
    role: "browser",
    tools: ["browser"],
    steps: [
      "Open browser context",
      "Inspect target page",
      "Draft actions",
      "Confirm risky actions",
      "Execute interaction",
      "Capture evidence",
      "Summarize result",
    ],
  },
  {
    type: "research",
    patterns: [/\b(research|riset|find\s+out|cari\s+tahu|gather|sources|paper|article|jurnal|cite|kutip|berita|news|trend|state\s+of)\b/i],
    role: "research",
    tools: ["browser", "memory"],
    steps: [
      "Frame research question",
      "Identify sources",
      "Browse and extract evidence",
      "Cross-reference key facts",
      "Synthesise concise findings",
    ],
  },
  {
    type: "writing",
    patterns: [/\b(write|tulis|draft|rewrite|paraphrase|tone|email|letter|surat|proposal|caption|essay|article|blog|story|script)\b/i],
    role: "main",
    tools: ["memory"],
    steps: [
      "Clarify audience and intent",
      "Outline structure",
      "Draft prose",
      "Polish tone and flow",
      "Deliver result",
    ],
  },
  {
    type: "analysis",
    patterns: [/\b(analy[sz]e|analisa|analisis|evaluate|compare|bandingkan|review|audit|critique|kritik|insight|kesimpulan|summari[sz]e|ringkas)\b/i],
    role: "main",
    tools: ["memory"],
    steps: [
      "Clarify scope",
      "Collect inputs",
      "Apply structured analysis",
      "Highlight key findings",
      "Recommend next action",
    ],
  },
  {
    type: "math",
    patterns: [/\b(calc(ulate)?|hitung|sum|average|mean|median|rate|percent|persen|formula|equation|matematika|integral|derivative|probability)\b/i],
    role: "main",
    tools: [],
    steps: [
      "Restate the problem",
      "Choose formula or method",
      "Compute step by step",
      "Verify the result",
      "Explain the answer",
    ],
  },
  {
    type: "creative",
    patterns: [/\b(brainstorm|ide\s|ideas?|kreatif|creative|naming|slogan|tagline|design|mock|sketch)\b/i],
    role: "main",
    tools: [],
    steps: [
      "Understand constraints",
      "Generate diverse options",
      "Score against criteria",
      "Recommend top picks",
    ],
  },
  {
    type: "data",
    patterns: [/\b(csv|json|tabel|table|spreadsheet|database|sql|query|filter|aggregate|chart|grafik|metric)\b/i],
    role: "coding",
    tools: ["file", "terminal"],
    steps: [
      "Locate data source",
      "Inspect schema",
      "Transform / aggregate",
      "Validate sample",
      "Return structured output",
    ],
  },
  {
    type: "vision",
    patterns: [/\b(image|gambar|photo|foto|screenshot|ocr|describe|caption|extract\s+text)\b/i],
    role: "main",
    tools: ["file"],
    steps: ["Receive image input", "Describe or extract", "Verify output", "Deliver"],
  },
  {
    type: "terminal",
    patterns: [/\b(run|jalankan|exec|terminal|shell|command|install|update|npm|yarn|pnpm|pip|cargo|git\s)\b/i],
    role: "main",
    tools: ["terminal"],
    steps: ["Plan command", "Confirm risk", "Execute", "Capture output", "Report"],
  },
  {
    type: "file",
    patterns: [/\b(file|read\s+file|tulis\s+file|create\s+file|hapus\s+file|copy|move|rename|directory|folder)\b/i],
    role: "coding",
    tools: ["file"],
    steps: ["Locate file", "Apply change", "Verify", "Report"],
  },
  {
    type: "scheduling",
    patterns: [/\b(remind|reminder|schedule|jadwal|calendar|kalender|meeting|rapat|deadline)\b/i],
    role: "main",
    tools: ["calendar"],
    steps: ["Capture details", "Validate constraints", "Schedule", "Confirm"],
  },
];

const DESTRUCTIVE = /\b(delete|hapus|rm\s+-rf|drop\s+table|publish|send\s+email|kirim\s+email|transfer|buy|beli|charge|withdraw)\b/i;
const COMPLEX = /\b(besar|kompleks|complex|multi[- ]step|multi[- ]task|workflow|pipeline|sub[- ]agent|worker|orchestrate|dan\s+lalu|after\s+that|kemudian|setelah\s+itu)\b/i;

export class Planner {
  createPlan(message: string): TaskPlan {
    const matches = PATTERNS.filter((pattern) => pattern.patterns.some((re) => re.test(message)));
    const primary = matches[0];
    const destructive = DESTRUCTIVE.test(message);
    const multiStep = COMPLEX.test(message) || matches.length > 1 || message.length > 240;
    const risk: Intent["risk"] = destructive ? "high" : multiStep ? "medium" : "low";
    const tools = Array.from(new Set(matches.flatMap((m) => m.tools)));

    if (!primary) {
      return {
        intent: { type: "general", needsSubAgent: false, multiStep, risk, tools },
        recommendedRole: "main",
        rationale: "No specialised intent detected; using general assistant flow.",
        steps: [
          "Understand user request",
          "Retrieve relevant memory",
          "Reason and respond",
          "Offer follow-up actions",
        ],
      };
    }

    return {
      intent: { type: primary.type, needsSubAgent: multiStep, multiStep, risk, tools },
      recommendedRole: primary.role,
      rationale: `Detected '${primary.type}' intent (matched ${matches.length} pattern${matches.length === 1 ? "" : "s"}).`,
      steps: primary.steps,
    };
  }
}
