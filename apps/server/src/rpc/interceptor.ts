import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { generateUserAnonymizedData } from "@/lib/anonymization";
import type { Interceptor } from "@connectrpc/connect";
import { Code, ConnectError } from "@connectrpc/connect";
import { eq } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { kUserId } from "./context";
import logger from "@/lib/logger";
import { auth } from "@/lib/auth";

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------
const JWKS_URI = "https://myr-project.eu/application/o/newton/jwks/";
const USER_INFO_URI = "https://myr-project.eu/application/o/userinfo/";
const AUDIENCE = "t9xFI53nHMTMRduUB1Kt2fUpV1IcFOfNXUZHjpmZ";

// Simple in-memory cache (can be swapped with Redis)
const tokenCache = new Map<string, { userId: string; exp: number }>();

const JWKS = createRemoteJWKSet(new URL(JWKS_URI));

// -----------------------------------------------------------------------------
// TOKEN VERIFICATION
// -----------------------------------------------------------------------------
async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      audience: AUDIENCE,
      issuer: "https://myr-project.eu/application/o/newton/",
    });
    return payload;
  } catch (error) {
    logger.error(error);
  }
}

// -----------------------------------------------------------------------------
// USER CREATION (NON-BLOCKING)
// -----------------------------------------------------------------------------

// Non-blocking user creation function
async function createUserInBackgroundIfNeeded(oauthToken: any, userId: string) {
  try {
    // First check if user already exists
    const [existing] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    // Fetch user info from OAuth provider
    const userInfo = await fetchUserInfo(oauthToken) as {
      preferred_username : string,
      picture : string,
      email : string,
      email_verified : boolean,
      name? : string
    };

    if (existing) {
      // Check if values have changed and update if necessary
      const hasChanged = 
        existing.username !== (userInfo.preferred_username || "") ||
        existing.image !== (userInfo.image || null) ||
        existing.email !== userInfo.email

      if (hasChanged) {
        logger.debug(`User data changed for ${userId}, updating...`);
        await db
          .update(user)
          .set({
            username: userInfo.preferred_username,
            picture: userInfo.image,
            email: userInfo.email || "none",
            updatedAt: new Date(),
          })
          .where(eq(user.id, userId));
        logger.debug(`User data updated for: ${userId}`);
      } else {
        logger.debug(`User data unchanged for: ${userId}`);
      }
      return;
    }


    const anonymized = generateUserAnonymizedData(userId);

    const newUser = {
      id: userId,
      name: userInfo.name || "none",
      username: userInfo.preferred_username,
      picture: userInfo.image,
      email: userInfo.email || "none",
      emailVerified: true,
      usernameAnonymized: anonymized.usernameAnonymized,
      pictureAnonymized: anonymized.imageAnonymized,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(user).values(newUser);
    logger.debug(`User created in background: ${userId}`);
  } catch (error) {
    logger.error(`Failed to create/update user in background: ${userId}`, error);
  }
}

// -----------------------------------------------------------------------------
// USER INFO ENDPOINT
// -----------------------------------------------------------------------------
async function fetchUserInfo(accessToken: string) {
  const response = await fetch(USER_INFO_URI, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch user info: ${response.status} ${response.statusText}`,
    );
  }

  return await response.json();
}

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
