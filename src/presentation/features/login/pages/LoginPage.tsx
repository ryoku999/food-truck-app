import { useLogin } from "@/infrastructure/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Ingresa tu usuario").max(50),
  password: z.string().min(8, "Ingresa al menos 8 caracteres").max(72),
});

const LoginPage = () => {
  const login = useLogin();
  const [visible, setVisible] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });
  const status = isAxiosError(login.error) ? login.error.response?.status : undefined;

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Inicia sesión</h1>
        <p className="mt-2">Accede al panel de tu turno.</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit((values) => {
        if (!login.isPending) login.mutate(values);
      })} noValidate>
        <div>
          <label className="label mb-1" htmlFor="username">Usuario</label>
          <input id="username" autoComplete="username" autoCapitalize="none" className="input w-full" aria-invalid={!!errors.username} aria-describedby={errors.username ? "username-error" : undefined} {...register("username")} />
          {errors.username && <p id="username-error" className="mt-1 text-sm text-error">{errors.username.message}</p>}
        </div>
        <div>
          <label className="label mb-1" htmlFor="password">Contraseña</label>
          <div className="flex gap-2">
            <input id="password" type={visible ? "text" : "password"} autoComplete="current-password" className="input min-w-0 flex-1" aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} {...register("password")} />
            <button type="button" className="btn btn-ghost" onClick={() => setVisible(!visible)}>{visible ? "Ocultar" : "Mostrar"}</button>
          </div>
          {errors.password && <p id="password-error" className="mt-1 text-sm text-error">{errors.password.message}</p>}
        </div>
        {login.isError && <p role="alert" className="alert alert-error">
          {status === 401 ? "Usuario o contraseña incorrectos, o cuenta inactiva." : status === 429 ? "Demasiados intentos. Espera un momento y vuelve a intentar." : "No se pudo iniciar sesión. Revisa la conexión e inténtalo otra vez."}
        </p>}
        <button type="submit" className="btn btn-primary min-h-11 w-full" disabled={login.isPending}>
          {login.isPending ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </>
  );
};

export default LoginPage;
