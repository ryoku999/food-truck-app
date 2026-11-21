import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "./config/query/tanstack-query";
import { RouterProvider } from "react-router-dom";
import { routes } from "./presentation/routes/routes";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={routes} />
      <Toaster
        richColors
        closeButton
        position="top-right"
        duration={4500}
        visibleToasts={4}
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;
