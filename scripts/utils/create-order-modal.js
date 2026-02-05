// Create New Order Modal and Functions

adminApp.openNewOrderModal = async function () {
    const { value: formData } = await Swal.fire({
        title: '➕ Criar Novo Pedido',
        html: `
            <div style="text-align: left;">
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #334155;">📋 Dados do Cliente</h4>
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Nome *</label>
                        <input id="client-name" class="swal2-input" placeholder="Nome do cliente" style="margin: 0; width: 100%;">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Email</label>
                            <input id="client-email" type="email" class="swal2-input" placeholder="email@exemplo.com" style="margin: 0; width: 100%;">
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Telefone</label>
                            <input id="client-phone" class="swal2-input" placeholder="(31) 99999-9999" style="margin: 0; width: 100%;">
                        </div>
                    </div>
                </div>

                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #334155;">📦 Produtos</h4>
                    <div id="products-list"></div>
                    <button type="button" onclick="adminApp.addProductRow()" class="swal2-confirm swal2-styled" 
                        style="margin-top: 10px; background: #3b82f6;">
                        <i class="ph-bold ph-plus"></i> Adicionar Produto
                    </button>
                </div>

                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Observações</label>
                        <textarea id="order-notes" class="swal2-textarea" placeholder="Observações internas..." style="margin: 0; width: 100%; min-height: 60px;"></textarea>
                    </div>
                    <div style="text-align: right; font-size: 1.2rem; font-weight: 700; color: #334155; padding-top: 10px; border-top: 2px solid #e2e8f0;">
                        Total: R$ <span id="order-total">0,00</span>
                    </div>
                </div>
            </div>
        `,
        width: '700px',
        showCancelButton: true,
        confirmButtonText: 'Criar Pedido',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
        didOpen: () => {
            // Add first product row
            adminApp.addProductRow();
        },
        preConfirm: () => {
            const clientName = document.getElementById('client-name').value.trim();
            const clientEmail = document.getElementById('client-email').value.trim();
            const clientPhone = document.getElementById('client-phone').value.trim();
            const notes = document.getElementById('order-notes').value.trim();

            if (!clientName) {
                Swal.showValidationMessage('Nome do cliente é obrigatório');
                return false;
            }

            // Collect products
            const products = [];
            document.querySelectorAll('.product-row').forEach(row => {
                const name = row.querySelector('.product-name').value.trim();
                const qty = parseInt(row.querySelector('.product-qty').value) || 0;
                const price = parseFloat(row.querySelector('.product-price').value) || 0;

                if (name && qty > 0 && price > 0) {
                    products.push({ name, quantity: qty, unit_price: price, total_price: qty * price });
                }
            });

            if (products.length === 0) {
                Swal.showValidationMessage('Adicione pelo menos um produto');
                return false;
            }

            const totalAmount = products.reduce((sum, p) => sum + p.total_price, 0);

            return {
                clientName,
                clientEmail,
                clientPhone,
                notes,
                products,
                totalAmount
            };
        }
    });

    if (formData) {
        await this.createNewOrder(formData);
    }
};

adminApp.addProductRow = function () {
    const container = document.getElementById('products-list');
    const rowIndex = container.children.length;

    const row = document.createElement('div');
    row.className = 'product-row';
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 8px; margin-bottom: 10px; align-items: center;';

    row.innerHTML = `
        <input type="text" class="swal2-input product-name" placeholder="Nome do produto" style="margin: 0;">
        <input type="number" class="swal2-input product-qty" placeholder="Qtd" min="1" value="1" oninput="adminApp.updateTotal()" style="margin: 0;">
        <input type="number" class="swal2-input product-price" placeholder="Preço" step="0.01" min="0" oninput="adminApp.updateTotal()" style="margin: 0;">
        <div style="font-weight: 600; color: #334155; padding: 0 10px;">R$ <span class="product-total">0,00</span></div>
        <button type="button" onclick="this.parentElement.remove(); adminApp.updateTotal()" 
            style="background: #ef4444; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
            <i class="ph-bold ph-trash"></i>
        </button>
    `;

    container.appendChild(row);
    adminApp.updateTotal();
};

adminApp.updateTotal = function () {
    let total = 0;
    document.querySelectorAll('.product-row').forEach(row => {
        const qty = parseInt(row.querySelector('.product-qty').value) || 0;
        const price = parseFloat(row.querySelector('.product-price').value) || 0;
        const productTotal = qty * price;

        row.querySelector('.product-total').textContent = productTotal.toFixed(2);
        total += productTotal;
    });

    document.getElementById('order-total').textContent = total.toFixed(2);
};

adminApp.createNewOrder = async function (formData) {
    try {
        // Show loading
        Swal.fire({
            title: 'Criando pedido...',
            html: 'Aguarde enquanto salvamos os dados',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Generate next order ID
        const year = new Date().getFullYear();
        const { data: existingOrders } = await window.supabase
            .from('protocols')
            .select('id')
            .like('id', `#MV-${year}-%`)
            .order('id', { ascending: false })
            .limit(1);

        let nextNumber = 1;
        if (existingOrders && existingOrders.length > 0) {
            const lastId = existingOrders[0].id;
            const match = lastId.match(/#MV-\d{4}-(\d{4})/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }

        const orderId = `#MV-${year}-${String(nextNumber).padStart(4, '0')}`;

        // Create protocol
        const { data: protocol, error: protocolError } = await window.supabase
            .from('protocols')
            .insert({
                id: orderId,
                client_name: formData.clientName,
                client_email: formData.clientEmail || null,
                client_phone: formData.clientPhone || null,
                total_amount: formData.totalAmount,
                paid_amount: 0,
                payment_status: 'pending',
                status: 'inquiry',
                column_id: 1,
                notes: formData.notes || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (protocolError) throw protocolError;

        // Create protocol items
        const items = formData.products.map(product => ({
            protocol_id: orderId,
            product_name: product.name,
            quantity: product.quantity,
            unit_price: product.unit_price,
            total_price: product.total_price
        }));

        const { error: itemsError } = await window.supabase
            .from('protocol_items')
            .insert(items);

        if (itemsError) throw itemsError;

        // Success!
        await Swal.fire({
            icon: 'success',
            title: 'Pedido Criado!',
            html: `
                <p>Pedido <strong>${orderId}</strong> foi criado com sucesso!</p>
                <p><strong>Cliente:</strong> ${formData.clientName}</p>
                <p><strong>Total:</strong> R$ ${formData.totalAmount.toFixed(2)}</p>
                <p><strong>Produtos:</strong> ${formData.products.length} item(ns)</p>
            `,
            confirmButtonColor: '#10b981'
        });

        // Reload orders table
        this.renderOrdersTable();

    } catch (error) {
        console.error('Error creating order:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao Criar Pedido',
            text: error.message || 'Não foi possível criar o pedido. Tente novamente.'
        });
    }
};
