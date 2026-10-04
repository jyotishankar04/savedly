import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { isAdvancedSearchEnabled, getAdvancedSearchMaxQueryLength, getAdvancedSearchMaxResults } from "../feature-flags/feature-flags.service";
import { advancedSearch } from "./search.service";
import type { AdvancedSearchInput } from "./search.schema";

export class SearchController {
  static async advancedSearch(req: Request, res: Response) {
    const isEnabled = await isAdvancedSearchEnabled();
    if (!isEnabled) {
      return res.status(403).json(ApiResponse.error("SEARCH_DISABLED", "Advanced search is currently disabled"));
    }

    const maxQueryLength = await getAdvancedSearchMaxQueryLength();
    const input = req.query as unknown as AdvancedSearchInput;

    if (input.query && input.query.length > maxQueryLength) {
      return res.status(400).json(ApiResponse.error("QUERY_TOO_LONG", `Query exceeds maximum length of ${maxQueryLength} characters`));
    }

    const maxResults = await getAdvancedSearchMaxResults();
    const limitedInput = { ...input, limit: Math.min(input.limit || 20, maxResults) };

    const result = await advancedSearch(req.user!.id, limitedInput);
    res.status(200).json(ApiResponse.success(result));
  }
}
