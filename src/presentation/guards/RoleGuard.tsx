import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import type { UserRole } from "@/core/entities/auth.entity";
import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";

type props = PropsWithChildren<{ allowedRoles: UserRole[] }>;

const RoleGuard = ({ children, allowedRoles }: props) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.userRole)) {
    return <Navigate to="/403" replace />;
  }

  return children;
};

export default RoleGuard;
