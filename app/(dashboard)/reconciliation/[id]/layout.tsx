import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reconciliation Details | Church Finance",
  description: "View reconciliation session details",
};

export default function ReconciliationDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
