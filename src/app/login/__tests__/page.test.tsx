import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import LoginPage from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/shared/hooks/use-session", () => ({
  useSession: () => ({
    login: vi.fn(),
    loginError: null,
    clearError: vi.fn(),
    isAuthenticated: false,
    role: null,
  }),
}));

vi.mock("@/shared/gsap/GSAPProvider", () => ({
  GSAPLink: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

describe("LoginPage Demo Button Rendering Gate", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("(5) does NOT render instant demo login button in production environment", () => {
    (process.env as any).NODE_ENV = "production";
    render(<LoginPage />);

    expect(screen.queryByText(/Login Instan Super Admin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/atau akses admin/i)).not.toBeInTheDocument();
  });

  it("(5b) renders instant demo login button in development environment", () => {
    (process.env as any).NODE_ENV = "development";
    render(<LoginPage />);

    expect(screen.getByText(/Login Instan Super Admin/i)).toBeInTheDocument();
    expect(screen.getByText(/atau akses admin/i)).toBeInTheDocument();
  });
});
