// products.js - Products page specific JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initProductsPage();
});

function initProductsPage() {
    // Initialize filters
    initFilters();
    
    // Initialize sort functionality
    initSorting();
    
    // Initialize view toggle
    initViewToggle();
    
    // Initialize quick view
    initQuickView();
    
    // Initialize pagination
    initPagination();
    
    // Initialize price range slider
    initPriceSlider();
    
    // Initialize lazy loading for images
    initLazyLoading();
}

function initFilters() {
    const filterForm = document.getElementById('filterForm');
    const filterInputs = document.querySelectorAll('.filter-input');
    
    filterInputs.forEach(input => {
        input.addEventListener('change', function() {
            applyFilters();
        });
    });
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function(e) {
            e.preventDefault();
            clearFilters();
        });
    }
}

function initSorting() {
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            applySorting(this.value);
        });
    }
    
    // Sort buttons
    const sortButtons = document.querySelectorAll('.sort-btn');
    sortButtons.forEach(button => {
        button.addEventListener('click', function() {
            const sortBy = this.dataset.sort;
            applySorting(sortBy);
            
            // Update active state
            sortButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function initViewToggle() {
    const gridViewBtn = document.getElementById('gridView');
    const listViewBtn = document.getElementById('listView');
    const productsContainer = document.getElementById('productsContainer');
    
    if (gridViewBtn && listViewBtn && productsContainer) {
        gridViewBtn.addEventListener('click', function() {
            productsContainer.classList.remove('list-view');
            productsContainer.classList.add('grid-view');
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            
            // Save preference to localStorage
            localStorage.setItem('productView', 'grid');
        });
        
        listViewBtn.addEventListener('click', function() {
            productsContainer.classList.remove('grid-view');
            productsContainer.classList.add('list-view');
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
            
            // Save preference to localStorage
            localStorage.setItem('productView', 'list');
        });
        
        // Load saved preference
        const savedView = localStorage.getItem('productView') || 'grid';
        if (savedView === 'list') {
            listViewBtn.click();
        } else {
            gridViewBtn.click();
        }
    }
}

function initQuickView() {
    document.addEventListener('click', function(e) {
        const quickViewBtn = e.target.closest('.quick-view-btn');
        if (quickViewBtn) {
            e.preventDefault();
            const productId = quickViewBtn.dataset.productId;
            openQuickView(productId);
        }
    });
}

function initPagination() {
    const paginationLinks = document.querySelectorAll('.page-link');
    paginationLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            goToPage(page);
        });
    });
}

function initPriceSlider() {
    const priceMin = document.getElementById('priceMin');
    const priceMax = document.getElementById('priceMax');
    const priceMinValue = document.getElementById('priceMinValue');
    const priceMaxValue = document.getElementById('priceMaxValue');
    
    if (priceMin && priceMax && priceMinValue && priceMaxValue) {
        // Set initial values
        const minPrice = parseInt(priceMin.dataset.min) || 0;
        const maxPrice = parseInt(priceMax.dataset.max) || 1000;
        
        priceMin.min = minPrice;
        priceMin.max = maxPrice;
        priceMax.min = minPrice;
        priceMax.max = maxPrice;
        
        priceMin.value = minPrice;
        priceMax.value = maxPrice;
        
        priceMinValue.textContent = `$${minPrice}`;
        priceMaxValue.textContent = `$${maxPrice}`;
        
        // Update values on input
        priceMin.addEventListener('input', function() {
            priceMinValue.textContent = `$${this.value}`;
            if (parseInt(this.value) > parseInt(priceMax.value)) {
                priceMax.value = this.value;
                priceMaxValue.textContent = `$${this.value}`;
            }
            applyFilters();
        });
        
        priceMax.addEventListener('input', function() {
            priceMaxValue.textContent = `$${this.value}`;
            if (parseInt(this.value) < parseInt(priceMin.value)) {
                priceMin.value = this.value;
                priceMinValue.textContent = `$${this.value}`;
            }
            applyFilters();
        });
    }
}

function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const lazyImages = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    }
}

