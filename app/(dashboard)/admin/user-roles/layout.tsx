import { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Roles | Church Finance",
  description: "Admin: Assign roles to users",
};

export default function AdminUserRolesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
