import Loader from "@/components/loader";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@pheralb/toast";
import type { trpc } from "@/utils/trpc";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import ShapeHero from "@/components/kokonutui/shape-hero";
import { WebSocketProvider } from "@/components/websocket-provider";
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import "../index.css";

export interface RouterAppContext {
  trpc: typeof trpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "Pok7",
      },
      {
        name: "description",
        content: "an enhancement of Meta pokes in a PWA",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  const isFetching = useRouterState({
    select: (s) => s.isLoading,
  });

  return (
    <>
      <HeadContent />
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <WebSocketProvider>
      <ShapeHero>
          <div className="grid grid-rows-[auto_1fr] h-svh">
            {isFetching ? <Loader /> : <Outlet />}
          </div>
      </ShapeHero>
          <Toaster />
          </WebSocketProvider>
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  );
}
