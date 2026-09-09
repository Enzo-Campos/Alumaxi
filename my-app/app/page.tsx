import { redirect } from "next/navigation";

export default function Home() {
  // A gestao de obra e a tela central do sistema.
  redirect("/obras");
}
