import Workspace from "@/components/Workspace";

export default function CampaignPage({ params }: { params: { id: string } }) {
  return <Workspace campaignId={params.id} />;
}
