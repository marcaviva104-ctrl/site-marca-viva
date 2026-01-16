/**
 * Marca Viva - Shopping Cart Logic
 * Handles adding/removing items and persistence to LocalStorage.
 */

const cartService = {
    KEY: 'mv_cart',

    getCart: () => {
        try {
            return JSON.parse(localStorage.getItem(cartService.KEY)) || [];
        } catch (e) {
            return [];
        }
    },

    addToCart: (product, qty, customization = 'Sem gravação') => {
        const cart = cartService.getCart();

        // Generate a unique ID for this line item (based on Prod ID + Customization)
        // This allows same product with different customizations to be separate lines
        const lineId = `${product.id}-${customization}-${Date.now()}`;

        const item = {
            lineId: lineId,
            productId: product.id,
            name: product.name,
            image: product.image,
            price: Number(product.price),
            qty: Number(qty),
            customization: customization,
            addedAt: new Date().toISOString()
        };

        cart.push(item);
        cartService.saveCart(cart);

        // UI Feedback
        Swal.fire({
            icon: 'success',
            title: 'Adicionado!',
            text: `${qty}x ${product.name} no carrinho.`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });

        return cart;
    },

    removeFromCart: (lineId) => {
        let cart = cartService.getCart();
        cart = cart.filter(item => item.lineId !== lineId);
        cartService.saveCart(cart);
        return cart;
    },

    updateQty: (lineId, newQty) => {
        let cart = cartService.getCart();
        const item = cart.find(i => i.lineId === lineId);
        if (item) {
            item.qty = Math.max(1, Number(newQty)); // Min 1
            cartService.saveCart(cart);
        }
        return cart;
    },

    clearCart: () => {
        localStorage.removeItem(cartService.KEY);
        cartService.notifyChange();
    },

    saveCart: (cart) => {
        localStorage.setItem(cartService.KEY, JSON.stringify(cart));
        cartService.notifyChange();
    },

    getTotal: () => {
        const cart = cartService.getCart();
        return cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    },

    getCount: () => {
        const cart = cartService.getCart();
        return cart.reduce((acc, item) => acc + item.qty, 0);
    },

    notifyChange: () => {
        // Dispatch event for UI updates (Badges, etc)
        const event = new CustomEvent('cart:updated', {
            detail: {
                cart: cartService.getCart(),
                count: cartService.getCount(),
                total: cartService.getTotal()
            }
        });
        document.dispatchEvent(event);
    }
};

// Global Expose
window.cartService = cartService;

// Initialize Badge on Load
document.addEventListener('DOMContentLoaded', () => {
    cartService.notifyChange();
});
