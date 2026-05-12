-- CreateIndex
CREATE INDEX "ActivityLog_targetId_createdAt_idx" ON "ActivityLog"("targetId", "createdAt" DESC);
