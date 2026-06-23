-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('FOOD', 'DRINK', 'FRUIT_VEGETABLE', 'CONVENIENCE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" "ProductCategory" NOT NULL DEFAULT 'FOOD';

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");
