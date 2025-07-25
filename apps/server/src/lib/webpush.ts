import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:asphalt8fr@gmail.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendWebPush(
  subscription: webpush.PushSubscription,
  payload: unknown
): Promise<void> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    console.error('Web push error:', err);
  }
}