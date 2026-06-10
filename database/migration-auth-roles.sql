-- ============================================================================
-- AUTHENTICATION & ROLES MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- 1. Add role column to user_profiles
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'customer';

-- 2. Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, display_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile (but not role)
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow the trigger to insert profiles
DROP POLICY IF EXISTS "Service can insert profiles" ON public.user_profiles;
CREATE POLICY "Service can insert profiles"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- TO PROMOTE A USER TO ADMIN, run:
-- UPDATE public.user_profiles SET role = 'admin' WHERE id = '<USER_UUID>';
--
-- You can find your user UUID in:
-- Supabase Dashboard → Authentication → Users → click on user → copy UID
-- ============================================================================
