import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offerings | Church Finance",
  description: "View and manage church offerings, tithes, and donations",
};

export default function OfferingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
