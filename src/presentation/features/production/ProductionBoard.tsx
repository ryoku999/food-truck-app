import type {
  BoardStatus,
  PreparationChange,
  ProductionArea,
  ProductionItem,
} from "@/core/entities/production.entity";
import { useOperationsState } from "@/infrastructure/hooks/use-operations";
import {
  usePreparationChange,
  useProductionQueue,
} from "@/infrastructure/hooks/use-production";
import { apiError } from "@/shared/utils/api-error";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const columns = [
  {
    status: "PENDING",
    label: "Pendientes",
    badge: "badge-warning",
    next: "PREPARING",
    action: "Empezar preparación",
  },
  {
    status: "PREPARING",
    label: "Preparando",
    badge: "badge-info",
    next: "READY",
    action: "Marcar listo",
  },
  {
    status: "READY",
    label: "Listos",
    badge: "badge-success",
    next: "SERVED",
    action: "Confirmar entrega",
  },
] as const;
type Column = (typeof columns)[number];

const sendTime = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function groupRounds(items: ProductionItem[]) {
  const groups = new Map<
    string,
    { key: string; first: ProductionItem; items: ProductionItem[] }
  >();
  for (const item of items) {
    const key = `${item.orderId}:${item.sentAt ?? "undated"}`;
    const group = groups.get(key);
    if (group) group.items.push(item);
    else groups.set(key, { key, first: item, items: [item] });
  }
  return [...groups.values()];
}

