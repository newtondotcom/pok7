import { db } from "@/db";
import { pokes, user } from "@/db/schema/auth";
import { getUserPokesData } from "@/lib/get-user-pokes-data";
import logger from "@/lib/logger";
import { notifyTargetUser } from "@/lib/notify-target-user";
import { redisService } from "@/lib/redis";
import { getRedisConnection } from "@/lib/redis-pool";
import {
  addUserConnected,
  isUserConnected,
  removeUserConnected,
} from "@/lib/user-connected";
import { kUserId } from "@/rpc/context";
import {
  SearchUserResultSchema,
  SearchUsersResponseSchema,
  GetPokeRelationResponseSchema,
  type GetUserPokesRequest,
  type PokesService,
  type PokeUserRequest,
  type SearchUsersRequest,
  type GetPokeRelationRequest,
} from "@/rpc/proto/poky/v1/pokes_service_pb";
import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { Code, ConnectError, type HandlerContext, type ServiceImpl } from "@connectrpc/connect";
import { and, eq, like, not, or } from "drizzle-orm";

const sub = redisService.getSubscriber();
const pub = redisService.getPublisher();

async function decideWhichActionToPerform(targetUserId: string) {
  // if users logged as online in the map
  const targetUserConnected = await isUserConnected(targetUserId);
  logger.debug(`Target user ${targetUserId} connected: ${targetUserConnected}`);

  if (targetUserConnected) {
    logger.debug(`Publishing to target user channel: ${targetUserId}`);
    pub.publish(targetUserId, targetUserId);
  } else {
    logger.debug(
      `Target user ${targetUserId} is offline, sending web push notification`,
    );
    notifyTargetUser(targetUserId);
  }
}

export class PokesServiceImpl implements ServiceImpl<typeof PokesService> {
  async *getUserPokes(_: GetUserPokesRequest, context: HandlerContext) {
    const currentUserId = context.values.get(kUserId);
    logger.debug(`Starting subscription for user: ${currentUserId}`);
    addUserConnected(currentUserId);

    const firstDatas = await getUserPokesData(currentUserId);
    logger.debug(`First data sent : ${firstDatas}`);
    yield firstDatas;
    logger.debug(`First data sent : ${firstDatas}`);

    try {
      // Get Redis connection from pool
      const sub = await getRedisConnection(currentUserId);
      
      // Subscribe to the channel
      await sub.subscribe(currentUserId);
      logger.debug(`Subscribed to Redis channel: ${currentUserId}`);

      // Create async iterator to receive messages
      while (true) {
        logger.debug(`Waiting for message on channel: ${currentUserId}`);
        await new Promise<string>((resolve, reject) => {
          let isResolved = false;
          
          // Create a one-time message handler
          const messageHandler = (ch: string, msg: string) => {
            if (ch === currentUserId && !isResolved) {
              logger.debug(`Received message on channel ${ch}: ${msg}`);
              isResolved = true;
              sub.off("message", messageHandler);
              clearTimeout(timeout);
              resolve(msg);
            }
          };

          // Set a timeout to prevent hanging
          const timeout = setTimeout(() => {
            if (!isResolved) {
              logger.debug(`Subscription timeout for user: ${currentUserId}`);
              isResolved = true;
              sub.off("message", messageHandler);
              reject(new Error("Subscription timeout"));
            }
          }, 300000000);

          // Add the listener
          sub.on("message", messageHandler);
        });

        logger.debug(`Processing update for user: ${currentUserId}`);
        const nextDatas = await getUserPokesData(currentUserId);
        yield nextDatas;
      }
    } catch (error) {
      logger.error("Subscription error:", { error });
      throw new ConnectError("Subscription error:", Code.NotFound);
    } finally {
      logger.debug("Subscription ended for user:", currentUserId);
      await sub.unsubscribe(currentUserId);
      removeUserConnected(currentUserId);
    }
  }

