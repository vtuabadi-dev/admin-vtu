import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, StatusBadge } from "../Badge";

describe("Badge", () => {
  it("renders children correctly", () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText("Test Badge")).toBeInTheDocument();
  });

  it("applies default variant classes", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge.className).toContain("bg-primary");
  });

  it("applies success variant", () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText("Success");
    expect(badge.className).toContain("bg-success");
  });

  it("applies destructive variant", () => {
    render(<Badge variant="destructive">Error</Badge>);
    const badge = screen.getByText("Error");
    expect(badge.className).toContain("bg-destructive");
  });

  it("applies size variants", () => {
    render(<Badge size="sm">Small</Badge>);
    const badge = screen.getByText("Small");
    expect(badge.className).toContain("text-[10px]");
  });
});

describe("StatusBadge", () => {
  it("renders translated label for known status", () => {
    render(<StatusBadge status="lunas" />);
    expect(screen.getByText("Lunas")).toBeInTheDocument();
  });

  it("renders raw status for unknown status", () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText("unknown_status")).toBeInTheDocument();
  });

  it("applies success variant for 'lengkap'", () => {
    render(<StatusBadge status="lengkap" />);
    const badge = screen.getByText("Lengkap");
    expect(badge.className).toContain("bg-success");
  });

  it("applies destructive variant for 'overdue'", () => {
    render(<StatusBadge status="overdue" />);
    const badge = screen.getByText("Overdue");
    expect(badge.className).toContain("bg-destructive");
  });

  it("applies warning variant for 'pending'", () => {
    render(<StatusBadge status="pending" />);
    const badge = screen.getByText("Pending");
    expect(badge.className).toContain("bg-warning");
  });
});
