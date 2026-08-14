/**
 * Marca Viva - Data Manager (Supabase)
 * Handles Products and Orders
 */

class DataManager {
    constructor() {
        this.products = [];
        this.inputs = [];
        this.history = [];
    }

    async init() {
        let attempts = 0;
        // Optimization: Wait less time, 50 chars * 100ms = 5s max
        while (!window.supabase && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        if (!window.supabase) {
            console.error("DataManager: Supabase client not available.");
            // Don't return, allow falling back to local storage
        }

        try {
            // Promise.allSettled is better here so one failure doesn't kill others
            await Promise.allSettled([
                this.fetchProducts(),
                this.fetchInputs(),
                this.fetchHistory()
            ]);
            console.log("DataManager Init Completed");
        } catch (error) {
            console.error("DataManager Init Critical Failure:", error);
        }
    }

    // --- Product Methods ---
    async fetchProducts() {
        let products = [];

        if (window.supabase) {
            const { data, error } = await window.supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.warn("Error fetching products (using local only):", error);
            } else {
                products = data ? data.map(p => ({
                    ...p,
                    price: (function(val) {
                        if (typeof val === 'number') return val;
                        if (!val) return 0;
                        const cleanStr = String(val).replace(/[R$\s.]/g, '').replace(',', '.');
                        return parseFloat(cleanStr) || 0;
                    })(p.price),
                    cost: Number(p.cost),
                    min: p.min_qty,
                    images: p.image ? [p.image] : [],
                    recipe: p.recipe || [],
                    weight: Number(p.weight) || 0.5,
                    height: Number(p.height) || 10,
                    width: Number(p.width) || 20,
                    length: Number(p.length) || 30
                })) : [];
            }
        }



        localStorage.setItem('mv_products', JSON.stringify(products));

        this.products = products;
        return this.products;
    }

    getProducts() {
        return this.products;
    }

    async getProductById(id) {
        let product = this.products.find(p => p.id === id);
        if (product) return product;

        const { data, error } = await window.supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (data) {
            return {
                ...data,
                price: Number(data.price),
                min: data.min_qty,
                images: data.image ? [data.image] : [],
                recipe: data.recipe || [],
                weight: Number(data.weight) || 0.5,
                height: Number(data.height) || 10,
                width: Number(data.width) || 20,
                length: Number(data.length) || 30
            };
        }
        return null;
    }

    async saveProduct(product) {
        const dbProduct = {
            id: product.id,
            name: product.name,
            category: product.category,
            price: product.price,
            cost: product.cost,
            image: product.image,
            description: product.description,
            min_qty: product.min,
            status: product.status || 'active',
            stock: 0,
            recipe: product.recipe, // Save recipe JSON
            weight: Number(product.weight) || 0.5,
            height: Number(product.height) || 10,
            width: Number(product.width) || 20,
            length: Number(product.length) || 30
        };

        // Local Storage Fallback (Always save to local to ensure UI updates instantly)
        const localProducts = JSON.parse(localStorage.getItem('mv_products') || '[]');
        const existingIndex = localProducts.findIndex(p => p.id === dbProduct.id);
        if (existingIndex >= 0) {
            localProducts[existingIndex] = dbProduct;
        } else {
            localProducts.push(dbProduct);
        }
        localStorage.setItem('mv_products', JSON.stringify(localProducts));

        // Try Supabase (but don't fail if permissions deny)
        if (window.supabase) {
            const { data, error } = await window.supabase
                .from('products')
                .upsert(dbProduct)
                .select();

            if (error) {
                console.warn("Supabase save failed (using local fallback):", error);
                // Return true anyway because we saved locally
            }
        }

        await this.fetchProducts();
        return true;
    }

    async deleteProduct(id) {
        // DELETE LOCAL FIRST
        const localProducts = JSON.parse(localStorage.getItem('mv_products') || '[]');
        const newLocal = localProducts.filter(p => p.id !== id);
        localStorage.setItem('mv_products', JSON.stringify(newLocal));

        // DELETE SUPABASE (Silent Fail allowed)
        if (window.supabase) {
            const { error } = await window.supabase.from('products').delete().eq('id', id);
            if (error) console.warn("Supabase delete failed (local delete ok):", error);
        }

        await this.fetchProducts();
        return true;
    }

    // --- Inventory (Inputs) Methods ---
    async fetchInputs() {
        if (!window.supabase) {
            console.warn("Supabase unavailable, using local inputs.");
            this.inputs = JSON.parse(localStorage.getItem('mv_inputs') || '[]');
            return this.inputs;
        }

        const { data, error } = await window.supabase
            .from('inventory_items')
            .select('*')
            .order('name');

        if (error) {
            console.error("Error fetching inputs:", error);
            // Fallback only on error
            this.inputs = JSON.parse(localStorage.getItem('mv_inputs') || '[]');
        } else {
            this.inputs = data.map(i => ({
                ...i,
                cost: Number(i.cost),
                stock: Number(i.stock),
                minStock: Number(i.min_stock),
                notes: i.notes || '',
                internal_code: i.internal_code != null && String(i.internal_code).trim() !== ''
                    ? String(i.internal_code).trim().toUpperCase()
                    : ''
            }));
            // Update local cache
            localStorage.setItem('mv_inputs', JSON.stringify(this.inputs));
        }
        return this.inputs;
    }

