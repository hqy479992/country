-- CreateEnum
CREATE TYPE "ErrandDeliveryMode" AS ENUM ('SEND', 'PICK', 'EXPRESS');

-- AlterTable
ALTER TABLE "ErrandOrder" ADD COLUMN     "deliveryMode" "ErrandDeliveryMode" NOT NULL DEFAULT 'SEND';
