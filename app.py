from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from flask_mysqldb import MySQL
import MySQLdb.cursors
import pandas as pd
import numpy as np
import os
from functools import wraps
import re
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'ecommerce_secret_key_2024'

# MySQL Configuration
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = ''
app.config['MYSQL_DB'] = 'ecommerce_recommendation'
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

mysql = MySQL(app)

print("="*60)
print("E-Commerce System - STARTING")
print("="*60)

# ============ SAMPLE DATA – REALISTIC PRODUCTS PER CATEGORY ============
categories = [
    'Electronics', 'Clothing', 'Home & Kitchen', 'Books', 
    'Sports', 'Beauty', 'Toys', 'Food'
]

# Category-wise realistic subcategories (Amazon/Flipkart style)
subcategories_map = {
    'Electronics': ['Smartphones', 'Laptops', 'Headphones', 'Smartwatches', 'Cameras'],
    'Clothing': ['T-Shirts', 'Shirts', 'Jeans', 'Shorts', 'Jackets', 'Dresses'],
    'Home & Kitchen': ['Cookware', 'Furniture', 'Lighting', 'Decor', 'Bedding'],
    'Books': ['Fiction', 'Non-Fiction', 'Comics', 'History', 'Science', 'Biography'],
    'Sports': ['Fitness', 'Outdoor', 'Team Sports', 'Cycling', 'Yoga'],
    'Beauty': ['Lipstick', 'Foundation', 'Mascara', 'Hairdryer', 'Shampoo', 'Perfume'],
    'Toys': ['Educational', 'Action Figures', 'Board Games', 'Outdoor', 'Dolls'],
    'Food': ['Snacks', 'Beverages', 'Canned Goods', 'Baking', 'Dairy']
}

# Category-wise realistic brands (Indian & International)
brands_map = {
    'Electronics': ['Apple', 'Samsung', 'Sony', 'LG', 'Microsoft', 'OnePlus', 'Boat'],
    'Clothing': ['Nike', 'Adidas', 'Zara', 'H&M', 'Levis', 'Puma', 'Allen Solly'],
    'Home & Kitchen': ['IKEA', 'Philips', 'Prestige', 'Butterfly', 'Bajaj', 'Hawkins'],
    'Books': ['Penguin', 'HarperCollins', 'Random House', 'Scholastic', 'Oxford'],
    'Sports': ['Nike', 'Adidas', 'Puma', 'Reebok', 'Cosco', 'SS'],
    'Beauty': ['Maybelline', 'Loreal', 'MAC', 'Nivea', 'Dove', 'Lakme', 'Forest Essentials'],
    'Toys': ['Lego', 'Mattel', 'Hasbro', 'Hot Wheels', 'Barbie', 'Fisher-Price'],
    'Food': ['Nestle', 'Pepsi', 'Coca-Cola', 'Kelloggs', 'Britannia', 'Amul']
}

# Complementary categories for cross‑selling (fallback)
complementary_categories = {
    'Clothing': ['Clothing', 'Footwear', 'Accessories'],
    'Electronics': ['Electronics', 'Accessories'],
    'Home & Kitchen': ['Home & Kitchen', 'Furniture', 'Decor'],
    'Books': ['Books', 'Stationery'],
    'Sports': ['Sports', 'Fitness', 'Outdoor'],
    'Beauty': ['Beauty', 'Personal Care'],
    'Toys': ['Toys', 'Games'],
    'Food': ['Food', 'Beverages']
}

# Generate 200+ products for rich catalog
sample_products = []
product_id = 1

