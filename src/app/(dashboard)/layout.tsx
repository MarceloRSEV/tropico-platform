import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proteção server-side: redireciona se não autenticado (AC6)
  if (!user) {
    redirect("/login");
  }

  // Busca perfil — trata graciosamente se não existir (AC7)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">Tropico</h1>
          <p className="text-xs text-gray-500 mt-0.5">Marketing Intelligence</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <a
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Dashboard
          </a>
          <a
            href="/campaigns"
            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Campanhas
          </a>
          <a
            href="/crm"
            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
          >
            CRM
          </a>

          {/* Abas exclusivas para admin (AC2 da Story 4.2) */}
          {profile?.role === "admin" && (
            <>
              <a
                href="/analysis"
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Análise Avançada
              </a>
              <a
                href="/suggestions"
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Sugestões IA
              </a>
              <a
                href="/settings"
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Configurações
              </a>
            </>
          )}
        </nav>

        {/* Footer do sidebar: info do usuário + logout */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-blue-700">
                {profile?.full_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name ?? user.email}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {profile?.role ?? "usuário"}
              </p>
            </div>
          </div>
          <form action="/logout" method="POST">
            <button
              type="submit"
              className="w-full text-left text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
