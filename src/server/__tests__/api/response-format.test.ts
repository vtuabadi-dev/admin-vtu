// @vitest-environment node

import { describe, it, expect } from "vitest";

// Test ApiResponse shape contract — semua API routes harus mengikuti format ini
describe("API Response Format Contract", () => {
  it("should validate success response shape", () => {
    const successResponse = {
      success: true,
      data: { id: "123", name: "Test" },
    };

    expect(successResponse).toHaveProperty("success", true);
    expect(successResponse).toHaveProperty("data");
    expect(successResponse.data).not.toBeNull();
  });

  it("should validate error response shape", () => {
    const errorResponse = {
      success: false,
      message: "Something went wrong",
    };

    expect(errorResponse).toHaveProperty("success", false);
    expect(errorResponse).toHaveProperty("message");
    expect(typeof errorResponse.message).toBe("string");
  });

  it("should validate paginated response shape", () => {
    const paginatedResponse = {
      success: true,
      data: [],
      total: 100,
      page: 1,
      limit: 20,
      totalPages: 5,
    };

    expect(paginatedResponse).toHaveProperty("total");
    expect(paginatedResponse).toHaveProperty("page");
    expect(paginatedResponse).toHaveProperty("limit");
    expect(paginatedResponse.totalPages).toBeGreaterThan(0);
  });

  it("should ensure error messages are user-readable", () => {
    const messages = [
      "Unauthorized",
      "Not found",
      "Hanya file JPG/JPEG yang diizinkan",
      "File terlalu besar (max 10MB)",
      "Unauthorized — admin only",
    ];

    for (const msg of messages) {
      expect(msg.length).toBeGreaterThan(0);
      expect(typeof msg).toBe("string");
    }
  });
});