for category in categories:
    subcategories = subcategories_map[category]
    brands = brands_map[category]
    
    for _ in range(25):
        subcategory = np.random.choice(subcategories)
        brand = np.random.choice(brands)
        
        # Price range according to category
        if category == 'Electronics':
            price = round(np.random.uniform(500, 1500), 2)
        elif category == 'Clothing':
            price = round(np.random.uniform(500, 3000), 2)
        elif category == 'Beauty':
            price = round(np.random.uniform(200, 2000), 2)
        elif category == 'Books':
            price = round(np.random.uniform(100, 800), 2)
        elif category == 'Home & Kitchen':
            price = round(np.random.uniform(300, 5000), 2)
        elif category == 'Sports':
            price = round(np.random.uniform(400, 4000), 2)
        elif category == 'Toys':
            price = round(np.random.uniform(200, 2500), 2)
        else:  # Food
            price = round(np.random.uniform(20, 500), 2)
        
        # ✅ Image path based on subcategory (generic image per product type)
        category_folder = category.lower().replace(' & ', '-')
        
        # Special mapping for subcategories that need specific images
        if subcategory == 'Jeans':
            image_path = f"{category_folder}/Jeans.jpg"
        elif subcategory == 'Dolls':
            image_path = f"{category_folder}/Dolls.jpg"
        else:
            # For all other subcategories, use the subcategory name as filename
            image_path = f"{category_folder}/{subcategory}.jpg"
        
        product = {
            'Product_ID': f'PROD_{product_id:04d}',
            'Category': category,
            'Subcategory': subcategory,
            'Price': price,
            'Brand': brand,
            'Average_Rating_of_Similar_Products': round(np.random.uniform(3.5, 4.8), 1),
            'Product_Rating': round(np.random.uniform(3.5, 4.8), 1),
            'Customer_Review_Sentiment_Score': round(np.random.uniform(0.6, 0.95), 2),
            'Holiday': np.random.choice(['Christmas', 'Diwali', 'Eid', 'New Year', 'None'], 
                                        p=[0.1, 0.1, 0.1, 0.1, 0.6]),
            'Season': np.random.choice(['Winter', 'Summer', 'Spring', 'Fall', 'All Season']),
            'Geographical_Location': np.random.choice(['India', 'US', 'UK', 'Canada', 'Australia']),
            'Similar_Product_List': '',
            'Probability_of_Recommendation': round(np.random.uniform(0.6, 0.95), 2),
            'image_search': category.lower(),
            'image_path': image_path           # ✅ generic subcategory image
        }
        sample_products.append(product)
        product_id += 1

product_df = pd.DataFrame(sample_products)
print(f"✓ Loaded {len(product_df)} sample products – generic subcategory images")
# =============================================================================

# ============ REFINED CROSS‑SELLING RECOMMENDATION ENGINE ============
def get_cross_sell_recommendations(product_id, top_n=4):
    """
    Cross‑selling: same category ke products do, lekin current subcategory ko exclude karo.
    Example: Jeans (Clothing) → Shirts, Shorts, Shoes (other subcategories of Clothing)
    Fallback: agar same category me kaafi products nahi mile to complementary categories se le lo.
    """
    if product_df.empty:
        return []
    
    product = product_df[product_df['Product_ID'] == product_id]
    if product.empty:
        return []
    
    category = product.iloc[0]['Category']
    current_subcategory = product.iloc[0]['Subcategory']
    
    # Same category ke products, lekin current subcategory nahi
    mask = (product_df['Category'] == category) & (product_df['Subcategory'] != current_subcategory)
    candidates = product_df[mask]
    
    # Agar same category me enough candidates nahi hain to complementary categories try karo
    if len(candidates) < top_n:
        comp_cats = complementary_categories.get(category, [category])
        mask = product_df['Category'].isin(comp_cats)
        candidates = product_df[mask]
        # Remove current product
        candidates = candidates[candidates['Product_ID'] != product_id]
    
    # Randomly select top_n (ya rating ke hisaab se sort kar sakte ho)
    if len(candidates) > top_n:
        recommendations = candidates.sample(n=top_n)
    else:
        recommendations = candidates
    
    results = []
    for _, row in recommendations.iterrows():
        results.append({
            'Product_ID': row['Product_ID'],
            'Product_Name': f"{row['Brand']} - {row['Category']}",
            'Brand': row['Brand'],
            'Category': row['Category'],
            'Subcategory': row['Subcategory'],
            'Price': float(row['Price']),
            'Rating': float(row['Product_Rating']),
            'Image_Search': row['image_search'],
            'image_path': row['image_path']      # ✅ generic subcategory image
        })
    return results

