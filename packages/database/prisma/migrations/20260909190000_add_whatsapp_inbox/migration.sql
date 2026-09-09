CREATE TABLE "whatsapp_sessions" (
    "id" TEXT NOT NULL,
    "draft" JSONB,
    "draft_code" TEXT,
    "draft_expires_at" TIMESTAMP(3),
    "draft_user_id" TEXT,
    "draft_company_id" TEXT,
    "lock_token" TEXT,
    "locked_until" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reply" TEXT,
    "send_attempts" INTEGER NOT NULL DEFAULT 0,
    "next_send_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "whatsapp_messages_session_id_status_received_at_idx"
ON "whatsapp_messages"("session_id", "status", "received_at");
