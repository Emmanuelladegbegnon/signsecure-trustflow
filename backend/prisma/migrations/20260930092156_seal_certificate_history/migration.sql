-- CreateTable
CREATE TABLE "SealCertificate" (
    "fingerprint" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "activeFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiredAt" DATETIME
);
