-- Migration: Create feature_requests and bug_reports tables
-- Run this in your Supabase SQL Editor

-- Feature Requests Table
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'planned', 'in_progress', 'completed', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bug Reports Table
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  device TEXT NOT NULL CHECK (device IN ('desktop', 'mobile')),
  page TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'in_progress', 'resolved', 'closed', 'wont_fix')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Policies for feature_requests
-- Anyone can insert (even logged out users for now, but we capture their info)
CREATE POLICY "Anyone can create feature requests" 
  ON public.feature_requests 
  FOR INSERT 
  TO authenticated, anon
  WITH CHECK (true);

-- Users can view their own requests
CREATE POLICY "Users can view their own feature requests" 
  ON public.feature_requests 
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for bug_reports
-- Anyone can insert
CREATE POLICY "Anyone can create bug reports" 
  ON public.bug_reports 
  FOR INSERT 
  TO authenticated, anon
  WITH CHECK (true);

-- Users can view their own reports
CREATE POLICY "Users can view their own bug reports" 
  ON public.bug_reports 
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX idx_feature_requests_user_id ON public.feature_requests(user_id);
CREATE INDEX idx_feature_requests_status ON public.feature_requests(status);
CREATE INDEX idx_feature_requests_created_at ON public.feature_requests(created_at DESC);

CREATE INDEX idx_bug_reports_user_id ON public.bug_reports(user_id);
CREATE INDEX idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX idx_bug_reports_page ON public.bug_reports(page);
CREATE INDEX idx_bug_reports_created_at ON public.bug_reports(created_at DESC);

-- Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to both tables
DROP TRIGGER IF EXISTS update_feature_requests_updated_at ON public.feature_requests;
CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bug_reports_updated_at ON public.bug_reports;
CREATE TRIGGER update_bug_reports_updated_at
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
