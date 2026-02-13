import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bank Reconciliation | Church Finance",
  description: "Reconcile bank statements with church financial records",
};

export default function ReconciliationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