# ============ COMBINED CART RECOMMENDATIONS ============
def get_combined_cart_recommendations(cart_items, top_n=4):
    """
    Saare cart items ki categories se recommendations uthata hai,
    duplicate hata kar mix karta hai.
    """
    if product_df.empty or not cart_items:
        return []
    
    all_recs = []
    seen_product_ids = set()
    cart_product_ids = [item['Product_ID'] for item in cart_items]
    
    for item in cart_items:
        product_id = item['Product_ID']
        
        product = product_df[product_df['Product_ID'] == product_id]
        if product.empty:
            continue
        
        category = product.iloc[0]['Category']
        current_subcategory = product.iloc[0]['Subcategory']
        
        # Same category ke products, lekin current subcategory nahi
        mask = (product_df['Category'] == category) & (product_df['Subcategory'] != current_subcategory)
        candidates = product_df[mask]
        
        # Cart mein already existing products ko hatao
        candidates = candidates[~candidates['Product_ID'].isin(cart_product_ids)]
        
        for _, row in candidates.iterrows():
            if row['Product_ID'] not in seen_product_ids:
                all_recs.append({
                    'Product_ID': row['Product_ID'],
                    'Product_Name': f"{row['Brand']} - {row['Category']}",
                    'Brand': row['Brand'],
                    'Category': row['Category'],
                    'Subcategory': row['Subcategory'],
                    'Price': float(row['Price']),
                    'Rating': float(row['Product_Rating']),
                    'Image_Search': row['image_search'],
                    'image_path': row['image_path']      # ✅ generic subcategory image
                })
                seen_product_ids.add(row['Product_ID'])
    
    # Limit to top_n, but try to maintain category diversity
    if len(all_recs) > top_n:
        # Pehle unique categories maintain karte hue select karo
        category_count = {}
        selected = []
        
        for rec in all_recs:
            cat = rec['Category']
            if cat not in category_count:
                category_count[cat] = 1
                selected.append(rec)
            elif len(selected) < top_n and category_count[cat] < 2:
                category_count[cat] += 1
                selected.append(rec)
        
        # Agar abhi bhi kam hain to rating ke hisaab se fill karo
        if len(selected) < top_n:
            remaining = [r for r in all_recs if r not in selected]
            remaining.sort(key=lambda x: x['Rating'], reverse=True)
            selected.extend(remaining[:top_n - len(selected)])
        
        return selected[:top_n]
    
    return all_recs[:top_n]

# ============ HELPER FUNCTIONS ============
def init_cart():
    if 'loggedin' in session:
        if 'cart' not in session:
            session['cart'] = []
            session['cart_count'] = 0
            session['cart_total'] = 0.0

def get_product_by_id(product_id):
    product = product_df[product_df['Product_ID'] == product_id]
    if not product.empty:
        return product.iloc[0].to_dict()
    return None

def get_featured_products(limit=12):
    return product_df.sort_values('Product_Rating', ascending=False).head(limit).to_dict('records')

