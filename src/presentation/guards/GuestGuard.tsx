import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import type { PropsWithChildren } from "react";
import { roleBasedRedirection } from "@/shared/utils/role-based-redirection";
import { Navigate } from "react-router-dom";

const GuestGuard = ({ children }: PropsWithChildren) => {
  const user = useAuthStore((state) => state.user);
  if (user) {
    return <Navigate to={roleBasedRedirection(user.userRole)} replace />;
  }

  return children;
};

export default GuestGuard;
