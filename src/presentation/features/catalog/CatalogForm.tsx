import type { CatalogFields } from "@/core/entities/catalog.entity";
import type { Editor } from "./catalog-fields";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

export function CatalogForm({
  editor,
  close,
}: {
  editor: Editor;
  close: (saved?: boolean) => void;
}) {
  const schema = z
    .object(
      Object.fromEntries(editor.fields.map((field) => [field.key, field.rule])),
    )
    .superRefine((values, context) => {
      const { minSelections, maxSelections, required, selectionType } = values;
      if (
        typeof minSelections === "number" &&
        typeof maxSelections === "number" &&
        minSelections > maxSelections
      ) {
        context.addIssue({
          code: "custom",
          path: ["maxSelections"],
          message: "El máximo debe ser mayor o igual al mínimo",
        });
      }
      if (required === true && minSelections === 0)
        context.addIssue({
          code: "custom",
          path: ["minSelections"],
          message: "Un grupo obligatorio requiere al menos una selección",
        });
      if (
        selectionType === "SINGLE" &&
        ((maxSelections !== null && maxSelections !== 1) ||
          (typeof minSelections === "number" && minSelections > 1))
      )
        context.addIssue({
          code: "custom",
          path: ["maxSelections"],
          message: "La selección única permite como máximo una opción",
        });
    });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, unknown>, unknown, CatalogFields>({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(
      editor.fields.map((field) => [field.key, field.value]),
    ),
  });
  return (
    <form
      className="card border border-base-300 bg-base-100"
      noValidate
      onSubmit={handleSubmit(async (fields) => {
        try {
          await editor.submit(fields);
          close(true);
        } catch (error) {
          setError("root", {
            message: apiError(error, "No se pudieron guardar los cambios."),
          });
        }
      })}
    >
      <div className="card-body">
        <h2 className="card-title">{editor.title}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {editor.fields.map((field) => (
            <label key={field.key} className="grid gap-1">
              {field.label}
              {typeof field.value === "boolean" ? (
                <input
                  className="checkbox"
                  type="checkbox"
                  {...register(field.key)}
                />
              ) : field.options ? (
                <select className="select w-full" {...register(field.key)}>
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.multiline ? (
                <textarea
                  className="textarea w-full"
                  {...register(field.key)}
                />
              ) : (
                <input
                  className="input w-full"
                  inputMode={field.numeric ? "decimal" : "text"}
                  {...register(field.key)}
                />
              )}
              {errors[field.key]?.message && (
                <span className="text-sm text-error">
                  {errors[field.key]?.message}
                </span>
              )}
            </label>
          ))}
        </div>
        {errors.root?.message && (
          <p className="alert alert-error" role="alert">
            {errors.root.message}
          </p>
        )}
        <div className="card-actions">
          <button className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : "Guardar"}
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            disabled={isSubmitting}
            onClick={() => close()}
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}
