import { createStorefrontHomeHandler } from "@/features/home/api/home-handler";
import { drizzleHomeRepository } from "@/features/home/repositories/drizzle-home-repository";

export const GET = createStorefrontHomeHandler(drizzleHomeRepository);
