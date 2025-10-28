import type { ConnectRouter } from "@connectrpc/connect";
import { PokesService } from "@/rpc/proto/poky/v1/pokes_service_pb";
import { LeaderboardService } from "@/rpc/proto/poky/v1/leaderboard_service_pb";
import { PokesServiceImpl } from "@/rpc/implementations/poky/v1/pokes";
import { LeaderboardServiceImpl } from "@/rpc/implementations/poky/v1/leaderboard";
import { WebPushService } from "./proto/poky/v1/webpush_service_pb";
import { WebpushServiceImpl } from "./implementations/poky/v1/webpush";

export default (router: ConnectRouter) => {
  router.service(PokesService, new PokesServiceImpl(), {
    maxTimeoutMs: 20 * 60 * 1000,
  });
  router.service(LeaderboardService, new LeaderboardServiceImpl());
  router.service(WebPushService, new WebpushServiceImpl());
};
