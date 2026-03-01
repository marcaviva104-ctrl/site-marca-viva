-- Teste de Diagnóstico: Verificar dados em protocols

-- 1. Ver quantos protocolos existem
SELECT COUNT(*) as total_protocols FROM protocols;

-- 2. Ver protocolos recentes (últimos 5)
SELECT 
    id,
    official_id,
    client_name,
    client_id,
    total_amount,
    status,
    created_at
FROM protocols
ORDER BY created_at DESC
LIMIT 5;

-- 3. Ver protocolos do mês atual
SELECT 
    COUNT(*) as protocolos_mes_atual,
    SUM(total_amount) as total_valor
FROM protocols
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE);

-- 4. Ver todas as colunas de UM protocolo
SELECT * FROM protocols LIMIT 1;
