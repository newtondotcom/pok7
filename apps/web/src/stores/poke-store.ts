import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { trpcClient } from "@/utils/trpc";
import React from "react";

interface PokeRelation {
  id: string;
  count: number;
  userAId: string;
  userBId: string;
  lastPokeDate: string;
  lastPokeBy: string;
  visibleLeaderboard: boolean;
  otherUser: {
    id: string;
    name: string;
    username: string | null;
    image: string | null;
  };
}

interface PokeData {
  count: number;
  totalPokes: number;
  pokeRelations: PokeRelation[];
}

interface PokeStore {
  // State
  pokesData: PokeData | null;
  isLoading: boolean;
  error: any;
  orderedPokeRelations: PokeRelation[];
  isConnected: boolean;

  // Actions
  setPokesData: (data: PokeData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: any) => void;
  setConnectionStatus: (connected: boolean) => void;
  getOrderedPokeRelations: (pokeRelations: PokeRelation[]) => PokeRelation[];
}

export const usePokeStore = create<PokeStore>((set, get) => ({
  // Initial state
  pokesData: null,
  isLoading: false,
  error: null,
  orderedPokeRelations: [],
  isConnected: false,

  // Set pokes data and update ordered relations in a single state update
  setPokesData: (data) => {
    const orderedRelations = data?.pokeRelations
      ? get().getOrderedPokeRelations(data.pokeRelations)
      : [];

    set({
      pokesData: data,
      orderedPokeRelations: orderedRelations,
    });
  },

  // Set loading state
  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  // Set error state
  setError: (error) => {
    set({ error });
  },

  // Set connection status
  setConnectionStatus: (connected) => {
    set({ isConnected: connected });
  },

  // Get ordered poke relations based on the provided data
  getOrderedPokeRelations: (pokeRelations) => {
    if (!pokeRelations) return [];

    return [...pokeRelations].sort((a, b) => {
      const aIsYourTurn = a.lastPokeBy == a.otherUser.id;
      const bIsYourTurn = b.lastPokeBy == b.otherUser.id;

      // First priority: Show relations where it's your turn to poke (someone is waiting for you)
      if (aIsYourTurn && !bIsYourTurn) return -1;
      if (!aIsYourTurn && bIsYourTurn) return 1;

      // Second priority: When both are in the same state (both your turn or both their turn),
      // sort by highest count first
      if (a.count !== b.count) {
        return b.count - a.count; // Higher count first
      }

      // Third priority: If counts are equal, sort by most recent last poke date
      return (
        new Date(b.lastPokeDate).getTime() - new Date(a.lastPokeDate).getTime()
      );
    });
  },
}));

// Hook to use poke data Server Send Events
export const usePokeData = () => {
  const { setPokesData, setLoading, setError, setConnectionStatus } = usePokeStore(
    useShallow((state) => ({
      setPokesData: state.setPokesData,
      setLoading: state.setLoading,
      setError: state.setError,
      setConnectionStatus: state.setConnectionStatus,
    })),
  );

  React.useEffect(() => {
    setLoading(true);
    setConnectionStatus(false); // Start disconnected

    const subscription = trpcClient.getUserPokes.subscribe(undefined, {
      onData: (data: any) => {
        console.log(">>> Observed new event:", data);
        setPokesData(data);
        setLoading(false);
        setConnectionStatus(true); // Connected when we receive data
      },
      onError: (error: any) => {
        console.error(">>> Subscription error:", error);
        setError(error);
        setLoading(false);
        setConnectionStatus(false); // Disconnected on error
      },
      onComplete: () => {
        console.log(">>> User subscription completed");
        setLoading(false);
        setConnectionStatus(false); // Disconnected when completed
      },
    });

    return () => {
      subscription.unsubscribe();
      setConnectionStatus(false);
    };
  }, [setPokesData, setLoading, setError, setConnectionStatus]);

  return usePokeStore(
    useShallow((state) => ({
      data: state.pokesData,
      isLoading: state.isLoading,
      error: state.error,
      isConnected: state.isConnected,
    })),
  );
};

// Helper hook for easier access
export const useOrderedPokeRelations = () =>
  usePokeStore((state) => state.orderedPokeRelations);

// Helper hook for connection status
export const useConnectionStatus = () =>
  usePokeStore((state) => state.isConnected);
