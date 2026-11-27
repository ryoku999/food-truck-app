import { Label } from "@/presentation/components/ui/label";
import { Input } from "@/presentation/components/ui/input";
import { Button } from "@/presentation/components/ui/button";
import { Alert } from "@/presentation/components/ui/alert";
import { Spinner } from "@/presentation/components/ui/spinner";
import { useLogin } from "@/infrastructure/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Ingresa tu usuario").max(50),
  password: z.string().min(8, "Ingresa al menos 8 caracteres").max(72),
});

const LoginPage = () => {
  const login = useLogin();
  const [visible, setVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });
  const status = isAxiosError(login.error)
    ? login.error.response?.status
    : undefined;

  return (
    <>
      <div>
        <h1 id="login-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Inicia sesión
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Accede al panel de tu turno.</p>
      </div>
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => {
          if (!login.isPending) login.mutate(values);
        })}
        noValidate
      >
        <div>
          <Label className="mb-1" htmlFor="username">
            Usuario
          </Label>
          <Input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            className="w-full"
            aria-invalid={!!errors.username}
            aria-describedby={errors.username ? "username-error" : undefined}
            {...register("username")}
          />
          {errors.username && (
            <p id="username-error" className="mt-1 text-sm text-destructive">
              {errors.username.message}
            </p>
          )}
        </div>
        <div>
          <Label className="mb-1" htmlFor="password">
            Contraseña
          </Label>
          <div className="flex gap-2">
            <Input
              id="password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              className="min-w-0 flex-1"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-controls="password"
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
          </div>
          {errors.password && (
            <p id="password-error" className="mt-1 text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        {login.isError && (
          <Alert role="alert" variant="destructive">
            {status === 401
              ? "Usuario o contraseña incorrectos, o cuenta inactiva."
              : status === 429
                ? "Demasiados intentos. Espera un momento y vuelve a intentar."
                : "No se pudo iniciar sesión. Revisa la conexión e inténtalo otra vez."}
          </Alert>
        )}
        <Button
          type="submit"
          className="mt-2 w-full"
          disabled={login.isPending}
        >
          {login.isPending ? "Ingresando…" : "Ingresar"}
          {login.isPending ? <Spinner aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        </Button>
      </form>
    </>
  );
};

export default LoginPage;
