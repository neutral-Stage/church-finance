import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Roles | Church Finance",
  description: "Admin: Configure user roles and permissions",
};

export default function AdminRolesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
