import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preferences | Church Finance",
  description: "Configure your account preferences",
};

export default function PreferencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
