import { PokesService, type UserPokeRelation } from "@/rpc/proto/poky/v1/pokes_service_pb";
import { timestampDate } from "@bufbuild/protobuf/wkt";
import { createCallbackClient, type ConnectError } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { useEffect, useMemo } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

// -------------------
// Zustand store
// -------------------
interface PokeData {
  count: number;
  totalPokes: number;
  pokeRelations: UserPokeRelation[];
}

interface PokeStore {
  pokesData: PokeData | null;
  isLoading: boolean;
  error: any;
  orderedPokeRelations: UserPokeRelation[];
  isConnected: boolean;
  retryCount: number;

  setPokesData: (data: PokeData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: any) => void;
  setConnectionStatus: (connected: boolean) => void;
  getOrderedPokeRelations: (pokeRelations: UserPokeRelation[]) => UserPokeRelation[];
  retry: () => void;
}

export const usePokeStore = create<PokeStore>((set, get) => ({
  pokesData: null,
  isLoading: false,
  error: null,
  orderedPokeRelations: [],
  isConnected: false,
  retryCount: 0,

  setPokesData: (data) => {
    const orderedRelations = data?.pokeRelations
      ? get().getOrderedPokeRelations(data.pokeRelations)
      : [];
    set({ pokesData: data, orderedPokeRelations: orderedRelations });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setConnectionStatus: (connected) => set({ isConnected: connected }),

  getOrderedPokeRelations: (pokeRelations: UserPokeRelation[]) => {
    if (!pokeRelations) return [];
    return [...pokeRelations].sort((a, b) => {
      const aIsYourTurn = a.lastPokeBy === a.otherUser?.id;
      const bIsYourTurn = b.lastPokeBy === b.otherUser?.id;

      if (aIsYourTurn && !bIsYourTurn) return -1;
      if (!aIsYourTurn && bIsYourTurn) return 1;

      if (a.count !== b.count) return b.count - a.count;

      const aTime = a.lastPokeDate ? timestampDate(a.lastPokeDate).getTime() : 0;
      const bTime = b.lastPokeDate ? timestampDate(b.lastPokeDate).getTime() : 0;
      return bTime - aTime;
    });
  },

  retry: () => {
    // Clear error and reset state to trigger a retry
    set((state) => ({ 
      error: null, 
      isLoading: true, 
      isConnected: false,
      retryCount: state.retryCount + 1
    }));
  },
}));

// -------------------
// Hook: create client with token
// -------------------
export const usePokesClient = () => {
  const client = useMemo(() => {
    const transport = createConnectTransport({
      baseUrl: import.meta.env.VITE_SERVER_URL,
      fetch: (input, init) => fetch(input, {...init, credentials: "include"}),
      defaultTimeoutMs : 20*60*1000
    });

    return createCallbackClient(PokesService, transport);
  }, []);

  return client;
};

// -------------------
// Hook: streaming poke data
// -------------------
export const usePokeData = () => {
  const client = usePokesClient();
  const { setPokesData, setLoading, setError, setConnectionStatus, retryCount } = usePokeStore(
    useShallow((state) => ({
      setPokesData: state.setPokesData,
      setLoading: state.setLoading,
      setError: state.setError,
      setConnectionStatus: state.setConnectionStatus,
      retry: state.retry,
      retryCount: state.retryCount,
    })),
  );

  useEffect(() => {
    setLoading(true);
    setConnectionStatus(false);

    // Start streaming
    const stream = client.getUserPokes(
      {},
      (res) => {
        const pokeData: PokeData = {
          count: res.pokeRelations.length,
          totalPokes: res.pokeRelations.reduce((acc, curr) => acc + curr.count, 0),
          pokeRelations: res.pokeRelations,
        };
        setPokesData(pokeData);
        setLoading(false);
        setConnectionStatus(true);
      },
      (err?: ConnectError) => {
        if (err) {
          setError(err);
          setLoading(false);
          setConnectionStatus(false);
        }
      },
    );

    // Cleanup
    return () => {
      setConnectionStatus(false);
      setError(null);
      if (stream && typeof stream === "function") {
        try {
          stream();
        } catch (error) {
          console.warn("Error closing stream:", error);
        }
      }
    };
  }, [client, setPokesData, setLoading, setError, setConnectionStatus, retryCount]);

  return usePokeStore(
    useShallow((state) => ({
      data: state.pokesData,
      isLoading: state.isLoading,
      error: state.error,
      isConnected: state.isConnected,
      retry: state.retry,
    })),
  );
};

// -------------------
// Helper hooks
// -------------------
export const useOrderedPokeRelations = () =>
  usePokeStore((state) => state.orderedPokeRelations);

export const useConnectionStatus = () =>
  usePokeStore((state) => state.isConnected);
