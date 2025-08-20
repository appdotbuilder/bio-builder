import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  getUserByUsernameInputSchema,
  createLinkInputSchema,
  updateLinkInputSchema,
  getLinksByUserInputSchema,
  reorderLinksInputSchema,
  trackLinkClickInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { updateUser } from './handlers/update_user';
import { getUserByUsername } from './handlers/get_user_by_username';
import { getPublicProfile } from './handlers/get_public_profile';
import { createLink } from './handlers/create_link';
import { updateLink } from './handlers/update_link';
import { deleteLink, type DeleteLinkInput } from './handlers/delete_link';
import { getLinksByUser } from './handlers/get_links_by_user';
import { reorderLinks } from './handlers/reorder_links';
import { trackLinkClick } from './handlers/track_link_click';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  getUserByUsername: publicProcedure
    .input(getUserByUsernameInputSchema)
    .query(({ input }) => getUserByUsername(input)),

  getPublicProfile: publicProcedure
    .input(getUserByUsernameInputSchema)
    .query(({ input }) => getPublicProfile(input)),

  // Link management routes
  createLink: publicProcedure
    .input(createLinkInputSchema)
    .mutation(({ input }) => createLink(input)),

  updateLink: publicProcedure
    .input(updateLinkInputSchema)
    .mutation(({ input }) => updateLink(input)),

  deleteLink: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteLink(input)),

  getLinksByUser: publicProcedure
    .input(getLinksByUserInputSchema)
    .query(({ input }) => getLinksByUser(input)),

  reorderLinks: publicProcedure
    .input(reorderLinksInputSchema)
    .mutation(({ input }) => reorderLinks(input)),

  // Analytics route
  trackLinkClick: publicProcedure
    .input(trackLinkClickInputSchema)
    .mutation(({ input }) => trackLinkClick(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`🚀 Link-in-bio TRPC server listening at port: ${port}`);
}

start();