function elapsed(item: ProductionItem, now: number) {
  const start = Date.parse(item.sentAt ?? item.createdAt);
  const seconds = Number.isFinite(start)
    ? Math.max(0, Math.floor((now - start) / 1000))
    : item.elapsedSeconds;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function ProductionCard({
  item,
  column,
  now,
  busy,
  submit,
}: {
  item: ProductionItem;
  column: Column;
  now: number;
  busy: boolean;
  submit: (id: string, change: PreparationChange) => void;
}) {
  const [cancel, setCancel] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <li className="card border border-base-300 bg-base-100">
      <div className="card-body gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="badge badge-outline">
            Pedido #{item.orderNumber}
          </span>
          <span className="text-sm tabular-nums">
            En cola: {elapsed(item, now)}
          </span>
        </div>
        <h4 className="text-xl font-bold">
          {item.quantity} × {item.productName}
        </h4>
        {item.variantName && <p className="font-medium">{item.variantName}</p>}
        <p className="text-sm">
          {item.tables.length
            ? item.tables
                .map(
                  (table) =>
                    `${table.name || `Mesa ${table.number}`} · ${table.diningAreaName}`,
                )
                .join(", ")
            : "Pedido sin mesa"}
        </p>
        {(item.modifiers.length > 0 ||
          item.comboSelections.length > 0 ||
          item.notes) && (
          <div className="space-y-1 rounded-box bg-base-200 p-3 text-sm">
            {item.modifiers.map((option, index) => (
              <p key={`modifier-${index}`}>
                {option.groupName}:{" "}
                {option.quantity > 1 ? `${option.quantity} × ` : ""}
                {option.optionName}
              </p>
            ))}
            {item.comboSelections.map((option, index) => (
              <p key={`combo-${index}`}>
                {option.groupName}: {option.productName}
              </p>
            ))}
            {item.notes && <p className="font-semibold">Notas: {item.notes}</p>}
          </div>
        )}
        {cancel ? (
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!busy && reason.trim())
                submit(item.id, {
                  status: "CANCELLED",
                  cancellationReason: reason.trim(),
                });
            }}
          >
            <label className="grid gap-1">
              Motivo de cancelación
              <textarea
                className="textarea w-full"
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-error min-h-11"
                disabled={busy || !reason.trim()}
              >
                Confirmar cancelación
              </button>
              <button
                className="btn btn-ghost min-h-11"
                type="button"
                disabled={busy}
                onClick={() => setCancel(false)}
              >
                Volver
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-primary min-h-11 grow"
              disabled={busy}
              onClick={() => submit(item.id, { status: column.next })}
            >
              {column.action}
            </button>
            {column.status !== "READY" && (
              <button
                className="btn btn-outline min-h-11"
                disabled={busy}
                onClick={() => setCancel(true)}
              >
                Cancelar ítem
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function ProductionColumn({
  area,
  column,
  search,
  connected,
  visible,
  now,
}: {
  area: ProductionArea;
  column: Column;
  search: string;
  connected: boolean;
  visible: boolean;
  now: number;
}) {
  const [page, setPage] = useState(1);
  const queue = useProductionQueue(
    area,
    { status: column.status, page, pageSize: 20, search: search || undefined },
    connected,
  );
  const change = usePreparationChange(area);
  return (
    <section
      className={`${visible ? "block" : "hidden"} min-w-0 space-y-3 rounded-box bg-base-200 lg:block`}
      aria-label={column.label}
    >
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {column.label}
        <span className={`badge ${column.badge}`}>
          {queue.data?.meta.total ?? "–"}
        </span>
      </h2>
      {queue.isPending && <p role="status">Cargando cola…</p>}
      {queue.isError && (
        <div className="alert alert-error" role="alert">
          {apiError(queue.error, "No se pudo actualizar esta cola.")}
          <button className="btn btn-sm" onClick={() => void queue.refetch()}>
            Reintentar
          </button>
        </div>
      )}
      {change.isError && (
        <p className="alert alert-error" role="alert">
          {apiError(
            change.error,
            "No se confirmó el cambio. Revisa el estado actualizado.",
          )}
        </p>
      )}
      {queue.data?.items.length === 0 && (
        <p className="rounded-box border border-base-300 p-4">
          {page === 1
            ? "Sin ítems en esta cola."
            : "Esta página ya no tiene ítems. Vuelve a la anterior."}
        </p>
      )}
      <ul className="space-y-4">
        {groupRounds(queue.data?.items ?? []).map((group) => (
          <li
            key={group.key}
            className="space-y-3 rounded-box border border-base-300 p-3"
          >
            <header className="space-y-1">
              <h3 className="flex flex-wrap items-center gap-2 font-semibold">
                Pedido #{group.first.orderNumber}
                <span
                  className={`badge ${(group.first.roundNumber ?? 0) > 1 ? "badge-secondary" : "badge-outline"}`}
                >
                  {group.first.roundNumber
                    ? `Ronda ${group.first.roundNumber}`
                    : "Envío sin identificar"}
                </span>
                {(group.first.roundNumber ?? 0) > 1 && (
                  <span className="text-sm">Adicional</span>
                )}
              </h3>
              <p className="text-sm">
                {group.first.sentAt ? (
                  <>
                    Enviada{" "}
                    <time dateTime={group.first.sentAt}>
                      {sendTime.format(new Date(group.first.sentAt))}
                    </time>{" "}
                    · Lima
                  </>
                ) : (
                  "Sin hora de envío registrada"
                )}
              </p>
            </header>
            <ul className="space-y-3">
              {group.items.map((item) => (
                <ProductionCard
                  key={item.id}
                  item={item}
                  column={column}
                  now={now}
                  busy={change.isPending || queue.isError}
                  submit={(id, next) => change.mutate({ id, change: next })}
                />
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {(page > 1 || (queue.data?.meta.pageCount ?? 0) > 1) && (
        <nav
          className="flex flex-wrap items-center gap-2"
          aria-label={`Páginas de ${column.label.toLowerCase()}`}
        >
          <button
            className="btn btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </button>
          <span>Pág. {page}</span>
          <button
            className="btn btn-sm"
            disabled={page >= (queue.data?.meta.pageCount ?? 0)}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </button>
        </nav>
      )}
    </section>
  );
}

export default function ProductionBoard({ area }: { area: ProductionArea }) {
  const connection = useOperationsState();
  const client = useQueryClient();
  const [selected, setSelected] = useState<BoardStatus>("PENDING");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {area === "kitchen" ? "Cocina" : "Barra"}
          </h1>
          <p className="mt-1">Cola de preparación</p>
        </div>
        <span
          role="status"
          className={`badge ${connection === "online" ? "badge-success" : "badge-warning"}`}
        >
          {connection === "online"
            ? "En vivo"
            : connection === "connecting"
              ? "Conectando…"
              : "Actualización periódica"}
        </span>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(input.trim());
        }}
      >
        <label className="grid grow gap-1 sm:max-w-xs">
          Filtrar por producto o variante
          <input
            className="input w-full"
            maxLength={100}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Buscar en la cola"
          />
        </label>
        <button className="btn btn-outline min-h-11">Buscar</button>
        <button
          type="button"
          className="btn btn-outline min-h-11"
          onClick={() =>
            void client.invalidateQueries({ queryKey: ["production", area] })
          }
        >
          Actualizar
        </button>
      </form>
      <nav
        className="grid grid-cols-3 gap-1 lg:hidden"
        aria-label="Estados de producción"
      >
        {columns.map((column) => (
          <button
            key={column.status}
            type="button"
            aria-pressed={selected === column.status}
            className={`btn min-h-11 px-1 ${selected === column.status ? "btn-primary" : "btn-outline"}`}
            onClick={() => setSelected(column.status)}
          >
            {column.label}
          </button>
        ))}
      </nav>
      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((column) => (
          <ProductionColumn
            key={`${area}:${column.status}:${search}`}
            area={area}
            column={column}
            search={search}
            connected={connection === "online"}
            visible={column.status === selected}
            now={now}
          />
        ))}
      </div>
    </div>
  );
}
