// cart.js - Complete working cart page JavaScript
// Updated to support cart.html with Brand + Subcategory display and remove functionality

document.addEventListener('DOMContentLoaded', function() {
    initCartPage();
});

function initCartPage() {
    // Initialize quantity controls
    initQuantityControls();
    
    // Initialize remove buttons
    initRemoveButtons();
    
    // Initialize clear cart button
    initClearCartButton();
    
    // Initialize checkout button
    initCheckoutButton();
    
    // Initialize cart totals
    updateCartTotals();
}

// ============ QUANTITY CONTROLS ============
function initQuantityControls() {
    // Increase quantity
    document.addEventListener('click', function(e) {
        if (e.target.closest('.increase-quantity')) {
            e.preventDefault();
            const btn = e.target.closest('.increase-quantity');
            const productId = btn.dataset.productId;
            updateCartItem(productId, 'increase');
        }
    });

    // Decrease quantity
    document.addEventListener('click', function(e) {
        if (e.target.closest('.decrease-quantity')) {
            e.preventDefault();
            const btn = e.target.closest('.decrease-quantity');
            const productId = btn.dataset.productId;
            updateCartItem(productId, 'decrease');
        }
    });
}

function updateCartItem(productId, action) {
    showLoading('Updating cart...');
    
    fetch('/update_cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: `product_id=${productId}&action=${action}`
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            // Reload page to reflect changes
            window.location.reload();
        } else {
            showNotification('Error: ' + data.message, 'danger');
        }
    })
    .catch(error => {
        hideLoading();
        showNotification('Network error. Please try again.', 'danger');
        console.error('Update cart error:', error);
    });
}

// ============ REMOVE BUTTON ============
function initRemoveButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.remove-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.remove-btn');
            const productId = btn.dataset.productId;   // Must match data-product-id in cart.html
            
            if (confirm('Are you sure you want to remove this item?')) {
                removeCartItem(productId);
            }
        }
    });
}

function removeCartItem(productId) {
    showLoading('Removing item...');
    
    fetch('/update_cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: `product_id=${productId}&action=remove`
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            // Reload page to reflect changes
            window.location.reload();
        } else {
            showNotification('Error: ' + data.message, 'danger');
        }
    })
    .catch(error => {
        hideLoading();
        showNotification('Network error. Please try again.', 'danger');
        console.error('Remove item error:', error);
    });
}

// ============ CLEAR CART ============
function initClearCartButton() {
    const clearCartBtn = document.getElementById('clearCartBtn');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to clear your entire cart?')) {
                clearCart();
            }
        });
    }
}

function clearCart() {
    showLoading('Clearing cart...');
    
    fetch('/clear_cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            window.location.reload();
        } else {
            showNotification('Error: ' + data.message, 'danger');
        }
    })
    .catch(error => {
        hideLoading();
        showNotification('Network error. Please try again.', 'danger');
        console.error('Clear cart error:', error);
    });
}

// ============ CHECKOUT ============
function initCheckoutButton() {
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            processCheckout();
        });
    }
}

function processCheckout() {
    if (!confirm('Proceed to checkout?')) {
        return;
    }
    
    showLoading('Processing checkout...');
    
    fetch('/checkout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            showOrderSuccess(data.order_id);
        } else {
            showNotification('Checkout failed: ' + data.message, 'danger');
        }
    })
    .catch(error => {
        hideLoading();
        showNotification('Network error during checkout.', 'danger');
        console.error('Checkout error:', error);
    });
}

function showOrderSuccess(orderId) {
    const modal = document.getElementById('orderSuccessModal');
    const orderIdSpan = document.getElementById('orderId');
    const messageEl = document.getElementById('orderSuccessMessage');
    
    if (modal && orderIdSpan && messageEl) {
        orderIdSpan.textContent = orderId;
        messageEl.textContent = 'Thank you for your purchase!';
        
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Reload page after modal is hidden
        modal.addEventListener('hidden.bs.modal', function() {
            window.location.href = '/products';
        });
    }
}

// ============ CART TOTALS ============
function updateCartTotals() {
    // Already rendered by server, no need to recalculate
}

// ============ UI HELPERS ============
function showLoading(message = 'Loading...') {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            backdrop-filter: blur(3px);
        `;
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        `;
        spinner.innerHTML = `
            <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mb-0 text-dark" id="loading-message">${message}</p>
        `;
        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
    } else {
        overlay.style.display = 'flex';
        const msgEl = document.getElementById('loading-message');
        if (msgEl) msgEl.textContent = message;
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showNotification(message, type = 'info') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            max-width: 350px;
        `;
        document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.style.animation = 'slideIn 0.3s ease-out';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    notification.style.marginBottom = '10px';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}