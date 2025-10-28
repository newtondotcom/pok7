import { db, eq } from "@poky/db";
import { sendWebPush } from "@/lib/webpush";
import logger from "@/lib/logger";
import { webpush } from "@poky/db/schema/poky";

export async function notifyTargetUser(targetUserId: string) {
  const [sub] = await db
    .select()
    .from(webpush)
    .where(eq(webpush.userId, targetUserId));
  if (sub) {
    const subscription = {
      endpoint: sub.endpoint,
      expirationTime:
        sub.expirationTime instanceof Date
          ? sub.expirationTime.valueOf()
          : (sub.expirationTime ?? undefined),
      keys: JSON.parse(sub.options).keys,
    };
    await sendWebPush(subscription, {
      title: "You were poked!",
      body: "Open Pok7 to see who poked you.",
      icon: "/favicon-32x32.png",
      data: { type: "poke" },
    });
    logger.debug("Web push notification sent", { targetUserId });
  }
  logger.debug("User is offline", { targetUserId });
}
