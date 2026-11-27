import { Input } from "@/presentation/components/ui/input";
import { Button } from "@/presentation/components/ui/button";
import { Alert } from "@/presentation/components/ui/alert";
import { Badge } from "@/presentation/components/ui/badge";
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
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="text-lg font-semibold">Imágenes de {item.name}</h3>
      <div className="flex flex-wrap gap-2">
        <Input
          ref={input}
          type="file"
          aria-label="Imagen para la carta"
          className="max-w-full"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => {
            setError("");
            setUploaded(undefined);
            setFile(event.target.files?.[0]);
          }}
        />
        <Button
          type="submit"
          disabled={!file || busy || actions.isPending}
          onClick={() => void attach()}
        >
          {busy
            ? "Subiendo…"
            : uploaded
              ? "Reintentar asociación"
              : "Subir imagen"}
        </Button>
      </div>
      {(error || actions.isError) && (
        <Alert role="alert" variant="destructive">
          {error || apiError(actions.error, "No se pudo actualizar la imagen.")}
        </Alert>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {item.images.map((image) => {
          const replacement = renewed[image.fileId];
          const url =
            replacement?.source === image.url ? replacement.url : image.url;
          return (
            <li
              key={image.fileId}
              className="space-y-2 rounded-xl border border-border p-3"
            >
              {broken[image.fileId] === url ? (
                <Button
                  type="submit" variant="outline"
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
                </Button>
              ) : (
                <img
                  src={url}
                  alt={image.originalName}
                  className="h-36 w-full rounded-xl bg-muted object-contain"
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
                  <Badge>Principal</Badge>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {resource === "products" && !image.isPrimary && (
                  <Button
                    type="submit" variant="outline" size="sm"
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
                  </Button>
                )}
                <Button
                  type="submit" variant="outline" size="sm"
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
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
