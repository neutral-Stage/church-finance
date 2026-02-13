import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Churches | Church Finance",
  description: "Admin: Manage church organizations",
};

export default function AdminChurchesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
