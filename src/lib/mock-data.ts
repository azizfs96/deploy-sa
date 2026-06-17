import { Deployment, Project, Repo, User } from "./types";

/** ---- Users (realistic Saudi GitHub identities) ---- */
export const currentUser: User = {
  name: "نواف الحربي",
  username: "nawaf-dev",
  email: "nawaf@deploy.sa",
  avatar: "https://avatars.githubusercontent.com/u/9919?v=4",
};

const users: Record<string, User> = {
  nawaf: currentUser,
  sara: {
    name: "سارة القحطاني",
    username: "sara-qht",
    email: "sara@deploy.sa",
    avatar: "https://avatars.githubusercontent.com/u/810438?v=4",
  },
  abdullah: {
    name: "عبدالله الدوسري",
    username: "abdullah-dsr",
    email: "abdullah@deploy.sa",
    avatar: "https://avatars.githubusercontent.com/u/1024025?v=4",
  },
  reem: {
    name: "ريم العتيبي",
    username: "reem-otb",
    email: "reem@deploy.sa",
    avatar: "https://avatars.githubusercontent.com/u/16860528?v=4",
  },
};

/** ---- Helpers ---- */
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

function buildLogs(framework: string, fail = false): string[] {
  const base = [
    "Cloning repository...",
    "Cloning completed: 1.42s",
    "Running \"install\" command...",
    framework === "python" ? "pip install -r requirements.txt" : "npm install",
    "added 312 packages in 8s",
    "Running \"build\" command...",
    framework === "python"
      ? "Collecting static files..."
      : "> next build",
    "Creating an optimized production build...",
    "Compiled successfully",
    "Generating static pages (12/12)",
    "Finalizing page optimization...",
  ];
  if (fail) {
    return [
      ...base.slice(0, 7),
      "Error: Module not found: Can't resolve '@/lib/config'",
      "Build failed with exit code 1",
      "Deployment failed.",
    ];
  }
  return [
    ...base,
    "Uploading build outputs...",
    "Deployment completed",
    "Assigning custom domains...",
    "✓ Ready",
  ];
}

let depCounter = 0;
function dep(
  partial: Omit<Deployment, "id" | "logs"> & { framework: string; fail?: boolean }
): Deployment {
  const { framework, fail, ...rest } = partial;
  return {
    id: `dep_${++depCounter}`,
    logs: buildLogs(framework, fail || rest.status === "failed"),
    ...rest,
  };
}

/** ---- Repos ---- */
const repos: Record<string, Repo> = {
  api: {
    id: "r1",
    name: "matjar-api",
    fullName: "nawaf-dev/matjar-api",
    visibility: "private",
    language: "TypeScript",
    updatedAt: hoursAgo(3),
    framework: "node",
  },
  data: {
    id: "r2",
    name: "tahlil-bayanat",
    fullName: "nawaf-dev/tahlil-bayanat",
    visibility: "private",
    language: "Python",
    updatedAt: hoursAgo(20),
    framework: "python",
  },
  site: {
    id: "r3",
    name: "mawqe-sharika",
    fullName: "nawaf-dev/mawqe-sharika",
    visibility: "public",
    language: "HTML",
    updatedAt: hoursAgo(54),
    framework: "static",
  },
};

