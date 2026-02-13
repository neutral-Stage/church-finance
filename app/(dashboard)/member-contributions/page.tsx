import { getMemberContributionsData, requireAuth } from "@/lib/server-data";
import { getSelectedChurch } from "@/lib/server-church-context";
import MemberContributionsClient from "@/components/member-contributions-client";
import { EmptyChurchState } from "@/components/empty-church-state";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Member Contributions | Church Finance",
  description: "View and analyze member contribution history and patterns.",
};

// Force dynamic rendering since this page requires server-side authentication
export const dynamic = "force-dynamic";

export default async function MemberContributionsPage() {
  // Require authentication first - will redirect if not authenticated
  await requireAuth();

  // Get selected church - if no church is selected, show empty state
  const selectedChurch = await getSelectedChurch();
  if (!selectedChurch) {
    return <EmptyChurchState />;
  }

  const memberContributionsData = await getMemberContributionsData();

  return <MemberContributionsClient initialData={memberContributionsData} />;
}
