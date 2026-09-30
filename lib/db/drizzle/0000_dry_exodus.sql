CREATE TYPE "public"."application_source" AS ENUM('Manual', 'Gmail');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('Saved', 'Applied', 'Under Review', 'Assessment', 'Interview', 'Technical Interview', 'Final Interview', 'Offer', 'Accepted', 'Rejected', 'Withdrawn');--> statement-breakpoint
CREATE TYPE "public"."application_opportunity_type" AS ENUM('Full-time', 'Part-time', 'Internship', 'Training', 'Train-to-Hire', 'Freelance');--> statement-breakpoint
CREATE TYPE "public"."application_work_mode" AS ENUM('On-site', 'Remote', 'Hybrid');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"position" varchar(255) NOT NULL,
	"opportunity_type" "application_opportunity_type" NOT NULL,
	"work_mode" "application_work_mode" NOT NULL,
	"application_date" date NOT NULL,
	"status" "application_status" NOT NULL,
	"job_url" varchar(2048) DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"source" "application_source" DEFAULT 'Manual' NOT NULL,
	"interview_date" date,
	"interview_time" varchar(5) DEFAULT '' NOT NULL,
	"interview_type" varchar(255) DEFAULT '' NOT NULL,
	"interview_location" varchar(2048) DEFAULT '' NOT NULL,
	"interview_notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_company_nonblank" CHECK (length(btrim("applications"."company_name")) > 0),
	CONSTRAINT "applications_position_nonblank" CHECK (length(btrim("applications"."position")) > 0),
	CONSTRAINT "applications_interview_time_valid" CHECK ("applications"."interview_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR "applications"."interview_time" = ''),
	CONSTRAINT "applications_interview_time_requires_date" CHECK ("applications"."interview_time" = '' OR "applications"."interview_date" IS NOT NULL)
);
