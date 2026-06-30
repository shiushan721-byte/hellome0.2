-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'awaiting_input';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "schemaPayload" JSONB,
ADD COLUMN     "schemaReadyAt" TIMESTAMP(3),
ADD COLUMN     "structuredAnswers" JSONB;
