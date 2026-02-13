import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bills | Church Finance",
  description: "Track and manage church bills and payments",
};

export default function BillsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
