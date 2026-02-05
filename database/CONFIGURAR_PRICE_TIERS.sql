-- ========================================
-- PRICE TIERS PADRONIZADOS
-- Faixas: 1, 10, 25, 50, 100, 300
-- ========================================

-- PRODUTO 1: ADESIVO
INSERT INTO products (id, name, category, price, description, image, status, stock)
VALUES ('PROD-ADESIVO-001', 'Adesivo Vinil Personalizado 10x10cm', 'Adesivos', 5.00,
        'Adesivo vinil recorte personalizado, impressão policromia. 10x10cm.',
        'https://via.placeholder.com/600?text=Adesivo', 'active', 5000)
ON CONFLICT (id) DO UPDATE SET price = 5.00, stock = 5000;

DELETE FROM product_tiers WHERE product_id = 'PROD-ADESIVO-001';
INSERT INTO product_tiers (product_id, min_quantity, unit_price) VALUES
    ('PROD-ADESIVO-001', 1, 5.00), ('PROD-ADESIVO-001', 10, 4.00), ('PROD-ADESIVO-001', 25, 3.20),
    ('PROD-ADESIVO-001', 50, 2.60), ('PROD-ADESIVO-001', 100, 2.20), ('PROD-ADESIVO-001', 300, 1.80);

-- PRODUTO 2: CANETA PLÁSTICA
INSERT INTO products (id, name, category, price, description, image, status, stock)
VALUES ('PROD-CANETA-002', 'Caneta Esferográfica Plástica', 'Canetas', 3.50,
        'Caneta esferográfica plástica, tinta azul, corpo transparente. Serigrafia.',
        'https://via.placeholder.com/600?text=Caneta', 'active', 3000)
ON CONFLICT (id) DO UPDATE SET price = 3.50, stock = 3000;

DELETE FROM product_tiers WHERE product_id = 'PROD-CANETA-002';
INSERT INTO product_tiers (product_id, min_quantity, unit_price) VALUES
    ('PROD-CANETA-002', 1, 3.50), ('PROD-CANETA-002', 10, 2.80), ('PROD-CANETA-002', 25, 2.30),
    ('PROD-CANETA-002', 50, 1.90), ('PROD-CANETA-002', 100, 1.60), ('PROD-CANETA-002', 300, 1.30);

-- PRODUTO 3: CANETA METAL
INSERT INTO products (id, name, category, price, description, image, status, stock)
VALUES ('PROD-CANETA-003', 'Caneta Metal Executive', 'Canetas', 22.00,
        'Caneta corpo alumínio, grip emborrachado, estojo. Gravação laser.',
        'https://via.placeholder.com/600?text=Caneta+Metal', 'active', 500)
ON CONFLICT (id) DO UPDATE SET price = 22.00, stock = 500;

DELETE FROM product_tiers WHERE product_id = 'PROD-CANETA-003';
INSERT INTO product_tiers (product_id, min_quantity, unit_price) VALUES
    ('PROD-CANETA-003', 1, 22.00), ('PROD-CANETA-003', 10, 18.00), ('PROD-CANETA-003', 25, 15.00),
    ('PROD-CANETA-003', 50, 13.00), ('PROD-CANETA-003', 100, 11.00), ('PROD-CANETA-003', 300, 9.50);

-- PRODUTO 4: CHAVEIRO
INSERT INTO products (id, name, category, price, description, image, status, stock)
VALUES ('PROD-CHAVEIRO-004', 'Chaveiro Metal Personalizado', 'Chaveiros', 8.00,
        'Chaveiro metal cromado, argola reforçada. Gravação laser.',
        'https://via.placeholder.com/600?text=Chaveiro', 'active', 2000)
ON CONFLICT (id) DO UPDATE SET price = 8.00, stock = 2000;

DELETE FROM product_tiers WHERE product_id = 'PROD-CHAVEIRO-004';
INSERT INTO product_tiers (product_id, min_quantity, unit_price) VALUES
    ('PROD-CHAVEIRO-004', 1, 8.00), ('PROD-CHAVEIRO-004', 10, 6.50), ('PROD-CHAVEIRO-004', 25, 5.50),
    ('PROD-CHAVEIRO-004', 50, 4.70), ('PROD-CHAVEIRO-004', 100, 4.00), ('PROD-CHAVEIRO-004', 300, 3.50);

