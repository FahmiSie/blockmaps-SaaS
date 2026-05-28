import { userRouter } from "@/server/api/routers/user";
import { companyRouter } from "@/server/api/routers/company";
import { zoneRouter } from "@/server/api/routers/zone";
import { itemRouter, inventoryRouter } from "@/server/api/routers/item";
import { deliveryRouter } from "@/server/api/routers/delivery";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  company: companyRouter,
  zone: zoneRouter,
  item: itemRouter,
  inventory: inventoryRouter,
  delivery: deliveryRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
