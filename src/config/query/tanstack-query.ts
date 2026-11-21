import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiError } from "@/shared/utils/api-error";
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(apiError(error, "No se pudo completar la operación."));
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

export default queryClient;
