import type { UserRole } from "@/core/entities/auth.entity";

export const roleBasedRedirection = (role: UserRole) => {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "MANAGER":
      return "/manager";
    case "WAITER":
      return "/waiter";
    case "KITCHEN":
      return "/kitchen";
    case "CASHIER":
      return "/cashier";
    case "BAR":
      return "/bar";
    default:
      return "/login";
  }
};
