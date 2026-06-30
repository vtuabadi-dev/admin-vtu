-- CreateEnum
CREATE TYPE "OcrProviderType" AS ENUM ('google_vision', 'external_api');

-- CreateEnum
CREATE TYPE "OcrHealthStatus" AS ENUM ('active', 'cooldown', 'disabled', 'error');

-- CreateTable ocr_providers
CREATE TABLE "ocr_providers" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "providerType" "OcrProviderType" NOT NULL DEFAULT 'google_vision',
    "apiKey" TEXT NOT NULL,
    "apiUrl" TEXT,
    "apiHeaderName" TEXT,
    "apiHeaderPrefix" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rotationOrder" INTEGER NOT NULL DEFAULT 0,
    "rotationCount" INTEGER NOT NULL DEFAULT 2,
    "requestCounter" INTEGER NOT NULL DEFAULT 0,
    "dailyUsage" INTEGER NOT NULL DEFAULT 0,
    "dailyLimit" INTEGER,
    "healthStatus" "OcrHealthStatus" NOT NULL DEFAULT 'active',
    "cooldownUntil" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMsg" TEXT,
    "consecutiveErrors" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "totalErrors" INTEGER NOT NULL DEFAULT 0,
    "averageLatencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_providers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ocr_providers_healthStatus_idx" ON "ocr_providers"("healthStatus");
CREATE INDEX "ocr_providers_isActive_rotationOrder_idx" ON "ocr_providers"("isActive", "rotationOrder");

-- CreateTable ocr_usage_logs
CREATE TABLE "ocr_usage_logs" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL DEFAULT 'ocr',
    "documentType" "DokumenJenis",
    "success" BOOLEAN NOT NULL,
    "confidence" DOUBLE PRECISION,
    "latencyMs" INTEGER NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "imageHash" TEXT,
    "imageSize" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocr_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ocr_usage_logs_providerId_createdAt_idx" ON "ocr_usage_logs"("providerId", "createdAt");
CREATE INDEX "ocr_usage_logs_imageHash_idx" ON "ocr_usage_logs"("imageHash");
CREATE INDEX "ocr_usage_logs_createdAt_idx" ON "ocr_usage_logs"("createdAt");
CREATE INDEX "ocr_usage_logs_success_idx" ON "ocr_usage_logs"("success");

-- CreateTable ocr_cache_entries
CREATE TABLE "ocr_cache_entries" (
    "id" TEXT NOT NULL,
    "imageHash" TEXT NOT NULL,
    "documentType" "DokumenJenis" NOT NULL,
    "result" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ocr_cache_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ocr_cache_entries_imageHash_key" ON "ocr_cache_entries"("imageHash");
CREATE INDEX "ocr_cache_entries_expiresAt_idx" ON "ocr_cache_entries"("expiresAt");

-- AddForeignKey
ALTER TABLE "ocr_usage_logs" ADD CONSTRAINT "ocr_usage_logs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ocr_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
