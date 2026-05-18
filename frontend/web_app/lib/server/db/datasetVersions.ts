import { productionDbUnavailablePayload } from "./client";
import type { DbDatasetVersionRow, RepositoryResult } from "./types";

export function listDatasetVersionsFromDb(): RepositoryResult<DbDatasetVersionRow[]> {
  return {
    ...productionDbUnavailablePayload(),
    data: [],
  };
}
