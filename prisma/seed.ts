import { PrismaClient } from "@prisma/client";
import { projects as mockProjects } from "../src/lib/mock-data";

const prisma = new PrismaClient();

/**
 * Optional demo seed. Attaches the three sample projects to the FIRST user in
 * the database (sign in via GitHub once first so a user exists). Safe to re-run
 * — it skips if that user already has projects.
 */
async function main() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    console.log("No user found. Sign in with GitHub once, then run db:seed.");
    return;
  }

  const existing = await prisma.project.count({ where: { userId: user.id } });
  if (existing > 0) {
    console.log(`User already has ${existing} projects — skipping seed.`);
    return;
  }

  for (const p of mockProjects) {
    await prisma.project.create({
      data: {
        name: p.name,
        slug: p.id,
        framework: p.framework,
        status: p.status,
        domain: p.domain,
        repoFullName: p.repo.fullName,
        repoLanguage: p.repo.language,
        repoVisibility: p.repo.visibility,
        branch: p.branch,
        autoDeploy: p.autoDeploy,
        webhookActive: p.webhookActive,
        installCommand: p.installCommand,
        buildCommand: p.buildCommand,
        outputDir: p.outputDir,
        userId: user.id,
        envVars: { create: p.envVars.map((e) => ({ key: e.key, value: e.value })) },
        deployments: {
          create: p.deployments.map((d) => ({
            commitHash: d.commitHash,
            commitMessage: d.commitMessage,
            branch: d.branch,
            authorName: d.author.name,
            authorUsername: d.author.username,
            authorAvatar: d.author.avatar,
            status: d.status,
            durationSec: d.durationSec,
            logs: d.logs,
            createdAt: new Date(d.createdAt),
          })),
        },
      },
    });
  }
  console.log(`Seeded ${mockProjects.length} demo projects for ${user.email ?? user.id}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
