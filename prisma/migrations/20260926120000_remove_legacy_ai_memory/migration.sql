-- Chat history and same-conversation summaries replace the removed confirmation-based memory feature.
DROP TABLE "ai_memory_suggestions";
DROP TABLE "ai_memory_items";
DROP TYPE "AIMemorySuggestionStatus";
ALTER TABLE "users" DROP COLUMN "memory_enabled";
