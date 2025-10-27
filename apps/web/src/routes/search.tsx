import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Search, User, Calendar, Zap } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect} from "react";
import { useQuery } from "@connectrpc/connect-query";
import { PokeButton } from "@/components/poke-button";
import { formatDistanceToNow } from "date-fns";
import { SearchResultSkeleton } from "@/components/skeletons/search-result";
import { PokesService, type SearchUserResult } from "@/rpc/proto/poky/v1/pokes_service_pb";
import { timestampDate } from "@bufbuild/protobuf/wkt";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/search")({
  component: SearchPage,
});

function SearchPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  if (!session) {
      navigate({ to: "/" });
      return null;
  }

  if (isPending) {
    return <Loader />;
  }
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Query to seach users
  const searchUsersQuery = useQuery(
    PokesService.method.searchUsers,
      {
        query: searchQuery,
      },
      {
        enabled: searchQuery.trim().length > 0, // Auto-run when query has content
        retry: false,
        staleTime: 30000, // Cache results for 30 seconds
      },
    );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Show loading state when user is typing
    if (value.trim().length > 0) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  };

  // Update loading state when query completes or when query is disabled
  useEffect(() => {
    if (!searchUsersQuery.isLoading || !searchQuery.trim()) {
      setIsSearching(false);
    }
  }, [searchUsersQuery.isLoading, searchQuery]);

  return (
    <div className="h-full w-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <button
          onClick={() => navigate({ to: "/" })}
          className="inline-flex items-center justify-center align-middle select-none font-sans text-center p-2 text-white text-sm font-medium rounded-lg bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none transition antialiased relative"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="text-xl font-semibold text-white/90">Search Users</h2>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      {/* Search Input */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-center w-full">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Search by name or nickname..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-4 py-3 w-full text-white text-sm bg-black/20 border border-white/50 backdrop-blur-sm rounded-lg shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] placeholder:text-white/70 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all duration-300 relative before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="size-4 animate-spin text-white/70" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Search Results */}
        {searchUsersQuery.isLoading && searchQuery.trim().length > 0 && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <SearchResultSkeleton key={index} />
            ))}
          </div>
        )}

        {searchUsersQuery.error && (
          <div className="text-center py-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl">
            <p className="text-red-400 font-medium">Failed to search users</p>
            <p className="text-sm text-white/60 mt-1">
              {searchUsersQuery.error.message}
            </p>
          </div>
        )}

        {searchUsersQuery.data && searchQuery.trim().length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-white/60">
              Found {searchUsersQuery.data.count} user(s)
            </p>

            {searchUsersQuery.data.users.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No users found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchUsersQuery.data.users.map((user: SearchUserResult) => {
                  const isYourTurn = user.lastPokeBy === user.id;

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0 ring-2 ring-white/30">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-white/70" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-white/90">
                            {user.username}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-white/60 mt-1">
                            <Calendar className="h-3 w-3" />
                            {user.hasPokeRelation && user.lastPokeDate ? (
                              <span>
                                {formatDistanceToNow(
                                  timestampDate(user.lastPokeDate),
                                  {
                                    addSuffix: true,
                                  },
                                )}
                              </span>
                            ) : (
                              <span>
                                Joined{" "}
                                {user.createdAt ? timestampDate(user.createdAt).toLocaleDateString() : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex flex-row items-center align-middle space-x-2">
                        {user.hasPokeRelation ? (
                          <>
                            {isYourTurn && (
                              <PokeButton
                                targetUserId={user.id}
                                targetUserName={user.name}
                                variant="outline"
                                size="sm"
                                className="text-green-400"
                                onPokeSuccess={() => navigate({ to: "/" })}
                              />
                            )}
                          </>
                        ) : (
                          <PokeButton
                            targetUserId={user.id}
                            targetUserName={user.name}
                            variant="outline"
                            size="sm"
                            onPokeSuccess={() => navigate({ to: "/" })}
                          />
                        )}
                        <div className="flex items-center gap-2 justify-end mb-2">
                          <Zap className="h-4 w-4 text-yellow-400" />
                          <span className="font-semibold text-white/90">
                            {user.pokeCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Initial state */}
        {!searchQuery.trim() && (
          <div className="text-center py-12 text-white/60">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Search for users</p>
            <p className="text-sm">Start typing to find people to poke</p>
          </div>
        )}
      </div>
    </div>
  );
}
