import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "@connectrpc/connect-query";
import { toast } from "@pheralb/toast";
import { LeaderboardService } from "@/rpc/proto/poky/v1/leaderboard_service_pb";
import { PokesService } from "@/rpc/proto/poky/v1/pokes_service_pb";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface PokeRelationSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRelation: any;
}

export function PokeRelationSheet({ isOpen, onOpenChange, selectedRelation }: PokeRelationSheetProps) {
  // Query to fetch fresh relation data when sheet opens
  const { data: freshRelationData, isLoading: isLoadingRelation } = useQuery(
    PokesService.method.getPokeRelation,
    {
      relationId: selectedRelation?.id || "",
    },
    {
      enabled: !!selectedRelation?.id && isOpen,
    }
  );

  // Mutation to toggle visibility
  const toggleVisibilityMutation = useMutation(LeaderboardService.method.togglePokeVisibility, {
    onSuccess: () => {
      toast.success({ text: "Visibility updated!" });
      onOpenChange(false);
    },
    onError: () => {
      toast.error({ text: "Failed to update visibility" });
    },
  });

  // Placeholder for delete relation mutation (to be implemented later)
  const deleteRelationMutation = useMutation({
    mutationFn: async (_relationId: string) => {
      // TODO: Implement delete relation API call
      throw new Error("Delete relation function not implemented yet");
    },
    onSuccess: () => {
      toast.success({ text: "Relation deleted!" });
      onOpenChange(false);
    },
    onError: () => {
      toast.error({ text: "Failed to delete relation" });
    },
  } as any);

  // Handle visibility toggle
  const handleToggleVisibility = () => {
    const relationToUse = freshRelationData?.relation || selectedRelation;
    if (relationToUse) {
      toggleVisibilityMutation.mutate({
        relationId: relationToUse.id,
        visible: !relationToUse.visibleLeaderboard,
      });
    }
  };

  // Handle delete relation
  const handleDeleteRelation = () => {
    if (selectedRelation) {
      deleteRelationMutation.mutate(selectedRelation.id);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-white/10 backdrop-blur-xl border-white/20 px-4 py-4">
        <SheetHeader>
          <SheetTitle className="text-white/90">
            {freshRelationData?.relation?.otherUser?.name || selectedRelation?.otherUser?.name}
          </SheetTitle>
          <SheetDescription className="text-white/60">
            Manage your poke relation with this user
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col gap-4 mt-6">
          {isLoadingRelation ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white/90 rounded-full animate-spin" />
              <span className="ml-2 text-white/60">Loading relation details...</span>
            </div>
          ) : (
            <>
              {/* Toggle Visibility Option */}
              <Button
                onClick={handleToggleVisibility}
                disabled={toggleVisibilityMutation.isPending}
                variant="outline"
                className="w-full justify-start gap-3 h-12 bg-white/5 border-white/20 text-white/90 hover:bg-white/10"
              >
                {toggleVisibilityMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (freshRelationData?.relation?.visibleLeaderboard ?? selectedRelation?.visibleLeaderboard) ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span>
                  {(freshRelationData?.relation?.visibleLeaderboard ?? selectedRelation?.visibleLeaderboard)
                    ? "Hide from Leaderboard" 
                    : "Show on Leaderboard"
                  }
                </span>
              </Button>
          
              {/* Delete Relation Option */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-12 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Relation</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white/10 backdrop-blur-xl border-white/20">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white/90">
                      Delete Poke Relation
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-white/60">
                      Are you sure you want to delete your poke relation with{" "}
                      <span className="font-semibold text-white/80">
                        {freshRelationData?.relation?.otherUser?.name || selectedRelation?.otherUser?.name}
                      </span>
                      ? This action cannot be undone and will remove all poke history between you two.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-white/5 border-white/20 text-white/70 hover:bg-white/10">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteRelation}
                      disabled={deleteRelationMutation.isPending}
                      className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                    >
                      {deleteRelationMutation.isPending ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Delete"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
