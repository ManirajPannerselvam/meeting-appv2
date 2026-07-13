import { requireAdmin } from "$lib/server/auth";

export const load = async ({ cookies }) => {
  // TEMP: no auth blocking for now
  return {
    users: []
  };
};