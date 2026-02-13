import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications | Church Finance",
  description: "View system notifications and alerts",
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
