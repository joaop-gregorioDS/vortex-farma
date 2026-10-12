import { notFound } from "next/navigation";
import { Admin } from "@/components/Admin";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!["orders", "stock", "products", "reviews", "activity"].includes(section))
    notFound();
  return <Admin section={section} />;
}
