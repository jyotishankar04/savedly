import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getVaultStatus, lockVault, setVaultPin, unlockVault } from "@/lib/vault";

export const vaultKeys = {
  status: ["vault", "status"] as const,
};

export const useVaultStatusQuery = () => useQuery({ queryKey: vaultKeys.status, queryFn: getVaultStatus });

function useVaultMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaultKeys.status });
      // Unlocking/locking/setting the PIN all change what a
      // ?isVaulted=true fetch is allowed to return, so any vaulted list
      // already in the cache needs a refetch under the new state.
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export const useSetVaultPinMutation = () => useVaultMutation(setVaultPin);
export const useUnlockVaultMutation = () => useVaultMutation(unlockVault);
export const useLockVaultMutation = () => useVaultMutation(() => lockVault());
