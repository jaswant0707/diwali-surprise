-- ====================================================================
-- DIWALI SURPRISE — SUPABASE DATABASE SCHEMA & RLS POLICIES
-- Platform: Supabase PostgreSQL
-- Author: Jaswant Yadav (@jaswant_0707)
-- ====================================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 1. TABLE: greetings
-- Stores personalized greetings created by senders
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.greetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_name VARCHAR(100) NOT NULL,
    personal_message VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ DEFAULT (timezone('utc'::text, now()) + interval '90 days'),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Constraints
    CONSTRAINT chk_recipient_name_length CHECK (char_length(trim(recipient_name)) >= 1 AND char_length(recipient_name) <= 100),
    CONSTRAINT chk_personal_message_length CHECK (personal_message IS NULL OR char_length(personal_message) <= 500)
);

-- Index for fast lookup by active ID
CREATE INDEX IF NOT EXISTS idx_greetings_id_active 
ON public.greetings(id) 
WHERE is_active = TRUE;

-- --------------------------------------------------------------------
-- 2. TABLE: feedback
-- Stores user feedback and ratings (1 to 5 stars)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(25),
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    CONSTRAINT chk_full_name_length CHECK (char_length(trim(full_name)) >= 1 AND char_length(full_name) <= 100),
    CONSTRAINT chk_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_message_length CHECK (char_length(trim(message)) >= 3 AND char_length(message) <= 2000)
);

-- Index for ordering feedback
CREATE INDEX IF NOT EXISTS idx_feedback_created_at 
ON public.feedback(created_at DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on both tables
ALTER TABLE public.greetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- POLICIES FOR: greetings
-- --------------------------------------------------------------------

-- Policy: Allow anyone (anon + authenticated) to create a new greeting
DROP POLICY IF EXISTS "Public can create greetings" ON public.greetings;
CREATE POLICY "Public can create greetings" 
ON public.greetings
FOR INSERT 
TO public
WITH CHECK (
    char_length(trim(recipient_name)) >= 1 
    AND char_length(recipient_name) <= 100
    AND (personal_message IS NULL OR char_length(personal_message) <= 500)
    AND is_active = TRUE
);

-- Policy: Allow anyone to view an active, unexpired greeting by ID
DROP POLICY IF EXISTS "Public can view active unexpired greetings" ON public.greetings;
CREATE POLICY "Public can view active unexpired greetings" 
ON public.greetings
FOR SELECT 
TO public
USING (
    is_active = TRUE 
    AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now()))
);

-- Public CANNOT update or delete greetings
DROP POLICY IF EXISTS "Public cannot update greetings" ON public.greetings;
DROP POLICY IF EXISTS "Public cannot delete greetings" ON public.greetings;

-- --------------------------------------------------------------------
-- POLICIES FOR: feedback
-- --------------------------------------------------------------------

-- Policy: Allow anyone to submit feedback
DROP POLICY IF EXISTS "Public can submit feedback" ON public.feedback;
CREATE POLICY "Public can submit feedback" 
ON public.feedback
FOR INSERT 
TO public
WITH CHECK (
    char_length(trim(full_name)) >= 1
    AND char_length(trim(message)) >= 3
    AND rating >= 1 AND rating <= 5
);

-- Policy: Public CANNOT read feedback (protects user emails and phone numbers)
-- Only service_role / dashboard admin can read feedback
DROP POLICY IF EXISTS "Public cannot select feedback" ON public.feedback;
-- No SELECT policy for public = access denied by default in RLS

-- Public CANNOT update or delete feedback
DROP POLICY IF EXISTS "Public cannot update feedback" ON public.feedback;
DROP POLICY IF EXISTS "Public cannot delete feedback" ON public.feedback;
