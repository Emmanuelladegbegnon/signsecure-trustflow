-- AlterTable
ALTER TABLE "Signatory" ADD COLUMN "identityBackPath" TEXT;
ALTER TABLE "Signatory" ADD COLUMN "identityBackSha256" TEXT;
ALTER TABLE "Signatory" ADD COLUMN "identityDocType" TEXT;
ALTER TABLE "Signatory" ADD COLUMN "identityFrontPath" TEXT;
ALTER TABLE "Signatory" ADD COLUMN "identityFrontSha256" TEXT;
ALTER TABLE "Signatory" ADD COLUMN "identityNameMatches" BOOLEAN;
ALTER TABLE "Signatory" ADD COLUMN "identityRefusalReason" TEXT;
ALTER TABLE "Signatory" ADD COLUMN "identityReviewedAt" DATETIME;
ALTER TABLE "Signatory" ADD COLUMN "identityReviewerId" TEXT;
ALTER TABLE "Signatory" ADD COLUMN "identityReviewerLabel" TEXT;
ALTER TABLE "Signatory" ADD COLUMN "identityStatus" TEXT;
ALTER TABLE "Signatory" ADD COLUMN "identitySubmittedAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "origine" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "custodyStatus" TEXT,
    "trackingCode" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sensible" BOOLEAN NOT NULL DEFAULT false,
    "identityCheckRequired" BOOLEAN NOT NULL DEFAULT false,
    "fichierPath" TEXT,
    "originalHashSha256" TEXT,
    "nombrePagesPdf" INTEGER,
    "sealedAt" DATETIME,
    "sealCertFingerprint" TEXT,
    "tsaTokenPath" TEXT,
    "tsaGenTime" DATETIME,
    "tsaUrl" TEXT,
    "finalPdfPath" TEXT,
    "hashSha256" TEXT,
    "revocationMotif" TEXT,
    "revokedAt" DATETIME,
    "revokedByUserId" TEXT,
    "reference" TEXT,
    "organismeDeclare" TEXT,
    "dateIndiquee" TEXT,
    "nombrePages" INTEGER,
    "confidentialite" TEXT,
    "lieuReception" TEXT,
    "observationsJson" JSONB,
    "archivedAt" DATETIME,
    "currentHolderId" TEXT,
    CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_currentHolderId_fkey" FOREIGN KEY ("currentHolderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("archivedAt", "confidentialite", "createdAt", "createdByUserId", "currentHolderId", "custodyStatus", "dateIndiquee", "fichierPath", "finalPdfPath", "hashSha256", "id", "lieuReception", "nombrePages", "nombrePagesPdf", "observationsJson", "organismeDeclare", "organizationId", "originalHashSha256", "origine", "reference", "revocationMotif", "revokedAt", "revokedByUserId", "sealCertFingerprint", "sealedAt", "sensible", "statut", "titre", "trackingCode", "tsaGenTime", "tsaTokenPath", "tsaUrl", "type") SELECT "archivedAt", "confidentialite", "createdAt", "createdByUserId", "currentHolderId", "custodyStatus", "dateIndiquee", "fichierPath", "finalPdfPath", "hashSha256", "id", "lieuReception", "nombrePages", "nombrePagesPdf", "observationsJson", "organismeDeclare", "organizationId", "originalHashSha256", "origine", "reference", "revocationMotif", "revokedAt", "revokedByUserId", "sealCertFingerprint", "sealedAt", "sensible", "statut", "titre", "trackingCode", "tsaGenTime", "tsaTokenPath", "tsaUrl", "type" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE UNIQUE INDEX "Document_trackingCode_key" ON "Document"("trackingCode");
CREATE INDEX "Document_hashSha256_idx" ON "Document"("hashSha256");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
