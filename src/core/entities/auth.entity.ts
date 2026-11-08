export type UserRole =
  "ADMIN" | "MANAGER" | "CASHIER" | "WAITER" | "KITCHEN" | "BAR";

// login request
export interface LoginReq {
  username: string;
  password: string;
}

// login response

export interface LoginRes {
  dni: string;
  username: string;
  firstName: string | null;
  id: string;
  lastName: string | null;
  userRole: UserRole;
  status: "ACTIVE" | "INACTIVE";
}

// logout

export interface LogoutRes {
  message: string;
}
