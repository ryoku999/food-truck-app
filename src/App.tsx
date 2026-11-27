import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "./config/query/tanstack-query";
import { RouterProvider } from "react-router-dom";
import { routes } from "./presentation/routes/routes";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { ThemeProvider } from "./presentation/components/theme-provider";
import { useTheme } from "./presentation/components/theme-context";

function AppToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      richColors
      closeButton
      position="top-right"
      duration={4500}
      visibleToasts={4}
    />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={routes} />
        <AppToaster />
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
