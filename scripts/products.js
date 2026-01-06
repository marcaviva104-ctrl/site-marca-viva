/**
 * Marca Viva - Central Data Manager (Backend Simulation)
 * Handles Products, Orders, and now INPUTS (Raw Materials)
 */

const INITIAL_INPUTS = [
    { id: 'INS-001', name: 'Caderno A5 (Base)', cost: 12.00, unit: 'un', stock: 50, minStock: 10, supplier: 'Kalunga' },
    { id: 'INS-002', name: 'Personalização Laser', cost: 3.50, unit: 'un', stock: 100, minStock: 20, supplier: 'Interno' },
    { id: 'INS-003', name: 'Caixa Premium', cost: 5.00, unit: 'un', stock: 30, minStock: 10, supplier: 'Embala+' },
    { id: 'INS-004', name: 'Licença Software (Hora)', cost: 50.00, unit: 'hr', stock: 200, minStock: 50, supplier: 'Adobe' }
];

const INITIAL_PRODUCTS = [
    {
        id: "MV-CAD001",
        name: "Caderno Corporativo A5 Premium",
        category: "Escritório",
        price: 24.90,
        cost: 15.50, // Example cost
        validLink: "https://drive.google.com/file/d/demo",
        image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&q=80",
        description: "Capa dura soft-touch. Ideal para cultura da empresa.",
        min: 20,
        status: 'active',
        tags: ["Entrega Rápida"],
        recipe: [
            { inputId: 'INS-001', quantity: 1 },
            { inputId: 'INS-002', quantity: 1 }
        ],
        minStock: 5
    }
];

class DataManager {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem('mv_products')) {
            localStorage.setItem('mv_products', JSON.stringify(INITIAL_PRODUCTS));
        }
        if (!localStorage.getItem('mv_inputs')) {
            localStorage.setItem('mv_inputs', JSON.stringify(INITIAL_INPUTS));
        }
        if (!localStorage.getItem('mv_orders')) {
            localStorage.setItem('mv_orders', JSON.stringify([]));
        }
        if (!localStorage.getItem('mv_inventory_history')) {
            localStorage.setItem('mv_inventory_history', JSON.stringify([]));
        }
    }

    // --- Input (Insumos) Methods ---
    getInputs() {
        return JSON.parse(localStorage.getItem('mv_inputs')) || [];
    }

    saveInput(input) {
        const inputs = this.getInputs();
        const index = inputs.findIndex(i => i.id === input.id);

        if (index >= 0) inputs[index] = input; // Update
        else inputs.push(input); // Create

        localStorage.setItem('mv_inputs', JSON.stringify(inputs));
    }

    deleteInput(id) {
        const inputs = this.getInputs().filter(i => i.id !== id);
        localStorage.setItem('mv_inputs', JSON.stringify(inputs));
    }

    // --- Product Methods ---
    getProducts() {
        return JSON.parse(localStorage.getItem('mv_products')) || [];
    }

    saveProduct(product) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id === product.id);

        if (index >= 0) products[index] = product;
        else products.push(product);

        localStorage.setItem('mv_products', JSON.stringify(products));
    }

    deleteProduct(id) {
        const products = this.getProducts().filter(p => p.id !== id);
        localStorage.setItem('mv_products', JSON.stringify(products));
    }

    // --- Order Methods ---
    getOrders() {
        return JSON.parse(localStorage.getItem('mv_orders')) || [];
    }

    createOrder(customerData, items, total) {
        const orders = this.getOrders();
        const newOrder = {
            id: `#${1000 + orders.length + 1}`,
            customer: customerData,
            items: items,
            total: total,
            status: 'approved',
            date: new Date().toISOString()
        };
        orders.unshift(newOrder); // Add to top
        localStorage.setItem('mv_orders', JSON.stringify(orders));
        return newOrder;
    }

    // --- Inventory Methods ---
    adjustStock(inputId, quantity, type = 'manual', reason = '') {
        const inputs = this.getInputs();
        const input = inputs.find(i => i.id === inputId);
        if (!input) return false;

        input.stock = (input.stock || 0) + quantity;
        if (input.stock < 0) input.stock = 0;

        this.saveInput(input);
        this.recordInventoryHistory(inputId, quantity, type, reason);
        return true;
    }

    recordInventoryHistory(inputId, quantity, type, reason) {
        const history = JSON.parse(localStorage.getItem('mv_inventory_history')) || [];
        const inputs = this.getInputs();
        const input = inputs.find(i => i.id === inputId);

        history.unshift({
            id: `MOV-${Date.now()}`,
            inputId,
            inputName: input ? input.name : 'Desconhecido',
            quantity,
            type, // 'entrada', 'saida', 'perda', 'venda', 'manual'
            reason,
            date: new Date().toISOString(),
            user: 'admin'
        });

        // Keep last 100 entries
        if (history.length > 100) history.length = 100;
        localStorage.setItem('mv_inventory_history', JSON.stringify(history));
    }

    getInventoryHistory(limit = 50) {
        const history = JSON.parse(localStorage.getItem('mv_inventory_history')) || [];
        return history.slice(0, limit);
    }

    // Calculate how many units of a product can be made from available inputs
    calculateAvailableStock(product) {
        if (!product.recipe || product.recipe.length === 0) return Infinity;

        const inputs = this.getInputs();
        let minAvailable = Infinity;

        product.recipe.forEach(recipeItem => {
            const input = inputs.find(i => i.id === recipeItem.inputId);
            if (!input) {
                minAvailable = 0;
                return;
            }

            const availableStock = input.stock || 0;
            const canMake = Math.floor(availableStock / recipeItem.quantity);
            minAvailable = Math.min(minAvailable, canMake);
        });

        return minAvailable === Infinity ? 0 : minAvailable;
    }

    // Deduct inputs from stock when a product is sold
    deductStockForSale(product, quantity = 1) {
        if (!product.recipe || product.recipe.length === 0) return true;

        product.recipe.forEach(recipeItem => {
            const totalNeeded = recipeItem.quantity * quantity;
            this.adjustStock(recipeItem.inputId, -totalNeeded, 'venda', `Venda: ${product.name} (${quantity}x)`);
        });

        return true;
    }

    getStockStatus(input) {
        const stock = input.stock || 0;
        const minStock = input.minStock || 0;

        if (stock === 0) return 'out';
        if (stock <= minStock * 0.5) return 'critical';
        if (stock <= minStock) return 'low';
        return 'ok';
    }

    getLowStockInputs() {
        const inputs = this.getInputs();
        return inputs.filter(i => {
            const status = this.getStockStatus(i);
            return status === 'critical' || status === 'low' || status === 'out';
        });
    }

    // --- Metrics ---
    getMetrics() {
        const orders = this.getOrders();
        const nav = orders.length;
        const revenue = orders.reduce((sum, ord) => sum + ord.total, 0);
        const products = this.getProducts().length;

        // Simple Cost estimation based on flat 60% margin for demo if cost missing
        const profit = revenue * 0.4;

        return {
            revenue,
            ordersCount: nav,
            productsCount: products,
            profitEst: profit
        };
    }
}

const dataManager = new DataManager();
// Legacy
const productService = { getAll: () => dataManager.getProducts().filter(p => p.status !== 'active' ? false : true) };
