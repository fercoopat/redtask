import { redirect } from "next/navigation";

import { LoginForm } from "@/modules/auth/components/login-form";
import { getCurrentUser } from "@/modules/auth/helpers/session";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/issues");

  return (
    <main className="hero min-h-screen bg-base-200 px-5 py-12">
      <div className="hero-content grid w-full max-w-6xl gap-12 lg:grid-cols-[1fr_440px] lg:gap-20">
        <section className="space-y-7">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-content">
              <span className="text-lg font-bold" aria-hidden="true">
                R
              </span>
            </div>
            <span className="text-lg font-semibold tracking-tight">Redmine Workspace</span>
          </div>
          <div className="space-y-4">
            <p className="badge badge-primary badge-outline">Tu espacio de trabajo</p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Todo tu trabajo de Redmine, en una interfaz más clara.
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-base-content/65">
              Conéctate con tu API Key para ver las incidencias disponibles para tu cuenta.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-base-content/70">
            <span className="badge badge-ghost py-4">Acceso con tu cuenta Redmine</span>
            <span className="badge badge-ghost py-4">Conexión cifrada</span>
          </div>
        </section>

        <section className="card w-full border border-base-300 bg-base-100 shadow-xl">
          <div className="card-body gap-6 p-7 sm:p-9">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
                Bienvenido
              </p>
              <h2 className="card-title text-2xl">Conecta tu cuenta</h2>
              <p className="text-sm leading-relaxed text-base-content/60">
                Introduce la API Key asociada a tu usuario de Redmine.
              </p>
            </div>
            <LoginForm />
            <div className="divider my-0" />
            <p className="text-xs leading-relaxed text-base-content/55">
              Tu API Key se cifra en una cookie protegida y no se guarda en el almacenamiento del
              navegador.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