/** ---- Projects ---- */
export const projects: Project[] = [
  {
    id: "matjar-api",
    name: "متجر-api",
    framework: "node",
    status: "ready",
    domain: "matjar-api.deploy.sa",
    repo: repos.api,
    branch: "main",
    autoDeploy: true,
    webhookActive: true,
    installCommand: "npm install",
    buildCommand: "npm run build",
    outputDir: ".next",
    envVars: [
      { id: "e1", key: "DATABASE_URL", value: "postgres://db.deploy.sa:5432/matjar" },
      { id: "e2", key: "JWT_SECRET", value: "sk_live_8f2a91c0e4b7d6" },
      { id: "e3", key: "STRIPE_KEY", value: "pk_live_51Hx9aKL2mNoP" },
    ],
    deployments: [
      dep({
        framework: "node",
        commitHash: "a3f91c20d4e8",
        commitMessage: "إضافة بوابة الدفع مدى",
        branch: "main",
        author: users.nawaf,
        status: "ready",
        durationSec: 47,
        createdAt: hoursAgo(3),
      }),
      dep({
        framework: "node",
        commitHash: "b71e0042aa19",
        commitMessage: "fix: تصحيح حساب الضريبة في الفاتورة",
        branch: "main",
        author: users.sara,
        status: "ready",
        durationSec: 52,
        createdAt: hoursAgo(9),
      }),
      dep({
        framework: "node",
        commitHash: "c0d4e8f10b22",
        commitMessage: "refactor: migrate orders service to Prisma",
        branch: "feat/orders",
        author: users.abdullah,
        status: "failed",
        durationSec: 31,
        createdAt: hoursAgo(15),
      }),
      dep({
        framework: "node",
        commitHash: "d9a18c33ef07",
        commitMessage: "إعداد التكامل مع نظام المخزون",
        branch: "main",
        author: users.nawaf,
        status: "ready",
        durationSec: 44,
        createdAt: hoursAgo(28),
      }),
      dep({
        framework: "node",
        commitHash: "e4b7d6a90c15",
        commitMessage: "chore: bump dependencies",
        branch: "main",
        author: users.reem,
        status: "ready",
        durationSec: 39,
        createdAt: hoursAgo(50),
      }),
    ],
  },
  {
    id: "tahlil-bayanat",
    name: "تحليل-بيانات",
    framework: "python",
    status: "building",
    domain: "tahlil-bayanat.deploy.sa",
    repo: repos.data,
    branch: "main",
    autoDeploy: true,
    webhookActive: true,
    installCommand: "pip install -r requirements.txt",
    buildCommand: "python build.py",
    outputDir: "dist",
    envVars: [
      { id: "e4", key: "MODEL_PATH", value: "/models/forecast-v3.pkl" },
      { id: "e5", key: "API_TOKEN", value: "hf_aZ91kLmNoPqRsTuV" },
    ],
    deployments: [
      dep({
        framework: "python",
        commitHash: "f10b22c3d4e5",
        commitMessage: "تحديث نموذج التنبؤ بالمبيعات",
        branch: "main",
        author: users.reem,
        status: "building",
        durationSec: 18,
        createdAt: hoursAgo(0.1),
      }),
      dep({
        framework: "python",
        commitHash: "0a1b2c3d4e5f",
        commitMessage: "feat: add Arabic NLP preprocessing pipeline",
        branch: "main",
        author: users.abdullah,
        status: "ready",
        durationSec: 96,
        createdAt: hoursAgo(20),
      }),
      dep({
        framework: "python",
        commitHash: "1f2e3d4c5b6a",
        commitMessage: "إصلاح ترميز UTF-8 في ملفات CSV",
        branch: "main",
        author: users.nawaf,
        status: "ready",
        durationSec: 88,
        createdAt: hoursAgo(40),
      }),
      dep({
        framework: "python",
        commitHash: "2b3c4d5e6f70",
        commitMessage: "experiment: try XGBoost over LightGBM",
        branch: "exp/xgboost",
        author: users.sara,
        status: "failed",
        durationSec: 64,
        createdAt: hoursAgo(62),
      }),
    ],
  },
  {
    id: "mawqe-sharika",
    name: "موقع-شركة",
    framework: "static",
    status: "ready",
    domain: "mawqe-sharika.deploy.sa",
    repo: repos.site,
    branch: "main",
    autoDeploy: false,
    webhookActive: false,
    installCommand: "npm install",
    buildCommand: "npm run build",
    outputDir: "out",
    envVars: [
      { id: "e6", key: "NEXT_PUBLIC_MAP_KEY", value: "AIzaSyD-mapKey-xyz123" },
    ],
    deployments: [
      dep({
        framework: "static",
        commitHash: "3c4d5e6f7081",
        commitMessage: "تحديث صفحة من نحن وإضافة الفريق",
        branch: "main",
        author: users.nawaf,
        status: "ready",
        durationSec: 22,
        createdAt: hoursAgo(54),
      }),
      dep({
        framework: "static",
        commitHash: "4d5e6f708192",
        commitMessage: "style: responsive hero section",
        branch: "main",
        author: users.sara,
        status: "ready",
        durationSec: 19,
        createdAt: hoursAgo(80),
      }),
      dep({
        framework: "static",
        commitHash: "5e6f70819203",
        commitMessage: "إضافة نموذج التواصل",
        branch: "main",
        author: users.reem,
        status: "ready",
        durationSec: 24,
        createdAt: hoursAgo(120),
      }),
      dep({
        framework: "static",
        commitHash: "6f7081920314",
        commitMessage: "initial commit",
        branch: "main",
        author: users.nawaf,
        status: "ready",
        durationSec: 17,
        createdAt: hoursAgo(160),
      }),
    ],
  },
];

/** ---- Available repos for the New Project flow ---- */
export const availableRepos: Repo[] = [
  repos.api,
  repos.data,
  repos.site,
  {
    id: "r4",
    name: "hajz-mawaeed",
    fullName: "nawaf-dev/hajz-mawaeed",
    visibility: "private",
    language: "TypeScript",
    updatedAt: hoursAgo(6),
    framework: "node",
  },
  {
    id: "r5",
    name: "lوحة-تحكم",
    fullName: "nawaf-dev/dashboard-kit",
    visibility: "public",
    language: "TypeScript",
    updatedAt: hoursAgo(12),
    framework: "node",
  },
  {
    id: "r6",
    name: "tasneef-suwar",
    fullName: "nawaf-dev/tasneef-suwar",
    visibility: "private",
    language: "Python",
    updatedAt: hoursAgo(30),
    framework: "python",
  },
  {
    id: "r7",
    name: "portfolio-2026",
    fullName: "nawaf-dev/portfolio-2026",
    visibility: "public",
    language: "Astro",
    updatedAt: hoursAgo(72),
    framework: "static",
  },
];

/** Flattened activity feed: latest 5 deployments across all projects. */
export function recentActivity(): (Deployment & { project: Project })[] {
  return projects
    .flatMap((p) => p.deployments.map((d) => ({ ...d, project: p })))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);
}

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}
