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
        while (!window.supabase && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        if (!window.supabase) {
            console.error("DataManager: Supabase client not available.");
            return;
        }

        try {
            await Promise.all([
                this.fetchProducts(),
                this.fetchInputs(),
                this.fetchHistory()
            ]);
            console.log("DataManager Init Completed");
        } catch (error) {
            console.error("DataManager Init Failed:", error);
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
                    price: Number(p.price),
                    cost: Number(p.cost),
                    min: p.min_qty,
                    images: p.image ? [p.image] : [],
                    recipe: p.recipe || []
                })) : [];
            }
        }

        // Merge Local Storage (Overrides DB)
        const localProducts = JSON.parse(localStorage.getItem('mv_products') || '[]');
        localProducts.forEach(localP => {
            const idx = products.findIndex(p => p.id === localP.id);
            if (idx >= 0) {
                products[idx] = { ...products[idx], ...localP };
            } else {
                products.push(localP);
            }
        });

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
                recipe: data.recipe || []
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
            recipe: product.recipe // Save recipe JSON
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
        let inputs = [];

        // Try Supabase if available
        if (window.supabase) {
            const { data, error } = await window.supabase
                .from('inventory_items')
                .select('*')
                .order('name');

            if (error) {
                console.warn("Error fetching inputs (using local only):", error);
            } else {
                inputs = data ? data.map(i => ({
                    ...i,
                    cost: Number(i.cost),
                    stock: Number(i.stock),
                    minStock: Number(i.min_stock)
                })) : [];
            }
        }

        // MERGE LOCAL
        const localInputs = JSON.parse(localStorage.getItem('mv_inputs') || '[]');
        localInputs.forEach(localI => {
            const idx = inputs.findIndex(i => i.id === localI.id);
            if (idx >= 0) {
                inputs[idx] = { ...inputs[idx], ...localI };
            } else {
                inputs.push(localI);
            }
        });

        this.inputs = inputs;
        return this.inputs;
    }

    getInputs() {
        return this.inputs;
    }

    async saveInput(input) {
        const dbInput = {
            id: input.id,
            name: input.name,
            supplier: input.supplier,
            cost: input.cost,
            unit: input.unit,
            stock: input.stock || 0,
            min_stock: 10 // Default
        };

        // LOCAL FALLBACK
        const localInputs = JSON.parse(localStorage.getItem('mv_inputs') || '[]');
        const existingRef = localInputs.findIndex(i => i.id === input.id);
        if (existingRef >= 0) {
            localInputs[existingRef] = dbInput;
        } else {
            localInputs.push(dbInput);
        }
        localStorage.setItem('mv_inputs', JSON.stringify(localInputs));

        // SUPABASE
        if (window.supabase) {
            const { error } = await window.supabase.from('inventory_items').upsert(dbInput);
            if (error) console.warn("Supabase input save failed (using local):", error.message);
        }

        await this.fetchInputs();
        return true;
    }

    async deleteInput(id) {
        // DELETE LOCAL
        const localInputs = JSON.parse(localStorage.getItem('mv_inputs') || '[]');
        const newLocal = localInputs.filter(i => i.id !== id);
        localStorage.setItem('mv_inputs', JSON.stringify(newLocal));

        if (window.supabase) {
            const { error } = await window.supabase.from('inventory_items').delete().eq('id', id);
            if (error) console.warn("Supabase input delete failed (local ok):", error.message);
        }


        await this.fetchInputs();
        return true;
    }

    // --- Inventory Movements ---
    async fetchHistory() {
        let history = [];

        // Try Supabase
        if (window.supabase) {
            const { data, error } = await window.supabase
                .from('inventory_movements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (!error && data) {
                history = data.map(h => {
                    // Find input name
                    const input = this.inputs.find(i => i.id === h.item_id);
                    return {
                        id: h.id,
                        inputName: input ? input.name : 'Item excluído',
                        type: h.type,
                        quantity: Number(h.quantity),
                        reason: h.reason,
                        user: h.user_email,
                        date: h.created_at
                    };
                });
            }
        }

        // MERGE LOCAL STORAGE (mv_history)
        const localHistory = JSON.parse(localStorage.getItem('mv_history') || '[]');
        // Combine and sort by date descending
        const combined = [...localHistory, ...history];

        // Deduplicate by ID (prefer Supabase if conflict)
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());

        // Sort
        unique.sort((a, b) => new Date(b.date) - new Date(a.date));

        this.history = unique.slice(0, 100); // Keep last 100
        return this.history;
    }

    getInventoryHistory() {
        return this.history;
    }

    async adjustStock(inputId, qtyChange, type, reason) {
        const input = this.inputs.find(i => i.id === inputId);
        if (!input) return false;

        const user = authService.getCurrentUser();
        const newStock = input.stock + qtyChange;

        // 1. UPDATE LOCAL STORAGE (Inputs)
        const localInputs = JSON.parse(localStorage.getItem('mv_inputs') || '[]');
        const idx = localInputs.findIndex(i => i.id === inputId);
        if (idx >= 0) {
            localInputs[idx].stock = newStock;
        } else {
            // If not in local but was fetched, add it
            localInputs.push({ ...input, stock: newStock });
        }
        localStorage.setItem('mv_inputs', JSON.stringify(localInputs));

        // 2. SAVE HISTORY TO LOCAL STORAGE
        const newMove = {
            id: `MOV - ${Date.now()} `,
            inputName: input.name, // Save name directly for local
            item_id: inputId, // Keep ref
            type: type,
            quantity: qtyChange,
            reason: reason,
            user_email: user ? user.email : 'system',
            date: new Date().toISOString()
        };
        const localHistory = JSON.parse(localStorage.getItem('mv_history') || '[]');
        localHistory.unshift(newMove); // Add to top
        localStorage.setItem('mv_history', JSON.stringify(localHistory.slice(0, 100)));

        // 3. SUPABASE (Try Record Movement & Update)
        if (window.supabase) {
            const { error: moveError } = await window.supabase.from('inventory_movements').insert({
                item_id: inputId,
                type: type,
                quantity: qtyChange,
                reason: reason,
                user_email: user ? user.email : 'system'
            });

            if (moveError) console.warn("Supabase movement log failed:", moveError);

            const { error: updateError } = await window.supabase
                .from('inventory_items')
                .update({ stock: newStock })
                .eq('id', inputId);

            if (updateError) console.warn("Supabase stock update failed:", updateError);
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
        return this.inputs.filter(i => i.stock <= i.minStock);
    }

    getStockStatus(input) {
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

    // --- Order Methods ---
    async createOrder(customerData, items, total) {
        const user = authService.getCurrentUser();
        const userId = user ? user.id : null;
        const orderId = `#${Math.floor(Date.now() / 1000)} `;

        const { data: order, error: orderError } = await window.supabase
            .from('orders')
            .insert({
                id: orderId,
                user_id: userId,
                customer_data: customerData,
                total: total,
                status: 'pending'
            })
            .select()
            .single();

        if (orderError) {
            console.error("Error creating order:", orderError);
            return null;
        }

        const orderItems = items.map(item => ({
            order_id: orderId,
            product_id: item.id,
            quantity: item.quantity,
            price_at_time: item.price
        }));

        const { error: itemsError } = await window.supabase.from('order_items').insert(orderItems);
        if (itemsError) console.error("Error creating order items:", itemsError);

        return order;
    }
}

const dataManager = new DataManager();
// Legacy adapter
const productService = {
    getAll: () => dataManager.getProducts(),
    init: async () => await dataManager.init()
};
