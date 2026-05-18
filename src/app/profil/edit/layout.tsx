import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Modifier le profil",
};

export default function ProfileEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
