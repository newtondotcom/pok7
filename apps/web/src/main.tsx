import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { TransportProvider } from "@connectrpc/connect-query";
import { createConnectTransport } from "@connectrpc/connect-web";
import { AuthProvider } from "react-oauth2-code-pkce";
import Loader from "./components/loader";
import { toast } from "@pheralb/toast";
import { routeTree } from "./routeTree.gen";
import type { TAuthConfig, TRefreshTokenExpiredEvent } from "react-oauth2-code-pkce";

// -------------------
// Auth config
// -------------------
const authConfig: TAuthConfig = {
  clientId: "t9xFI53nHMTMRduUB1Kt2fUpV1IcFOfNXUZHjpmZ",
  authorizationEndpoint: "https://myr-project.eu/application/o/authorize/",
  tokenEndpoint: "https://myr-project.eu/application/o/token/",
  redirectUri: window.location.origin,
  scope: "profile openid offline_access picture email",
  autoLogin : false,
  onRefreshTokenExpire: (event: TRefreshTokenExpiredEvent) => event.logIn(undefined,undefined, "redirect"),
};

// -------------------
// React Query client
// -------------------
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any) => {
      toast.error({
        text: error?.message ?? "Unknown error",
        action: {
          content: "Retry",
          onClick: () => () => queryClient.invalidateQueries(),
        },
      });
    },
  }),
});

// -------------------
// Router
// -------------------
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => <Loader />,
  context: { queryClient },
  Wrap: function WrapComponent({ children }: { children: React.ReactNode }) {
    // Memoize transport
    const transport = useMemo(
      () =>
        createConnectTransport({
          baseUrl: import.meta.env.VITE_SERVER_URL,
          fetch: (input, init) => fetch(input, {...init, credentials: "include"}),
        }),
      [],
    );

    return (
      <AuthProvider authConfig={authConfig}>
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {children}
    </QueryClientProvider>
    </TransportProvider>
    </AuthProvider>
    );
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// -------------------
// Render app
// -------------------
const rootElement = document.getElementById("app");

if (!rootElement) throw new Error("Root element not found");

const root = ReactDOM.createRoot(rootElement);
root.render(<RouterProvider router={router} />);