function applyFilters() {
    showLoading('Applying filters...');
    
    const formData = new FormData(document.getElementById('filterForm'));
    const params = new URLSearchParams(formData).toString();
    
    fetch(`/products?${params}`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.text())
    .then(html => {
        hideLoading();
        
        // Update products grid
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newProducts = doc.getElementById('productsContainer');
        
        if (newProducts) {
            const currentContainer = document.getElementById('productsContainer');
            currentContainer.innerHTML = newProducts.innerHTML;
            
            // Reinitialize products page features
            initProductsPage();
            
            // Update product count
            const productCount = doc.querySelector('.product-count');
            if (productCount) {
                document.querySelector('.product-count').textContent = productCount.textContent;
            }
            
            // Show notification
            const productCards = document.querySelectorAll('.product-card').length;
            showNotification(`Showing ${productCards} products`, 'info');
        }
    })
    .catch(error => {
        hideLoading();
        showNotification('Error applying filters', 'danger');
        console.error('Filter error:', error);
    });
}

function clearFilters() {
    const form = document.getElementById('filterForm');
    if (form) {
        form.reset();
        
        // Reset price slider
        const priceMin = document.getElementById('priceMin');
        const priceMax = document.getElementById('priceMax');
        const priceMinValue = document.getElementById('priceMinValue');
        const priceMaxValue = document.getElementById('priceMaxValue');
        
        if (priceMin && priceMax) {
            const minPrice = parseInt(priceMin.dataset.min) || 0;
            const maxPrice = parseInt(priceMax.dataset.max) || 1000;
            
            priceMin.value = minPrice;
            priceMax.value = maxPrice;
            priceMinValue.textContent = `$${minPrice}`;
            priceMaxValue.textContent = `$${maxPrice}`;
        }
        
        applyFilters();
    }
}

