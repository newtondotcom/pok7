import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Bell, LogOut, Moon, Sun, Wifi, RotateCcw, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery as useRQQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/utils/trpc";
import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";
import { toast } from "@pheralb/toast";
import { getDeviceId, getBrowserName, getOSName } from "@/lib/device_id";

export const Route = createFileRoute("/account")({
  component: AccountPage,
});

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function AccountPage() {
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();
  const healthCheck = useRQQuery(trpc.healthCheck.queryOptions());
  const { data: session, isPending } = authClient.useSession();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [checkingPush, setCheckingPush] = useState(true);
  const [subscriptionValid, setSubscriptionValid] = useState(false);

  // Fetch anonymized data
  const anonymizedDataQuery = useRQQuery({
    ...trpc.getUserAnonymizedData.queryOptions(),
    enabled: !!session?.user,
  });

  // Add mutation for registering web push
  const registerWebPushMutation = useMutation({
    mutationFn: (input: {
      id: string;
      endpoint: string;
      expirationTime: number | null;
      options: string;
      deviceId: string;
      deviceName?: string;
      userAgent?: string;
    }) => trpcClient.registerWebPush.mutate(input),
  });

  const deleteWebPushMutation = useMutation({
    mutationFn: (input: { id: string }) =>
      trpcClient.deleteWebPush.mutate(input),
  });

  // Add mutations for refreshing anonymized data
  const refreshNameMutation = useMutation({
    mutationFn: () => trpcClient.refreshAnonymizedName.mutate(),
    onSuccess: () => {
      anonymizedDataQuery.refetch();
      toast.success({ text: "Anonymous name refreshed!" });
    },
    onError: () => {
      toast.error({ text: "Failed to refresh anonymous name" });
    },
  });

  const refreshPictureMutation = useMutation({
    mutationFn: () => trpcClient.refreshAnonymizedPicture.mutate(),
    onSuccess: () => {
      anonymizedDataQuery.refetch();
      toast.success({ text: "Anonymous picture refreshed!" });
    },
    onError: () => {
      toast.error({ text: "Failed to refresh anonymous picture" });
    },
  });

  // Check current push subscription and validate with backend
  useEffect(() => {
    async function checkPush() {
      setCheckingPush(true);
      let endpoint: string | null = null;
      let valid = false;
      if ("serviceWorker" in navigator && "PushManager" in window) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            endpoint = sub.endpoint;
            // Validate with backend
            const backendSub = await trpcClient.getWebPush.query({
              id: endpoint,
            });
            valid = !!backendSub;
          }
        } catch (e) {
          // ignore
        }
      }
      setPushEnabled(!!endpoint);
      setSubscriptionValid(valid);
      setCheckingPush(false);
    }
    checkPush();
  }, []);

  // Get initials from user name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const cycleMode = () => {
    const newTheme =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(newTheme);
    console.log(`Theme changed to ${newTheme}`);
  };

  if (isPending) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20">
        <div className="flex items-center justify-center min-h-screen">
          <Skeleton className="h-32 w-80 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!session) {
    navigate({ to: "/" });
    return null;
  }

  async function manageWebPush() {
    if (pushEnabled) {
      // Remove from localStorage, unsubscribe from PushManager
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await deleteWebPushMutation.mutateAsync({ id: endpoint });
      }
      localStorage.removeItem("webpush-permission");
      localStorage.removeItem("webpush-subscription");
      setPushEnabled(false);
      setSubscriptionValid(false);
      setCheckingPush(false); // Ensure checkingPush is false after successful disable
      toast.info({ text: "Notifications disabled." });
      return;
    }
    // If not valid, renew subscription
    if (!subscriptionValid) {
      if (!("serviceWorker" in navigator)) {
        toast.error({
          text: "Service workers are not supported in this browser.",
        });
        return;
      }
      if (!("PushManager" in window)) {
        toast.error({
          text: "Push notifications are not supported in this browser.",
        });
        return;
      }
      try {
        const permission = await Notification.requestPermission();
        localStorage.setItem("webpush-permission", permission);
        if (permission !== "granted") {
          toast.warning({ text: "Push notification permission denied." });
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          toast.error({ text: "VAPID public key is not set." });
          return;
        }
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        localStorage.setItem(
          "webpush-subscription",
          JSON.stringify(subscription),
        );
        const subObj = subscription.toJSON();
        const deviceId = getDeviceId();
        const deviceName = `${getBrowserName()} on ${getOSName()}`; // e.g., "Chrome on Windows"
        await registerWebPushMutation.mutateAsync({
          id: subscription.endpoint,
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime ?? null,
          options: JSON.stringify({
            keys: subObj.keys,
          }),
          deviceId,
          deviceName,
          userAgent: navigator.userAgent,
        });
        setPushEnabled(true);
        setSubscriptionValid(true);
        setCheckingPush(false); // Ensure checkingPush is false after successful enable
        toast.success({ text: "Push notifications enabled!" });
      } catch (err) {
        toast.error({ text: "Failed to enable push notifications." });
        setSubscriptionValid(false);
        setPushEnabled(false);
        console.error(err);
      }
      return;
    }
    // If valid, do nothing (should not happen, but fallback)
    toast.info({ text: "Web push notifications already enabled and valid." });
  }

  async function testWebPush() {
    if (!pushEnabled) {
      toast.error({ text: "Please enable notifications first." });
      return;
    }
    
    try {
      // Send a test notification to the current user
      await trpcClient.testWebPush.mutate();
      toast.success({ text: "Test notification sent!" });
    } catch (err) {
      toast.error({ text: "Failed to send test notification." });
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <button
          onClick={() => navigate({ to: "/" })}
          className="inline-flex items-center justify-center align-middle select-none font-sans text-center p-2 text-white text-sm font-medium rounded-lg bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none transition antialiased relative"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="text-xl font-semibold text-white/90">
          Account Settings
        </h2>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6">
        <div className="max-w-sm bg-black/20 backdrop-blur-sm border border-white/50 rounded-lg shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] p-6 text-white relative before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none">
          <div className="relative z-10">
            <div className="flex flex-col items-center text-center">
              {/* User Avatar */}
              <div className="w-24 h-24 rounded-full mb-4 ring-2 ring-white/30 overflow-hidden bg-white/20 flex items-center justify-center">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "Profile picture"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-semibold text-white/70">
                    {session.user.name ? getInitials(session.user.name) : "U"}
                  </span>
                )}
              </div>

              {/* User Info */}
              <h2 className="text-md font-semibold mb-1">{session.user.name || "User"}</h2>
              <p className="text-sm opacity-70 mb-6">{session.user.email || "No email provided"}</p>
              
              {/* Anonymized Data Section */}
              <div className="w-full mb-6 p-4 bg-white/10 rounded-lg border border-white/20">
                <h3 className="text-sm font-medium text-white/80 mb-3">Anonymous Identity</h3>
                <div className="space-y-3">
                  {/* Anonymized Avatar */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
                        {anonymizedDataQuery.isLoading ? (
                          <Loader />
                        ) : anonymizedDataQuery.data?.pictureAnonymized ? (
                          <img 
                            src={anonymizedDataQuery.data.pictureAnonymized} 
                            alt="Anonymous avatar" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-white/70">?</span>
                        )}
                      </div>
                      <button
                        onClick={() => refreshPictureMutation.mutate()}
                        disabled={refreshPictureMutation.isPending}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 border border-white/30"
                      >
                        {refreshPictureMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {anonymizedDataQuery.isLoading ? "Loading..." : anonymizedDataQuery.data?.usernameAnonymized || "Generating..."}
                        </p>
                        <button
                          onClick={() => refreshNameMutation.mutate()}
                          disabled={refreshNameMutation.isPending}
                          className="w-5 h-5 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 border border-white/30"
                        >
                          {refreshNameMutation.isPending ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-2.5 h-2.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Settings Options */}
              <div className="w-full space-y-3">
                {/* Theme Color */}
                <button
                  onClick={cycleMode}
                  className="w-full flex items-center justify-between p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-300 border border-white/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0 top-0 left-0" />
                    </div>
                    <span className="text-sm">Theme</span>
                  </div>
                  <span className="text-xs text-white/70 capitalize">
                    {theme}
                  </span>
                </button>

                {/* Web Push Permission Toggle */}
                <div className="w-full flex items-center justify-between p-3 bg-white/20 rounded-lg border border-white/30">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4" />
                    <span className="text-sm">Notifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {checkingPush && (
                      <span className="w-4 h-4 flex items-center justify-center">
                        <Loader />
                      </span>
                    )}
                    <button
                      onClick={manageWebPush}
                      disabled={checkingPush}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent ${
                        pushEnabled 
                          ? 'bg-green-500 hover:bg-green-600' 
                          : 'bg-gray-400 hover:bg-gray-500'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          pushEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Test Web Push Button */}
                {pushEnabled && (
                  <button
                    onClick={testWebPush}
                    className="w-full flex items-center justify-between p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-300 border border-white/30"
                  >
                    <div className="flex items-center gap-3">
                      <TestTube className="w-4 h-4" />
                      <span className="text-sm">Test notification</span>
                    </div>
                  </button>
                )}

                {/* API Status */}
                <div className="w-full flex items-center justify-between p-3 bg-white/20 rounded-lg border border-white/30">
                  <div className="flex items-center gap-3">
                    <Wifi className={`w-4 h-4`} />
                    <span className="text-sm">API status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
                    />
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={() => {
                    authClient.signOut({
                      fetchOptions: {
                        onSuccess: () => {
                          navigate({ to: "/" });
                        },
                      },
                    });
                  }}
                  className="w-full flex items-center justify-between p-3 bg-white/20 rounded-lg border border-white/30"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span className="text-sm">Sign Out</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
