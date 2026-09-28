import { redirect } from "next/navigation";

export default function Home() {
  // O Painel (visao geral de todas as areas) e a tela inicial.
  redirect("/painel");
}
