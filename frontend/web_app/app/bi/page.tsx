import { AppFrame } from "@/components/AppFrame";
import { BiConsole } from "@/components/bi/BiConsole";
import { requireAdminPage } from "@/lib/server/auth/session";

export const dynamic = "force-dynamic";

export default async function BiPage() {
  await requireAdminPage("/bi");
  return (
    <AppFrame>
      <BiConsole />
    </AppFrame>
  );
}
