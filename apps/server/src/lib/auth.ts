import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema/auth";
import { genericOAuth } from "better-auth/plugins";
import { generateUserAnonymizedData } from "@/lib/anonymization";
import { user } from "@/db/schema/auth";
import { eq } from "drizzle-orm";
import logger from "@/lib/logger";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  user: {
    additionalFields: {
      usernameAnonymized: {
        type: "string",
        required: true,
        defaultValue: "",
        input: false,
      },
      pictureAnonymized: {
        type: "string",
        required: true,
        defaultValue: "",
        input: false,
      },
      username: {
        type: "string",
        required: true,
        defaultValue: "",
        input: false,
      },
    },
  },
  plugins: [
    genericOAuth({
      config: [
          {
              providerId: "churros",
              clientId: process.env.CHURROS_CLIENT_ID || "",
              clientSecret: process.env.CHURROS_CLIENT_SECRET || "",
              authorizationUrl : process.env.CHURROS_AUTHORIZATION_URL || "",
              tokenUrl : process.env.CHURROS_TOKEN_URL || "",
              scopes : ['openid', 'profile', 'preferred_username',"email","churros:profile"],
              async getUserInfo(tokens) {
                const userInfoUrl = process.env.CHURROS_USER_INFO;
                if (!userInfoUrl) {
                  throw new Error("CHURROS_USER_INFO environment variable is not set");
                }

                const response = await fetch(userInfoUrl, {
                  headers: {
                    "Authorization": `Bearer ${tokens.accessToken}`,
                    "Content-Type": "application/json",
                  },
                });

                if (!response.ok) {
                  throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
                }

                const userInfo = await response.json();

                logger.info("User info received", { userInfo });

                const userId = userInfo.sub || "";

                // Check if user already exists and has anonymized data
                const existingUser = await db
                  .select({
                    usernameAnonymized: user.usernameAnonymized,
                    pictureAnonymized: user.pictureAnonymized,
                  })
                  .from(user)
                  .where(eq(user.id, userId))
                  .limit(1);

                let anonymizedData: {
                  usernameAnonymized: string | null;
                  pictureAnonymized: string | null;
                };

                // Only generate new anonymized data if user doesn't exist or has null anonymized data
                if (existingUser.length === 0 ||
                    !existingUser[0].usernameAnonymized ||
                    !existingUser[0].pictureAnonymized) {
                  anonymizedData = generateUserAnonymizedData(userId);
                } else {
                  // Use existing anonymized data
                  anonymizedData = {
                    usernameAnonymized: existingUser[0].usernameAnonymized,
                    pictureAnonymized: existingUser[0].pictureAnonymized,
                  };
                }

                return {
                  id: userInfo.sub || "", // could be uid but sub will be used for anonuymsation
                  name: userInfo.fullName ||"",
                  username: userInfo.uid || userInfo.nickname || "",
                  image: userInfo.pictureURL || null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  email : userInfo.email,
                  usernameAnonymized: anonymizedData.usernameAnonymized,
                  pictureAnonymized: anonymizedData.pictureAnonymized,
                  emailVerified : userInfo.email_verified,
                };
              },
          },
      ]
  }) ],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.CORS_ORIGIN || ""],
});
