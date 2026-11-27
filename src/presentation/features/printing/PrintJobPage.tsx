import { Button, buttonVariants } from "@/presentation/components/ui/button";
import { Alert } from "@/presentation/components/ui/alert";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { usePrintJob } from "@/infrastructure/hooks/use-printing";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { apiError } from "@/shared/utils/api-error";
import { roleBasedRedirection } from "@/shared/utils/role-based-redirection";
import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronDown, Info } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/presentation/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/presentation/components/ui/dialog";
import { PrintJobActions, PrintJobBadge } from "./PrintJobStatus";
import {
  jobLabels,
  printContent,
  printDate,
  printDocumentNumber,
  printOrderContext,
} from "./printing-labels";

export default function PrintJobPage() {
  const { jobId = "" } = useParams();
  const { search } = useLocation();
  const query = usePrintJob(jobId);
  const job = query.data;
  const role = useAuthStore((state) => state.user?.userRole);
  const number = printDocumentNumber(job?.payload);
  const lines = printContent(job?.payload);
  const accountPath =
    role && job?.orderId
      ? `${roleBasedRedirection(role)}${role === "CASHIER" ? "" : "/cashier"}/accounts/${job.orderId}`
      : undefined;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        className={buttonVariants({ variant: "ghost" })}
        to={{ pathname: "..", search }}
        relative="path"
      >
        Volver a la cola
      </Link>
      {query.isPending && <p role="status">Cargando trabajo…</p>}
      {query.isError && (
        <Alert role="alert" variant="destructive">
          {apiError(query.error, "No se pudo consultar el trabajo.")}
        </Alert>
      )}
      {job && (
        <Card as="section">
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{jobLabels[job.type]}</h1>
              <PrintJobBadge job={job} />
            </div>
            <dl className="space-y-2 wrap-break-word">
              {number && (
                <div>
                  <dt className="font-semibold">Número impreso</dt>
                  <dd>{number}</dd>
                </div>
              )}
              <div>
                <dt className="font-semibold">Impresora</dt>
                <dd>{job.printer?.name ?? "Nombre no disponible"}</dd>
              </div>
              {job.orderId && (
                <div>
                  <dt className="font-semibold">Pedido</dt>
                  <dd>
                    {accountPath ? (
                      <Link className="text-link" to={accountPath}>
                        {job.order
                          ? `Pedido #${job.order.number}`
                          : "Ver pedido"}
                      </Link>
                    ) : job.order ? (
                      `Pedido #${job.order.number}`
                    ) : (
                      "Número no disponible"
                    )}
                    {job.order && ` · ${printOrderContext(job.order)}`}
                  </dd>
                </div>
              )}
              <div>
                <dt className="font-semibold">Creado · Intentos</dt>
                <dd>
                  {printDate(job.createdAt)} · {job.attempts}
                </dd>
              </div>
              {job.printedAt && (
                <div>
                  <dt className="font-semibold">Confirmación del agente</dt>
                  <dd>{printDate(job.printedAt)}</dd>
                </div>
              )}
            </dl>
            {job.status === "PROCESSING" && (
              <p>
                El agente tomó el trabajo. Si no llega una confirmación, revisa
                la impresora o el archivo de salida antes de generar otro.
              </p>
            )}
            <PrintJobActions key={job.id} job={job} blocked={query.isError} />
            {lines.length > 0 && (
              <Collapsible className="rounded-xl border bg-muted">
                <CollapsibleTrigger
                  render={<Button variant="ghost" className="group w-full justify-between" />}
                >
                  Texto del trabajo
                  <ChevronDown className="group-aria-expanded:rotate-180" aria-hidden="true" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="px-4 pb-4 font-mono text-sm whitespace-pre-wrap wrap-break-word">
                    {lines.join("\n")}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}
            <Dialog>
              <DialogTrigger render={<Button variant="outline" className="self-start" />}>
                <Info aria-hidden="true" />
                Datos técnicos
              </DialogTrigger>
              <DialogContent>
                <DialogHeader className="pr-12">
                  <DialogTitle>Datos técnicos</DialogTitle>
                  <DialogDescription>Identificadores del trabajo de impresión</DialogDescription>
                </DialogHeader>
                <dl className="grid gap-3 rounded-lg bg-muted p-3">
                  <div>
                    <dt className="font-medium">Trabajo</dt>
                    <dd className="wrap-anywhere font-mono text-xs">{job.id}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Impresora</dt>
                    <dd className="wrap-anywhere font-mono text-xs">{job.printerId}</dd>
                  </div>
                  {job.orderId && (
                    <div>
                      <dt className="font-medium">Pedido</dt>
                      <dd className="wrap-anywhere font-mono text-xs">{job.orderId}</dd>
                    </div>
                  )}
                </dl>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
      <Button
        type="submit" variant="outline"
        disabled={query.isFetching}
        onClick={() => void query.refetch()}
      >
        Actualizar estado
      </Button>
    </div>
  );
}
