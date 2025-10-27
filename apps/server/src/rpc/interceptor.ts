import type { Interceptor } from "@connectrpc/connect";
import { Code, ConnectError } from "@connectrpc/connect";
import { kUserId } from "./context";
import logger from "@/lib/logger";
import { auth } from "@poky/auth";

// -----------------------------------------------------------------------------
// INTERCEPTOR
// -----------------------------------------------------------------------------
export const authInterceptor: Interceptor = (next) => async (req) => {
  const authHeader = req.header.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")){
    logger.error("Missing or invalid Authorization header");
    throw new ConnectError(
      "Missing or invalid Authorization header",
      Code.Unauthenticated,
    );
  };
  
  const session = await auth.api.getSession({
    headers: req.header,
  });

  if (!session) {
    logger.error("Missing or invalid Authorization header");
    throw new ConnectError(
      "Missing or invalid Authorization header",
      Code.Unauthenticated,
    );
  }

  // Add user ID to context
  req.contextValues.set(kUserId, session?.user.id);

  return next(req);
};
