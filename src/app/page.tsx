import { Workspace } from "@/components/workspace";

export default function Home() {
  return <Workspace adsEnabled={process.env.NEXT_PUBLIC_ADS_ENABLED === "true"} />;
}
