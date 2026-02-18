// main.js - Updated for Public Access & Login Redirect Workflow

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const CART_UPDATE_DELAY = 300; // ms

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initCartBadge();
    initAddToCartButtons();
    initSearchForm();
    initLogoutConfirmation();
    initMobileMenu();
    initPasswordToggle();
    initFormValidations();
    initNotifications();
});

// ============ LOGIN STATUS ============
function isLoggedIn() {
    // Check body data attribute set by Flask template
    return document.body.dataset.loggedIn === 'true';
}

// ============ CART FUNCTIONS ============
function initCartBadge() {
    // Cart badge is initially set by server via template variable.
    // We don't need to fetch from API; just update via add-to-cart response.
}

function updateCartBadge(count) {
    const badges = document.querySelectorAll('.cart-badge, .cart-count');
    badges.forEach(badge => {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    });
}

function initAddToCartButtons() {
    document.addEventListener('click', function(e) {
        const addToCartBtn = e.target.closest('.add-to-cart');
        if (addToCartBtn) {
            e.preventDefault();

            const productId = addToCartBtn.dataset.productId;
            const productName = addToCartBtn.dataset.productName || 'Product';
            const quantity = addToCartBtn.dataset.quantity || 1;

            addToCart(productId, quantity, productName);
        }
    });
}

function addToCart(productId, quantity = 1, productName = 'Product') {
    // --- LOGIN CHECK ---
    if (!isLoggedIn()) {
        // Show confirmation dialog like Amazon/Flipkart
        if (confirm('Please login to add items to your cart. Go to login page?')) {
            // Save current page to redirect back after login
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?next=${next}`;
        }
        return;
    }

    showLoading('Adding to cart...');

    fetch('/add_to_cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: `product_id=${productId}&quantity=${quantity}`
    })
    .then(response => {
        if (response.status === 401) {
            hideLoading();
            // Session expired or not logged in (shouldn't happen due to check above, but handle anyway)
            if (confirm('Your session has expired. Please login again.')) {
                const next = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `/login?next=${next}`;
            }
            return null;
        }
        return response.json();
    })
    .then(data => {
        if (!data) return;
        hideLoading();

        if (data.success) {
            // Update cart badge with new count from server
            updateCartBadge(data.cart_count);
            showNotification(`${productName} added to cart!`, 'success');

            // If on cart page, trigger cart totals update
            if (typeof window.updateCartTotals === 'function') {
                window.updateCartTotals();
            }
        } else {
            showNotification(`Error: ${data.message}`, 'danger');
        }
    })
    .catch(error => {
        hideLoading();
        showNotification('Network error. Please try again.', 'danger');
        console.error('Add to cart error:', error);
    });
}

// ============ SEARCH FUNCTIONS ============
function initSearchForm() {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            const searchInput = document.getElementById('searchInput');
            if (searchInput && searchInput.value.trim().length < 2) {
                e.preventDefault();
                showNotification('Please enter at least 2 characters to search', 'warning');
            }
        });
    }

    // Live search if element exists
    const searchInput = document.getElementById('liveSearch');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performLiveSearch(this.value);
            }, 500);
        });
    }
}

function performLiveSearch(query) {
    if (query.length < 2) {
        hideLiveSearchResults();
        return;
    }

    fetch(`/api/search_products?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.results.length > 0) {
                displayLiveSearchResults(data.results);
            } else {
                hideLiveSearchResults();
            }
        })
        .catch(error => console.error('Search error:', error));
}

