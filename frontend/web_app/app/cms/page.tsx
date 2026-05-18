import { AppFrame } from "@/components/AppFrame";
import { CmsConsole } from "@/components/cms/CmsConsole";
import { requireAdminPage } from "@/lib/server/auth/session";

export const dynamic = "force-dynamic";

export default async function CmsPage() {
  await requireAdminPage("/cms");
  return (
    <AppFrame>
      <CmsConsole />
    </AppFrame>
  );
}
