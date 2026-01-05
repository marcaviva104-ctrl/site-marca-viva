/**
 * Marca Viva - Central Data Manager (Backend Simulation)
 * Handles Products, Orders, and now INPUTS (Raw Materials)
 */

const INITIAL_INPUTS = [
    { id: 'INS-001', name: 'Caderno A5 (Base)', cost: 12.00, unit: 'un' },
    { id: 'INS-002', name: 'Personalização Laser', cost: 3.50, unit: 'un' },
    { id: 'INS-003', name: 'Caixa Premium', cost: 5.00, unit: 'un' },
    { id: 'INS-004', name: 'Licença Software (Hora)', cost: 50.00, unit: 'hr' }
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
        tags: ["Entrega Rápida"]
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
