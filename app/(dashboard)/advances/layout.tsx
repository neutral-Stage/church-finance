import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Advances | Church Finance",
  description: "Manage staff advances and repayments",
};

export default function AdvancesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
