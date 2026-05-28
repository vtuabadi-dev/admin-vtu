import type { OperationalRole } from "@/shared/types";

declare module "next-auth" {
  interface User {
    role?: OperationalRole;
    mustChangePassword?: boolean;
  }
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: OperationalRole;
      mustChangePassword?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: OperationalRole;
    mustChangePassword?: boolean;
  }
}