function applySorting(sortBy) {
    const url = new URL(window.location);
    url.searchParams.set('sort_by', sortBy);
    
    showLoading('Sorting products...');
    
    fetch(url.toString(), {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.text())
    .then(html => {
        hideLoading();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newProducts = doc.getElementById('productsContainer');
        
        if (newProducts) {
            const currentContainer = document.getElementById('productsContainer');
            currentContainer.innerHTML = newProducts.innerHTML;
            
            // Reinitialize products page features
            initProductsPage();
        }
    })
    .catch(error => {
        hideLoading();
        showNotification('Error sorting products', 'danger');
        console.error('Sorting error:', error);
    });
}

function openQuickView(productId) {
    showLoading('Loading product details...');
    
    fetch(`/api/products/${productId}`)
        .then(response => response.json())
        .then(data => {
            hideLoading();
            
            if (data.success) {
                showQuickViewModal(data.product);
            } else {
                showNotification('Product not found', 'danger');
            }
        })
        .catch(error => {
            hideLoading();
            showNotification('Error loading product', 'danger');
            console.error('Quick view error:', error);
        });
}

function showQuickViewModal(product) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('quickViewModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'quickViewModal';
        modal.className = 'modal fade';
        modal.tabIndex = '-1';
        modal.setAttribute('aria-hidden', 'true');
        
        modal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Product Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="quickViewContent">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // Set content
    const content = `
        <div class="row">
            <div class="col-md-6">
                <img src="/static/${product.image_path || 'default.jpg'}" 
                     class="img-fluid rounded" 
                     alt="${product.Brand}">
            </div>
            <div class="col-md-6">
                <h4>${product.Brand}</h4>
                <p class="text-muted">${product.Category} - ${product.Subcategory}</p>
                
                <div class="mb-3">
                    <div class="rating-stars">
                        ${generateStarRating(product.Product_Rating)}
                    </div>
                    <span class="ms-2">${product.Product_Rating}/5.0</span>
                </div>
                
                <p class="lead price-tag">$${product.Price}</p>
                
                <div class="mb-4">
                    <p>${product.Description || 'No description available.'}</p>
                </div>
                
                <div class="d-grid gap-2">
                    <button class="btn btn-primary btn-lg add-to-cart"
                            data-product-id="${product.Product_ID}"
                            data-product-name="${product.Brand}">
                        <i class="bi bi-cart-plus me-2"></i>Add to Cart
                    </button>
                    <button class="btn btn-outline-secondary">
                        <i class="bi bi-heart me-2"></i>Add to Wishlist
                    </button>
                </div>
                
                <div class="mt-4">
                    <h6>Product Details</h6>
                    <ul class="list-unstyled">
                        <li><strong>Brand:</strong> ${product.Brand}</li>
                        <li><strong>Category:</strong> ${product.Category}</li>
                        <li><strong>Subcategory:</strong> ${product.Subcategory}</li>
                        <li><strong>Price:</strong> $${product.Price}</li>
                        <li><strong>Rating:</strong> ${product.Product_Rating}/5</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('quickViewContent').innerHTML = content;
    
    // Show modal
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

function goToPage(page) {
    const url = new URL(window.location);
    url.searchParams.set('page', page);
    window.location.href = url.toString();
}

function generateStarRating(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="bi bi-star-fill"></i>';
    }
    
    if (halfStar) {
        stars += '<i class="bi bi-star-half"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="bi bi-star"></i>';
    }
    
    return stars;
}

// Add products page styles
const productsStyles = document.createElement('style');
productsStyles.textContent = `
    .products-page {
        min-height: 600px;
    }
    
    .products-container.grid-view {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 20px;
    }
    
    .products-container.list-view .product-card {
        display: flex;
        flex-direction: row;
        margin-bottom: 20px;
    }
    
    .products-container.list-view .product-card img {
        width: 200px;
        height: auto;
        object-fit: cover;
    }
    
    .products-container.list-view .product-card .card-body {
        flex: 1;
    }
    
    .filter-sidebar {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
    }
    
    .filter-group {
        margin-bottom: 25px;
    }
    
    .filter-group h6 {
        color: #495057;
        margin-bottom: 15px;
        font-weight: 600;
    }
    
    .filter-checkbox {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        cursor: pointer;
    }
    
    .filter-checkbox input {
        margin-right: 10px;
    }
    
    .price-slider {
        padding: 0 10px;
    }
    
    .price-slider .slider-track {
        height: 4px;
        background: #dee2e6;
        border-radius: 2px;
        position: relative;
    }
    
    .price-slider .slider-range {
        position: absolute;
        height: 100%;
        background: #667eea;
        border-radius: 2px;
    }
    
    .price-slider .slider-handle {
        position: absolute;
        width: 20px;
        height: 20px;
        background: white;
        border: 2px solid #667eea;
        border-radius: 50%;
        top: 50%;
        transform: translateY(-50%);
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .price-values {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
        font-size: 0.9rem;
        color: #6c757d;
    }
    
    .sort-controls {
        display: flex;
        gap: 10px;
        align-items: center;
    }
    
    .sort-btn {
        padding: 5px 15px;
        border: 1px solid #dee2e6;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .sort-btn:hover {
        background: #f8f9fa;
    }
    
    .sort-btn.active {
        background: #667eea;
        color: white;
        border-color: #667eea;
    }
    
    .view-toggle {
        display: flex;
        gap: 5px;
    }
    
    .view-btn {
        padding: 5px 10px;
        border: 1px solid #dee2e6;
        background: white;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .view-btn.active {
        background: #f8f9fa;
        border-color: #667eea;
    }
    
    .product-card .card-img-top {
        height: 200px;
        object-fit: cover;
    }
    
    .product-card .card-title {
        font-size: 1rem;
        font-weight: 500;
        margin-bottom: 5px;
        height: 40px;
        overflow: hidden;
    }
    
    .product-card .card-text {
        font-size: 0.9rem;
        color: #6c757d;
        height: 60px;
        overflow: hidden;
    }
    
    .product-actions {
        display: flex;
        gap: 5px;
        margin-top: 10px;
    }
    
    .quick-view-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 30px;
        height: 30px;
        background: rgba(255,255,255,0.9);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.3s;
    }
    
    .product-card:hover .quick-view-btn {
        opacity: 1;
    }
    
    .product-badges {
        position: absolute;
        top: 10px;
        left: 10px;
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    
    .product-badge {
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .badge-new {
        background: #28a745;
        color: white;
    }
    
    .badge-sale {
        background: #dc3545;
        color: white;
    }
    
    .badge-featured {
        background: #ffc107;
        color: #212529;
    }
    
    .pagination {
        justify-content: center;
        margin-top: 30px;
    }
    
    .page-item.active .page-link {
        background-color: #667eea;
        border-color: #667eea;
    }
    
    @media (max-width: 768px) {
        .products-container.list-view .product-card {
            flex-direction: column;
        }
        
        .products-container.list-view .product-card img {
            width: 100%;
            height: 200px;
        }
        
        .filter-sidebar {
            margin-bottom: 20px;
        }
    }
`;
document.head.appendChild(productsStyles);