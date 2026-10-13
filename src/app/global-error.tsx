"use client";

import "./globals.css";

import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es" data-theme="light">
      <body className="min-h-screen bg-base-200 font-sans">
        <main className="grid min-h-screen place-items-center p-6">
          <section className="w-full max-w-lg space-y-4 rounded-box bg-base-100 p-8 shadow">
            <h1 className="text-2xl font-semibold">Algo salió mal / Something went wrong</h1>
            <Alert variant="error">
              Se produjo un error inesperado. / An unexpected error occurred.
            </Alert>
            <Button variant="primary" onClick={reset}>
              Reintentar / Try again
            </Button>
          </section>
        </main>
      </body>
    </html>
  );
}
