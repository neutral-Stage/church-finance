import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Users | Church Finance",
  description: "Admin: Manage user accounts",
};

export default function AdminUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
