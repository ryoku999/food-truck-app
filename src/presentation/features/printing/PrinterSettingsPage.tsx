import { printerPurposes, type AgentToken, type Printer, type PrinterAgent, type PrintJob } from "@/core/entities/printing.entity";
import type { ProductionArea } from "@/core/entities/local.entity";
import { useProductionAreas } from "@/infrastructure/hooks/use-local";
import { usePrintAction, usePrinterAgents, usePrinters } from "@/infrastructure/hooks/use-printing";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { apiError } from "@/shared/utils/api-error";
import { roleBasedRedirection } from "@/shared/utils/role-based-redirection";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { printDate, purposeLabels } from "./printing-labels";

const name = z.string().trim().min(1, "Ingresa un nombre").max(100);
const printerSchema = z.object({
  name, purpose: z.enum(printerPurposes), connectionType: z.enum(["NETWORK_TCP", "SYSTEM_PRINTER"]),
  host: z.string().trim().max(253), port: z.string().trim(), systemName: z.string().trim().max(200),
  paperWidth: z.enum(["58", "80"]), printerAgentId: z.string(), productionAreaId: z.string(), active: z.boolean(),
}).superRefine((fields, context) => {
  if (fields.connectionType === "NETWORK_TCP") {
    if (!fields.host || /[\s/]/.test(fields.host)) context.addIssue({ code: "custom", path: ["host"], message: "Ingresa una IP o nombre de host sin protocolo." });
    if (!/^\d+$/.test(fields.port) || Number(fields.port) < 1 || Number(fields.port) > 65535) context.addIssue({ code: "custom", path: ["port"], message: "Ingresa un puerto de 1 a 65535." });
  } else if (!fields.systemName || fields.systemName.startsWith("-")) {
    context.addIssue({ code: "custom", path: ["systemName"], message: "Ingresa el nombre exacto de la cola instalada." });
  }
});

function PrinterForm({ item, agents, areas, close }: { item?: Printer; agents: PrinterAgent[]; areas: ProductionArea[]; close: () => void }) {
  const action = usePrintAction<Printer>();
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof printerSchema>>({
    resolver: zodResolver(printerSchema),
    defaultValues: {
      name: item?.name ?? "", purpose: item?.purpose ?? "CASHIER", connectionType: item?.connectionType === "SYSTEM_PRINTER" ? "SYSTEM_PRINTER" : "NETWORK_TCP",
      host: item?.host ?? "", port: String(item?.port ?? 9100), systemName: item?.systemName ?? "",
      paperWidth: item?.paperWidth === 58 ? "58" : "80", printerAgentId: item?.printerAgentId ?? "", productionAreaId: item?.productionAreaId ?? "", active: item?.active ?? true,
    },
  });
  const network = useWatch({ control, name: "connectionType" }) === "NETWORK_TCP";
  return <form className="card border border-base-300 bg-base-100" noValidate onSubmit={handleSubmit(async values => {
    try {
      await action.mutateAsync(repo => repo.savePrinter({
        name: values.name, purpose: values.purpose, connectionType: values.connectionType, active: values.active,
        host: network ? values.host : undefined, port: network ? Number(values.port) : undefined, systemName: network ? undefined : values.systemName,
        paperWidth: values.paperWidth === "58" ? 58 : 80, printerAgentId: values.printerAgentId || null, productionAreaId: values.productionAreaId || null,
      }, item?.id));
      close();
    } catch { /* Error is rendered from the mutation. */ }
  })}><div className="card-body">
    <h2 className="card-title">{item ? "Editar impresora" : "Nueva impresora"}</h2>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1">Nombre<input className="input w-full" {...register("name")} /></label>
      <label className="grid gap-1">Propósito<select className="select w-full" {...register("purpose")}>{printerPurposes.map(key => <option key={key} value={key}>{purposeLabels[key]}</option>)}</select></label>
      <label className="grid gap-1">Conexión<select className="select w-full" {...register("connectionType")}><option value="NETWORK_TCP">Red TCP</option><option value="SYSTEM_PRINTER">Cola del sistema</option></select></label>
      <label className="grid gap-1">Ancho de papel<select className="select w-full" {...register("paperWidth")}><option value="58">58 mm</option><option value="80">80 mm</option></select></label>
      {network ? <>
        <label className="grid gap-1">Host o IP<input className="input w-full" placeholder="192.168.1.50" {...register("host")} /></label>
        <label className="grid gap-1">Puerto<input className="input w-full" inputMode="numeric" {...register("port")} /></label>
      </> : <label className="grid gap-1">Nombre de la cola<input className="input w-full" {...register("systemName")} /></label>}
      <label className="grid gap-1">Agente<select className="select w-full" {...register("printerAgentId")}>
        <option value="">Sin agente</option>{agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}{agent.active ? "" : " (inactivo)"}</option>)}
      </select></label>
      <label className="grid gap-1">Área de producción<select className="select w-full" {...register("productionAreaId")}>
        <option value="">Sin área específica</option>{areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
      </select></label>
      <label className="label min-h-11"><input type="checkbox" className="checkbox" {...register("active")} /> Activa</label>
    </div>
    {Object.entries(errors).map(([key, error]) => <p key={key} role="alert" className="text-error">{error.message}</p>)}
    {action.isError && <p role="alert" className="alert alert-error">{apiError(action.error, "No se pudo guardar la impresora.")}</p>}
    <div className="card-actions"><button className="btn btn-primary" disabled={isSubmitting}>Guardar</button><button className="btn btn-ghost" type="button" disabled={isSubmitting} onClick={close}>Cancelar</button></div>
  </div></form>;
}

