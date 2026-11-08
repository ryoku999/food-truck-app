import type { BillParts, ProductSelection } from "@/core/entities/cashier.entity";
import { useCashierAction } from "@/infrastructure/hooks/use-cashier";
import { apiError } from "@/shared/utils/api-error";
import { useState } from "react";
import { BillDocumentButton } from "../printing/BillDocumentButton";
import { cents } from "./cashier-fields";

function ProductPicker({ available, choose, blocked, format }: {
  available: BillParts["available"]; choose: (selection: ProductSelection) => void; blocked: boolean; format: (value: string) => string;
}) {
  const [name, setName] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const lines = available.map(item => {
    const text = quantities[item.id] ?? "";
    const quantity = Number(text);
    const valid = /^\d*$/.test(text) && Number.isSafeInteger(quantity) && quantity >= 0 && quantity <= item.remainingQuantity;
    const remaining = BigInt(cents(item.remainingAmount));
    const units = BigInt(item.remainingQuantity);
    // Same round-half-up calculation as the API for nonnegative monetary amounts.
    const amount = valid ? Number((2n * remaining * BigInt(quantity) + units) / (2n * units)) : 0;
    const unitPrice = Number((2n * remaining + units) / (2n * units));
    return { item, text, quantity, valid, amount, unitPrice, approximate: remaining % units !== 0n };
  });
  const picked = lines.filter(line => line.valid && line.quantity > 0);
  const total = picked.reduce((sum, line) => sum + line.amount, 0);
  const invalid = lines.some(line => !line.valid) || picked.length > 100 ||
    Object.entries(quantities).some(([id, value]) => Number(value) > 0 && !available.some(item => item.id === id));
  return <form className="space-y-3" onSubmit={event => {
    event.preventDefault();
    if (blocked || invalid || total <= 0) return;
    choose({ name: name.trim() || undefined, expectedTotal: (total / 100).toFixed(2),
      items: picked.map(line => ({ orderItemId: line.item.id, quantity: line.quantity })) });
  }}>
    <h3 className="font-semibold">Productos por cobrar</h3>
    {lines.map(({ item, text, valid, amount, unitPrice, approximate }) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-base-300 py-2">
      <div>
        <p className="font-medium">{item.name}{item.variant ? ` · ${item.variant}` : ""}</p>
        <p className="text-sm">{approximate ? "≈ " : ""}{format((unitPrice / 100).toFixed(2))} por unidad · {item.remainingQuantity} disponibles</p>
        {amount > 0 && <p className="text-sm">Selección: {format((amount / 100).toFixed(2))}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-outline min-h-11" aria-label={`Quitar una unidad de ${item.name}`} disabled={blocked || !valid || Number(text) <= 0}
          onClick={() => setQuantities(previous => ({ ...previous, [item.id]: String(Number(text) - 1) }))}>−</button>
        <input className="input w-16 text-center" placeholder="0" inputMode="numeric" maxLength={10} aria-label={`Cantidad de ${item.name}`} aria-invalid={!valid} disabled={blocked} value={text}
          onChange={event => setQuantities(previous => ({ ...previous, [item.id]: event.target.value }))} />
        <button type="button" className="btn btn-outline min-h-11" aria-label={`Agregar una unidad de ${item.name}`} disabled={blocked || !valid || Number(text) >= item.remainingQuantity}
          onClick={() => setQuantities(previous => ({ ...previous, [item.id]: String(Number(text) + 1) }))}>+</button>
      </div>
    </div>)}
    {invalid && <p role="alert" className="text-error">Revisa las cantidades disponibles o vuelve a seleccionar los productos.</p>}
    <label className="grid gap-1">Nombre de quien paga (opcional)<input className="input w-full" maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>
    <button className="btn btn-primary min-h-11 w-full" disabled={blocked || invalid || total <= 0}>Cobrar selección · {format((total / 100).toFixed(2))}</button>
  </form>;
}

export function BillPartsPanel({ id, bill, selected, select, editable, blocked, format, choose, showPicker }: {
  id: string; bill: BillParts; selected?: string; select: (id: string) => void; editable: boolean; blocked: boolean; format: (value: string) => string;
  choose: (selection: ProductSelection) => void; showPicker: boolean;
}) {
  const remove = useCashierAction<BillParts>();
  return <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xl font-semibold">Partes por productos</h2>
    </div>
    {editable && bill.canSplit && bill.available.length > 0 && <div hidden={!showPicker}><ProductPicker available={bill.available} choose={choose} blocked={blocked || remove.isPending} format={format} /></div>}
    {remove.isError && <p role="alert" className="alert alert-error">{apiError(remove.error, "No se pudo liberar la parte.")}</p>}
    {bill.parts.map(part => {
      const paid = cents(part.pending) === 0;
      return <article key={part.id} className="space-y-2 rounded-box border border-base-300 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{part.name}</h3>
          <span className={`badge ${paid ? "badge-success" : "badge-outline"}`}>{paid ? "Pagada" : "Pendiente"}</span>
        </div>
        <ul className="space-y-1">{part.items.map(item => <li className="flex justify-between gap-2" key={item.orderItemId}>
          <span>{item.quantity} × {item.name}{item.variant ? ` · ${item.variant}` : ""}</span><span>{format(item.amount)}</span>
        </li>)}</ul>
        <p className="text-sm">Total {format(part.total)} · Pagado {format(part.paid)} · Pendiente {format(part.pending)}</p>
        <div className="flex flex-wrap gap-2">
          {editable && !paid && <button className={`btn min-h-11 ${selected === part.id ? "btn-primary" : "btn-outline"}`} disabled={blocked} aria-pressed={selected === part.id} onClick={() => select(part.id)}>{selected === part.id ? "Parte seleccionada" : "Cobrar esta parte"}</button>}
          {paid && <BillDocumentButton document={{ orderId: id, partId: part.id }} disabled={blocked} />}
          {editable && part.removable && <button className="btn btn-ghost min-h-11" disabled={blocked || remove.isPending} onClick={() => {
            if (window.confirm("¿Liberar los productos asignados a esta parte?")) remove.mutate(repo => repo.removeBillPart(id, part.id));
          }}>Liberar parte</button>}
        </div>
      </article>;
    })}
  </section>;
}
