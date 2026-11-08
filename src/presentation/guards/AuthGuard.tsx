import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";

const AuthGuard = ({ children }: PropsWithChildren) => {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default AuthGuard;
