-- CreateTable
CREATE TABLE "EventBudget" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventBudget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventBudget_eventId_idx" ON "EventBudget"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventBudget_eventId_category_key" ON "EventBudget"("eventId", "category");

-- AddForeignKey
ALTER TABLE "EventBudget" ADD CONSTRAINT "EventBudget_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
