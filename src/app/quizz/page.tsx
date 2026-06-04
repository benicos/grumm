import { redirect } from "next/navigation";

export default function LegacyQuizRedirectPage() {
  redirect("/quiz");
}
