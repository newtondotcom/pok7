import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@poky/db";
import * as schema from "@poky/db/schema/auth";
import { genericOAuth } from "better-auth/plugins";
import { eq } from "@poky/db";
import { generateUserAnonymizedData } from "@poky/db/utils/anonymization";
import { user } from "@poky/db/schema/auth";

export const auth = betterAuth<BetterAuthOptions>({
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
	
					console.log("User info received", { userInfo });
	
					const userId = userInfo.sub || "";
	
					// Check if user already exists and has anonymized data
					const [existingUser] = await db
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
	
					// Only generate new anonymized data if user doesn't exist
					if (!existingUser) {
					  anonymizedData = generateUserAnonymizedData(userId);
					} else {
					  // Use existing anonymized data
					  anonymizedData = {
						usernameAnonymized: existingUser.usernameAnonymized,
						pictureAnonymized: existingUser.pictureAnonymized,
					  };
					}
	
					const userLocal = {
						id: userId,
						name: userInfo.fullName ||"",
						username: userInfo.uid || userInfo.nickname || "",
						image: userInfo.pictureURL || null,
						createdAt: new Date(),
						updatedAt: new Date(),
						email : userInfo.email,
						usernameAnonymized: anonymizedData.usernameAnonymized,
						pictureAnonymized: anonymizedData.pictureAnonymized,
						emailVerified : userInfo.email_verified,
					}
					console.log("User info received", { userLocal });
					return userLocal;
				  },
			  },
		  ]
	  }) ],
	  secret: process.env.BETTER_AUTH_SECRET,
	  baseURL: process.env.BETTER_AUTH_URL,
	  trustedOrigins: [process.env.CORS_ORIGIN || ""],
	advanced: {
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
	},
});
