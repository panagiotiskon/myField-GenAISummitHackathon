import { OwnerPack } from "@/components/OwnerPack";

export default async function OwnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OwnerPack parcelId={id} />;
}
