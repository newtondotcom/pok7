import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { TransportProvider } from "@connectrpc/connect-query";
import { createConnectTransport } from "@connectrpc/connect-web";
import Loader from "@/components/loader";
import { toast } from "@pheralb/toast";
import { routeTree } from "./routeTree.gen";


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
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {children}
    </QueryClientProvider>
    </TransportProvider>
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
