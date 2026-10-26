CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_email" text NOT NULL,
	"item" text NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"webhook_url" text,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"webhook_enabled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_event_id_channel_key" ON "notification_deliveries" USING btree ("event_id","channel");--> statement-breakpoint
CREATE INDEX "notification_deliveries_order_id_idx" ON "notification_deliveries" USING btree ("order_id");