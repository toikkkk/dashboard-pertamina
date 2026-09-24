import MocFormPage from "@/components/MocFormPage";

export default function EditMocPage({ params }: { params: { id: string } }) {
  return <MocFormPage mocId={params.id} />;
}
