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
    <form
      className="card border border-base-300 bg-base-100"
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
      <div className="card-body">
        <h2 className="card-title">
          {item ? "Editar impresora" : "Nueva impresora"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            Nombre
            <input className="input w-full" {...register("name")} />
          </label>
          <label className="grid gap-1">
            Propósito
            <select className="select w-full" {...register("purpose")}>
              {printerPurposes.filter((key) => key === "CASHIER" || key === "GENERAL" || key === item?.purpose).map((key) => (
                <option key={key} value={key}>
                  {purposeLabels[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            Conexión principal
            <select className="select w-full" {...register("connectionType")}>
              <option value="NETWORK_TCP">Red TCP</option>
              <option value="SYSTEM_PRINTER">Cola del sistema</option>
            </select>
          </label>
          <label className="label min-h-11 self-end">
            <input type="checkbox" className="checkbox" {...register("fallbackEnabled")} />
            Usar la otra conexión como respaldo
          </label>
          <label className="grid gap-1">
            Ancho de papel
            <select className="select w-full" {...register("paperWidth")}>
              <option value="58">58 mm</option>
              <option value="80">80 mm</option>
            </select>
          </label>
          {(network || fallbackEnabled) && (
            <>
              <label className="grid gap-1">
                Host o IP
                <input
                  className="input w-full"
                  placeholder="192.168.1.50"
                  {...register("host")}
                />
              </label>
              <label className="grid gap-1">
                Puerto
                <input
                  className="input w-full"
                  inputMode="numeric"
                  {...register("port")}
                />
              </label>
            </>
          )}
          {(!network || fallbackEnabled) && (
            <label className="grid gap-1">
              Nombre de la cola
              <input className="input w-full" {...register("systemName")} />
            </label>
          )}
          <label className="grid gap-1">
            Agente
            <select className="select w-full" {...register("printerAgentId")}>
              <option value="">Sin agente</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                  {agent.active ? "" : " (inactivo)"}
                </option>
              ))}
            </select>
          </label>
          <label className="label min-h-11">
            <input
              type="checkbox"
              className="checkbox"
              {...register("active")}
            />{" "}
            Activa
          </label>
        </div>
        {Object.entries(errors).map(([key, error]) => (
          <p key={key} role="alert" className="text-error">
            {error.message}
          </p>
        ))}
        {action.isError && (
          <p role="alert" className="alert alert-error">
            {apiError(action.error, "No se pudo guardar la impresora.")}
          </p>
        )}
        <div className="card-actions">
          <button className="btn btn-primary" disabled={isSubmitting}>
            Guardar
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            disabled={isSubmitting}
            onClick={close}
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
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
    <form
      className="card border border-base-300 bg-base-100"
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
      <div className="card-body">
        <h2 className="card-title">
          {item ? "Editar agente" : "Nuevo agente"}
        </h2>
        <label className="grid gap-1">
          Nombre
          <input className="input w-full" {...register("name")} />
        </label>
        {errors.name && <p className="text-error">{errors.name.message}</p>}
        {action.isError && (
          <p role="alert" className="alert alert-error">
            {apiError(action.error, "No se pudo guardar el agente.")}
          </p>
        )}
        <div className="card-actions">
          <button className="btn btn-primary" disabled={isSubmitting}>
            Guardar
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            disabled={isSubmitting}
            onClick={close}
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
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
        <h1 className="text-3xl font-bold">Impresión</h1>
        <Link className="btn btn-outline" to={jobsPath}>
          Ver cola
        </Link>
      </div>
      {secret && admin && (
        <section className="card border border-warning bg-base-100">
          <div className="card-body">
            <h2 className="card-title">Token del agente</h2>
            <p>
              Se muestra una sola vez. Guárdalo en la PC del agente como{" "}
              <code>PRINTER_AGENT_TOKEN</code>.
            </p>
            <input
              aria-label="Token del agente"
              className="input w-full font-mono"
              readOnly
              value={secret.token}
              onFocus={(event) => event.currentTarget.select()}
            />
            <div className="card-actions">
              <button
                className="btn btn-outline"
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
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSecret(undefined);
                  setCopy("");
                }}
              >
                Ya lo guardé
              </button>
            </div>
            {copy && <p role="status">{copy}</p>}
          </div>
        </section>
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
        <p role="alert" className="alert alert-error">
          {apiError(agentAction.error, "No se pudo actualizar el agente.")}
        </p>
      )}
      {test.isError && (
        <p role="alert" className="alert alert-error">
          {apiError(
            test.error,
            "No se confirmó la prueba. Revisa la cola antes de volver a enviarla.",
          )}
        </p>
      )}
      {deletePrinter.isError && (
        <p role="alert" className="alert alert-error">
          {apiError(deletePrinter.error, "No se pudo borrar la impresora.")}
        </p>
      )}
      {test.data && (
        <div className="alert alert-info" role="status">
          Prueba encolada.
          <Link className="link" to={`${jobsPath}/${test.data.id}`}>
            Consultar estado
          </Link>
        </div>
      )}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold">Detectar impresoras locales</h2>
              <p className="text-sm opacity-75">
                El agente solo escaneará la red que indiques.
              </p>
            </div>
            <span className={`badge ${localHealth.data?.ok ? "badge-success" : "badge-ghost"}`}>
              {localHealth.data?.ok ? "API local conectada" : "API local no disponible"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
            <label className="grid gap-1">
              Red a escanear
              <span className="flex items-center gap-1">
                {scanOctets.map((octet, index) => (
                  <span key={index} className="flex min-w-0 flex-1 items-center gap-1">
                    <input
                      className="input w-full text-center"
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
              <input
                className="input w-full"
                inputMode="numeric"
                value={scanPort}
                onChange={(event) => setScanPort(event.target.value)}
              />
            </label>
            <button
              className="btn btn-primary self-end"
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
            </button>
          </div>
          {localHealth.isError && (
            <p className="text-sm text-error">
              Inicia el agente Go en esta computadora para habilitar la búsqueda.
            </p>
          )}
          {discoveryAction.isError && (
            <p role="alert" className="alert alert-error">
              {apiError(discoveryAction.error, "No se pudo escanear la red indicada.")}
            </p>
          )}
          {discovery && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold">Impresoras de red ({discovery.network.length})</h3>
                {discovery.network.length === 0 && <p className="text-sm opacity-75">No se encontraron impresoras TCP.</p>}
                {discovery.network.map((printer) => (
                  <div key={`${printer.host}:${printer.port}`} className="flex flex-wrap items-center justify-between gap-2 rounded border border-base-300 p-3">
                    <span className="font-mono">{printer.host}:{printer.port} · {printer.latencyMs} ms</span>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => setEditor({ kind: "printer", prefill: { name: `Impresora ${printer.host}`, connectionType: "NETWORK_TCP", host: printer.host, port: printer.port, paperWidth: 80, active: true } })}
                    >
                      Guardar impresora
                    </button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Colas de Windows ({discovery.system.length})</h3>
                {discovery.system.map((printer) => (
                  <div key={`${printer.name}:${printer.portName}`} className="flex flex-wrap items-center justify-between gap-2 rounded border border-base-300 p-3">
                    <span>{printer.name} · {printer.portName}</span>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => setEditor({ kind: "printer", prefill: { name: printer.name, connectionType: "SYSTEM_PRINTER", systemName: printer.name, paperWidth: 80, active: true } })}
                    >
                      Guardar impresora
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
          <div className="flex flex-wrap justify-between gap-2">
            <h2 className="text-xl font-semibold">Impresoras</h2>
            <button
              className="btn btn-primary"
              disabled={!!editor || !agents.isSuccess}
              onClick={() => setEditor({ kind: "printer" })}
            >
              Nueva impresora
            </button>
          </div>
          <p>Configura una impresora activa de comandas para cocina y barra y asigna un agente.</p>
          {printers.isPending && <p role="status">Cargando impresoras…</p>}
          {printers.isError && (
            <div role="alert" className="alert alert-error">
              No se pudieron cargar las impresoras.
              <button className="btn" onClick={() => void printers.refetch()}>
                Reintentar
              </button>
            </div>
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
                className="space-y-2 border-t border-base-300 pt-3"
              >
                <p className="font-semibold">
                  {item.name}{" "}
                  <span
                    className={`badge ${item.active ? "badge-success" : "badge-ghost"}`}
                  >
                    {item.active ? "Activa" : "Inactiva"}
                  </span>
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
                  <button
                    className="btn btn-outline"
                    disabled={!!editor || !agents.isSuccess}
                    onClick={() => setEditor({ kind: "printer", item })}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-outline btn-error"
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
                  </button>
                  <button
                    className="btn btn-outline"
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
                  </button>
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
                      <input
                        className="input w-full"
                        maxLength={300}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn btn-primary"
                        disabled={test.isPending}
                      >
                        Encolar prueba
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={test.isPending}
                        onClick={() => setTestId(undefined)}
                      >
                        Volver
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </section>
        <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
          <div className="flex flex-wrap justify-between gap-2">
            <h2 className="text-xl font-semibold">Agentes</h2>
            {admin && (
              <button
                className="btn btn-primary"
                disabled={!!editor || !!secret || agentAction.isPending}
                onClick={() => setEditor({ kind: "agent" })}
              >
                Nuevo agente
              </button>
            )}
          </div>
          {agents.isPending && <p role="status">Cargando agentes…</p>}
          {agents.isError && (
            <div role="alert" className="alert alert-error">
              No se pudieron cargar los agentes.
              <button className="btn" onClick={() => void agents.refetch()}>
                Reintentar
              </button>
            </div>
          )}
          {agents.data?.length === 0 && <p>No hay agentes registrados.</p>}
          {agents.data?.map((item) => (
            <div
              key={item.id}
              className="space-y-2 border-t border-base-300 pt-3"
            >
              <p className="font-semibold">
                {item.name}{" "}
                <span
                  className={`badge ${item.online ? "badge-success" : "badge-ghost"}`}
                >
                  {!item.active
                    ? "Inactivo"
                    : item.online
                      ? "En línea"
                      : "Desconectado"}
                </span>
              </p>
              {item.lastSeenAt && (
                <p className="text-sm">
                  Último contacto: {printDate(item.lastSeenAt)}
                </p>
              )}
              {admin && (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-outline"
                    disabled={!!editor || agentAction.isPending}
                    onClick={() => setEditor({ kind: "agent", item })}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-outline"
                    disabled={!!editor || agentAction.isPending}
                    onClick={() =>
                      agentAction.mutate((repo) =>
                        repo.updateAgent(item.id, { active: !item.active }),
                      )
                    }
                  >
                    {item.active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    className="btn btn-outline"
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
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
