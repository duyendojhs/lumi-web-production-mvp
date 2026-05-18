import { productionDbUnavailablePayload } from "./client";
import type { DbPipelineRunRow, RepositoryResult } from "./types";

export function listPipelineRunsFromDb(): RepositoryResult<DbPipelineRunRow[]> {
  return {
    ...productionDbUnavailablePayload(),
    data: [],
  };
}
