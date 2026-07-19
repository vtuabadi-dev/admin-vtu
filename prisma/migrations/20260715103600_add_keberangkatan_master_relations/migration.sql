-- AlterTable
ALTER TABLE "keberangkatan" ADD COLUMN "maskapaiId" TEXT;
ALTER TABLE "keberangkatan" ADD COLUMN "hotelMekkahId" TEXT;
ALTER TABLE "keberangkatan" ADD COLUMN "hotelMadinahId" TEXT;
ALTER TABLE "keberangkatan" ADD COLUMN "startingPointId" TEXT;
ALTER TABLE "keberangkatan" ADD COLUMN "packageTypeId" TEXT;

-- CreateIndex
CREATE INDEX "keberangkatan_maskapaiId_idx" ON "keberangkatan"("maskapaiId");
CREATE INDEX "keberangkatan_hotelMekkahId_idx" ON "keberangkatan"("hotelMekkahId");
CREATE INDEX "keberangkatan_hotelMadinahId_idx" ON "keberangkatan"("hotelMadinahId");
CREATE INDEX "keberangkatan_startingPointId_idx" ON "keberangkatan"("startingPointId");
CREATE INDEX "keberangkatan_packageTypeId_idx" ON "keberangkatan"("packageTypeId");
