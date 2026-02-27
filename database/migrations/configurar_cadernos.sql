-- ========================================
-- CADASTRO DE "CADERNOS" COM OPÇÕES NATIVAS
-- ========================================

-- Exemplo de inserção de um Caderno Corporativo usando configuration_rules
-- A estrutura de options será populada via JSONB no campo configuration_rules.

INSERT INTO products (
    id, 
    name, 
    category, 
    price, 
    cost, 
    min_qty, 
    stock, 
    status, 
    image, 
    description, 
    pricing_type, 
    configuration_rules
) VALUES (
    'caderno-corp-001', 
    'Caderno Corporativo Personalizado', 
    'Papelaria', 
    15.90, 
    8.00, 
    50, 
    1000, 
    'active', 
    'https://images.unsplash.com/photo-1531346878377-a5be20888e57?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 
    'Caderno de alta qualidade com capa dura personalizável. Ideal para brindes corporativos e eventos.', 
    'standard', 
    '[
        {
            "name": "Tipo de Capa",
            "type": "select",
            "options": [
                {"label": "Capa Dura Fosca", "price_mod": 0},
                {"label": "Capa Dura com Brilho", "price_mod": 2.50},
                {"label": "Capa Premium (Couro Sintético)", "price_mod": 10.00}
            ]
        },
        {
            "name": "Miolo",
            "type": "select",
            "options": [
                {"label": "Folhas Pautadas (96 fls)", "price_mod": 0},
                {"label": "Folhas Pontilhadas (96 fls)", "price_mod": 1.00},
                {"label": "Folhas Lisas (96 fls)", "price_mod": 0}
            ]
        },
        {
            "name": "Acabamento Extra",
            "type": "radio",
            "options": [
                {"label": "Sem Elástico", "price_mod": 0},
                {"label": "Com Elástico e Fita Cetim", "price_mod": 3.00}
            ]
        }
    ]'::jsonb
)
ON CONFLICT (id) DO UPDATE 
SET 
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    configuration_rules = EXCLUDED.configuration_rules;

-- Inserindo um segundo modelo de Caderno (Ecológico)
INSERT INTO products (
    id, 
    name, 
    category, 
    price, 
    cost, 
    min_qty, 
    stock, 
    status, 
    image, 
    description, 
    pricing_type, 
    configuration_rules
) VALUES (
    'caderno-eco-001', 
    'Caderno Ecológico Kraft', 
    'Ecológicos', 
    12.50, 
    6.00, 
    50, 
    1000, 
    'active', 
    'https://images.unsplash.com/photo-1544816155-12df9643f363?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 
    'Caderno com capa em papel kraft sustentável. Opção ecológica para sua marca.', 
    'standard', 
    '[
        {
            "name": "Personalização Especiais",
            "type": "select",
            "options": [
                {"label": "Gravação a Laser", "price_mod": 0},
                {"label": "Silk Screen (1 Cor)", "price_mod": 1.50}
            ]
        },
        {
            "name": "Miolo",
            "type": "select",
            "options": [
                {"label": "Papel Reciclado (80 fls)", "price_mod": 0}
            ]
        }
    ]'::jsonb
)
ON CONFLICT (id) DO UPDATE 
SET 
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    configuration_rules = EXCLUDED.configuration_rules;
