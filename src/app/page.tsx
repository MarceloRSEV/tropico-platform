import { redirect } from "next/navigation";

// Redireciona raiz para /dashboard (middleware vai redirecionar para /login se não autenticado)
export default function RootPage() {
  redirect("/dashboard");
}