function displayLiveSearchResults(results) {
    const container = document.getElementById('liveSearchResults');
    if (!container) return;

    let html = '<div class="live-search-results">';

    results.forEach(result => {
        html += `
            <a href="/product/${result.id}" class="live-search-item">
                <img src="/static/images/${result.image}" alt="${result.name}">
                <div>
                    <h6>${result.name}</h6>
                    <p class="text-muted">${result.category}</p>
                    <span class="price">$${result.price}</span>
                </div>
            </a>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
    container.style.display = 'block';
}

function hideLiveSearchResults() {
    const container = document.getElementById('liveSearchResults');
    if (container) {
        container.style.display = 'none';
    }
}

// ============ AUTHENTICATION FUNCTIONS ============
function initLogoutConfirmation() {
    const logoutLinks = document.querySelectorAll('a[href*="logout"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to logout?')) {
                e.preventDefault();
            }
        });
    });
}

function initPasswordToggle() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('bi-eye');
                icon.classList.add('bi-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('bi-eye-slash');
                icon.classList.add('bi-eye');
            }
        });
    });
}

// ============ FORM VALIDATIONS ============
function initFormValidations() {
    // Email validation
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateEmail(this);
        });
    });

    // Password strength
    const passwordInputs = document.querySelectorAll('input[name="password"]');
    passwordInputs.forEach(input => {
        input.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    });

    // Confirm password
    const confirmPasswords = document.querySelectorAll('input[name="confirmPassword"]');
    confirmPasswords.forEach(input => {
        input.addEventListener('input', function() {
            const password = document.querySelector('input[name="password"]');
            if (password) {
                validatePasswordMatch(password.value, this.value);
            }
        });
    });
}

function validateEmail(input) {
    const email = input.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email && !emailRegex.test(email)) {
        setInputError(input, 'Please enter a valid email address');
        return false;
    } else {
        clearInputError(input);
        return true;
    }
}

function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('passwordStrength');
    if (!strengthBar) return;

    let strength = 0;

    // Length check
    if (password.length >= 8) strength += 25;
    // Contains lowercase
    if (/[a-z]/.test(password)) strength += 25;
    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 25;
    // Contains numbers
    if (/[0-9]/.test(password)) strength += 25;

    // Update progress bar
    strengthBar.style.width = strength + '%';

    // Change color based on strength
    strengthBar.classList.remove('bg-danger', 'bg-warning', 'bg-success');
    if (strength < 50) {
        strengthBar.classList.add('bg-danger');
    } else if (strength < 75) {
        strengthBar.classList.add('bg-warning');
    } else {
        strengthBar.classList.add('bg-success');
    }
}

function validatePasswordMatch(password, confirmPassword) {
    const confirmInput = document.querySelector('input[name="confirmPassword"]');
    if (!confirmInput) return;

    if (password && confirmPassword && password !== confirmPassword) {
        setInputError(confirmInput, 'Passwords do not match');
        return false;
    } else {
        clearInputError(confirmInput);
        return true;
    }
}

function setInputError(input, message) {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');

    let feedback = input.nextElementSibling;
    if (!feedback || !feedback.classList.contains('invalid-feedback')) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        input.parentNode.insertBefore(feedback, input.nextSibling);
    }
    feedback.textContent = message;
}

function clearInputError(input) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
}

// ============ UI FUNCTIONS ============
function initMobileMenu() {
    const mobileMenuToggles = document.querySelectorAll('.mobile-menu-toggle');
    mobileMenuToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const target = document.querySelector(this.dataset.target);
            if (target) {
                target.classList.toggle('show');
            }
        });
    });
}

function initNotifications() {
    // Auto-dismiss flash messages after 5 seconds
    const flashMessages = document.querySelectorAll('.alert');
    flashMessages.forEach(message => {
        setTimeout(() => {
            message.classList.add('fade');
            setTimeout(() => message.remove(), 300);
        }, 5000);
    });
}

function showNotification(message, type = 'info') {
    const notificationContainer = document.getElementById('notification-container');

    if (!notificationContainer) {
        // Create notification container if it doesn't exist
        const container = document.createElement('div');
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
    notification.style.cssText = `
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        margin-bottom: 10px;
    `;

    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.getElementById('notification-container').appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function showLoading(message = 'Loading...') {
    let loadingOverlay = document.getElementById('loading-overlay');

    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.style.cssText = `
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
            <p class="mb-0 text-dark">${message}</p>
        `;

        loadingOverlay.appendChild(spinner);
        document.body.appendChild(loadingOverlay);
    } else {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// ============ API HELPERS (OPTIONAL) ============
async function fetchWithAuth(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (response.status === 401) {
            // Unauthorized - redirect to login with next parameter
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?next=${next}`;
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        showNotification('Network error. Please try again.', 'danger');
        throw error;
    }
}

// ============ UTILITY FUNCTIONS ============
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// ============ ANIMATIONS (already included in styles.css) ============
// Only keep custom styles that are not in external CSS.
// The following are added dynamically if needed.
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    .live-search-results {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 0 0 8px 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 1000;
        max-height: 400px;
        overflow-y: auto;
    }
    
    .live-search-item {
        display: flex;
        align-items: center;
        padding: 10px;
        border-bottom: 1px solid #eee;
        text-decoration: none;
        color: inherit;
        transition: background 0.2s;
    }
    
    .live-search-item:hover {
        background: #f8f9fa;
    }
    
    .live-search-item img {
        width: 50px;
        height: 50px;
        object-fit: cover;
        margin-right: 10px;
        border-radius: 4px;
    }
    
    .live-search-item h6 {
        margin: 0;
        font-size: 0.9rem;
    }
    
    .live-search-item .price {
        color: #28a745;
        font-weight: 600;
    }
    
    .product-card {
        transition: transform 0.3s, box-shadow 0.3s;
    }
    
    .product-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
`;
document.head.appendChild(style);