  async pokeUser(req: PokeUserRequest, context: HandlerContext) {
    const currentUserId = context.values.get(kUserId);
    const targetUserId = req.targetUserId;

    // Prevent self-poking
    if (currentUserId === targetUserId) {
      logger.error("poke yourself")
      throw new Error("You cannot poke yourself");
    }

    try {
      // Check if target user exists
      const [targetUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, targetUserId))
        .limit(1);

      if (!targetUser) {
        logger.error("targe user not found")
        throw new Error("Target user not found");
      }

      // Check if a poke relation already exists between these users
      const [existingRelation] = await db
        .select({
          id: pokes.id,
          userAId: pokes.userAId,
          userBId: pokes.userBId,
          count: pokes.count,
          lastPokeDate: pokes.lastPokeDate,
          lastPokeBy: pokes.lastPokeBy,
        })
        .from(pokes)
        .where(
          or(
            and(
              eq(pokes.userAId, currentUserId),
              eq(pokes.userBId, targetUserId),
            ),
            and(
              eq(pokes.userAId, targetUserId),
              eq(pokes.userBId, currentUserId),
            ),
          ),
        )
        .limit(1);

      if (existingRelation) {
        // Update existing relation
        const newCount = existingRelation.count + 1;
        const now = new Date();

        await db
          .update(pokes)
          .set({
            count: newCount,
            lastPokeDate: now,
            lastPokeBy: currentUserId,
          })
          .where(eq(pokes.id, existingRelation.id));

        // Notify target user after database update
        decideWhichActionToPerform(targetUserId);

        // publish so that user ui is refreshed
        logger.debug(`Publishing to Redis channel: ${currentUserId}`);
        pub.publish(currentUserId, currentUserId);

        return {
          success: true,
          message: "Poke sent successfully",
          pokeRelation: {
            id: existingRelation.id,
            count: newCount,
            lastPokeDate: timestampFromDate(now),
            lastPokeBy: currentUserId,
            isNewRelation: false,
          },
        };
      } else {
        // Create new relation
        const newRelationId = crypto.randomUUID();
        const now = new Date();

        await db.insert(pokes).values({
          id: newRelationId,
          userAId: currentUserId,
          userBId: targetUserId,
          count: 1,
          lastPokeDate: now,
          lastPokeBy: currentUserId,
          visibleLeaderboard: true, // Default to visible
        });

        // Notify target user after database update
        decideWhichActionToPerform(targetUserId);

        // publish so that user ui is refreshed
        logger.debug(`Publishing to Redis channel: ${currentUserId}`);
        pub.publish(currentUserId, currentUserId);

        return {
          success: true,
          message: "Poke sent successfully",
          pokeRelation: {
            id: newRelationId,
            count: 1,
            lastPokeDate: timestampFromDate(now),
            lastPokeBy: currentUserId,
            isNewRelation: true,
          },
        };
      }
    } catch (error) {
      logger.error("Error poking user:", { error });
      throw new ConnectError("Failed to poke user:", Code.NotFound);
    }
  }

  async searchUsers(req: SearchUsersRequest, context: HandlerContext) {
    const currentUserId = context.values.get(kUserId);
    if (!currentUserId) throw new Error("Unauthenticated");

    const query = req.query.trim();

    try {
      // 🔍 Search users
      const users = await db
        .select({
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(
          and(
            or(
              like(user.username, `%${query}%`),
              like(user.name, `%${query}%`),
            ),
            not(eq(user.id, currentUserId)),
          ),
        )
        .limit(20);

      // ⚡ Fetch poke relations of the current user
      const pokeRelations = await db
        .select({
          userAId: pokes.userAId,
          userBId: pokes.userBId,
          count: pokes.count,
          lastPokeBy: pokes.lastPokeBy,
          lastPokeDate: pokes.lastPokeDate,
        })
        .from(pokes)
        .where(
          or(
            eq(pokes.userAId, currentUserId),
            eq(pokes.userBId, currentUserId),
          ),
        );

      // 🧠 Merge user info + poke info
      const searchResults = users.map((u) => {
        const relation = pokeRelations.find(
          (r) =>
            (r.userAId === currentUserId && r.userBId === u.id) ||
            (r.userAId === u.id && r.userBId === currentUserId),
        );

        return create(SearchUserResultSchema, {
          id: u.id,
          name: u.name ?? "",
          username: u.username ?? undefined, // 👈 use undefined not null
          image: u.image ?? undefined,
          createdAt: timestampFromDate(u.createdAt),
          hasPokeRelation: !!relation,
          pokeCount: relation?.count ?? 0,
          lastPokeBy: relation?.lastPokeBy ?? undefined,
          lastPokeDate: relation?.lastPokeDate
            ? timestampFromDate(relation.lastPokeDate)
            : undefined,
        });
      });

      return create(SearchUsersResponseSchema, {
        users: searchResults,
        count: searchResults.length,
      });
    } catch (error) {
      logger.error("Error searching users:", { error });
      throw new ConnectError("Failed to search users:", Code.NotFound);
    }
  }

  async getPokeRelation(req: GetPokeRelationRequest, context: HandlerContext) {
    const currentUserId = context.values.get(kUserId);
    const relationId = req.relationId;

    try {
      // Get the poke relation
      const [relation] = await db
        .select({
          id: pokes.id,
          userAId: pokes.userAId,
          userBId: pokes.userBId,
          count: pokes.count,
          lastPokeDate: pokes.lastPokeDate,
          lastPokeBy: pokes.lastPokeBy,
          visibleLeaderboard: pokes.visibleLeaderboard,
        })
        .from(pokes)
        .where(
          and(
            eq(pokes.id, relationId),
            or(
              eq(pokes.userAId, currentUserId),
              eq(pokes.userBId, currentUserId),
            ),
          ),
        )
        .limit(1);

      if (!relation) {
        throw new ConnectError("Poke relation not found", Code.NotFound);
      }

      // Get the other user's details
      const otherUserId = relation.userAId === currentUserId ? relation.userBId : relation.userAId;
      const [otherUser] = await db
        .select({
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image,
        })
        .from(user)
        .where(eq(user.id, otherUserId))
        .limit(1);

      if (!otherUser) {
        throw new ConnectError("User not found", Code.NotFound);
      }

      // Create the response
      const relationWithUser = create(GetPokeRelationResponseSchema, {
        relation: {
          id: relation.id,
          userAId: relation.userAId,
          userBId: relation.userBId,
          count: relation.count,
          lastPokeDate: timestampFromDate(relation.lastPokeDate),
          lastPokeBy: relation.lastPokeBy,
          visibleLeaderboard: relation.visibleLeaderboard,
          otherUser: {
            id: otherUser.id,
            name: otherUser.name,
            username: otherUser.username ?? "",
            image: otherUser.image ?? "",
            createdAt: undefined,
          },
        },
      });

      return relationWithUser;
    } catch (error) {
      logger.error("Error getting poke relation:", { error });
      throw new ConnectError("Failed to get poke relation:", Code.NotFound);
    }
  }
}
