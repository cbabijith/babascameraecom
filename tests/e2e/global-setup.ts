import { seedLocalAuthFixtures } from "./auth-fixtures";

export default async function globalSetup(): Promise<void> {
  if (process.env.E2E_SEED_AUTH !== "true") {
    return;
  }

  await seedLocalAuthFixtures();
}
