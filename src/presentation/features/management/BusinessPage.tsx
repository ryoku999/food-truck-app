import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { Textarea } from "@/presentation/components/ui/textarea";
import { Input } from "@/presentation/components/ui/input";
import { Alert } from "@/presentation/components/ui/alert";
import { useConfirm } from "@/presentation/components/use-confirm";
import {
  useBusiness,
  useBusinessActions,
  useSignedImage,
} from "@/infrastructure/hooks/use-management";
import type { Business } from "@/core/entities/management.entity";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre").max(150),
  tradeName: z.string().trim().max(150),
  documentNumber: z.string().trim().max(20),
  phone: z.string().trim().max(30),
  email: z
    .string()
    .trim()
    .max(150)
    .refine(
      (value) => !value || z.email().safeParse(value).success,
      "Correo inválido",
    ),
  address: z.string().trim().max(250),
  description: z.string().trim().max(500),
  currencyCode: z
    .string()
    .trim()
    .regex(/^[a-z]{3}$/i, "Usa un código de tres letras, por ejemplo PEN")
    .toUpperCase(),
});
type Fields = z.infer<typeof schema>;
const labels: Record<keyof Fields, string> = {
  name: "Nombre del negocio",
  tradeName: "Nombre comercial",
  documentNumber: "Documento fiscal",
  phone: "Teléfono",
  email: "Correo",
  address: "Dirección",
  description: "Descripción",
  currencyCode: "Moneda",
};

function LogoPreview({ logo }: { logo: NonNullable<Business["logo"]> }) {
  const signed = useSignedImage(logo.id);
  const [brokenUrl, setBrokenUrl] = useState<string>();
  const url = signed.data?.url ?? logo.url;
  return brokenUrl === url ? (
    <Button
      type="button"
      variant="outline"
      disabled={signed.isFetching}
      onClick={() =>
        void signed.refetch().then((result) => {
          if (result.isSuccess) setBrokenUrl(undefined);
        })
      }
    >
      Renovar vista del logo
    </Button>
  ) : (
    <img
      className="h-24 w-24 rounded-xl bg-muted object-contain"
      src={url}
      alt="Logo del negocio"
      onError={() => setBrokenUrl(url)}
    />
  );
}

function BusinessForm({ business }: { business: Business | null }) {
  const confirmAction = useConfirm();
  const { settings, upload, logo } = useBusinessActions();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: business?.name ?? "",
      tradeName: business?.tradeName ?? "",
      documentNumber: business?.documentNumber ?? "",
      phone: business?.phone ?? "",
      email: business?.email ?? "",
      address: business?.address ?? "",
      description: business?.description ?? "",
      currencyCode: business?.currencyCode ?? "PEN",
    },
  });
  const busy = upload.isPending || logo.isPending;
  async function saveLogo() {
    if (!file || busy) return;
    try {
      const stored = upload.data ?? (await upload.mutateAsync(file));
      await logo.mutateAsync(stored.id);
      upload.reset();
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch {
      /* The mutation state displays the error and preserves the uploaded ID. */
    }
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
      <Card
        as="form"
        onSubmit={handleSubmit((values) =>
          settings.mutate(values, { onSuccess: () => reset(values) }),
        )}
        noValidate
      >
        <CardContent>
          <h2 className="text-lg leading-snug font-semibold">Datos generales</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(labels) as (keyof Fields)[]).map((key) => (
              <label
                key={key}
                className={
                  key === "description"
                    ? "grid gap-1 sm:col-span-2"
                    : "grid gap-1"
                }
              >
                {labels[key]}
                {key === "description" ? (
                  <Textarea
                    className="w-full"
                    aria-invalid={!!errors[key]}
                    {...register(key)}
                  />
                ) : (
                  <Input
                    className="w-full"
                    type={key === "email" ? "email" : "text"}
                    aria-invalid={!!errors[key]}
                    {...register(key)}
                  />
                )}
                {errors[key] && (
                  <span className="text-sm text-destructive">
                    {errors[key]?.message}
                  </span>
                )}
              </label>
            ))}
          </div>
          {settings.isError && (
            <Alert role="alert" variant="destructive">
              {apiError(settings.error, "No se pudo guardar el negocio.")}
            </Alert>
          )}
          {settings.isSuccess && (
            <Alert role="status" variant="success">
              Datos guardados.
            </Alert>
          )}
          <Button
            type="submit" className="self-start"
            disabled={settings.isPending}
          >
            {settings.isPending ? "Guardando…" : "Guardar datos"}
          </Button>
        </CardContent>
      </Card>
      <Card as="section" className="self-start">
        <CardContent>
          <h2 className="text-lg leading-snug font-semibold">Logo</h2>
          {business?.logo ? (
            <LogoPreview key={business.logo.id} logo={business.logo} />
          ) : (
            <p>Sin logo asociado.</p>
          )}
          {business ? (
            <>
              <label className="grid gap-1">
                Imagen
                <Input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="w-full"
                  disabled={busy}
                  onChange={(event) => {
                    const selected = event.target.files?.[0] ?? null;
                    upload.reset();
                    logo.reset();
                    const invalid =
                      selected &&
                      !["image/jpeg", "image/png", "image/webp"].includes(
                        selected.type,
                      );
                    setFileError(
                      invalid ? "Selecciona un JPEG, PNG o WebP." : "",
                    );
                    setFile(invalid ? null : selected);
                  }}
                />
              </label>
              {fileError && (
                <p role="alert" className="text-destructive">
                  {fileError}
                </p>
              )}
              {(upload.isError || logo.isError) && (
                <Alert role="alert" variant="destructive">
                  {apiError(
                    upload.error ?? logo.error,
                    "No se pudo actualizar el logo.",
                  )}
                </Alert>
              )}
              {logo.isSuccess && <p role="status">Logo actualizado.</p>}
              <Button
                type="submit"
                disabled={!file || busy}
                onClick={() => void saveLogo()}
              >
                {busy
                  ? "Actualizando…"
                  : upload.data
                    ? "Reintentar asociación"
                    : "Subir y asociar"}
              </Button>
              {business.logo && (
                <Button
                  type="submit" variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    if (await confirmAction("¿Quitar el logo del negocio?"))
                      logo.mutate(null);
                  }}
                >
                  Quitar logo
                </Button>
              )}
            </>
          ) : (
            <p>Guarda los datos del negocio antes de subir una imagen.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BusinessPage() {
  const business = useBusiness();
  return (
    <div className="space-y-4">
      <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-4xl">Negocio</h1>
      {business.isPending ? (
        <p role="status">Cargando configuración…</p>
      ) : business.isError ? (
        <Alert variant="destructive" role="alert">
          {apiError(business.error, "No se pudo cargar el negocio.")}
          <Button type="submit" variant="outline" onClick={() => void business.refetch()}>
            Reintentar
          </Button>
        </Alert>
      ) : (
        <BusinessForm business={business.data} />
      )}
    </div>
  );
}
