import { productionDbUnavailablePayload } from "./client";
import type { DbQualityIssueRow, RepositoryResult } from "./types";

export function listQualityIssuesFromDb(): RepositoryResult<DbQualityIssueRow[]> {
  return {
    ...productionDbUnavailablePayload(),
    data: [],
  };
}
