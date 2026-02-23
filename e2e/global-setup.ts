import { execSync } from "child_process";

export default async function globalSetup() {
  console.log("[global-setup] Pushing schema and seeding database…");
  execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
  console.log("[global-setup] Database ready.");
}