function AgentForm({ item, token, close }: { item?: PrinterAgent; token: (result: AgentToken) => void; close: () => void }) {
  const action = usePrintAction<void>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(z.object({ name })), defaultValues: { name: item?.name ?? "" },
  });
  return <form className="card border border-base-300 bg-base-100" onSubmit={handleSubmit(async values => {
    try {
      await action.mutateAsync(async repo => {
        if (item) await repo.updateAgent(item.id, values);
        else token(await repo.createAgent(values.name));
      });
      close();
    } catch { /* Error is rendered from the mutation. */ }
  })}><div className="card-body">
    <h2 className="card-title">{item ? "Editar agente" : "Nuevo agente"}</h2>
    <label className="grid gap-1">Nombre<input className="input w-full" {...register("name")} /></label>
    {errors.name && <p className="text-error">{errors.name.message}</p>}
    {action.isError && <p role="alert" className="alert alert-error">{apiError(action.error, "No se pudo guardar el agente.")}</p>}
    <div className="card-actions"><button className="btn btn-primary" disabled={isSubmitting}>Guardar</button><button className="btn btn-ghost" type="button" disabled={isSubmitting} onClick={close}>Cancelar</button></div>
  </div></form>;
}

export default function PrinterSettingsPage() {
  const role = useAuthStore(state => state.user?.userRole);
  const admin = role === "ADMIN";
  const jobsPath = `${role ? roleBasedRedirection(role) : ""}/print-jobs`;
  const printers = usePrinters();
  const agents = usePrinterAgents();
  const areas = useProductionAreas();
  const test = usePrintAction<PrintJob>();
  const agentAction = usePrintAction<void>();
  const [editor, setEditor] = useState<{ kind: "printer"; item?: Printer } | { kind: "agent"; item?: PrinterAgent }>();
  const [secret, setSecret] = useState<AgentToken>();
  const [copy, setCopy] = useState("");
  const [testId, setTestId] = useState<string>();
  const [message, setMessage] = useState("");
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-3xl font-bold">Impresión</h1><Link className="btn btn-outline" to={jobsPath}>Ver cola</Link></div>
    {secret && admin && <section className="card border border-warning bg-base-100"><div className="card-body">
      <h2 className="card-title">Token del agente</h2>
      <p>Se muestra una sola vez. Guárdalo en la PC del agente como <code>PRINTER_AGENT_TOKEN</code>.</p>
      <input aria-label="Token del agente" className="input w-full font-mono" readOnly value={secret.token} onFocus={event => event.currentTarget.select()} />
      <div className="card-actions">
        <button className="btn btn-outline" onClick={async () => {
          try { await navigator.clipboard.writeText(secret.token); setCopy("Token copiado."); }
          catch { setCopy("Selecciona y copia el token manualmente."); }
        }}>Copiar</button>
        <button className="btn btn-primary" onClick={() => { setSecret(undefined); setCopy(""); }}>Ya lo guardé</button>
      </div>
      {copy && <p role="status">{copy}</p>}
    </div></section>}
    {editor?.kind === "printer" && <PrinterForm key={editor.item?.id ?? "printer"} item={editor.item} agents={agents.data ?? []} areas={areas.data ?? []} close={() => setEditor(undefined)} />}
    {editor?.kind === "agent" && admin && <AgentForm key={editor.item?.id ?? "agent"} item={editor.item} token={setSecret} close={() => setEditor(undefined)} />}
    {agentAction.isError && <p role="alert" className="alert alert-error">{apiError(agentAction.error, "No se pudo actualizar el agente.")}</p>}
    {test.isError && <p role="alert" className="alert alert-error">{apiError(test.error, "No se confirmó la prueba. Revisa la cola antes de volver a enviarla.")}</p>}
    {test.data && <div className="alert alert-info" role="status">Prueba encolada.<Link className="link" to={`${jobsPath}/${test.data.id}`}>Consultar estado</Link></div>}
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="text-xl font-semibold">Impresoras</h2>
          <button className="btn btn-primary" disabled={!!editor || !agents.isSuccess || !areas.isSuccess} onClick={() => setEditor({ kind: "printer" })}>Nueva impresora</button></div>
        {printers.isPending && <p role="status">Cargando impresoras…</p>}
        {printers.isError && <div role="alert" className="alert alert-error">No se pudieron cargar las impresoras.<button className="btn" onClick={() => void printers.refetch()}>Reintentar</button></div>}
        {areas.isError && <div role="alert" className="alert alert-error">No se pudieron cargar las áreas.<button className="btn" onClick={() => void areas.refetch()}>Reintentar</button></div>}
        {printers.data?.length === 0 && <p>No hay impresoras configuradas.</p>}
        {printers.data?.map(item => {
          const agent = agents.data?.find(agent => agent.id === item.printerAgentId);
          const area = areas.data?.find(area => area.id === item.productionAreaId);
          return <div key={item.id} className="space-y-2 border-t border-base-300 pt-3">
            <p className="font-semibold">{item.name} <span className={`badge ${item.active ? "badge-success" : "badge-ghost"}`}>{item.active ? "Activa" : "Inactiva"}</span></p>
            <p>{purposeLabels[item.purpose]} · {item.connectionType === "NETWORK_TCP" ? `${item.host}:${item.port}` : item.connectionType === "USB" ? "USB" : item.systemName} · {item.paperWidth} mm</p>
            <p>{agent?.name ?? "Sin agente visible"}{area ? ` · ${area.name}` : ""}</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-outline" disabled={!!editor || !agents.isSuccess || !areas.isSuccess} onClick={() => setEditor({ kind: "printer", item })}>Editar</button>
              <button className="btn btn-outline" disabled={!item.active || !agent?.active || test.isPending || !!testId} onClick={() => { test.reset(); setMessage(""); setTestId(item.id); }}>Probar</button>
            </div>
            {testId === item.id && <form className="space-y-2" onSubmit={event => {
              event.preventDefault();
              if (test.isPending) return;
              test.mutate(repo => repo.test(item.id, message.trim() || undefined), { onSuccess: () => setTestId(undefined) });
            }}>
              <label className="grid gap-1">Texto de prueba (opcional)<input className="input w-full" maxLength={300} value={message} onChange={event => setMessage(event.target.value)} /></label>
              <div className="flex flex-wrap gap-2"><button className="btn btn-primary" disabled={test.isPending}>Encolar prueba</button><button type="button" className="btn btn-ghost" disabled={test.isPending} onClick={() => setTestId(undefined)}>Volver</button></div>
            </form>}
          </div>;
        })}
      </section>
      <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="text-xl font-semibold">Agentes</h2>
          {admin && <button className="btn btn-primary" disabled={!!editor || !!secret || agentAction.isPending} onClick={() => setEditor({ kind: "agent" })}>Nuevo agente</button>}</div>
        {agents.isPending && <p role="status">Cargando agentes…</p>}
        {agents.isError && <div role="alert" className="alert alert-error">No se pudieron cargar los agentes.<button className="btn" onClick={() => void agents.refetch()}>Reintentar</button></div>}
        {agents.data?.length === 0 && <p>No hay agentes registrados.</p>}
        {agents.data?.map(item => <div key={item.id} className="space-y-2 border-t border-base-300 pt-3">
          <p className="font-semibold">{item.name} <span className={`badge ${item.online ? "badge-success" : "badge-ghost"}`}>{!item.active ? "Inactivo" : item.online ? "En línea" : "Desconectado"}</span></p>
          {item.lastSeenAt && <p className="text-sm">Último contacto: {printDate(item.lastSeenAt)}</p>}
          {admin && <div className="flex flex-wrap gap-2">
            <button className="btn btn-outline" disabled={!!editor || agentAction.isPending} onClick={() => setEditor({ kind: "agent", item })}>Editar</button>
            <button className="btn btn-outline" disabled={!!editor || agentAction.isPending} onClick={() => agentAction.mutate(repo => repo.updateAgent(item.id, { active: !item.active }))}>{item.active ? "Desactivar" : "Activar"}</button>
            <button className="btn btn-outline" disabled={!!editor || !!secret || agentAction.isPending} onClick={() => {
              if (window.confirm("¿Rotar el token? El agente deberá actualizar su configuración para volver a conectarse.")) {
                agentAction.mutate(async repo => setSecret(await repo.rotateAgent(item.id)));
              }
            }}>Rotar token</button>
          </div>}
        </div>)}
      </section>
    </div>
  </div>;
}
