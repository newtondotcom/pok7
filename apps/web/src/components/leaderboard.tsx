import { useQuery } from '@connectrpc/connect-query';
import { Trophy, Medal, Award, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@pheralb/toast";
import { LeaderboardItemSkeleton } from "@/components/skeletons/leaderbord";
import { LeaderboardService } from '@/rpc/proto/poky/v1/leaderboard_service_pb';
import { timestampDate } from '@bufbuild/protobuf/wkt';

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-500" />;
  return null;
}

function getRankColor(rank: number) {
  if (rank === 1) return "text-yellow-400 font-bold";
  if (rank === 2) return "text-gray-300 font-semibold";
  if (rank === 3) return "text-amber-500 font-semibold";
  return "text-white/70";
}

export function Leaderboard() {
  const {
    data: leaderboardData,
    isLoading,
    error,
  } = useQuery(LeaderboardService.method.getLeaderboard);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <LeaderboardItemSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    toast.error({ text: "Failed to load leaderboard" });
    return (
      <div className="text-center py-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl">
        <p className="text-red-400 font-medium">Failed to load leaderboard</p>
        <p className="text-sm text-white/60 mt-1">{error.message}</p>
      </div>
    );
  }

  if (!leaderboardData || leaderboardData.entries.length === 0) {
    return (
      <div className="text-center py-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl">
        <Trophy className="h-12 w-12 mx-auto mb-3 text-white/50" />
        <p className="text-white/80 font-medium">No poke relations yet!</p>
        <p className="text-sm text-white/60 mt-1">
          Start poking people to see them on the leaderboard
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {leaderboardData.entries.map((entry, index) => {
        const rank = index + 1;
        const rankIcon = getRankIcon(rank);
        const rankColor = getRankColor(rank);

        // Data is now pre-filtered on the server based on visibility
        // No need to choose between anonymized/non-anonymized data

        return (
          <div
            key={entry.relationId}
            className="p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
          >
            {/* Rank and Stats Row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {rankIcon}
                <span className={`text-sm ${rankColor}`}>#{rank}</span>
              </div>

              <div className="text-right flex flex-row gap-2 md:flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-xl font-bold text-white/90">
                    {entry.count}
                  </span>
                  <span className="text-xs text-white/60">pokes</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-white/60 mt-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {entry.lastPokeDate && formatDistanceToNow(timestampDate(entry.lastPokeDate), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Users Row */}
            <div className="flex flex-col md:flex-row items-center justify-center md:gap-3">
              {/* User A */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20 flex items-center justify-center ring-2 ring-white/30 flex-shrink-0">
                    <img
                      src={entry.userA?.image || undefined}
                      alt={entry.userA?.username || undefined}
                      className="w-full h-full object-cover"
                    />
                </div>
                <span className="text-sm font-medium text-white/90 truncate">
                  {entry.userA?.username}
                </span>
              </div>

              <span className="text-white/60 text-lg font-bold">×</span>

              {/* User B */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20 flex items-center justify-center ring-2 ring-white/30 flex-shrink-0">
                    <img
                      src={entry.userB?.image || undefined}
                      alt={entry.userB?.username || undefined}
                      className="w-full h-full object-cover"
                    />
                </div>
                <span className="text-sm font-medium text-white/90 truncate">
                  {entry.userB?.username}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
