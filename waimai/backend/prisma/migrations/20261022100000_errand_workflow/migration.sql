ALTER TABLE "ErrandOrder"
  ALTER COLUMN "status" SET DEFAULT 'PENDING_QUOTE',
  ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING',
  ADD COLUMN "goodsBudget" INTEGER,
  ADD COLUMN "requestId" TEXT,
  ADD COLUMN "paymentMethod" TEXT,
  ADD COLUMN "riderId" TEXT,
  ADD COLUMN "quotedAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "pickedUpAt" TIMESTAMP(3),
  ADD COLUMN "deliveredAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "ErrandOrder_userId_requestId_key" ON "ErrandOrder"("userId", "requestId");
CREATE INDEX "ErrandOrder_riderId_idx" ON "ErrandOrder"("riderId");
ALTER TABLE "ErrandOrder" ADD CONSTRAINT "ErrandOrder_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "ErrandStatusLog" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "toStatus" "ErrandOrderStatus" NOT NULL,
  "actorType" "ActorType" NOT NULL,
  "actorId" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErrandStatusLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ErrandStatusLog_orderId_idx" ON "ErrandStatusLog"("orderId");
ALTER TABLE "ErrandStatusLog" ADD CONSTRAINT "ErrandStatusLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ErrandOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
