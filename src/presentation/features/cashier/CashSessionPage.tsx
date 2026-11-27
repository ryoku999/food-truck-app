import { Card, CardContent } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Textarea } from "@/presentation/components/ui/textarea";
import { Alert } from "@/presentation/components/ui/alert";
import { Button, buttonVariants } from "@/presentation/components/ui/button";
import { NativeSelect } from "@/presentation/components/ui/native-select";
import { Badge } from "@/presentation/components/ui/badge";
import { useConfirm } from "@/presentation/components/use-confirm";
import type { CashSession } from "@/core/entities/cashier.entity";
import { manualMovements } from "@/core/entities/cashier.entity";
import {
  useCashRegisters,
  useCashSession,
  useCashierAction,
} from "@/infrastructure/hooks/use-cashier";
import { useBusiness } from "@/infrastructure/hooks/use-management";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { moneyFormatter } from "../waiter/order-labels";
import { amountNumber, amountRule, movementLabels } from "./cashier-fields";

const sessionSchema = z.object({
  amount: amountRule.refine(
    (value) => amountNumber(value) >= 0,
    "El monto no puede ser negativo",
  ),
  notes: z.string().trim().max(500),
});
const movementSchema = z
  .object({
    type: z.enum(manualMovements),
    amount: amountRule,
    description: z.string().trim().min(1, "Indica el motivo").max(500),
  })
  .refine(
    (values) =>
      values.type === "ADJUSTMENT"
        ? amountNumber(values.amount) !== 0
        : amountNumber(values.amount) > 0,
    {
      path: ["amount"],
      message: "Ingresa un monto positivo o un ajuste distinto de cero",
    },
  );

function Collections({
  session,
  format,
}: {
  session: CashSession;
  format: (value: string) => string;
}) {
  const { collections } = session;
  return (
    <Card as="section">
      <CardContent>
        <h2 className="text-lg leading-snug font-semibold">Cobros del turno</h2>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="clay-panel rounded-lg bg-clay-peach p-3">
            <dt>Total cobrado</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{format(collections.total)}</dd>
          </div>
          <div>
            <dt>En efectivo</dt>
            <dd className="font-semibold">{format(collections.cash)}</dd>
          </div>
          <div>
            <dt>Por otros medios</dt>
            <dd className="font-semibold">{format(collections.nonCash)}</dd>
          </div>
        </dl>
        <ul className="divide-y divide-border">
          {collections.methods.map((method) => (
            <li
              key={method.id}
              className="flex flex-wrap justify-between gap-2 py-2"
            >
              <span>
                {method.name} · {method.count}{" "}
                {method.count === 1 ? "pago" : "pagos"}
              </span>
              <span className="font-semibold">{format(method.amount)}</span>
              {(Number(method.cancelled) !== 0 ||
                Number(method.refunded) !== 0) && (
                <span className="w-full text-sm">
                  Anulado: {format(method.cancelled)} · Reembolsado:{" "}
                  {format(method.refunded)}
                </span>
              )}
            </li>
          ))}
        </ul>
        {!collections.methods.length && (
          <p>Este turno aún no tiene cobros registrados.</p>
        )}
        <p className="text-sm">
          Anulaciones: {format(collections.cancelled)} · Reembolsos:{" "}
          {format(collections.refunded)}
        </p>
      </CardContent>
    </Card>
  );
}

