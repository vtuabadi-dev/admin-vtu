import type { OperationalRole } from "@/shared/types";

declare module "next-auth" {
  interface User {
    role?: OperationalRole;
  }
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: OperationalRole;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: OperationalRole;
  }
}
