import type { Product } from "@/core/entities/catalog.entity";
import {
  useCatalogActions,
  useCatalogProduct,
  useCategories,
} from "@/infrastructure/hooks/use-catalog";
import { useProductionAreas } from "@/infrastructure/hooks/use-local";
import { apiError } from "@/shared/utils/api-error";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import { CatalogForm } from "./CatalogForm";
import {
  descriptionField,
  flagField,
  nameField,
  orderField,
  selectField,
  type Editor,
} from "./catalog-fields";
import { CatalogImages } from "./CatalogImages";

const choices = (items: { id: string; name: string }[]) =>
  items.map((item) => ({ value: item.id, label: item.name }));
const moneyField = (
  key: string,
  label: string,
  value: string | number = 0,
) => ({
  key,
  label,
  value: value.toString(),
  numeric: true,
  rule: z
    .string()
    .trim()
    .refine(
      (text) => /^\d+(\.\d{1,2})?$/.test(text) && Number(text) <= 99999999.99,
      "Ingresa un número válido",
    )
    .transform((text) => Number(text)),
});

export default function ProductEditPage() {
  const { productId } = useParams();
  const product = useCatalogProduct(productId);
  const categories = useCategories();
  const areas = useProductionAreas();
  const actions = useCatalogActions();
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(true);

  if (product.isPending || categories.isPending || areas.isPending) {
    return <p role="status">Cargando producto…</p>;
  }
  if (product.isError || !product.data) {
    return (
      <div className="alert alert-error" role="alert">
        {apiError(product.error, "No se pudo cargar el producto.")}
        <Link className="btn btn-sm" to="../.." relative="path">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const item: Product = product.data;
  const editor: Editor = {
    title: `Editar ${item.name}`,
    fields: [
      nameField(item.name),
      descriptionField(item.description),
      selectField("categoryId", "Categoría", item.category.id, [
        { value: "", label: "Selecciona una categoría" },
        ...choices(
          (categories.data ?? []).filter(
            (category) => category.active || category.id === item.category.id,
          ),
        ),
      ]),
      selectField(
        "productionAreaId",
        "Área de producción",
        item.productionArea?.id ?? "",
        [
          { value: "", label: "Sin área propia" },
          ...choices(
            (areas.data ?? []).filter(
              (area) =>
                area.active || area.id === item.productionArea?.id,
            ),
          ),
        ],
        true,
      ),
      {
        key: "basePrice",
        label: "Precio base",
        value: item.basePrice,
        numeric: true,
        rule: moneyField("basePrice", "Precio base", item.basePrice).rule,
      },
      flagField("featured", "Destacado", item.featured),
      orderField(item.sortOrder),
    ],
    submit: (fields) =>
      actions.mutateAsync((service) =>
        service.save("products", fields, item.id),
      ),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link className="link link-hover text-sm" to="../.." relative="path">
            ← Volver al catálogo
          </Link>
          <p className="mt-3 text-sm opacity-70">Producto seleccionado</p>
          <h1 className="text-3xl font-bold">{item.name}</h1>
          <p className="mt-1 opacity-80">
            Categoría: {item.category.name} · Orden: {item.sortOrder}
          </p>
        </div>
        <span className={`badge ${item.available ? "badge-success" : "badge-ghost"}`}>
          {item.available ? "Disponible" : "Agotado"}
        </span>
      </div>
      {notice && (
        <p className="alert alert-success" role="status">
          {notice}
        </p>
      )}
      {editing ? (
        <CatalogForm
          editor={editor}
          close={(saved) => {
            setEditing(false);
            if (saved) setNotice("Producto actualizado.");
          }}
        />
      ) : (
        <button className="btn btn-outline" onClick={() => setEditing(true)}>
          Editar producto nuevamente
        </button>
      )}
      <CatalogImages resource="products" item={item} />
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <p className="text-sm opacity-70">Precio base</p>
          <p className="text-xl font-bold">{item.basePrice}</p>
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <p className="text-sm opacity-70">Variantes</p>
          <p className="text-xl font-bold">{item.variants.length}</p>
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <p className="text-sm opacity-70">Imágenes</p>
          <p className="text-xl font-bold">{item.images.length}</p>
        </div>
      </section>
    </div>
  );
}