function SessionForm({
  registerId,
  session,
  complete,
  cancel,
}: {
  registerId: string;
  session?: CashSession;
  complete: (session: CashSession) => void;
  cancel?: () => void;
}) {
  const confirmAction = useConfirm();
  const action = useCashierAction<CashSession>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(sessionSchema),
    defaultValues: { amount: "", notes: "" },
  });
  return (
    <Card
      as="form"
      noValidate
      onSubmit={handleSubmit(async ({ amount, notes }) => {
        if (
          session &&
          !(await confirmAction(
            "¿Confirmar el cierre con el efectivo contado?",
          ))
        )
          return;
        try {
          const result = await action.mutateAsync((repo) =>
            session
              ? repo.close(session.id, amountNumber(amount), notes || undefined)
              : repo.open(registerId, amountNumber(amount), notes || undefined),
          );
          complete(result);
        } catch {
          /* API error is shown below. */
        }
      })}
    >
      <CardContent>
        <h2 className="text-lg leading-snug font-semibold">
          {session ? "Cerrar turno" : "Abrir turno"}
        </h2>
        <label className="grid gap-1">
          {session ? "Efectivo contado" : "Fondo inicial"}
          <Input
            inputMode="decimal"
            className="w-full"
            {...register("amount")}
          />
        </label>
        {errors.amount && <p className="text-destructive">{errors.amount.message}</p>}
        <label className="grid gap-1">
          Notas (opcional)
          <Textarea
            className="w-full"
            maxLength={500}
            {...register("notes")}
          />
        </label>
        {action.isError && (
          <Alert role="alert" variant="destructive">
            {apiError(
              action.error,
              "No se confirmó la operación. Revisa el estado de la caja.",
            )}
          </Alert>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="submit" className="min-h-11" disabled={isSubmitting}>
            {isSubmitting
              ? "Guardando…"
              : session
                ? "Cerrar caja"
                : "Abrir caja"}
          </Button>
          {cancel && (
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={cancel}
            >
              Volver
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MovementForm({ id, close }: { id: string; close: () => void }) {
  const action = useCashierAction();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof movementSchema>>({
    resolver: zodResolver(movementSchema),
    defaultValues: { type: "INCOME", amount: "", description: "" },
  });
  return (
    <Card
      as="form"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        try {
          await action.mutateAsync((repo) =>
            repo.movement(id, {
              ...values,
              amount: amountNumber(values.amount),
            }),
          );
          close();
        } catch {
          /* API error is shown below. */
        }
      })}
    >
      <CardContent>
        <h2 className="text-lg leading-snug font-semibold">Registrar movimiento</h2>
        <label className="grid gap-1">
          Tipo
          <NativeSelect className="w-full" {...register("type")}>
            {manualMovements.map((type) => (
              <option key={type} value={type}>
                {movementLabels[type]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-1">
          Monto
          <Input
            className="w-full"
            inputMode="decimal"
            {...register("amount")}
          />
        </label>
        <label className="grid gap-1">
          Motivo
          <Textarea
            className="w-full"
            maxLength={500}
            {...register("description")}
          />
        </label>
        {(errors.amount || errors.description) && (
          <p role="alert" className="text-destructive">
            {errors.amount?.message || errors.description?.message}
          </p>
        )}
        {action.isError && (
          <Alert role="alert" variant="destructive">
            {apiError(
              action.error,
              "No se confirmó el movimiento. Revisa el historial antes de repetirlo.",
            )}
          </Alert>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            Registrar
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={close}
          >
            Volver
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CashSessionPage() {
  const registers = useCashRegisters();
  const [selected, setSelected] = useState("");
  const [mode, setMode] = useState<"movement" | "close">();
  const [receipt, setReceipt] = useState<CashSession>();
  const business = useBusiness();
  const money = moneyFormatter(business.data?.currencyCode);
  const format = (amount: string | null) =>
    amount == null ? "—" : money.format(Number(amount));
  const active = registers.data?.filter((register) => register.active) ?? [];
  const register = active.find((item) => item.id === selected) ?? active[0];
  const session = useCashSession(register?.currentSession?.id);
  const current = session.data?.status === "OPEN" ? session.data : undefined;
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="clay-hero clay-raised flex flex-wrap items-end justify-between gap-3 rounded-2xl border p-5 @lg:p-7">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight @lg:text-4xl">Turno de caja</h1>
          <p className="mt-1 text-sm text-muted-foreground">Apertura, movimientos y cierre del turno</p>
        </div>
        <Link className={buttonVariants({ variant: "outline" })} to="../accounts" relative="path">
          Ver cuentas
        </Link>
      </header>
      {registers.isPending && <p role="status">Cargando cajas…</p>}
      {registers.isError && (
        <Alert variant="destructive" role="alert">
          {apiError(registers.error, "No se pudieron cargar las cajas.")}
          <Button type="submit" variant="outline" onClick={() => void registers.refetch()}>
            Reintentar
          </Button>
        </Alert>
      )}
      {registers.isSuccess && !register && (
        <p>No hay cajas activas. Solicita a Gestión que configure una.</p>
      )}
      {register && (
        <label className="grid gap-1">
          Caja
          <NativeSelect
            className="w-full sm:max-w-xs"
            value={register.id}
            onChange={(event) => {
              setSelected(event.target.value);
              setMode(undefined);
              setReceipt(undefined);
            }}
          >
            {active.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.currentSession ? "Abierta" : "Sin turno"}
              </option>
            ))}
          </NativeSelect>
        </label>
      )}
      {receipt?.cashRegisterId === register?.id &&
        receipt?.status === "CLOSED" && (
          <>
            <Card as="section">
              <CardContent>
                <h2 className="text-lg leading-snug font-semibold">Cierre confirmado</h2>
                <p>
                  Esperado: {format(receipt.expectedAmount)} · Contado:{" "}
                  {format(receipt.actualAmount)} · Diferencia:{" "}
                  {format(receipt.difference)}
                </p>
              </CardContent>
            </Card>
            <Collections session={receipt} format={format} />
          </>
        )}
      {register && !register.currentSession && !registers.isError && (
        <SessionForm
          key={register.id}
          registerId={register.id}
          complete={setReceipt}
        />
      )}
      {register?.currentSession && session.isPending && (
        <p role="status">Cargando turno…</p>
      )}
      {session.isError && (
        <Alert variant="destructive" role="alert">
          {apiError(session.error, "No se pudo cargar el turno.")}
          <Button type="submit" variant="outline" onClick={() => void session.refetch()}>
            Reintentar
          </Button>
        </Alert>
      )}
      {current && (
        <>
          <Collections session={current} format={format} />
          <Card as="section">
            <CardContent>
              <h2 className="text-lg leading-snug font-semibold">
                Efectivo en caja{" "}
                <Badge variant="success">Turno abierto</Badge>
              </h2>
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt>Fondo inicial</dt>
                  <dd className="font-bold">{format(current.openingAmount)}</dd>
                </div>
                <div>
                  <dt>Efectivo esperado</dt>
                  <dd className="font-bold">
                    {format(current.liveExpectedAmount)}
                  </dd>
                </div>
                {(
                  [
                    "SALE",
                    "INCOME",
                    "EXPENSE",
                    "WITHDRAWAL",
                    "ADJUSTMENT",
                  ] as const
                ).map((type) => (
                  <div key={type}>
                    <dt>{movementLabels[type]}</dt>
                    <dd>{format(current.summary[type])}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="submit"
                  disabled={!!mode || session.isError}
                  onClick={() => setMode("movement")}
                >
                  Nuevo movimiento
                </Button>
                <Button
                  type="submit" variant="outline"
                  disabled={!!mode || session.isError}
                  onClick={() => setMode("close")}
                >
                  Preparar cierre
                </Button>
              </div>
            </CardContent>
          </Card>
          {mode === "movement" && (
            <MovementForm
              key={current.id}
              id={current.id}
              close={() => setMode(undefined)}
            />
          )}
          {mode === "close" && (
            <SessionForm
              key={current.id}
              registerId={current.cashRegisterId}
              session={current}
              complete={(result) => {
                setReceipt(result);
                setMode(undefined);
              }}
              cancel={() => setMode(undefined)}
            />
          )}
          <section className="space-y-2">
            <h2 className="text-xl font-semibold">Movimientos</h2>
            {current.movements.length === 0 && (
              <p>Todavía no hay movimientos.</p>
            )}
            <ul className="space-y-2">
              {[...current.movements].reverse().map((item) => (
                <li
                  className="flex flex-wrap justify-between gap-2 rounded-xl border border-border bg-card p-3"
                  key={item.id}
                >
                  <div>
                    <p className="font-semibold">{movementLabels[item.type]}</p>
                    {item.description && <p>{item.description}</p>}
                  </div>
                  <span>{format(item.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
