-- Habilitar permissõs essenciais para o protocolo TUS funcionar (UPDATE)

-- 1. Permitir que o protocolo de upload resumível (TUS) "cole" os pedaços (Update)
CREATE POLICY "Permitir Update em Arquivos do Cliente" 
ON storage.objects FOR UPDATE 
TO public 
USING (bucket_id = 'products');

-- Obs: O INSERT (upload do primeiro pedaço) e SELECT (leitura) já existem no seu banco.
-- Esse UPDATE é estritamente necessário para os pacotes do meio (5MB, 10MB...).
