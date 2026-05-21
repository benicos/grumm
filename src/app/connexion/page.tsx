import { redirect } from "next/navigation";

export default function LegacyConnexionPage() {
  redirect("/login");
}
