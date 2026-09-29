-- AlterTable
ALTER TABLE "Artifact" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "Artifact" ADD COLUMN "sha256" TEXT;
ALTER TABLE "Artifact" ADD COLUMN "sizeBytes" INTEGER;

-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN "details" TEXT;
ALTER TABLE "AuditEvent" ADD COLUMN "userAgent" TEXT;

-- AlterTable
ALTER TABLE "Signatory" ADD COLUMN "otpChannels" TEXT;
ALTER TABLE "Signatory" ADD COLUMN "reminderSentAt" DATETIME;
ALTER TABLE "Signatory" ADD COLUMN "userAgent" TEXT;

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "revokedReason" TEXT,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TraceComparison" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "submittedPath" TEXT NOT NULL,
    "submittedSha256" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "conclusion" TEXT NOT NULL,
    "commentaire" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TraceComparison_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TraceComparison_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditAnchor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "lastEventId" TEXT,
    "lastEventHash" TEXT NOT NULL,
    "eventCount" INTEGER NOT NULL,
    "chainIntact" BOOLEAN NOT NULL,
    "sentTo" TEXT NOT NULL,
    "tsaTokenPath" TEXT,
    "tsaGenTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditAnchor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "fichierPath" TEXT,
    "originalHashSha256" TEXT,
    "nombrePagesPdf" INTEGER,
    "sealedAt" DATETIME,
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
INSERT INTO "new_Document" ("archivedAt", "confidentialite", "createdAt", "createdByUserId", "currentHolderId", "custodyStatus", "dateIndiquee", "fichierPath", "finalPdfPath", "hashSha256", "id", "lieuReception", "nombrePages", "observationsJson", "organismeDeclare", "organizationId", "origine", "reference", "revocationMotif", "revokedAt", "revokedByUserId", "statut", "titre", "trackingCode", "type") SELECT "archivedAt", "confidentialite", "createdAt", "createdByUserId", "currentHolderId", "custodyStatus", "dateIndiquee", "fichierPath", "finalPdfPath", "hashSha256", "id", "lieuReception", "nombrePages", "observationsJson", "organismeDeclare", "organizationId", "origine", "reference", "revocationMotif", "revokedAt", "revokedByUserId", "statut", "titre", "trackingCode", "type" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE UNIQUE INDEX "Document_trackingCode_key" ON "Document"("trackingCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "AuditAnchor_organizationId_createdAt_idx" ON "AuditAnchor"("organizationId", "createdAt");
