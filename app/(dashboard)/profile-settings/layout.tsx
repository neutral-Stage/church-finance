import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile Settings | Church Finance",
  description: "Update your profile information",
};

export default function ProfileSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
