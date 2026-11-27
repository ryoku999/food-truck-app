import { Card, CardContent } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { NativeSelect } from "@/presentation/components/ui/native-select";
import { Label } from "@/presentation/components/ui/label";
import { Alert } from "@/presentation/components/ui/alert";
import { Button, buttonVariants } from "@/presentation/components/ui/button";
import { Badge } from "@/presentation/components/ui/badge";
import { useConfirm } from "@/presentation/components/use-confirm";
import {
  printerPurposes,
  type AgentToken,
  type Printer,
  type PrinterAgent,
  type PrintJob,
  type LocalPrinterDiscovery,
} from "@/core/entities/printing.entity";
import {
  usePrintAction,
  useLocalPrinterHealth,
  usePrinterAgents,
  usePrinters,
} from "@/infrastructure/hooks/use-printing";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { apiError } from "@/shared/utils/api-error";
import { roleBasedRedirection } from "@/shared/utils/role-based-redirection";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { printDate, purposeLabels } from "./printing-labels";

const name = z.string().trim().min(1, "Ingresa un nombre").max(100);
const printerSchema = z
  .object({
    name,
    purpose: z.enum(printerPurposes),
    connectionType: z.enum(["NETWORK_TCP", "SYSTEM_PRINTER"]),
    fallbackEnabled: z.boolean(),
    host: z.string().trim().max(253),
    port: z.string().trim(),
    systemName: z.string().trim().max(200),
    paperWidth: z.enum(["58", "80"]),
    printerAgentId: z.string(),
    active: z.boolean(),
  })
  .superRefine((fields, context) => {
    if (fields.connectionType === "NETWORK_TCP" || fields.fallbackEnabled) {
      if (!fields.host || /[\s/]/.test(fields.host))
        context.addIssue({
          code: "custom",
          path: ["host"],
          message: "Ingresa una IP o nombre de host sin protocolo.",
        });
      if (
        !/^\d+$/.test(fields.port) ||
        Number(fields.port) < 1 ||
        Number(fields.port) > 65535
      )
        context.addIssue({
          code: "custom",
          path: ["port"],
          message: "Ingresa un puerto de 1 a 65535.",
        });
    }
    if (
      (fields.connectionType === "SYSTEM_PRINTER" || fields.fallbackEnabled) &&
      (!fields.systemName || fields.systemName.startsWith("-"))
    ) {
      context.addIssue({
        code: "custom",
        path: ["systemName"],
        message: "Ingresa el nombre exacto de la cola instalada.",
      });
    }
  });

