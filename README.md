# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```


## Docker y Dokploy

El cliente se construye con Bun 1.4.2 y se sirve con Nginx en el puerto 7000.
La etapa de construcción instala con `bun install --frozen-lockfile` y compila
con `bun run --bun build`. La imagen final contiene Nginx y los archivos
HTML, CSS, JavaScript y assets de `dist`.

Versiona `bun.lock` junto con `package.json`. Cuando cambies dependencias,
actualízalo con Bun antes de desplegar. Docker reutiliza la capa de instalación
y la caché de descargas cuando corresponde.
El archivo de despliegue es `compose.yml` y el servicio es `food-truck-app`.

En Dokploy crea un servicio Docker Compose desde este repositorio y selecciona
`compose.yml`. En sus variables de entorno define la URL pública de la API,
incluyendo el prefijo que usa NestJS.

```dotenv
VITE_API_URL=https://api.tudominio.com/api
```

En Domains asigna el dominio del cliente, por ejemplo `app.tudominio.com`, al servicio
`food-truck-app`, con puerto de contenedor `7000`, ruta `/` y HTTPS.
Dokploy configura el enrutamiento del dominio. El Compose también publica
`7000:7000` para acceso por el puerto solicitado.

`VITE_API_URL` se incorpora al JavaScript durante la construcción. Después de
cambiarla, vuelve a construir y desplegar. Los archivos `.env` quedan fuera de la
imagen. Las variables `VITE_*` son públicas y deben contener configuración del cliente.

Axios usa la URL completa, por ejemplo `https://api.tudominio.com/api`.
Socket.IO deriva el origen `https://api.tudominio.com`, se conecta al namespace
`/operations` y usa el transporte `/socket.io/`. Basta con `VITE_API_URL`.
Puedes retirar `VITE_API_BASE_URL`, `VITE_WS_BASE_URL` y `VITE_OPERATIONS_URL`
de la configuración antigua de despliegue.

La API debe permitir el origen HTTPS del cliente en `CORS_ORIGINS`, aceptar
credenciales y usar `AUTH_COOKIE_SECURE=true` en producción. Para conservar
la configuración actual de cookies, publica cliente y API como subdominios
HTTPS del mismo dominio. El dominio de la API debe enrutar también
`/socket.io/` y admitir WebSocket. Las imágenes se descargan desde las URLs
firmadas de RustFS, cuyo endpoint público también debe ser accesible por HTTPS.

Para ejecutar el contenedor desde la carpeta del cliente, define `VITE_API_URL`
en un archivo `.env` o en el entorno y ejecuta lo siguiente.

```sh
docker compose -f compose.yml up -d --build
```

El cliente queda en `http://localhost:7000`. Nginx resuelve las rutas de React Router y conserva
en caché los archivos versionados de `/assets/`. El documento HTML se revalida
para recibir los cambios de cada despliegue. La política de contenido admite
las conexiones HTTP(S)/WS(S), imágenes firmadas y el worker local de compresión.
