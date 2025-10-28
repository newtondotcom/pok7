import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { UserPokes } from "@/components/user-pokes";
import { Navigation } from "@/components/navigation";
import UserMenu from "@/components/user-menu";
import { useEffect } from 'react';
import { toast } from '@pheralb/toast';
import { authClient } from "@/lib/auth-client";
import Loader from "@/components/loader";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      const userKey = `hasLoggedIn:${session?.user.id}`;
      if (!localStorage.getItem(userKey)) {
        toast.info({
          text: "Welcome! Enable notifications for the best experience.",
          action: {
            content: "Go to settings",
            onClick: () => {
              navigate({ to: "/account" });
            },
          },
        });
        localStorage.setItem(userKey, "true");
      }
    }
  }, [session, navigate]);

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {!session ? <UserMenu /> : <><Navigation /><UserPokes /></>}
    </div>
  );
}
