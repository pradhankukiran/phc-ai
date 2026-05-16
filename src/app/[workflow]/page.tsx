import { notFound } from "next/navigation";
import { PhcWorkspace } from "@/components/phc-workspace";
import { getWorkflow, workflows } from "@/lib/workflows";

export function generateStaticParams() {
  return workflows.map((workflow) => ({ workflow: workflow.route }));
}

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ workflow: string }>;
}) {
  const { workflow: route } = await params;
  const workflow = getWorkflow(route);

  if (!workflow) {
    notFound();
  }

  return <PhcWorkspace key={workflow.route} activeRoute={workflow.route} />;
}
