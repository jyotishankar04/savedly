import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myPlanQueryKey } from "@/hooks/use-plan-limit";
import {
  approveShareRequest,
  createShare,
  deleteShare,
  denyShareRequest,
  getShareForResource,
  getShareViewSummary,
  getShareViewsDaily,
  inviteToShare,
  listAllPendingRequests,
  listMyShares,
  listShareGrants,
  listShareViewers,
  listSharedWithMe,
  revokeShareGrant,
  rotateShareSlug,
  updateShare,
  type ShareResourceType,
  type UpdateSharePatch,
} from "@/lib/shares";

export const shareKeys = {
  all: ["shares"] as const,
  mine: ["shares", "mine"] as const,
  sharedWithMe: ["shares", "shared-with-me"] as const,
  requests: ["shares", "requests"] as const,
  resource: (type: ShareResourceType, id: string) => ["shares", "resource", type, id] as const,
  grants: (shareId: string) => ["shares", shareId, "grants"] as const,
  viewSummary: (shareId: string) => ["shares", shareId, "views", "summary"] as const,
  viewers: (shareId: string) => ["shares", shareId, "views"] as const,
  viewsDaily: (shareId: string) => ["shares", shareId, "views", "daily"] as const,
};

/**
 * Every share mutation invalidates the whole ["shares"] prefix rather than
 * a precise key. The lists, the per-resource lookup and the grant list all
 * overlap (approving a request changes a grant count, a pending count and
 * a row in two different lists), so targeted invalidation here buys
 * nothing but a chance to miss one.
 */
function useShareMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, opts?: { touchesPlanUsage?: boolean }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shareKeys.all });
      // Publishing/unpublishing moves the public_share_count usage counter,
      // which the dialog reads back to show "n of m used".
      if (opts?.touchesPlanUsage) queryClient.invalidateQueries({ queryKey: myPlanQueryKey });
    },
  });
}

export const useMySharesQuery = () => useQuery({ queryKey: shareKeys.mine, queryFn: listMyShares });

export const useSharedWithMeQuery = () =>
  useQuery({ queryKey: shareKeys.sharedWithMe, queryFn: listSharedWithMe });

export const usePendingRequestsQuery = () =>
  useQuery({ queryKey: shareKeys.requests, queryFn: listAllPendingRequests });

/**
 * The share for one resource, or null when it has never been shared.
 * `enabled` keeps this from firing until the dialog actually opens — most
 * collections are never shared, and this would otherwise be a request per
 * page view.
 */
export const useResourceShareQuery = (type: ShareResourceType, id: string, enabled = true) =>
  useQuery({
    queryKey: shareKeys.resource(type, id),
    queryFn: () => getShareForResource(type, id),
    enabled,
  });

export const useShareGrantsQuery = (shareId: string | undefined) =>
  useQuery({
    queryKey: shareKeys.grants(shareId ?? "none"),
    queryFn: () => listShareGrants(shareId!),
    enabled: Boolean(shareId),
  });

/**
 * Not opened by default alongside the share dialog — analytics are an
 * expand-to-see detail, not something every dialog open should fetch.
 * `enabled` is how callers defer the query until the panel is opened.
 */
export const useShareViewSummaryQuery = (shareId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: shareKeys.viewSummary(shareId ?? "none"),
    queryFn: () => getShareViewSummary(shareId!),
    enabled: Boolean(shareId) && enabled,
  });

export const useShareViewersQuery = (shareId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: shareKeys.viewers(shareId ?? "none"),
    queryFn: () => listShareViewers(shareId!),
    enabled: Boolean(shareId) && enabled,
  });

export const useShareViewsDailyQuery = (shareId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: shareKeys.viewsDaily(shareId ?? "none"),
    queryFn: () => getShareViewsDaily(shareId!),
    enabled: Boolean(shareId) && enabled,
  });

export const useCreateShareMutation = () =>
  useShareMutation(({ type, id }: { type: ShareResourceType; id: string }) => createShare(type, id));

export const useUpdateShareMutation = () =>
  useShareMutation(({ id, patch }: { id: string; patch: UpdateSharePatch }) => updateShare(id, patch), {
    touchesPlanUsage: true,
  });

export const useRotateSlugMutation = () => useShareMutation((id: string) => rotateShareSlug(id));

export const useDeleteShareMutation = () =>
  useShareMutation((id: string) => deleteShare(id), { touchesPlanUsage: true });

export const useInviteToShareMutation = () =>
  useShareMutation(({ id, email }: { id: string; email: string }) => inviteToShare(id, email));

export const useRevokeGrantMutation = () =>
  useShareMutation(({ id, grantId }: { id: string; grantId: string }) => revokeShareGrant(id, grantId));

export const useApproveRequestMutation = () =>
  useShareMutation(({ id, requestId }: { id: string; requestId: string }) => approveShareRequest(id, requestId));

export const useDenyRequestMutation = () =>
  useShareMutation(({ id, requestId }: { id: string; requestId: string }) => denyShareRequest(id, requestId));