function PrinterForm({
  item,
  prefill,
  agents,
  close,
}: {
  item?: Printer;
  prefill?: Partial<Printer>;
  agents: PrinterAgent[];
  close: () => void;
}) {
  const action = usePrintAction<Printer>();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof printerSchema>>({
    resolver: zodResolver(printerSchema),
    defaultValues: {
      name: item?.name ?? prefill?.name ?? "",
      purpose: item?.purpose ?? "CASHIER",
      connectionType:
        (item?.connectionType ?? prefill?.connectionType) === "SYSTEM_PRINTER"
          ? "SYSTEM_PRINTER"
          : "NETWORK_TCP",
      fallbackEnabled: item?.fallbackEnabled ?? prefill?.fallbackEnabled ?? false,
      host: item?.host ?? prefill?.host ?? "",
      port: String(item?.port ?? prefill?.port ?? 9100),
      systemName: item?.systemName ?? prefill?.systemName ?? "",
      paperWidth: item?.paperWidth === 58 || prefill?.paperWidth === 58 ? "58" : "80",
      printerAgentId: item?.printerAgentId ?? "",
      active: item?.active ?? true,
    },
  });
  const network =
    useWatch({ control, name: "connectionType" }) === "NETWORK_TCP";
  const fallbackEnabled = useWatch({ control, name: "fallbackEnabled" });
  return (
    <Card
      as="form"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        try {
          await action.mutateAsync((repo) =>
            repo.savePrinter(
              {
                name: values.name,
                purpose: values.purpose,
                connectionType: values.connectionType,
                fallbackEnabled: values.fallbackEnabled,
                active: values.active,
                host: network || values.fallbackEnabled ? values.host : undefined,
                port: network || values.fallbackEnabled ? Number(values.port) : undefined,
                systemName: !network || values.fallbackEnabled ? values.systemName : undefined,
                paperWidth: values.paperWidth === "58" ? 58 : 80,
                printerAgentId: values.printerAgentId || null,
                productionAreaId: null,
              },
              item?.id,
            ),
          );
          toast.success(item ? "Impresora actualizada" : "Impresora registrada");
          close();
        } catch {
          /* Error is rendered from the mutation. */
        }
      })}
    >
      <CardContent>
        <h2 className="text-lg leading-snug font-semibold">
          {item ? "Editar impresora" : "Nueva impresora"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            Nombre
            <Input className="w-full" {...register("name")} />
          </label>
          <label className="grid gap-1">
            Propósito
            <NativeSelect className="w-full" {...register("purpose")}>
              {printerPurposes.filter((key) => key === "CASHIER" || key === "GENERAL" || key === item?.purpose).map((key) => (
                <option key={key} value={key}>
                  {purposeLabels[key]}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="grid gap-1">
            Conexión principal
            <NativeSelect className="w-full" {...register("connectionType")}>
              <option value="NETWORK_TCP">Red TCP</option>
              <option value="SYSTEM_PRINTER">Cola del sistema</option>
            </NativeSelect>
          </label>
          <Label className="min-h-11 self-end">
            <input type="checkbox" {...register("fallbackEnabled")} />
            Usar la otra conexión como respaldo
          </Label>
          <label className="grid gap-1">
            Ancho de papel
            <NativeSelect className="w-full" {...register("paperWidth")}>
              <option value="58">58 mm</option>
              <option value="80">80 mm</option>
            </NativeSelect>
          </label>
          {(network || fallbackEnabled) && (
            <>
              <label className="grid gap-1">
                Host o IP
                <Input
                  className="w-full"
                  placeholder="192.168.1.50"
                  {...register("host")}
                />
              </label>
              <label className="grid gap-1">
                Puerto
                <Input
                  className="w-full"
                  inputMode="numeric"
                  {...register("port")}
                />
              </label>
            </>
          )}
          {(!network || fallbackEnabled) && (
            <label className="grid gap-1">
              Nombre de la cola
              <Input className="w-full" {...register("systemName")} />
            </label>
          )}
          <label className="grid gap-1">
            Agente
            <NativeSelect className="w-full" {...register("printerAgentId")}>
              <option value="">Sin agente</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                  {agent.active ? "" : " (inactivo)"}
                </option>
              ))}
            </NativeSelect>
          </label>
          <Label className="min-h-11">
            <input
              type="checkbox"
              {...register("active")}
            />{" "}
            Activa
          </Label>
        </div>
        {Object.entries(errors).map(([key, error]) => (
          <p key={key} role="alert" className="text-destructive">
            {error.message}
          </p>
        ))}
        {action.isError && (
          <Alert role="alert" variant="destructive">
            {apiError(action.error, "No se pudo guardar la impresora.")}
          </Alert>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            Guardar
          </Button>
          <Button
            variant="ghost"
            type="button"
            disabled={isSubmitting}
            onClick={close}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentForm({
  item,
  token,
  close,
}: {
  item?: PrinterAgent;
  token: (result: AgentToken) => void;
  close: () => void;
}) {
  const action = usePrintAction<void>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(z.object({ name })),
    defaultValues: { name: item?.name ?? "" },
  });
  return (
    <Card
      as="form"
      onSubmit={handleSubmit(async (values) => {
        try {
          await action.mutateAsync(async (repo) => {
            if (item) await repo.updateAgent(item.id, values);
            else token(await repo.createAgent(values.name));
          });
          toast.success(item ? "Agente actualizado" : "Agente creado");
          close();
        } catch {
          /* Error is rendered from the mutation. */
        }
      })}
    >
      <CardContent>
        <h2 className="text-lg leading-snug font-semibold">
          {item ? "Editar agente" : "Nuevo agente"}
        </h2>
        <label className="grid gap-1">
          Nombre
          <Input className="w-full" {...register("name")} />
        </label>
        {errors.name && <p className="text-destructive">{errors.name.message}</p>}
        {action.isError && (
          <Alert role="alert" variant="destructive">
            {apiError(action.error, "No se pudo guardar el agente.")}
          </Alert>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            Guardar
          </Button>
          <Button
            variant="ghost"
            type="button"
            disabled={isSubmitting}
            onClick={close}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PrinterSettingsPage() {
  const confirmAction = useConfirm();
  const role = useAuthStore((state) => state.user?.userRole);
  const admin = role === "ADMIN";
  const jobsPath = `${role ? roleBasedRedirection(role) : ""}/print-jobs`;
  const printers = usePrinters();
  const agents = usePrinterAgents();
  const localHealth = useLocalPrinterHealth();
  const test = usePrintAction<PrintJob>();
  const deletePrinter = usePrintAction<void>();
  const agentAction = usePrintAction<void>();
  const discoveryAction = usePrintAction<LocalPrinterDiscovery>();
  const [editor, setEditor] = useState<
    | { kind: "printer"; item?: Printer; prefill?: Partial<Printer> }
    | { kind: "agent"; item?: PrinterAgent }
  >();
  const [secret, setSecret] = useState<AgentToken>();
  const [copy, setCopy] = useState("");
  const [testId, setTestId] = useState<string>();
  const [message, setMessage] = useState("");
  const [scanOctets, setScanOctets] = useState<[string, string, string]>([
    "192",
    "168",
    "101",
  ]);
  const [scanPort, setScanPort] = useState("9100");
  const [discovery, setDiscovery] = useState<LocalPrinterDiscovery>();
  const scanNetwork = `${scanOctets[0]}.${scanOctets[1]}.${scanOctets[2]}.x`;
  const scanNetworkReady = scanOctets.every(
    (octet) => /^(?:\d{1,3})$/.test(octet) && Number(octet) <= 255,
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-4xl">Impresión</h1>
        <Link className={buttonVariants({ variant: "outline" })} to={jobsPath}>
          Ver cola
        </Link>
      </div>
      {secret && admin && (
        <Card as="section" className="border-warning">
          <CardContent>
            <h2 className="text-lg leading-snug font-semibold">Token del agente</h2>
            <p>
              Se muestra una sola vez. Guárdalo en la PC del agente como{" "}
              <code>PRINTER_AGENT_TOKEN</code>.
            </p>
            <Input
              aria-label="Token del agente"
              className="w-full font-mono"
              readOnly
              value={secret.token}
              onFocus={(event) => event.currentTarget.select()}
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="submit" variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(secret.token);
                    setCopy("Token copiado.");
                  } catch {
                    setCopy("Selecciona y copia el token manualmente.");
                  }
                }}
              >
                Copiar
              </Button>
              <Button
                type="submit"
                onClick={() => {
                  setSecret(undefined);
                  setCopy("");
                }}
              >
                Ya lo guardé
              </Button>
            </div>
            {copy && <p role="status">{copy}</p>}
          </CardContent>
        </Card>
      )}
      {editor?.kind === "printer" && (
        <PrinterForm
          key={editor.item?.id ?? "printer"}
          item={editor.item}
          prefill={editor.prefill}
          agents={agents.data ?? []}
          close={() => setEditor(undefined)}
        />
      )}
      {editor?.kind === "agent" && admin && (
        <AgentForm
          key={editor.item?.id ?? "agent"}
          item={editor.item}
          token={setSecret}
          close={() => setEditor(undefined)}
        />
      )}
      {agentAction.isError && (
        <Alert role="alert" variant="destructive">
          {apiError(agentAction.error, "No se pudo actualizar el agente.")}
        </Alert>
      )}
      {test.isError && (
        <Alert role="alert" variant="destructive">
          {apiError(
            test.error,
            "No se confirmó la prueba. Revisa la cola antes de volver a enviarla.",
          )}
        </Alert>
      )}
      {deletePrinter.isError && (
        <Alert role="alert" variant="destructive">
          {apiError(deletePrinter.error, "No se pudo borrar la impresora.")}
        </Alert>
      )}
      {test.data && (
        <Alert variant="info" role="status">
          Prueba encolada.
          <Link className="text-link" to={`${jobsPath}/${test.data.id}`}>
            Consultar estado
          </Link>
        </Alert>
      )}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-border bg-card p-4 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold">Detectar impresoras locales</h2>
              <p className="text-sm opacity-75">
                El agente solo escaneará la red que indiques.
              </p>
            </div>
            <Badge variant={localHealth.data?.ok ? "success" : "ghost"}>
              {localHealth.data?.ok ? "API local conectada" : "API local no disponible"}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
            <label className="grid gap-1">
              Red a escanear
              <span className="flex items-center gap-1">
                {scanOctets.map((octet, index) => (
                  <span key={index} className="flex min-w-0 flex-1 items-center gap-1">
                    <Input
                      className="w-full text-center"
                      inputMode="numeric"
                      maxLength={3}
                      value={octet}
                      aria-label={`Octeto ${index + 1}`}
                      onChange={(event) => {
                        const value = event.target.value.replace(/\D/g, "");
                        setScanOctets((previous) => {
                          const next = [...previous] as [string, string, string];
                          next[index] = value;
                          return next;
                        });
                      }}
                    />
                    {index < 2 && <span aria-hidden="true">.</span>}
                  </span>
                ))}
                <span className="px-1 font-mono font-semibold">.x</span>
              </span>
            </label>
            <label className="grid gap-1">
              Puerto
              <Input
                className="w-full"
                inputMode="numeric"
                value={scanPort}
                onChange={(event) => setScanPort(event.target.value)}
              />
            </label>
            <Button
              type="submit" className="self-end"
              disabled={!localHealth.data?.ok || discoveryAction.isPending || !scanNetworkReady}
              onClick={() => {
                setDiscovery(undefined);
                discoveryAction.mutate(
                  (repo) => repo.discoverLocal(scanNetwork.trim(), Number(scanPort) || 9100),
                  {
                    onSuccess: (result) => {
                      setDiscovery(result);
                      toast.success(
                        `Búsqueda terminada: ${result.network.length} de red y ${result.system.length} de Windows`,
                      );
                    },
                  },
                );
              }}
            >
              {discoveryAction.isPending ? "Buscando…" : "Buscar"}
            </Button>
          </div>
          {localHealth.isError && (
            <p className="text-sm text-destructive">
              Inicia el agente Go en esta computadora para habilitar la búsqueda.
            </p>
          )}
          {discoveryAction.isError && (
            <Alert role="alert" variant="destructive">
              {apiError(discoveryAction.error, "No se pudo escanear la red indicada.")}
            </Alert>
          )}
          {discovery && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold">Impresoras de red ({discovery.network.length})</h3>
                {discovery.network.length === 0 && <p className="text-sm opacity-75">No se encontraron impresoras TCP.</p>}
                {discovery.network.map((printer) => (
                  <div key={`${printer.host}:${printer.port}`} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-3">
                    <span className="font-mono">{printer.host}:{printer.port} · {printer.latencyMs} ms</span>
                    <Button
                      type="submit" variant="outline" size="sm"
                      onClick={() => setEditor({ kind: "printer", prefill: { name: `Impresora ${printer.host}`, connectionType: "NETWORK_TCP", host: printer.host, port: printer.port, paperWidth: 80, active: true } })}
                    >
                      Guardar impresora
                    </Button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Colas de Windows ({discovery.system.length})</h3>
                {discovery.system.map((printer) => (
                  <div key={`${printer.name}:${printer.portName}`} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-3">
                    <span>{printer.name} · {printer.portName}</span>
                    <Button
                      type="submit" variant="outline" size="sm"
                      onClick={() => setEditor({ kind: "printer", prefill: { name: printer.name, connectionType: "SYSTEM_PRINTER", systemName: printer.name, paperWidth: 80, active: true } })}
                    >
                      Guardar impresora
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap justify-between gap-2">
            <h2 className="text-xl font-semibold">Impresoras</h2>
            <Button
              type="submit"
              disabled={!!editor || !agents.isSuccess}
              onClick={() => setEditor({ kind: "printer" })}
            >
              Nueva impresora
            </Button>
          </div>
          <p>Configura una impresora activa de comandas para cocina y barra y asigna un agente.</p>
          {printers.isPending && <p role="status">Cargando impresoras…</p>}
          {printers.isError && (
            <Alert role="alert" variant="destructive">
              No se pudieron cargar las impresoras.
              <Button type="submit" variant="outline" onClick={() => void printers.refetch()}>
                Reintentar
              </Button>
            </Alert>
          )}
          {printers.data?.length === 0 && (
            <p>No hay impresoras configuradas.</p>
          )}
          {printers.data?.map((item) => {
            const agent = agents.data?.find(
              (agent) => agent.id === item.printerAgentId,
            );
            return (
              <div
                key={item.id}
                className="space-y-2 border-t border-border pt-3"
              >
                <p className="font-semibold">
                  {item.name}{" "}
                  <Badge
                    variant={item.active ? "success" : "ghost"}
                  >
                    {item.active ? "Activa" : "Inactiva"}
                  </Badge>
                </p>
                <p>
                  {purposeLabels[item.purpose]} ·{" "}
                  {item.connectionType === "NETWORK_TCP"
                    ? `${item.host}:${item.port}`
                    : item.connectionType === "USB"
                      ? "USB"
                      : item.systemName}{" "}
                  · {item.paperWidth} mm
                </p>
                {item.fallbackEnabled && (
                  <p className="text-sm">
                    Respaldo: {item.connectionType === "NETWORK_TCP" ? item.systemName : `${item.host}:${item.port}`}
                  </p>
                )}
                <p>
                  {agent?.name ?? "Sin agente visible"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit" variant="outline"
                    disabled={!!editor || !agents.isSuccess}
                    onClick={() => setEditor({ kind: "printer", item })}
                  >
                    Editar
                  </Button>
                  <Button
                    type="submit" variant="destructive"
                    disabled={!!editor || deletePrinter.isPending || test.isPending}
                    onClick={async () => {
                      if (
                        await confirmAction(
                          `¿Borrar definitivamente la impresora "${item.name}"? Esta acción no se puede deshacer.`,
                        )
                      ) {
                        deletePrinter.mutate((repo) => repo.deletePrinter(item.id), {
                          onSuccess: () => toast.success("Impresora eliminada"),
                        });
                      }
                    }}
                  >
                    Borrar
                  </Button>
                  <Button
                    type="submit" variant="outline"
                    disabled={
                      !item.active ||
                      !agent?.active ||
                      test.isPending ||
                      !!testId
                    }
                    onClick={() => {
                      test.reset();
                      setMessage("");
                      setTestId(item.id);
                    }}
                  >
                    Probar
                  </Button>
                </div>
                {testId === item.id && (
                  <form
                    className="space-y-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (test.isPending) return;
                      test.mutate(
                        (repo) =>
                          repo.test(item.id, message.trim() || undefined),
                        {
                          onSuccess: () => {
                            setTestId(undefined);
                            toast.success("Prueba enviada a la cola de impresión");
                          },
                        },
                      );
                    }}
                  >
                    <label className="grid gap-1">
                      Texto de prueba (opcional)
                      <Input
                        className="w-full"
                        maxLength={300}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="submit"
                        disabled={test.isPending}
                      >
                        Encolar prueba
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={test.isPending}
                        onClick={() => setTestId(undefined)}
                      >
                        Volver
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </section>
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap justify-between gap-2">
            <h2 className="text-xl font-semibold">Agentes</h2>
            {admin && (
              <Button
                type="submit"
                disabled={!!editor || !!secret || agentAction.isPending}
                onClick={() => setEditor({ kind: "agent" })}
              >
                Nuevo agente
              </Button>
            )}
          </div>
          {agents.isPending && <p role="status">Cargando agentes…</p>}
          {agents.isError && (
            <Alert role="alert" variant="destructive">
              No se pudieron cargar los agentes.
              <Button type="submit" variant="outline" onClick={() => void agents.refetch()}>
                Reintentar
              </Button>
            </Alert>
          )}
          {agents.data?.length === 0 && <p>No hay agentes registrados.</p>}
          {agents.data?.map((item) => (
            <div
              key={item.id}
              className="space-y-2 border-t border-border pt-3"
            >
              <p className="font-semibold">
                {item.name}{" "}
                <Badge
                  variant={item.online ? "success" : "ghost"}
                >
                  {!item.active
                    ? "Inactivo"
                    : item.online
                      ? "En línea"
                      : "Desconectado"}
                </Badge>
              </p>
              {item.lastSeenAt && (
                <p className="text-sm">
                  Último contacto: {printDate(item.lastSeenAt)}
                </p>
              )}
              {admin && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit" variant="outline"
                    disabled={!!editor || agentAction.isPending}
                    onClick={() => setEditor({ kind: "agent", item })}
                  >
                    Editar
                  </Button>
                  <Button
                    type="submit" variant="outline"
                    disabled={!!editor || agentAction.isPending}
                    onClick={() =>
                      agentAction.mutate((repo) =>
                        repo.updateAgent(item.id, { active: !item.active }),
                      )
                    }
                  >
                    {item.active ? "Desactivar" : "Activar"}
                  </Button>
                  <Button
                    type="submit" variant="outline"
                    disabled={!!editor || !!secret || agentAction.isPending}
                    onClick={async () => {
                      if (
                        await confirmAction(
                          "¿Rotar el token? El agente deberá actualizar su configuración para volver a conectarse.",
                        )
                      ) {
                        agentAction.mutate(async (repo) =>
                          setSecret(await repo.rotateAgent(item.id)),
                        );
                      }
                    }}
                  >
                    Rotar token
                  </Button>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
