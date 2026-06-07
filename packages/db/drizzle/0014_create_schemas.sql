-- Create PostgreSQL schemas for domain separation
-- DDD bounded contexts require separate schemas per domain
-- This enables proper isolation and follows AGENTS.md Rule 1: no cross-domain imports

CREATE SCHEMA IF NOT EXISTS calendar;--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS drive;--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS tasks;--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS auth;
