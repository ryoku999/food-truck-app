import { useConfirm } from "@/presentation/components/use-confirm";
import type {
  CatalogEditResource,
  CatalogResource,
  ComboGroup,
  ComboItem,
  ModifierGroup,
  ModifierOption,
  Named,
  Product,
  Variant,
} from "@/core/entities/catalog.entity";
import {
  useCatalogActions,
  useCatalogModifiers,
  useCatalogProduct,
  useCatalogProducts,
  useCategories,
  useMenu,
} from "@/infrastructure/hooks/use-catalog";
import { useProductionAreas } from "@/infrastructure/hooks/use-local";
import { apiError } from "@/shared/utils/api-error";
import { useState } from "react";
import { CatalogForm } from "./CatalogForm";
import {
  descriptionField,
  flagField,
  nameField,
  numberField,
  orderField,
  selectField,
  type Editor,
  type Field,
} from "./catalog-fields";
import { CatalogImages } from "./CatalogImages";

const sections = {
  categories: "Categorías",
  products: "Productos",
  "modifier-groups": "Modificadores",
} as const;
const choices = (items: Named[]) =>
  items.map((item) => ({ value: item.id, label: item.name }));
const moneyField = (
  key: string,
  label: string,
  value: string | number = 0,
  min = 0,
) => numberField(key, label, value, { decimal: true, min });