def get_categories():
    return sorted(product_df['Category'].unique().tolist())

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'loggedin' not in session:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'success': False, 'message': 'Please login to continue', 'redirect': url_for('login')}), 401
            flash('Please login to access this page', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def login_required_api(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'loggedin' not in session:
            return jsonify({'success': False, 'message': 'Please login to continue'}), 401
        return f(*args, **kwargs)
    return decorated_function
# ============================================

# ============ PUBLIC ROUTES ============
@app.route('/')
def index():
    init_cart()
    featured_products = get_featured_products(12)
    categories = get_categories()
    
    recommendations = []
    if 'loggedin' in session and not product_df.empty:
        popular_product = product_df.sort_values('Product_Rating', ascending=False).iloc[0]['Product_ID']
        recommendations = get_cross_sell_recommendations(popular_product, top_n=6)
    
    return render_template('home.html',
                         featured_products=featured_products,
                         recommendations=recommendations,
                         categories=categories,
                         cart_count=session.get('cart_count', 0) if 'loggedin' in session else 0,
                         logged_in=('loggedin' in session),
                         user_name=session.get('name', ''))

@app.route('/products')
def products():
    init_cart()
    
    category = request.args.get('category', '')
    search = request.args.get('search', '')
    
    filtered_products = product_df.copy()
    
    if category:
        filtered_products = filtered_products[filtered_products['Category'] == category]
    
    if search:
        search = search.lower()
        mask = (
            filtered_products['Category'].str.lower().str.contains(search) |
            filtered_products['Brand'].str.lower().str.contains(search) |
            filtered_products['Subcategory'].str.lower().str.contains(search)
        )
        filtered_products = filtered_products[mask]
    
    products_list = filtered_products.to_dict('records')
    categories_list = get_categories()
    
    return render_template('products.html',
                         products=products_list,
                         categories=categories_list,
                         selected_category=category,
                         search_query=search,
                         cart_count=session.get('cart_count', 0) if 'loggedin' in session else 0,
                         logged_in=('loggedin' in session))

@app.route('/product/<product_id>')
def product_detail(product_id):
    product = get_product_by_id(product_id)
    if not product:
        return render_template('404.html'), 404
    
    recommendations = get_cross_sell_recommendations(product_id, top_n=4)
    
    return render_template('product_detail.html',
                         product=product,
                         recommendations=recommendations,
                         logged_in=('loggedin' in session))

# ============ AUTH ROUTES ============
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('SELECT * FROM users WHERE email = %s AND password = %s', (email, password))
        user = cursor.fetchone()
        
        if user:
            session['loggedin'] = True
            session['userid'] = user['id']
            session['name'] = user['name']
            session['email'] = user['email']
            init_cart()
            
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)
            
            flash(f'Welcome {user["name"]}!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Invalid email or password!', 'danger')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        password = request.form['password']
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
        account = cursor.fetchone()
        
        if account:
            flash('Email already registered!', 'danger')
        elif not re.match(r'[^@]+@[^@]+\.[^@]+', email):
            flash('Invalid email address!', 'danger')
        elif not name or not password:
            flash('Please fill all fields!', 'danger')
        else:
            cursor.execute('INSERT INTO users (name, email, password) VALUES (%s, %s, %s)', 
                         (name, email, password))
            mysql.connection.commit()
            flash('Registration successful! Please login.', 'success')
            return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

# ============ PROTECTED ROUTES ============
@app.route('/add_to_cart', methods=['POST'])
@login_required_api
def add_to_cart():
    init_cart()
    
    product_id = request.form.get('product_id')
    quantity = int(request.form.get('quantity', 1))
    
    if not product_id:
        return jsonify({'success': False, 'message': 'Product ID is required!'})
    
    product = get_product_by_id(product_id)
    if not product:
        return jsonify({'success': False, 'message': 'Product not found!'})
    
    cart = session['cart']
    found = False
    
    for item in cart:
        if item['Product_ID'] == product_id:
            item['Quantity'] += quantity
            found = True
            break
    
    if not found:
        cart.append({
            'Product_ID': product_id,
            'Product_Name': f"{product['Brand']} - {product['Category']}",
            'Brand': product['Brand'],
            'Category': product['Category'],
            'Subcategory': product['Subcategory'],
            'Price': float(product['Price']),
            'Rating': float(product['Product_Rating']),
            'Image_Search': product['image_search'],
            'image_path': product['image_path'],   # ✅ generic subcategory image
            'Quantity': quantity
        })
    
    session['cart'] = cart
    session['cart_count'] = sum(item['Quantity'] for item in cart)
    session['cart_total'] = sum(item['Price'] * item['Quantity'] for item in cart)
    session.modified = True
    
    return jsonify({
        'success': True,
        'message': 'Product added to cart!',
        'cart_count': session['cart_count'],
        'cart_total': f"${session['cart_total']:.2f}"
    })

@app.route('/cart')
@login_required
def cart():
    init_cart()
    
    cart_items = session.get('cart', [])
    cart_total = session.get('cart_total', 0.0)
    
    # Use combined recommendations (6 items)
    recommendations = get_combined_cart_recommendations(cart_items, top_n=6)
    
    return render_template('cart.html',
                         cart_items=cart_items,
                         cart_total=cart_total,
                         recommendations=recommendations,
                         cart_count=session.get('cart_count', 0))

@app.route('/update_cart', methods=['POST'])
@login_required_api
def update_cart():
    product_id = request.form.get('product_id')
    action = request.form.get('action')
    
    if not product_id or not action:
        return jsonify({'success': False, 'message': 'Invalid request!'})
    
    cart = session.get('cart', [])
    new_cart = []
    
    for item in cart:
        if item['Product_ID'] == product_id:
            if action == 'increase':
                item['Quantity'] += 1
                new_cart.append(item)
            elif action == 'decrease':
                if item['Quantity'] > 1:
                    item['Quantity'] -= 1
                    new_cart.append(item)
            elif action == 'remove':
                continue
        else:
            new_cart.append(item)
    
    session['cart'] = new_cart
    session['cart_count'] = sum(item['Quantity'] for item in new_cart)
    session['cart_total'] = sum(item['Price'] * item['Quantity'] for item in new_cart)
    session.modified = True
    
    return jsonify({
        'success': True,
        'message': 'Cart updated!',
        'cart_count': session['cart_count'],
        'cart_total': f"${session['cart_total']:.2f}"
    })

@app.route('/clear_cart', methods=['POST'])
@login_required_api
def clear_cart():
    session['cart'] = []
    session['cart_count'] = 0
    session['cart_total'] = 0.0
    session.modified = True
    return jsonify({'success': True, 'message': 'Cart cleared!'})

@app.route('/checkout', methods=['POST'])
@login_required_api
def checkout():
    cart_items = session.get('cart', [])
    if not cart_items:
        return jsonify({'success': False, 'message': 'Cart is empty!'})
    
    try:
        cursor = mysql.connection.cursor()
        total = session.get('cart_total', 0)
        cursor.execute('INSERT INTO orders (user_id, total_amount) VALUES (%s, %s)', 
                      (session['userid'], total))
        order_id = cursor.lastrowid
        
        for item in cart_items:
            cursor.execute('INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (%s, %s, %s, %s, %s)',
                          (order_id, item['Product_ID'], item['Product_Name'], item['Quantity'], item['Price']))
        
        mysql.connection.commit()
        
        session['cart'] = []
        session['cart_count'] = 0
        session['cart_total'] = 0
        session.modified = True
        
        return jsonify({'success': True, 'message': f'Order #{order_id} placed successfully!', 'order_id': order_id})
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/profile')
@login_required
def profile():
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute('SELECT * FROM orders WHERE user_id = %s ORDER BY created_at DESC', (session['userid'],))
    orders = cursor.fetchall()
    return render_template('profile.html',
                         name=session['name'],
                         email=session['email'],
                         orders=orders,
                         cart_count=session.get('cart_count', 0))

# ============ API ENDPOINTS ============
@app.route('/api/products/<product_id>')
def api_product_detail(product_id):
    product = get_product_by_id(product_id)
    if product:
        return jsonify({'success': True, 'product': product})
    return jsonify({'success': False, 'message': 'Product not found'})

@app.route('/api/search_products')
def api_search():
    query = request.args.get('q', '')
    if not query:
        return jsonify({'success': False, 'message': 'Search query required'})
    
    results = []
    for _, product in product_df.iterrows():
        if query.lower() in product['Category'].lower() or query.lower() in product['Brand'].lower():
            results.append({
                'id': product['Product_ID'],
                'name': f"{product['Brand']} - {product['Category']}",
                'category': product['Category'],
                'price': product['Price'],
                'image_path': product['image_path']
            })
    return jsonify({'success': True, 'results': results[:10]})

# ============ DATABASE INIT ============
def init_db():
    try:
        cursor = mysql.connection.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                product_id VARCHAR(50) NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                quantity INT NOT NULL,
                price DECIMAL(10,2) NOT NULL
            )
        ''')
        mysql.connection.commit()
        print("✓ Database initialized")
    except Exception as e:
        print(f"Database error: {e}")

# ============ ERROR HANDLERS ============
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500

# ============ RUN ============
if __name__ == '__main__':
    with app.app_context():
        init_db()
    
    # Create images directory if not exists
    os.makedirs('static/images', exist_ok=True)
    
    print(f"✓ {len(product_df)} products loaded with generic subcategory images")
    print("✓ Ready to run!")
    print("\n➡️  Home page: http://localhost:5000")
    print("➡️  Products: http://localhost:5000/products")
    print("➡️  Login: http://localhost:5000/login")
    print("="*60)
    app.run(debug=True, host='0.0.0.0', port=5000)