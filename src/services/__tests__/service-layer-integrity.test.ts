import { describe, it, expect } from "vitest";
import * as manifestService from "../manifest.service";
import * as paymentService from "../payment.service";
import * as invoiceService from "../invoice.service";
import * as roomingService from "../rooming.service";
import * as notificationService from "../notification.service";
import * as reminderService from "../reminder.service";
import * as documentService from "../document.service";
import * as exportService from "../export.service";

const services = [
  { name: "manifest.service", mod: manifestService },
  { name: "payment.service", mod: paymentService },
  { name: "invoice.service", mod: invoiceService },
  { name: "rooming.service", mod: roomingService },
  { name: "notification.service", mod: notificationService },
  { name: "reminder.service", mod: reminderService },
  { name: "document.service", mod: documentService },
  { name: "export.service", mod: exportService },
];

describe("Service layer integrity", () => {
  it.each(services)("%s exports at least one function", ({ mod }) => {
    const exports = Object.keys(mod);
    expect(exports.length).toBeGreaterThan(0);
  });

  it.each(services)("%s all exports are functions", ({ mod }) => {
    for (const value of Object.values(mod)) {
      expect(typeof value).toBe("function");
    }
  });

  it("manifest.service exports expected functions", () => {
    expect(typeof manifestService.computeManifestStats).toBe("function");
    expect(typeof manifestService.enrichManifestWithPackage).toBe("function");
    expect(typeof manifestService.getManifestsByPackage).toBe("function");
  });

  it("payment.service exports expected functions", () => {
    expect(typeof paymentService.computePaymentStats).toBe("function");
    expect(typeof paymentService.enrichSummariesWithPackage).toBe("function");
    expect(typeof paymentService.filterSummariesByStatus).toBe("function");
    expect(typeof paymentService.getUnpaidSummaries).toBe("function");
  });

  it("export.service exports expected functions", () => {
    expect(typeof exportService.generateExportData).toBe("function");
    expect(typeof exportService.escapeCsvField).toBe("function");
  });

  it("service functions return plain objects (no JSX/React)", () => {
    const result = manifestService.computeManifestStats([]);
    expect(result).toBeTypeOf("object");
    expect(result).not.toHaveProperty("$$typeof");
  });
});
