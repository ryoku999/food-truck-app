import { useDiningAreas, useLocalActions, useLocalTables, useProductionAreas } from "@/infrastructure/hooks/use-local";
import { apiError } from "@/shared/utils/api-error";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LocalForm, type LocalEditor } from "./LocalForm";

const tabs = { production: "Producción", dining: "Áreas del local", tables: "Mesas" } as const;

export default function LocalPage() {
  const [params, setParams] = useSearchParams();
  const view = params.get("view");
  const tab = view === "dining" || view === "tables" ? view : "production";
  const [editor, setEditor] = useState<LocalEditor>();
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [notice, setNotice] = useState("");
  const production = useProductionAreas();
  const dining = useDiningAreas();
  const tables = useLocalTables();
  const { active } = useLocalActions();
  const query = { production, dining, tables }[tab];
  const needle = search.trim().toLocaleLowerCase("es-PE");
  const rows = tab === "production" ? production.data?.map(item => ({
    item, title: item.name, description: `${{ KITCHEN: "Cocina", BAR: "Barra", NONE: "Sin producción" }[item.code]} · ${item.counts.products} productos`, edit: { kind: "production", item } as const,
  })) : tab === "dining" ? dining.data?.map(item => ({
    item, title: item.name, description: [item.description, `${item.activeTableCount} de ${item.tableCount} mesas activas`].filter(Boolean).join(" · "), edit: { kind: "dining", item } as const,
  })) : tables.data?.filter(item => !area || item.diningArea.id === area).map(item => ({
    item, title: item.name || `Mesa ${item.number}`, description: `${item.diningArea.name} · N.º ${item.number}${item.capacity ? ` · ${item.capacity} personas` : ""}`, edit: { kind: "tables", item } as const,
  }));
  const visible = rows?.filter(row => `${row.title} ${row.description}`.toLocaleLowerCase("es-PE").includes(needle));
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-bold">Local</h1>
      <Link className="btn btn-outline" to="../table-map" relative="path">Ver mapa</Link>
    </div>
    <nav aria-label="Configuración del local" className="flex flex-wrap gap-2">
      {(Object.keys(tabs) as (keyof typeof tabs)[]).map(key => <button key={key} className={`btn ${tab === key ? "btn-primary" : "btn-outline"}`} aria-pressed={tab === key} onClick={() => {
        setEditor(undefined); setSearch(""); setNotice(""); active.reset(); setParams({ view: key });
      }}>{tabs[key]}</button>)}
    </nav>
    <div className="flex flex-wrap items-end gap-3 rounded-box border border-base-300 bg-base-100 p-4">
      <label className="grid gap-1">Buscar<input className="input w-full" value={search} onChange={event => setSearch(event.target.value)} /></label>
      {tab === "tables" && <label className="grid gap-1">Área<select className="select" value={area} onChange={event => setArea(event.target.value)}>
        <option value="">Todas</option>{dining.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>}
      <button className="btn btn-primary" disabled={!!editor || (tab === "tables" && !dining.data?.some(item => item.active))} onClick={() => { setNotice(""); setEditor({ kind: tab }); }}>
        {tab === "tables" ? "Nueva mesa" : "Nueva área"}
      </button>
    </div>
    {tab === "tables" && dining.isSuccess && !dining.data.some(item => item.active) && <p>Crea o activa un área del local para registrar mesas.</p>}
    {tab === "tables" && dining.isError && <p role="alert" className="text-error">No se pudieron cargar las áreas del local.</p>}
    {notice && <p className="alert alert-success" role="status">{notice}</p>}
    {editor && editor.kind === tab && <LocalForm key={editor.item?.id ?? tab} editor={editor} areas={dining.data ?? []} close={saved => {
      setEditor(undefined);
      if (saved) setNotice("Cambios guardados.");
    }} />}
    {active.isError && <p className="alert alert-error" role="alert">{apiError(active.error, "No se pudo actualizar el estado.")}</p>}
    {query.isPending && <p role="status">Cargando…</p>}
    {query.isError && <div className="alert alert-error" role="alert">{apiError(query.error, "No se pudo cargar el listado.")}<button className="btn" onClick={() => void query.refetch()}>Reintentar</button></div>}
    {visible?.length === 0 && <p>No hay resultados.</p>}
    <ul className="grid gap-3 md:grid-cols-2">
      {visible?.map(({ item, title, description, edit }) => <li key={item.id} className="card border border-base-300 bg-base-100">
        <div className="card-body">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="card-title">{title}</h2>
            <span className={`badge ${item.active ? "badge-success" : "badge-ghost"}`}>{item.active ? "Activo" : "Inactivo"}</span>
          </div>
          <p>{description}</p>
          <div className="card-actions">
            <button className="btn btn-outline" disabled={!!editor} onClick={() => { setNotice(""); setEditor(edit); }}>Editar</button>
            {edit.kind !== "tables" && <button className="btn btn-outline" disabled={active.isPending || !!editor} onClick={() => {
              if (item.active && !window.confirm(`¿Desactivar ${title}?`)) return;
              setNotice("");
              active.mutate({ id: item.id, kind: edit.kind === "dining" ? "dining-areas" : "production-areas", active: !item.active }, { onSuccess: () => setNotice("Estado actualizado.") });
            }}>{item.active ? "Desactivar" : "Activar"}</button>}
          </div>
        </div>
      </li>)}
    </ul>
  </div>;
}
