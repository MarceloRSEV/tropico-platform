-- Segurança (TP-04): o papel NUNCA vem de raw_user_meta_data (controlado pelo
-- próprio usuário no signUp). Todo novo usuário nasce 'client'. Promover a
-- admin apenas via SQL / service_role.
-- NÃO aplicada automaticamente: revisar e rodar com `supabase db push`.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    'client'::public.user_role,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
