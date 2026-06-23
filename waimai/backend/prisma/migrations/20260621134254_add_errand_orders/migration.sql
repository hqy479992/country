-- CreateEnum
CREATE TYPE "ErrandServiceType" AS ENUM ('DELIVERY', 'BUY', 'HELP');

-- CreateEnum
CREATE TYPE "ErrandVehicleType" AS ENUM ('BIKE', 'CAR');

-- CreateEnum
CREATE TYPE "ErrandOrderStatus" AS ENUM ('PENDING_ASSIGN', 'RIDER_ACCEPTED', 'PICKED_UP', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ErrandOrder" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceType" "ErrandServiceType" NOT NULL,
    "vehicleType" "ErrandVehicleType" NOT NULL DEFAULT 'BIKE',
    "pickupAddressSnapshot" JSONB NOT NULL,
    "deliveryAddressSnapshot" JSONB NOT NULL,
    "itemNote" TEXT,
    "remark" TEXT,
    "distanceText" TEXT,
    "baseFee" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "status" "ErrandOrderStatus" NOT NULL DEFAULT 'PENDING_ASSIGN',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "paidAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErrandOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ErrandOrder_orderNo_key" ON "ErrandOrder"("orderNo");

-- CreateIndex
CREATE INDEX "ErrandOrder_userId_idx" ON "ErrandOrder"("userId");

-- CreateIndex
CREATE INDEX "ErrandOrder_status_idx" ON "ErrandOrder"("status");

-- AddForeignKey
ALTER TABLE "ErrandOrder" ADD CONSTRAINT "ErrandOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
