import { AppFrame } from "@/components/AppFrame";
import { PlatformsConsole } from "@/components/platforms/PlatformsConsole";
import { requireAdminPage } from "@/lib/server/auth/session";

export const dynamic = "force-dynamic";

export default async function PlatformsPage() {
  await requireAdminPage("/platforms");
  return (
    <AppFrame>
      <PlatformsConsole />
    </AppFrame>
  );
}
