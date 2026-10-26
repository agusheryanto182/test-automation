INSERT INTO "settings" ("id", "webhook_url", "email_enabled", "webhook_enabled")
VALUES (1, NULL, true, false)
ON CONFLICT ("id") DO NOTHING;
