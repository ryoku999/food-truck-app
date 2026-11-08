import type { CatalogFields, CatalogValue } from "@/core/entities/catalog.entity";
import { z } from "zod";

export type Field = { key: string; label: string; value: string | boolean; rule: z.ZodType<CatalogValue>; options?: { value: string; label: string }[]; multiline?: boolean; numeric?: boolean };
export type Editor = { title: string; fields: Field[]; submit: (fields: CatalogFields) => Promise<void> };
const nameRule = z.string().trim().min(1, "Ingresa un nombre").max(100);
export const nameField = (value = ""): Field => ({ key: "name", label: "Nombre", value, rule: nameRule });
export const descriptionField = (value?: string | null): Field => ({ key: "description", label: "Descripción", value: value ?? "", rule: z.string().trim().max(500).transform(text => text || null), multiline: true });
export const flagField = (key: string, label: string, value: boolean): Field => ({ key, label, value, rule: z.boolean() });
export const numberField = (key: string, label: string, value: string | number | null, { min = 0, decimal = false, optional = false } = {}): Field => ({
  key, label, value: value?.toString() ?? "", numeric: true,
  rule: z.string().trim().refine(text => optional && !text || (decimal ? /^-?\d+(\.\d{1,2})?$/ : /^\d+$/).test(text) && Number(text) >= min && Number(text) <= (decimal ? 99999999.99 : 2147483647), "Ingresa un número válido").transform(text => text ? Number(text) : null),
});
export const orderField = (value = 0) => numberField("sortOrder", "Orden", value);
export const selectField = (key: string, label: string, value: string, options: Field["options"], optional = false): Field => ({
  key, label, value, options,
  rule: z.string().refine(text => (optional && !text) || !!text && !!options?.some(option => option.value === text), "Selecciona una opción").transform(text => text || null),
});