    getInputs() {
        return this.inputs;
    }

    async saveInput(input) {
        const minStockVal = input.min_stock != null ? Number(input.min_stock) : (input.minStock != null ? Number(input.minStock) : 0);
        const dbInput = {
            id: input.id,
            name: input.name,
            supplier: input.supplier || null,
            cost: Number(input.cost) || 0,
            unit: input.unit || 'un',
            stock: input.stock != null ? Number(input.stock) : 0,
            min_stock: Number.isFinite(minStockVal) ? minStockVal : 0
        };
        const codeTrim = input.internal_code != null ? String(input.internal_code).trim() : '';
        if (codeTrim) dbInput.internal_code = codeTrim.toUpperCase();
        else dbInput.internal_code = null;

        const notesTrim = (input.notes != null && String(input.notes).trim()) ? String(input.notes).trim() : null;
        if (notesTrim) dbInput.notes = notesTrim;

        if (window.supabase) {
            let payload = { ...dbInput };
            let { error } = await window.supabase.from('inventory_items').upsert(payload);
            if (error && notesTrim && String(error.message || '').toLowerCase().includes('notes')) {
                const { notes: _omit, ...rest } = payload;
                payload = rest;
                ({ error } = await window.supabase.from('inventory_items').upsert(payload));
            }
            if (error && String(error.message || '').toLowerCase().includes('internal_code')) {
                const { internal_code: _ic, ...rest2 } = payload;
                ({ error } = await window.supabase.from('inventory_items').upsert(rest2));
                if (!error) {
                    console.warn('inventory_items: rode database/migrations/updates/add_inventory_internal_code.sql para habilitar código interno.');
                }
            }
            if (error) {
                console.error("Supabase Save Error:", error);
                const msg = String(error.message || '');
                const dup = msg.includes('inventory_items_internal_code_unique') || msg.includes('duplicate key');
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao Salvar',
                    text: dup
                        ? 'Já existe outro insumo com este código interno.'
                        : 'Não foi possível salvar no banco de dados. Tente novamente.',
                    confirmButtonColor: '#ef4444'
                });
                return false;
            }
        } else {
            // Local Fallback
            const localInputs = JSON.parse(localStorage.getItem('mv_inputs') || '[]');
            const idx = localInputs.findIndex(i => i.id === input.id);
            if (idx >= 0) localInputs[idx] = dbInput;
            else localInputs.push(dbInput);
            localStorage.setItem('mv_inputs', JSON.stringify(localInputs));
        }

        await this.fetchInputs();
        return true;
    }

    async deleteInput(id) {
        if (window.supabase) {
            const { error } = await window.supabase.from('inventory_items').delete().eq('id', id);
            if (error) {
                console.error("Supabase Delete Error:", error);
                return false;
            }
        } else {
            const localInputs = JSON.parse(localStorage.getItem('mv_inputs') || '[]');
            const newLocal = localInputs.filter(i => i.id !== id);
            localStorage.setItem('mv_inputs', JSON.stringify(newLocal));
        }

        await this.fetchInputs();
        return true;
    }

    // --- Inventory Movements ---
    async fetchHistory() {
        if (!window.supabase) {
            this.history = JSON.parse(localStorage.getItem('mv_history') || '[]');
            return this.history;
        }

        const { data, error } = await window.supabase
            .from('inventory_movements')
            .select(`
                *,
                inventory_items (name)
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error("Error fetching history:", error);
            this.history = JSON.parse(localStorage.getItem('mv_history') || '[]');
        } else {
            this.history = data.map(h => ({
                id: h.id,
                inputName: h.inventory_items ? h.inventory_items.name : 'Item excluído',
                type: h.type,
                quantity: Number(h.quantity),
                reason: h.reason,
                user: h.user_email,
                date: h.created_at
            }));
            localStorage.setItem('mv_history', JSON.stringify(this.history));
        }
        return this.history;
    }

    getInventoryHistory() {
        return this.history;
    }

    async adjustStock(inputId, qtyChange, type, reason, opts = {}) {
        const input = this.inputs.find(i => i.id === inputId);
        if (!input) return false;

        const user = authService.getCurrentUser();
        const newStock = Number(input.stock) + Number(qtyChange);
        const unitCost = opts && opts.unitCost != null ? Number(opts.unitCost) : NaN;
        const applyLastCost =
            type === 'entrada' &&
            Number(qtyChange) > 0 &&
            Number.isFinite(unitCost) &&
            unitCost > 0;

        if (window.supabase) {
            let moveReason = reason;
            if (applyLastCost) {
                moveReason = `${reason || 'Entrada'} | Custo unit. atualizado: R$ ${unitCost.toFixed(2)}`;
            }
            // 1. Log Movement
            const { error: moveError } = await window.supabase.from('inventory_movements').insert({
                item_id: inputId,
                type: type,
                quantity: qtyChange,
                reason: moveReason,
                user_email: user ? user.user_email : (user ? user.email : 'system')
            });
            if (moveError) console.error("Move Error:", moveError);

            // 2. Update Stock (e custo na entrada, se informado = última compra)
            const updatePayload = { stock: newStock };
            if (applyLastCost) updatePayload.cost = Number(unitCost.toFixed(2));

            const { error: updateError } = await window.supabase
                .from('inventory_items')
                .update(updatePayload)
                .eq('id', inputId);

            if (updateError) {
                console.error("Update Stock Error:", updateError);
                return false;
            }
        } else {
            // Local Fallback
            const localInputs = JSON.parse(localStorage.getItem('mv_inputs') || '[]');
            const idx = localInputs.findIndex(i => i.id === inputId);
            if (idx >= 0) {
                localInputs[idx].stock = newStock;
                if (applyLastCost) localInputs[idx].cost = Number(unitCost.toFixed(2));
            }
            localStorage.setItem('mv_inputs', JSON.stringify(localInputs));
        }

        await this.fetchInputs();
        await this.fetchHistory();
        return true;
    }

    // --- Logic & Helpers ---
    calculateAvailableStock(product) {
        if (!product.recipe || product.recipe.length === 0) return Infinity; // No recipe = assume infinite or manual

        let maxCanMake = Infinity;

        product.recipe.forEach(item => {
            const input = this.inputs.find(i => i.id === item.inputId);
            if (!input) return; // Ignore missing inputs
            const canMake = Math.floor(input.stock / item.quantity);
            if (canMake < maxCanMake) maxCanMake = canMake;
        });

        return maxCanMake;
    }

    getLowStockInputs() {
        // Ignore if minStock is 0 (No Minimum)
        return this.inputs.filter(i => i.minStock > 0 && i.stock <= i.minStock);
    }

    getStockStatus(input) {
        // If "No Minimum" (minStock 0), always OK
        if (input.minStock === 0) return 'ok';

        if (input.stock === 0) return 'out';
        if (input.stock <= (input.minStock || 10) * 0.5) return 'critical';
        if (input.stock <= (input.minStock || 10)) return 'low';
        return 'ok';
    }

    getMetrics() {
        // Mock revenue for now, could be fetched from orders
        return {
            revenue: 0,
            ordersCount: 0,
            productsCount: this.products.length,
            profitEst: this.products.reduce((acc, p) => acc + (p.price - p.cost), 0)
        };
    }

    async syncProductsToSupabase() {
        if (!window.supabase) return;
        const localProducts = JSON.parse(localStorage.getItem('products') || '[]');

        for (const p of localProducts) {
            // Check if exists
            const { count } = await window.supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('id', p.id);

            if (count === 0) {
                // Insert
                await window.supabase.from('products').insert({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    cost: p.cost,
                    image: p.image,
                    category: p.category,
                    rating: p.rating,
                    description: p.description
                });
            }
        }
    }

    // --- Order Methods ---
    async createOrder(customerData, items, total) {
        const user = authService.getCurrentUser();
        const userId = user ? user.id : null;
        const year = new Date().getFullYear();
        const random = Math.floor(1000 + Math.random() * 9000);
        const orderId = `#REQ-${random}`;

        // Admin bypass UUID não deve ser inserido como FK
        const ADMIN_BYPASS = '00000000-0000-0000-0000-000000000000';
        const safeUserId = (userId && userId !== ADMIN_BYPASS) ? userId : null;

        const { data: order, error: orderError } = await window.supabase
            .from('protocols')
            .insert({
                id: orderId,
                client_id: safeUserId,
                client_name: customerData?.name || null,
                client_email: customerData?.email || (user ? user.email : null),
                total_amount: total,
                status: 'inquiry',
                payment_status: 'pending',
                column_id: 1
            })
            .select()
            .single();

        if (orderError) {
            console.error("Error creating order:", orderError);
            return null;
        }

        const orderItems = items.map(item => ({
            protocol_id: orderId,
            product_name: item.name,
            quantity: item.quantity || item.qty || 1,
            unit_price: item.price,
            total_price: (item.price) * (item.quantity || item.qty || 1)
        }));

        const { error: itemsError } = await window.supabase.from('protocol_items').insert(orderItems);
        if (itemsError) console.error("Error creating order items:", itemsError);

        return order;
    }
}

const dataManager = new DataManager();
// Legacy adapter
const productService = {
    getAll: () => dataManager.getProducts(),
    init: async () => await dataManager.init(),
    // Expose Input methods
    saveInput: async (input) => await dataManager.saveInput(input),
    deleteInput: async (id) => await dataManager.deleteInput(id)
};

// Make it global
window.productService = productService;