-- PRODUTO 5: CADERNO
INSERT INTO products (id, name, category, price, description, image, status, stock)
VALUES ('PROD-CADERNO-005', 'Caderno Capa Dura A5', 'Cadernos', 20.00,
        'Caderno executivo capa dura A5, 100 folhas, elástico. Personalização capa.',
        'https://via.placeholder.com/600?text=Caderno', 'active', 600)
ON CONFLICT (id) DO UPDATE SET price = 20.00, stock = 600;

DELETE FROM product_tiers WHERE product_id = 'PROD-CADERNO-005';
INSERT INTO product_tiers (product_id, min_quantity, unit_price) VALUES
    ('PROD-CADERNO-005', 1, 20.00), ('PROD-CADERNO-005', 10, 17.00), ('PROD-CADERNO-005', 25, 15.00),
    ('PROD-CADERNO-005', 50, 13.00), ('PROD-CADERNO-005', 100, 11.50), ('PROD-CADERNO-005', 300, 10.00);

-- PRODUTO 6: COPO TÉRMICO
INSERT INTO products (id, name, category, price, description, image, status, stock)
VALUES ('PROD-COPO-006', 'Copo Térmico Inox 450ml', 'Copos e Garrafas', 40.00,
        'Copo térmico inox 450ml, tampa rosqueável. Mantém temperatura 6h.',
        'https://via.placeholder.com/600?text=Copo', 'active', 400)
ON CONFLICT (id) DO UPDATE SET price = 40.00, stock = 400;

DELETE FROM product_tiers WHERE product_id = 'PROD-COPO-006';
INSERT INTO product_tiers (product_id, min_quantity, unit_price) VALUES
    ('PROD-COPO-006', 1, 40.00), ('PROD-COPO-006', 10, 35.00), ('PROD-COPO-006', 25, 31.00),
    ('PROD-COPO-006', 50, 27.00), ('PROD-COPO-006', 100, 24.00), ('PROD-COPO-006', 300, 21.00);

-- PRODUTO 7: ECOBAG
INSERT INTO products (id, name, category, price, description, image, status, stock)
VALUES ('PROD-ECOBAG-007', 'Ecobag Sacola Algodão', 'Bolsas', 10.00,
        'Ecobag algodão cru 40x35cm, alças reforçadas. Serigrafia 1 cor.',
        'https://via.placeholder.com/600?text=Ecobag', 'active', 1500)
ON CONFLICT (id) DO UPDATE SET price = 10.00, stock = 1500;

DELETE FROM product_tiers WHERE product_id = 'PROD-ECOBAG-007';
INSERT INTO product_tiers (product_id, min_quantity, unit_price) VALUES
    ('PROD-ECOBAG-007', 1, 10.00), ('PROD-ECOBAG-007', 10, 8.50), ('PROD-ECOBAG-007', 25, 7.50),
    ('PROD-ECOBAG-007', 50, 6.50), ('PROD-ECOBAG-007', 100, 5.80), ('PROD-ECOBAG-007', 300, 5.00);

-- PRODUTO 8: KIT EXECUTIVO
INSERT INTO products (id, name, category, price, description, image, status, stock)
VALUES ('PROD-KIT-008', 'Kit Executivo Premium', 'Kits', 50.00,
        'Kit estojo: caneta metal + caderno A5. Gravação laser. Brinde VIP.',
        'https://via.placeholder.com/600?text=Kit', 'active', 200)
ON CONFLICT (id) DO UPDATE SET price = 50.00, stock = 200;

DELETE FROM product_tiers WHERE product_id = 'PROD-KIT-008';
INSERT INTO product_tiers (product_id, min_quantity, unit_price) VALUES
    ('PROD-KIT-008', 1, 50.00), ('PROD-KIT-008', 10, 43.00), ('PROD-KIT-008', 25, 38.00),
    ('PROD-KIT-008', 50, 33.00), ('PROD-KIT-008', 100, 29.00), ('PROD-KIT-008', 300, 26.00);

-- VERIFICAÇÃO
SELECT '✅ 8 produtos e 48 tiers configurados!' as status;
SELECT name, price, stock FROM products WHERE id LIKE 'PROD-%' ORDER BY id;
SELECT product_id, COUNT(*) as tiers FROM product_tiers GROUP BY product_id ORDER BY product_id;
