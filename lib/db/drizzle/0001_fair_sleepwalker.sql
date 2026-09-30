CREATE TABLE "gmail_review_imports" (
	"message_key" varchar(64) PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gmail_review_imports" ADD CONSTRAINT "gmail_review_imports_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;