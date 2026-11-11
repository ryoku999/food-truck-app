import { useConfirm } from "@/presentation/components/use-confirm";
import type { CatalogImage, Named } from "@/core/entities/catalog.entity";
import { useCatalogActions } from "@/infrastructure/hooks/use-catalog";
import { filesService } from "@/infrastructure/services/management.service";
import { apiError } from "@/shared/utils/api-error";
import { useRef, useState } from "react";

export function CatalogImages({
  resource,
  item,
}: {
  resource: "categories" | "products";
  item: Named & { images: CatalogImage[] };
}) {
  const confirmAction = useConfirm();
  const actions = useCatalogActions();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [uploaded, setUploaded] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [renewed, setRenewed] = useState<
    Record<string, { source: string; url: string }>
  >({});
  const [broken, setBroken] = useState<Record<string, string>>({});
  async function attach() {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const id =
        uploaded ??
        (
          await filesService.upload(
            file,
            resource === "products" ? "PRODUCT_IMAGE" : "CATEGORY_IMAGE",
          )
        ).id;
      setUploaded(id);
      await actions.mutateAsync((service) =>
        service.image(
          resource,
          item.id,
          id,
          "attach",
          resource === "products" && !item.images.length
            ? { isPrimary: true }
            : undefined,
        ),
      );
      setFile(undefined);
      setUploaded(undefined);
      if (input.current) input.current.value = "";
    } catch (cause) {
      setError(apiError(cause, "No se pudo guardar la imagen."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
      <h3 className="text-lg font-semibold">Imágenes de {item.name}</h3>
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          aria-label="Imagen para la carta"
          className="file-input max-w-full"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => {
            setError("");
            setUploaded(undefined);
            setFile(event.target.files?.[0]);
          }}
        />
        <button
          className="btn btn-primary"
          disabled={!file || busy || actions.isPending}
          onClick={() => void attach()}
        >
          {busy
            ? "Subiendo…"
            : uploaded
              ? "Reintentar asociación"
              : "Subir imagen"}
        </button>
      </div>
      {(error || actions.isError) && (
        <p role="alert" className="alert alert-error">
          {error || apiError(actions.error, "No se pudo actualizar la imagen.")}
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {item.images.map((image) => {
          const replacement = renewed[image.fileId];
          const url =
            replacement?.source === image.url ? replacement.url : image.url;
          return (
            <li
              key={image.fileId}
              className="space-y-2 rounded-box border border-base-300 p-3"
            >
              {broken[image.fileId] === url ? (
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    void filesService
                      .url(image.fileId)
                      .then((result) => {
                        setRenewed((previous) => ({
                          ...previous,
                          [image.fileId]: {
                            source: image.url,
                            url: result.url,
                          },
                        }));
                        setBroken((previous) => ({
                          ...previous,
                          [image.fileId]: "",
                        }));
                      })
                      .catch((cause) =>
                        setError(
                          apiError(cause, "No se pudo renovar la vista."),
                        ),
                      );
                  }}
                >
                  Renovar vista
                </button>
              ) : (
                <img
                  src={url}
                  alt={image.originalName}
                  className="h-36 w-full rounded-box bg-base-200 object-contain"
                  onError={() =>
                    setBroken((previous) => ({
                      ...previous,
                      [image.fileId]: url,
                    }))
                  }
                />
              )}
              <p className="break-all">
                {image.originalName}{" "}
                {image.isPrimary && (
                  <span className="badge badge-primary">Principal</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {resource === "products" && !image.isPrimary && (
                  <button
                    className="btn btn-sm btn-outline"
                    disabled={busy || actions.isPending}
                    onClick={() =>
                      actions.mutate((service) =>
                        service.image(
                          resource,
                          item.id,
                          image.fileId,
                          "update",
                          { isPrimary: true },
                        ),
                      )
                    }
                  >
                    Hacer principal
                  </button>
                )}
                <button
                  className="btn btn-sm btn-outline"
                  disabled={busy || actions.isPending}
                  onClick={async () => {
                    if (await confirmAction("¿Quitar esta imagen de la carta?"))
                      actions.mutate((service) =>
                        service.image(
                          resource,
                          item.id,
                          image.fileId,
                          "remove",
                        ),
                      );
                  }}
                >
                  Quitar
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
