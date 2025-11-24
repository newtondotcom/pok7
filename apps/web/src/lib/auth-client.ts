import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins"
// Type-only import to avoid bundling server code into the client
import type { Auth } from "@poky/auth/types";

export const authClient = createAuthClient({
  baseURL:
      import.meta.env.VITE_SERVER_URL,
  plugins: [inferAdditionalFields<Auth>({
    usernameAnonymized: {
      type: "string",
      required: true,
      defaultValue: "",
      input: false,
    },
    imageAnonymized: {
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
  })],
});