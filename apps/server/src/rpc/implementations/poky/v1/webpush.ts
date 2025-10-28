import { db, and, eq  } from "@poky/db";
import { devices, webpush } from "@poky/db/schema/poky";
import logger from "@/lib/logger";
import { sendWebPush } from "@/lib/webpush";
import { kUserId } from "@/rpc/context";
import { GetWebPushResponseSchema, type DeleteWebPushRequest, type GetWebPushRequest, type RegisterWebPushRequest, type TestWebPushRequest, type WebPushService } from "@/rpc/proto/poky/v1/webpush_service_pb";
import { create } from "@bufbuild/protobuf";
import { Code, ConnectError, type HandlerContext, type ServiceImpl } from "@connectrpc/connect";

export class WebpushServiceImpl implements ServiceImpl<typeof WebPushService> {
  async registerWebPush(req : RegisterWebPushRequest, context: HandlerContext){
    const userId = context.values.get(kUserId);
    try {
      // First, ensure the device is registered
      const deviceData = {
        id: req.deviceId,
        userId,
        name: req.deviceName || "Unknown Device",
        userAgent: req.userAgent || "",
        lastSeen: new Date(),
      };

      // Upsert device
      await db.insert(devices).values(deviceData)
        .onConflictDoUpdate({
          target: devices.id,
          set: {
            lastSeen: new Date(),
            name: deviceData.name,
            userAgent: deviceData.userAgent,
          }
        });

      const expirationDate = req.expirationTime ? new Date(req.expirationTime.toString()) : null;

      // Upsert web push subscription (one per device)
      await db.insert(webpush).values({
        id: req.id,
        endpoint: req.endpoint,
        expirationTime: expirationDate,
        options: req.options,
        userId,
        deviceId: req.deviceId,
      }).onConflictDoUpdate({
        target: webpush.deviceId, // Update based on deviceId constraint
        set: {
          endpoint: req.endpoint,
          expirationTime: expirationDate,
          options: req.options,
          userId,
          id: req.id, // Update the endpoint ID as well
        }
      });

      return { success: true };
    } catch (error) {
      logger.error("Failed to register web push subscription", { error });
      throw new Error("Failed to register web push subscription");
    }
  }

  async getWebPush(req: GetWebPushRequest, context: HandlerContext) {
    const userId = context.values.get(kUserId);
    try {
      const [result] = await db.select().from(webpush).where(
        and(
          eq(webpush.deviceId, req.id),
          eq(webpush.userId, userId)
        )
      );
      if (!result) {
        throw new ConnectError("No webpush subcription found", Code.NotFound);
      }
      const resultMessage = create(GetWebPushResponseSchema, {
        id: result.id,
        endpoint: result.endpoint,
        options: result.options,
        userId: result.userId,
        deviceId: result.deviceId,
      });
      return resultMessage;
    } catch (error) {
      logger.error("Failed to get web push subscription", { error });
      throw new Error("Failed to get web push subscription");
    }
  }

  async deleteWebPush(req: DeleteWebPushRequest, context: HandlerContext){
    const userId = context.values.get(kUserId);
    // assert user Id is the same as webpush user_id
    try {
      // First, check if the subscription exists and belongs to the user
      const [existing] = await db.select().from(webpush).where(
        eq(webpush.id, req.id)
      );
      if (!existing || existing.userId !== userId) {
        throw new Error("Subscription not found or not owned by user");
      }
      // Then, delete it
      await db.delete(webpush).where(
        eq(webpush.id, req.id)
      );
      return { success: true };
    } catch (error) {
      logger.error("Failed to delete web push subscription", { error });
      throw new Error("Failed to delete web push subscription");
    }
  }

  async testWebPush(req: TestWebPushRequest, context: HandlerContext){
    const userId = context.values.get(kUserId);
    try {
      const deviceId = req.deviceId;
      const [subscription] = await db.select().from(webpush).where(
        and(eq(webpush.deviceId, deviceId),
      eq(webpush.userId, userId)));

      if (!subscription) {
        throw new Error("No web push subscription found for device");
      }

      // Send test notification to the device
        const subscriptionToSend = {
          endpoint: subscription.endpoint,
          expirationTime:
            subscription.expirationTime instanceof Date
              ? subscription.expirationTime.valueOf()
              : (subscription.expirationTime ?? undefined),
          keys: JSON.parse(subscription.options).keys,
        };

        await sendWebPush(subscriptionToSend, {
          title: "Test Notification",
          body: "This is a test notification from Poky!",
          icon: "/favicon-32x32.png",
          data: { type: "test" },
        });
        logger.debug("Push has been sent")
        return { success: true, sentTo: 1 };
    } catch (error) {
      console.error("Failed to send test web push notification", error);
      throw new Error("Failed to send test notification");
    }
  }
}
