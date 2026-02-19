-- Add 'teacher' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';

-- Grant permissions to Teachers

-- 1. Profiles (Teachers need to see student names)
CREATE POLICY "Teachers can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'teacher'));

-- 2. Essays (Teachers need to correct essays)
CREATE POLICY "Teachers can view all essays" 
ON public.essays FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update essays" 
ON public.essays FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'teacher'));

-- 3. Essay Themes (Teachers can create/edit themes)
CREATE POLICY "Teachers can manage essay themes" 
ON public.essay_themes FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'teacher'));
