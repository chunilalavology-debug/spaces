-- AlterTable
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "additionalContact" TEXT;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "resetTokenHash" TEXT;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "resetTokenExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "Project_status_createdAt_idx" ON "Project"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Project_category_idx" ON "Project"("category");

-- AlterTable
CREATE INDEX IF NOT EXISTS "Blog_status_publishedAt_idx" ON "Blog"("status", "publishedAt");

-- AlterTable
CREATE INDEX IF NOT EXISTS "Enquiry_createdAt_idx" ON "Enquiry"("createdAt");
CREATE INDEX IF NOT EXISTS "Enquiry_formId_idx" ON "Enquiry"("formId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "SmtpSetting" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "host" TEXT,
    "port" INTEGER NOT NULL DEFAULT 587,
    "username" TEXT,
    "passwordEnc" TEXT,
    "encryption" TEXT NOT NULL DEFAULT 'tls',
    "fromEmail" TEXT,
    "fromName" TEXT,
    "replyTo" TEXT,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmtpSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MediaAsset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "storage" TEXT NOT NULL DEFAULT 'disk',
    "dataBase64" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");
