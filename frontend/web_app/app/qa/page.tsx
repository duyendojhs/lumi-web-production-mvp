import { AppFrame } from "@/components/AppFrame";
import { QaConsole } from "@/components/qa/QaConsole";
import { requireAdminPage } from "@/lib/server/auth/session";

export const dynamic = "force-dynamic";

export default async function QaPage() {
  await requireAdminPage("/qa");
  return (
    <AppFrame>
      <QaConsole />
    </AppFrame>
  );
}
