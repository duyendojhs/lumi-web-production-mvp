import { AppFrame } from "@/components/AppFrame";
import { DataLayerConsole } from "@/components/data-layer/DataLayerConsole";
import { requireAdminPage } from "@/lib/server/auth/session";
import { getDataLayerBundle } from "@/lib/server/dataLayerRepository";

export const dynamic = "force-dynamic";

export default async function DataLayerPage() {
  await requireAdminPage("/data-layer");
  const bundle = getDataLayerBundle();
  return (
    <AppFrame>
      <DataLayerConsole
        statistics={bundle.statistics}
        catalog={bundle.catalog}
        chunks={bundle.chunks}
        dataRoot={bundle.dataRoot}
        generated={bundle.generated}
        lineage={bundle.lineage}
        ocrQueue={bundle.ocrQueue}
        observability={bundle.observability}
        issueTriage={bundle.issueTriage}
        expectationContracts={bundle.expectationContracts}
        expectationResults={bundle.expectationResults}
        dataProducts={bundle.dataProducts}
        productionReadiness={bundle.productionReadiness}
        accessPolicy={bundle.accessPolicy}
        dataDictionary={bundle.dataDictionary}
      />
    </AppFrame>
  );
}