function MenuPreview() {
  const menu = useMenu();
  if (menu.isPending) return <p role="status">Cargando carta disponible…</p>;
  if (menu.isError)
    return (
      <div role="alert" className="alert alert-error">
        {apiError(menu.error, "No se pudo cargar la carta disponible.")}
        <button className="btn btn-sm" onClick={() => void menu.refetch()}>
          Reintentar
        </button>
      </div>
    );
  return (
    <div className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
      {menu.data.categories.length === 0 && (
        <p>No hay productos disponibles.</p>
      )}
      {menu.data.categories.map((category) => (
        <section key={category.id} className="space-y-2">
          <h2 className="text-lg font-semibold">{category.name}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {category.products.map((product) => (
              <li
                key={product.id}
                className="space-y-1 rounded-box border border-base-300 p-3"
              >
                <p className="font-semibold">
                  {product.name} · {product.basePrice}
                </p>
                {product.variants.length > 0 && (
                  <p>
                    Variantes:{" "}
                    {product.variants.map((variant) => variant.name).join(", ")}
                  </p>
                )}
                {product.modifierGroups.length > 0 && (
                  <p>
                    Modificadores:{" "}
                    {product.modifierGroups
                      .map((group) => group.name)
                      .join(", ")}
                  </p>
                )}
                {product.comboGroups.length > 0 && (
                  <p>
                    Combo:{" "}
                    {product.comboGroups.map((group) => group.name).join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ModifierAssignment({
  product,
  groups,
}: {
  product: Product;
  groups: ModifierGroup[];
}) {
  const actions = useCatalogActions();
  const [selected, setSelected] = useState(
    product.modifierGroups.map((group) => group.id),
  );
  return (
    <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
      <h3 className="text-lg font-semibold">Modificadores asignados</h3>
      {groups.length === 0 && <p>Crea un grupo en la pestaña Modificadores.</p>}
      {groups.map((group) => (
        <label key={group.id} className="label flex min-h-11 justify-start">
          <input
            type="checkbox"
            className="checkbox"
            checked={selected.includes(group.id)}
            disabled={actions.isPending}
            onChange={(event) => {
              const checked = event.target.checked;
              setSelected((previous) =>
                checked
                  ? [...previous, group.id]
                  : previous.filter((id) => id !== group.id),
              );
            }}
          />{" "}
          {group.name}
          {group.active ? "" : " (inactivo)"}
        </label>
      ))}
      <button
        className="btn btn-primary"
        disabled={
          actions.isPending ||
          selected.join() ===
            product.modifierGroups.map((group) => group.id).join()
        }
        onClick={() =>
          actions.mutate((service) => service.assign(product.id, selected))
        }
      >
        Guardar asignación
      </button>
      {actions.isError && (
        <p role="alert" className="alert alert-error">
          {apiError(actions.error, "No se pudo guardar la asignación.")}
        </p>
      )}
      {actions.isSuccess && <p role="status">Asignación guardada.</p>}
    </section>
  );
}

export default function CatalogPage() {
  const confirmAction = useConfirm();
  const [section, setSection] = useState<CatalogResource>("products");
  const [selected, setSelected] = useState<string>();
  const [editor, setEditor] = useState<Editor>();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [componentSearch, setComponentSearch] = useState("");
  const [componentPage, setComponentPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(false);
  const categories = useCategories();
  const areas = useProductionAreas();
  const groups = useCatalogModifiers();
  const products = useCatalogProducts({
    page,
    pageSize: 12,
    search: search.trim() || undefined,
    categoryId: categoryId || undefined,
  });
  const detail = useCatalogProduct(
    section === "products" ? selected : undefined,
  );
  const components = useCatalogProducts({
    page: componentPage,
    pageSize: 20,
    search: componentSearch.trim() || undefined,
  });
  const actions = useCatalogActions();
  const category = categories.data?.find((item) => item.id === selected);
  const group = groups.data?.find((item) => item.id === selected);
  const product = detail.data;
  const list =
    section === "categories"
      ? categories
      : section === "modifier-groups"
        ? groups
        : products;
  const needle = search.trim().toLocaleLowerCase();
  const rows =
    section === "products"
      ? products.data?.items
      : (section === "categories" ? categories.data : groups.data)?.filter(
          (item) => item.name.toLocaleLowerCase().includes(needle),
        );

  function edit(
    title: string,
    resource: CatalogEditResource,
    fields: Field[],
    id?: string,
    parentId?: string,
  ) {
    setNotice("");
    setEditor({
      title,
      fields,
      submit: (data) =>
        actions.mutateAsync((service) =>
          service.save(resource, data, id, parentId),
        ),
    });
  }
  function flag(
    resource: CatalogEditResource,
    item: Named,
    key: "active" | "available",
    value: boolean,
  ) {
    actions.mutate((service) => service.flag(resource, item.id, key, value));
  }
  function toggle(
    resource: CatalogEditResource,
    item: Named & { active: boolean },
  ) {
    return (
      <button
        className="btn btn-sm btn-outline"
        disabled={actions.isPending || !!editor}
        onClick={() => flag(resource, item, "active", !item.active)}
      >
        {item.active ? "Desactivar" : "Activar"}
      </button>
    );
  }
  function availability(
    resource: CatalogEditResource,
    item: Named & { available: boolean },
  ) {
    return (
      <button
        className="btn btn-sm btn-outline"
        disabled={actions.isPending || !!editor}
        onClick={() => flag(resource, item, "available", !item.available)}
      >
        {item.available ? "Marcar agotado" : "Marcar disponible"}
      </button>
    );
  }
  function editMain(create: boolean) {
    if (section === "categories") {
      const item = create ? undefined : category;
      edit(
        item ? "Editar categoría" : "Nueva categoría",
        section,
        [
          nameField(item?.name),
          descriptionField(item?.description),
          selectField(
            "productionAreaId",
            "Área de producción",
            item?.productionArea?.id ?? "",
            [
              { value: "", label: "Sin área" },
              ...choices(
                (areas.data ?? []).filter(
                  (area) => area.active || area.id === item?.productionArea?.id,
                ),
              ),
            ],
            true,
          ),
          orderField(item?.sortOrder),
        ],
        item?.id,
      );
    } else if (section === "products") {
      const item = create ? undefined : product;
      edit(
        item ? "Editar producto" : "Nuevo producto",
        section,
        [
          nameField(item?.name),
          descriptionField(item?.description),
          selectField("categoryId", "Categoría", item?.category.id ?? "", [
            { value: "", label: "Selecciona una categoría" },
            ...choices(
              (categories.data ?? []).filter(
                (row) => row.active || row.id === item?.category.id,
              ),
            ),
          ]),
          selectField(
            "productionAreaId",
            "Área de producción",
            item?.productionArea?.id ?? "",
            [
              { value: "", label: "Sin área propia" },
              ...choices(
                (areas.data ?? []).filter(
                  (area) => area.active || area.id === item?.productionArea?.id,
                ),
              ),
            ],
            true,
          ),
          moneyField("basePrice", "Precio base", item?.basePrice),
          flagField("featured", "Destacado", item?.featured ?? false),
          orderField(item?.sortOrder),
        ],
        item?.id,
      );
    } else {
      const item = create ? undefined : group;
      edit(
        item ? "Editar grupo" : "Nuevo grupo de modificadores",
        section,
        [
          nameField(item?.name),
          descriptionField(item?.description),
          selectField(
            "selectionType",
            "Selección",
            item?.selectionType ?? "MULTIPLE",
            [
              { value: "MULTIPLE", label: "Múltiple" },
              { value: "SINGLE", label: "Única" },
            ],
          ),
          numberField("minSelections", "Mínimo", item?.minSelections ?? 0),
          numberField(
            "maxSelections",
            "Máximo (vacío = sin límite)",
            item?.maxSelections ?? null,
            { min: 1, optional: true },
          ),
          flagField("required", "Obligatorio", item?.required ?? false),
          orderField(item?.sortOrder),
        ],
        item?.id,
      );
    }
  }
  function editOption(item?: ModifierOption) {
    edit(
      item ? "Editar opción" : "Nueva opción",
      "modifier-options",
      [
        nameField(item?.name),
        moneyField(
          "priceDelta",
          "Recargo o descuento",
          item?.priceDelta,
          -99999999.99,
        ),
        orderField(item?.sortOrder),
      ],
      item?.id,
      group?.id,
    );
  }
  function editVariant(item?: Variant) {
    edit(
      item ? "Editar variante" : "Nueva variante",
      "product-variants",
      [
        nameField(item?.name),
        moneyField("price", "Precio", item?.price),
        flagField("active", "Activa", item?.active ?? true),
        orderField(item?.sortOrder),
      ],
      item?.id,
      product?.id,
    );
  }
  function editCombo(combo?: ComboGroup) {
    edit(
      combo ? "Editar grupo de combo" : "Nuevo grupo de combo",
      "combo-groups",
      [
        nameField(combo?.name),
        numberField("minSelections", "Mínimo", combo?.minSelections ?? 1),
        numberField("maxSelections", "Máximo", combo?.maxSelections ?? 1, {
          min: 1,
        }),
        orderField(combo?.sortOrder),
      ],
      combo?.id,
      product?.id,
    );
  }
  function editComboItem(combo: ComboGroup, item?: ComboItem) {
    const options = choices(
      (components.data?.items ?? []).filter(
        (row) => row.id !== product?.id && row.active,
      ),
    );
    if (item && !options.some((option) => option.value === item.productId))
      options.push({ value: item.productId, label: item.productNameSnapshot });
    edit(
      item ? "Editar componente" : "Agregar componente",
      "combo-group-items",
      [
        selectField("productId", "Producto", item?.productId ?? "", [
          { value: "", label: "Selecciona un producto" },
          ...options,
        ]),
        moneyField(
          "additionalPrice",
          "Precio adicional",
          item?.additionalPrice,
        ),
        flagField("active", "Activo", item?.active ?? true),
        orderField(item?.sortOrder),
      ],
      item?.id,
      combo.id,
    );
  }
  const current =
    section === "products"
      ? product
      : section === "categories"
        ? category
        : group;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Carta</h1>
        <button
          className="btn btn-outline"
          aria-expanded={preview}
          onClick={() => setPreview((value) => !value)}
        >
          {preview ? "Ocultar vista previa" : "Ver carta disponible"}
        </button>
        <button
          className="btn btn-primary"
          disabled={
            !!editor ||
            actions.isPending ||
            (section === "products" &&
              !categories.data?.some((item) => item.active))
          }
          onClick={() => editMain(true)}
        >
          {section === "categories"
            ? "Nueva categoría"
            : section === "products"
              ? "Nuevo producto"
              : "Nuevo grupo"}
        </button>
      </div>
      {preview && <MenuPreview />}
      <nav className="flex flex-wrap gap-2" aria-label="Secciones de la carta">
        {(Object.keys(sections) as CatalogResource[]).map((key) => (
          <button
            key={key}
            aria-pressed={key === section}
            disabled={actions.isPending}
            className={`btn ${key === section ? "btn-primary" : "btn-outline"}`}
            onClick={() => {
              setSection(key);
              setSelected(undefined);
              setEditor(undefined);
              setSearch("");
              setPage(1);
              setNotice("");
              actions.reset();
            }}
          >
            {sections[key]}
          </button>
        ))}
      </nav>
      <div className="flex flex-wrap gap-3">
        <input
          className="input"
          aria-label="Buscar en la carta"
          placeholder="Buscar por nombre"
          maxLength={100}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        {section === "products" && (
          <select
            className="select"
            aria-label="Filtrar por categoría"
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas las categorías</option>
            {categories.data?.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {editor && (
        <CatalogForm
          editor={editor}
          close={(saved) => {
            setEditor(undefined);
            if (saved) setNotice("Cambios guardados.");
          }}
        />
      )}
      {notice && (
        <p className="alert alert-success" role="status">
          {notice}
        </p>
      )}
      {(areas.isError || categories.isError || groups.isError) && (
        <p className="text-error" role="alert">
          Algunos datos de referencia no se pudieron cargar.
        </p>
      )}
      {actions.isError && !editor && (
        <p className="alert alert-error" role="alert">
          {apiError(actions.error, "No se pudo completar la operación.")}
        </p>
      )}
      <div className="grid gap-4 xl:grid-cols-[minmax(12rem,1fr)_minmax(0,2fr)]">
        <section className="space-y-2">
          {list.isPending && <p role="status">Cargando carta…</p>}
          {list.isError && (
            <div className="alert alert-error" role="alert">
              {apiError(list.error, "No se pudo cargar la carta.")}
              <button
                className="btn btn-sm"
                onClick={() => void list.refetch()}
              >
                Reintentar
              </button>
            </div>
          )}
          {rows?.length === 0 && <p>Sin resultados.</p>}
          {rows?.map((row) => (
            <button
              key={row.id}
              type="button"
              disabled={!!editor || actions.isPending}
              aria-pressed={selected === row.id}
              className={`btn h-auto min-h-11 w-full justify-between py-2 text-left whitespace-normal ${selected === row.id ? "btn-primary" : "btn-outline"}`}
              onClick={() => {
                setSelected(row.id);
                setComponentSearch("");
                setComponentPage(1);
                actions.reset();
              }}
            >
              {row.name}
              <span className="badge badge-ghost">
                {row.active ? "Activo" : "Inactivo"}
              </span>
            </button>
          ))}
          {section === "products" && products.data && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="btn btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </button>
              <span>
                Pág. {page} de {Math.max(1, products.data.meta.pageCount)}
              </span>
              <button
                className="btn btn-sm"
                disabled={page >= products.data.meta.pageCount}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </section>
        <section className="min-w-0 space-y-4">
          {!selected && <p>Selecciona un registro para gestionarlo.</p>}
          {section === "products" && selected && detail.isPending && (
            <p role="status">Cargando producto…</p>
          )}
          {section === "products" && detail.isError && (
            <p className="alert alert-error" role="alert">
              {apiError(detail.error, "No se pudo cargar el producto.")}
            </p>
          )}
          {current && (
            <div className="space-y-2 rounded-box border border-base-300 bg-base-100 p-4">
              <h2 className="text-xl font-bold">{current.name}</h2>
              {current.description && <p>{current.description}</p>}
              {product && (
                <p>
                  Precio base: {product.basePrice} ·{" "}
                  {product.available ? "Disponible" : "Agotado"}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={!!editor || actions.isPending}
                  onClick={() => editMain(false)}
                >
                  Editar
                </button>
                {toggle(section, current)}
                {product && availability("products", product)}
              </div>
            </div>
          )}
          {section === "categories" && category && (
            <CatalogImages
              key={category.id}
              resource="categories"
              item={category}
            />
          )}
          {section === "modifier-groups" && group && (
            <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
              <h3 className="text-lg font-semibold">Opciones</h3>
              <p>
                {group.selectionType === "SINGLE"
                  ? "Selección única"
                  : "Selección múltiple"}{" "}
                · {group.minSelections} a {group.maxSelections ?? "sin límite"}
              </p>
              <button
                className="btn btn-sm btn-primary"
                disabled={!!editor || actions.isPending}
                onClick={() => editOption()}
              >
                Nueva opción
              </button>
              {group.options.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 border-t border-base-300 pt-2"
                >
                  <p className="grow">
                    {item.name} · {item.priceDelta} ·{" "}
                    {item.active ? "Activa" : "Inactiva"} ·{" "}
                    {item.available ? "Disponible" : "Agotada"}
                  </p>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={!!editor || actions.isPending}
                    onClick={() => editOption(item)}
                  >
                    Editar
                  </button>
                  {toggle("modifier-options", item)}
                  {availability("modifier-options", item)}
                </div>
              ))}
            </section>
          )}
          {product && (
            <>
              <CatalogImages
                key={product.id}
                resource="products"
                item={product}
              />
              <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
                <h3 className="text-lg font-semibold">Variantes</h3>
                <button
                  className="btn btn-sm btn-primary"
                  disabled={!!editor || actions.isPending}
                  onClick={() => editVariant()}
                >
                  Nueva variante
                </button>
                {product.variants.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-2 border-t border-base-300 pt-2"
                  >
                    <p className="grow">
                      {item.name} · {item.price} ·{" "}
                      {item.active ? "Activa" : "Inactiva"} ·{" "}
                      {item.available ? "Disponible" : "Agotada"}
                    </p>
                    <button
                      className="btn btn-sm btn-outline"
                      disabled={!!editor || actions.isPending}
                      onClick={() => editVariant(item)}
                    >
                      Editar
                    </button>
                    {availability("product-variants", item)}
                  </div>
                ))}
              </section>
              {groups.data && (
                <ModifierAssignment
                  key={product.id}
                  product={product}
                  groups={groups.data}
                />
              )}
              <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
                <h3 className="text-lg font-semibold">Combos</h3>
                <button
                  className="btn btn-sm btn-primary"
                  disabled={!!editor || actions.isPending}
                  onClick={() => editCombo()}
                >
                  Nuevo grupo de combo
                </button>
                {product.comboGroups.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="input"
                      aria-label="Buscar producto para el combo"
                      placeholder="Buscar componente"
                      value={componentSearch}
                      maxLength={100}
                      onChange={(event) => {
                        setComponentSearch(event.target.value);
                        setComponentPage(1);
                      }}
                    />
                    <button
                      className="btn btn-sm"
                      disabled={componentPage <= 1}
                      onClick={() => setComponentPage(componentPage - 1)}
                    >
                      Anterior
                    </button>
                    <button
                      className="btn btn-sm"
                      disabled={
                        componentPage >= (components.data?.meta.pageCount ?? 0)
                      }
                      onClick={() => setComponentPage(componentPage + 1)}
                    >
                      Siguiente
                    </button>
                    <span>Pág. {componentPage}</span>
                    {components.isError && (
                      <p role="alert" className="text-error">
                        No se pudieron cargar los componentes.
                      </p>
                    )}
                  </div>
                )}
                {product.comboGroups.map((combo) => (
                  <div
                    key={combo.id}
                    className="space-y-2 rounded-box border border-base-300 p-3"
                  >
                    <h4 className="font-semibold">
                      {combo.name} · {combo.minSelections} a{" "}
                      {combo.maxSelections}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn btn-sm btn-outline"
                        disabled={!!editor || actions.isPending}
                        onClick={() => editCombo(combo)}
                      >
                        Editar grupo
                      </button>
                      <button
                        className="btn btn-sm btn-outline"
                        disabled={
                          !!editor ||
                          actions.isPending ||
                          !components.data?.items.some(
                            (row) => row.active && row.id !== product.id,
                          )
                        }
                        onClick={() => editComboItem(combo)}
                      >
                        Agregar componente
                      </button>
                    </div>
                    {combo.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center gap-2 border-t border-base-300 pt-2"
                      >
                        <p className="grow">
                          {item.productNameSnapshot} · Adicional{" "}
                          {item.additionalPrice} ·{" "}
                          {item.active ? "Activo" : "Inactivo"}
                        </p>
                        <button
                          className="btn btn-sm btn-outline"
                          disabled={!!editor || actions.isPending}
                          onClick={() => editComboItem(combo, item)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          disabled={!!editor || actions.isPending}
                          onClick={async () => {
                            if (
                              await confirmAction(
                                "¿Quitar este componente del combo?",
                              )
                            )
                              actions.mutate((service) =>
                                service.removeComboItem(item.id),
                              );
                          }}
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
