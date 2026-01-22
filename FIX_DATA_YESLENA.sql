-- =================================================================
-- PREENCHER DADOS DA YESLENA (Para sumir o "não inf.")
-- =================================================================

UPDATE public.profiles 
SET 
    cpf = '123.456.789-00', 
    phone = '(11) 99999-9999'
WHERE email = 'romeroyeslenaz09@gmail.com';

-- Confirmação
SELECT email, cpf, phone FROM public.profiles WHERE email = 'romeroyeslenaz09@gmail.com';
