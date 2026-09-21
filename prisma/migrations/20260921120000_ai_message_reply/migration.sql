ALTER TABLE "ai_messages"
ADD COLUMN "reply_to_message_id" UUID;

CREATE UNIQUE INDEX "ai_messages_reply_to_message_id_key"
ON "ai_messages"("reply_to_message_id");

ALTER TABLE "ai_messages"
ADD CONSTRAINT "ai_messages_reply_to_message_id_fkey"
FOREIGN KEY ("reply_to_message_id") REFERENCES "ai_messages"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
