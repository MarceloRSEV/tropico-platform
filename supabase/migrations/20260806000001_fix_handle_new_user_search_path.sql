-- Fix: handle_new_user rodava sem search_path ao ser disparado pelo GoTrue
-- (supabase_auth_admin), fazendo INSERT INTO profiles falhar com
-- "Database error creating new user". Schema-qualifica tudo e fixa o path.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'client'),
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
