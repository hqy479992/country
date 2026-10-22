ALTER TABLE "User" ADD COLUMN "account" TEXT, ADD COLUMN "passwordHash" TEXT;
CREATE UNIQUE INDEX "User_account_key" ON "User"("account");
CREATE TABLE "UserSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");
ALTER TABLE "Order" ADD COLUMN "expiresAt" TIMESTAMP(3), ADD COLUMN "requestId" TEXT;
UPDATE "Order" SET "expiresAt" = "createdAt" + INTERVAL '15 minutes' WHERE "status" = 'PENDING_PAYMENT';
CREATE UNIQUE INDEX "Order_userId_requestId_key" ON "Order"("userId", "requestId");
