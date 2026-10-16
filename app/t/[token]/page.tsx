import TrackClient from "@/components/TrackClient";

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TrackClient token={token} />;
}
