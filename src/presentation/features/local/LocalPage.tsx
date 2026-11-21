import { useConfirm } from "@/presentation/components/use-confirm";
import {
  useDiningAreas,
  useLocalActions,
  useLocalTables,
  useProductionAreas,
} from "@/infrastructure/hooks/use-local";
import { apiError } from "@/shared/utils/api-error";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LocalForm, type LocalEditor } from "./LocalForm";

const tabs = {
  production: "Producción",
  dining: "Áreas del local",
  tables: "Mesas",
} as const;

export default function LocalPage() {
  const confirmAction = useConfirm();
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
  const rows =
    tab === "production"
      ? production.data?.map((item) => ({
          item,
          title: item.name,
          description: `${{ KITCHEN: "Cocina", BAR: "Barra", NONE: "Sin producción" }[item.code]} · ${item.counts.products} productos`,
          edit: { kind: "production", item } as const,
        }))
      : tab === "dining"
        ? dining.data?.map((item) => ({
            item,
            title: item.name,
            description: [
              item.description,
              `${item.activeTableCount} de ${item.tableCount} mesas activas`,
            ]
              .filter(Boolean)
              .join(" · "),
            edit: { kind: "dining", item } as const,
          }))
        : tables.data
            ?.filter((item) => !area || item.diningArea.id === area)
            .map((item) => ({
              item,
              title: item.name || `Mesa ${item.number}`,
              description: `${item.diningArea.name} · N.º ${item.number}${item.capacity ? ` · ${item.capacity} personas` : ""}`,
              edit: { kind: "tables", item } as const,
            }));
  const visible = rows?.filter((row) =>
    `${row.title} ${row.description}`
      .toLocaleLowerCase("es-PE")
      .includes(needle),
  );
  const tableRows =
    tab === "tables"
      ? tables.data
          ?.filter((item) => !area || item.diningArea.id === area)
          .filter((item) => {
            const title = item.name || `Mesa ${item.number}`;
            const description = `${item.diningArea.name} ${item.number} ${item.capacity ?? ""}`;
            return `${title} ${description}`
              .toLocaleLowerCase("es-PE")
              .includes(needle);
          })
      : undefined;
  const tableGroups = tableRows
    ? Array.from(
        tableRows.reduce((groups, table) => {
          const group = groups.get(table.diningArea.id) ?? [];
          group.push(table);
          groups.set(table.diningArea.id, group);
          return groups;
        }, new Map<string, NonNullable<typeof tableRows>[number][]>()),
      )
    : [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Local</h1>
        <Link className="btn btn-outline" to="../table-map" relative="path">
          Ver mapa
        </Link>
      </div>
      <nav
        aria-label="Configuración del local"
        className="flex flex-wrap gap-2"
      >
        {(Object.keys(tabs) as (keyof typeof tabs)[]).map((key) => (
          <button
            key={key}
            className={`btn ${tab === key ? "btn-primary" : "btn-outline"}`}
            aria-pressed={tab === key}
            onClick={() => {
              setEditor(undefined);
              setSearch("");
              setNotice("");
              active.reset();
              setParams({ view: key });
            }}
          >
            {tabs[key]}
          </button>
        ))}
      </nav>
      <div className="flex flex-wrap items-end gap-3 rounded-box border border-base-300 bg-base-100 p-4">
        <label className="grid gap-1">
          Buscar
          <input
            className="input w-full"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {tab === "tables" && (
          <label className="grid gap-1">
            Área
            <select
              className="select"
              value={area}
              onChange={(event) => setArea(event.target.value)}
            >
              <option value="">Todas</option>
              {dining.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          className="btn btn-primary"
          disabled={
            !!editor ||
            (tab === "tables" && !dining.data?.some((item) => item.active))
          }
          onClick={() => {
            setNotice("");
            setEditor({ kind: tab });
          }}
        >
          {tab === "tables" ? "Nueva mesa" : "Nueva área"}
        </button>
      </div>
      {tab === "tables" &&
        dining.isSuccess &&
        !dining.data.some((item) => item.active) && (
          <p>Crea o activa un área del local para registrar mesas.</p>
        )}
      {tab === "tables" && dining.isError && (
        <p role="alert" className="text-error">
          No se pudieron cargar las áreas del local.
        </p>
      )}
      {notice && (
        <p className="alert alert-success" role="status">
          {notice}
        </p>
      )}
      {editor && editor.kind === tab && (
        <LocalForm
          key={editor.item?.id ?? tab}
          editor={editor}
          areas={dining.data ?? []}
          close={(saved) => {
            setEditor(undefined);
            if (saved) setNotice("Cambios guardados.");
          }}
        />
      )}
      {active.isError && (
        <p className="alert alert-error" role="alert">
          {apiError(active.error, "No se pudo actualizar el estado.")}
        </p>
      )}
      {query.isPending && <p role="status">Cargando…</p>}
      {query.isError && (
        <div className="alert alert-error" role="alert">
          {apiError(query.error, "No se pudo cargar el listado.")}
          <button className="btn" onClick={() => void query.refetch()}>
            Reintentar
          </button>
        </div>
      )}
      {visible?.length === 0 && <p>No hay resultados.</p>}
      {tab === "tables" ? (
        <div className="space-y-5">
          {tableGroups.map(([areaId, areaTables]) => (
            <section
              key={areaId}
              className="overflow-hidden rounded-box border border-primary/30 bg-base-100"
            >
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 bg-primary/5 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-primary">Área del local</p>
                  <h2 className="text-xl font-bold">
                    {areaTables[0].diningArea.name}
                  </h2>
                </div>
                <span className="badge badge-primary badge-outline">
                  {areaTables.length} {areaTables.length === 1 ? "mesa" : "mesas"}
                </span>
              </header>
              <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {areaTables.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm opacity-70">Mesa</p>
                        <h3 className="text-lg font-bold">
                          {item.name || `Mesa ${item.number}`}
                        </h3>
                      </div>
                      <span className="badge badge-outline">
                        N.º {item.number}
                      </span>
                    </div>
                    <p className="mt-3 text-sm opacity-70">
                      {item.capacity
                        ? `Capacidad: ${item.capacity} personas`
                        : "Capacidad no definida"}
                    </p>
                    <button
                      className="btn btn-sm btn-outline mt-4"
                      disabled={!!editor}
                      onClick={() => {
                        setNotice("");
                        setEditor({ kind: "tables", item });
                      }}
                    >
                      Editar mesa
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible?.map(({ item, title, description, edit }) => (
            <li
              key={item.id}
              className={`card border border-base-300 border-l-4 bg-base-100 ${item.active ? "border-l-success" : "border-l-base-300"}`}
            >
              <div className="card-body gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm opacity-70">
                      {edit.kind === "production" ? "Área de producción" : "Área del local"}
                    </p>
                    <h2 className="card-title">{title}</h2>
                  </div>
                  <span
                    className={`badge ${item.active ? "badge-success" : "badge-ghost"}`}
                  >
                    {item.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="min-h-12 text-sm opacity-80">{description}</p>
                <div className="card-actions">
                  <button
                    className="btn btn-outline"
                    disabled={!!editor}
                    onClick={() => {
                      setNotice("");
                      setEditor(edit);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-outline"
                    disabled={active.isPending || !!editor}
                    onClick={async () => {
                      if (
                        item.active &&
                        !(await confirmAction(`¿Desactivar ${title}?`))
                      )
                        return;
                      setNotice("");
                      active.mutate(
                        {
                          id: item.id,
                          kind:
                            edit.kind === "dining"
                              ? "dining-areas"
                              : "production-areas",
                          active: !item.active,
                        },
                        { onSuccess: () => setNotice("Estado actualizado.") },
                      );
                    }}
                  >
                    {item.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
