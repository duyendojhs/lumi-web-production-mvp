import { AppFrame } from "@/components/AppFrame";
import { SourceLibrary } from "@/components/sources/SourceLibrary";

export const dynamic = "force-dynamic";

export default function SourcesPage() {
  return (
    <AppFrame>
      <SourceLibrary />
    </AppFrame>
  );
}
