-- AlterTable
ALTER TABLE "Document" ADD COLUMN "sealCertFingerprint" TEXT;

-- CreateIndex
CREATE INDEX "Document_hashSha256_idx" ON "Document"("hashSha256");
