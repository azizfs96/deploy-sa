import { Framework } from "./types";

/** Default install/build/output commands per detected framework. */
export function defaultBuildConfig(f: Framework): {
  installCommand: string;
  buildCommand: string;
  outputDir: string;
} {
  if (f === "python")
    return {
      installCommand: "pip install -r requirements.txt",
      buildCommand: "python build.py",
      outputDir: "dist",
    };
  if (f === "static")
    return {
      installCommand: "npm install",
      buildCommand: "npm run build",
      outputDir: "out",
    };
  return {
    installCommand: "npm install",
    buildCommand: "npm run build",
    outputDir: ".next",
  };
}

/** Build a simulated deployment log stream for a freshly imported project. */
export function buildDeployLogs(
  fullName: string,
  branch: string,
  framework: Framework,
  cfg: { installCommand: string; buildCommand: string }
): string[] {
  return [
    `Cloning ${fullName} (branch: ${branch})...`,
    "Cloning completed: 1.2s",
    `Detected framework: ${framework}`,
    `Running "${cfg.installCommand}"...`,
    "added 284 packages in 7s",
    `Running "${cfg.buildCommand}"...`,
    "Compiled successfully",
    "Generating output...",
    "Uploading build outputs...",
    "Assigning domain...",
    "✓ Deployment completed",
  ];
}
