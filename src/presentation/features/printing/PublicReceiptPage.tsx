import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import type { ApiEnvelope } from "@/shared/interfaces/api-response.interface";

type Receipt = { lines: string[]; headerLines: number; logo: string | null };

export default function PublicReceiptPage() {
  const token = useLocation().hash.slice(1);
  const receipt = useQuery({
    queryKey: ["public-receipt", token],
    enabled: !!token,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    queryFn: async ({ signal }) => {
      const base = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
      const response = await fetch(`${base}/public/receipt`, {
        signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        headers: { Authorization: `Receipt ${token}` },
      });
      if (!response.ok) throw new Error(String(response.status));
      return ((await response.json()) as ApiEnvelope<Receipt>).data;
    },
  });

  const data = receipt.data;
  return (
    <main className="min-h-dvh bg-muted px-4 py-8 text-foreground">
      <meta name="robots" content="noindex,nofollow" />
      <article className="mx-auto max-w-lg rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8">
        {!data ? (
          <p role="status" className="text-center">
            {token && receipt.isPending
              ? "Verificando ticket…"
              : !token || receipt.error?.message === "404"
                ? "Este ticket no está disponible."
                : "No se pudo consultar el ticket. Vuelve a cargar la página."}
          </p>
        ) : (
          <>
            <header className="space-y-2 text-center">
              {data.logo && (
                <img src={data.logo} alt="" className="mx-auto max-h-24 max-w-48 object-contain" />
              )}
              <h1 className="text-2xl font-bold [overflow-wrap:anywhere]">{data.lines[0]}</h1>
              {data.lines.slice(1, data.headerLines - 1).map((line, index) => (
                <p key={index} className="text-sm [overflow-wrap:anywhere]">{line}</p>
              ))}
              <h2 className="pt-2 font-bold">{data.lines[data.headerLines - 1]}</h2>
              <p className="font-semibold text-success">Pago verificado</p>
            </header>
            <div className="mt-5 space-y-1 font-mono text-sm">
              {data.lines.slice(data.headerLines).map((line, index) =>
                /^-{3,}$/.test(line) ? (
                  <hr key={index} className="my-3 border-dashed border-border" />
                ) : (
                  <p key={index} className="whitespace-pre-wrap [overflow-wrap:anywhere]">{line}</p>
                ),
              )}
            </div>
          </>
        )}
      </article>
    </main>
  );
}
