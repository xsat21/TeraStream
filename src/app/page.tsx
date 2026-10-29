import { Workspace } from "@/components/workspace";
import { providerMode } from "@/lib/providers/config";

// Provider selection is server-only runtime configuration, not a baked client secret.
export const dynamic = "force-dynamic";

export default function Home() {
  return <Workspace adsEnabled={process.env.NEXT_PUBLIC_ADS_ENABLED === "true"} providerMode={providerMode()} />;
}
