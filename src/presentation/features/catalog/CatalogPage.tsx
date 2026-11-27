import { Alert } from "@/presentation/components/ui/alert";
import { Button, buttonVariants } from "@/presentation/components/ui/button";
import { Label } from "@/presentation/components/ui/label";
import { Input } from "@/presentation/components/ui/input";
import { NativeSelect } from "@/presentation/components/ui/native-select";
import { Badge } from "@/presentation/components/ui/badge";
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
import { Link } from "react-router-dom";
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
      <Alert role="alert" variant="destructive">
        {apiError(menu.error, "No se pudo cargar la carta disponible.")}
        <Button type="submit" variant="outline" size="sm" onClick={() => void menu.refetch()}>
          Reintentar
        </Button>
      </Alert>
    );
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
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
                className="space-y-1 rounded-xl border border-border p-3"
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
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="text-lg font-semibold">Modificadores asignados</h3>
      {groups.length === 0 && <p>Crea un grupo en la pestaña Modificadores.</p>}
      {groups.map((group) => (
        <Label key={group.id} className="min-h-11 flex justify-start">
          <input
            type="checkbox"
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
        </Label>
      ))}
      <Button
        type="submit"
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
      </Button>
      {actions.isError && (
        <Alert role="alert" variant="destructive">
          {apiError(actions.error, "No se pudo guardar la asignación.")}
        </Alert>
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
  const product = section === "products" ? detail.data : undefined;
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
      <Button
        type="submit" variant="outline" size="sm"
        disabled={actions.isPending || !!editor}
        onClick={() => flag(resource, item, "active", !item.active)}
      >
        {item.active ? "Desactivar" : "Activar"}
      </Button>
    );
  }
  function availability(
    resource: CatalogEditResource,
    item: Named & { available: boolean },
  ) {
    return (
      <Button
        type="submit" variant="outline" size="sm"
        disabled={actions.isPending || !!editor}
        onClick={() => flag(resource, item, "available", !item.available)}
      >
        {item.available ? "Marcar agotado" : "Marcar disponible"}
      </Button>
    );
  }
  function editMain(create: boolean) {
    if (section === "categories") {
      const item = create ? undefined : category;
      const nextCategoryOrder =
        Math.max(-1, ...(categories.data ?? []).map((row) => row.sortOrder)) + 1;
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
          orderField(item?.sortOrder ?? nextCategoryOrder),
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
        <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-4xl">Carta</h1>
        <Button
          type="submit" variant="outline"
          aria-expanded={preview}
          onClick={() => setPreview((value) => !value)}
        >
          {preview ? "Ocultar vista previa" : "Ver carta disponible"}
        </Button>
        <Button
          type="submit"
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
        </Button>
      </div>
      {preview && <MenuPreview />}
      <nav className="flex flex-wrap gap-2" aria-label="Secciones de la carta">
        {(Object.keys(sections) as CatalogResource[]).map((key) => (
          <Button
            key={key}
            aria-pressed={key === section}
            disabled={actions.isPending}
            type="submit" variant={key === section ? "default" : "outline"}
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
          </Button>
        ))}
      </nav>
      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Buscar en la carta"
          placeholder="Buscar por nombre"
          maxLength={100}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setSelected(undefined);
            setEditor(undefined);
            setPage(1);
          }}
        />
        {section === "products" && (
          <NativeSelect
            aria-label="Filtrar por categoría"
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setSelected(undefined);
              setEditor(undefined);
              setNotice("");
              setPage(1);
            }}
          >
            <option value="">Todas las categorías</option>
            {categories.data?.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </NativeSelect>
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
        <Alert variant="success" role="status">
          {notice}
        </Alert>
      )}
      {(areas.isError || categories.isError || groups.isError) && (
        <p className="text-destructive" role="alert">
          Algunos datos de referencia no se pudieron cargar.
        </p>
      )}
      {actions.isError && !editor && (
        <Alert variant="destructive" role="alert">
          {apiError(actions.error, "No se pudo completar la operación.")}
        </Alert>
      )}
      <div className="grid gap-4 xl:grid-cols-[minmax(12rem,1fr)_minmax(0,2fr)]">
        <section className="space-y-2">
          {list.isPending && <p role="status">Cargando carta…</p>}
          {list.isError && (
            <Alert variant="destructive" role="alert">
              {apiError(list.error, "No se pudo cargar la carta.")}
              <Button
                type="submit" variant="outline" size="sm"
                onClick={() => void list.refetch()}
              >
                Reintentar
              </Button>
            </Alert>
          )}
          {rows?.length === 0 && <p>Sin resultados.</p>}
          {rows?.map((row) => (
            <Button
              key={row.id}
              type="button"
              disabled={!!editor || actions.isPending}
              aria-pressed={selected === row.id}
              variant={selected === row.id ? "default" : "outline"} className="h-auto min-h-11 w-full justify-between py-2 text-left whitespace-normal"
              onClick={() => {
                setSelected(row.id);
                setComponentSearch("");
                setComponentPage(1);
                actions.reset();
              }}
            >
              <span className="min-w-0">
                <span className="block truncate">{row.name}</span>
                {section === "categories" && "sortOrder" in row && (
                  <span className="mt-1 block text-xs opacity-70">
                    Orden {row.sortOrder}
                    {"productionArea" in row && row.productionArea
                      ? ` · ${row.productionArea.name}`
                      : ""}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {section === "categories" && "sortOrder" in row && (
                  <Badge variant="outline">#{row.sortOrder}</Badge>
                )}
                <Badge variant="ghost">
                  {row.active ? "Activo" : "Inactivo"}
                </Badge>
              </span>
            </Button>
          ))}
          {section === "products" && products.data && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit" variant="outline" size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <span>
                Pág. {page} de {Math.max(1, products.data.meta.pageCount)}
              </span>
              <Button
                type="submit" variant="outline" size="sm"
                disabled={page >= products.data.meta.pageCount}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </section>
        <section
          key={`${section}-${selected ?? "none"}`}
          className="min-w-0 space-y-4"
        >
          {!selected && <p>Selecciona un registro para gestionarlo.</p>}
          {section === "products" && selected && detail.isPending && (
            <p role="status">Cargando producto…</p>
          )}
          {section === "products" && detail.isError && (
            <Alert variant="destructive" role="alert">
              {apiError(detail.error, "No se pudo cargar el producto.")}
            </Alert>
          )}
          {current && (
            <div className="space-y-2 rounded-xl border border-border bg-card p-4">
              <h2 className="text-xl font-bold">{current.name}</h2>
              {current.description && <p>{current.description}</p>}
              {product && (
                <p>
                  Precio base: {product.basePrice} ·{" "}
                  {product.available ? "Disponible" : "Agotado"}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {section === "products" && product ? (
                  <Link
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                    to={`products/${product.id}`}
                    relative="path"
                  >
                    Editar producto
                  </Link>
                ) : (
                  <Button
                    type="submit" variant="outline" size="sm"
                    disabled={!!editor || actions.isPending}
                    onClick={() => editMain(false)}
                  >
                    Editar
                  </Button>
                )}
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
            <section className="space-y-3 rounded-xl border border-border bg-card p-4">
              <h3 className="text-lg font-semibold">Opciones</h3>
              <p>
                {group.selectionType === "SINGLE"
                  ? "Selección única"
                  : "Selección múltiple"}{" "}
                · {group.minSelections} a {group.maxSelections ?? "sin límite"}
              </p>
              <Button
                type="submit" size="sm"
                disabled={!!editor || actions.isPending}
                onClick={() => editOption()}
              >
                Nueva opción
              </Button>
              {group.options.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 border-t border-border pt-2"
                >
                  <p className="grow">
                    {item.name} · {item.priceDelta} ·{" "}
                    {item.active ? "Activa" : "Inactiva"} ·{" "}
                    {item.available ? "Disponible" : "Agotada"}
                  </p>
                  <Button
                    type="submit" variant="outline" size="sm"
                    disabled={!!editor || actions.isPending}
                    onClick={() => editOption(item)}
                  >
                    Editar
                  </Button>
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
              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <h3 className="text-lg font-semibold">Variantes</h3>
                <Button
                  type="submit" size="sm"
                  disabled={!!editor || actions.isPending}
                  onClick={() => editVariant()}
                >
                  Nueva variante
                </Button>
                {product.variants.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-2 border-t border-border pt-2"
                  >
                    <p className="grow">
                      {item.name} · {item.price} ·{" "}
                      {item.active ? "Activa" : "Inactiva"} ·{" "}
                      {item.available ? "Disponible" : "Agotada"}
                    </p>
                    <Button
                      type="submit" variant="outline" size="sm"
                      disabled={!!editor || actions.isPending}
                      onClick={() => editVariant(item)}
                    >
                      Editar
                    </Button>
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
              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <h3 className="text-lg font-semibold">Combos</h3>
                <Button
                  type="submit" size="sm"
                  disabled={!!editor || actions.isPending}
                  onClick={() => editCombo()}
                >
                  Nuevo grupo de combo
                </Button>
                {product.comboGroups.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      aria-label="Buscar producto para el combo"
                      placeholder="Buscar componente"
                      value={componentSearch}
                      maxLength={100}
                      onChange={(event) => {
                        setComponentSearch(event.target.value);
                        setComponentPage(1);
                      }}
                    />
                    <Button
                      type="submit" variant="outline" size="sm"
                      disabled={componentPage <= 1}
                      onClick={() => setComponentPage(componentPage - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      type="submit" variant="outline" size="sm"
                      disabled={
                        componentPage >= (components.data?.meta.pageCount ?? 0)
                      }
                      onClick={() => setComponentPage(componentPage + 1)}
                    >
                      Siguiente
                    </Button>
                    <span>Pág. {componentPage}</span>
                    {components.isError && (
                      <p role="alert" className="text-destructive">
                        No se pudieron cargar los componentes.
                      </p>
                    )}
                  </div>
                )}
                {product.comboGroups.map((combo) => (
                  <div
                    key={combo.id}
                    className="space-y-2 rounded-xl border border-border p-3"
                  >
                    <h4 className="font-semibold">
                      {combo.name} · {combo.minSelections} a{" "}
                      {combo.maxSelections}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="submit" variant="outline" size="sm"
                        disabled={!!editor || actions.isPending}
                        onClick={() => editCombo(combo)}
                      >
                        Editar grupo
                      </Button>
                      <Button
                        type="submit" variant="outline" size="sm"
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
                      </Button>
                    </div>
                    {combo.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center gap-2 border-t border-border pt-2"
                      >
                        <p className="grow">
                          {item.productNameSnapshot} · Adicional{" "}
                          {item.additionalPrice} ·{" "}
                          {item.active ? "Activo" : "Inactivo"}
                        </p>
                        <Button
                          type="submit" variant="outline" size="sm"
                          disabled={!!editor || actions.isPending}
                          onClick={() => editComboItem(combo, item)}
                        >
                          Editar
                        </Button>
                        <Button
                          type="submit" variant="outline" size="sm"
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
                        </Button>
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
