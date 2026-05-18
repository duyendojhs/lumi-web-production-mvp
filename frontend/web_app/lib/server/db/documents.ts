import { productionDbUnavailablePayload } from "./client";
import type { DbDocumentRow, RepositoryResult } from "./types";

export function listDocumentsFromDb(): RepositoryResult<DbDocumentRow[]> {
  return {
    ...productionDbUnavailablePayload(),
    data: [],
  };
}
