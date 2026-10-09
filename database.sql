-- Create Database
CREATE DATABASE IF NOT EXISTS smart_garment;
USE smart_garment;

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: products
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image VARCHAR(255),
    sizes VARCHAR(255) NOT NULL, -- comma-separated sizes, e.g. 'S,M,L,XL,XXL'
    stock INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: cart
CREATE TABLE IF NOT EXISTS cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    size VARCHAR(10) NOT NULL,
    quantity INT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Table: orders
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status ENUM('Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table: order_items
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    size VARCHAR(10) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Table: reviews
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    rating INT NOT NULL CHECK(rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Table: size_predictions
CREATE TABLE IF NOT EXISTS size_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    height DECIMAL(5, 2) NOT NULL,
    weight DECIMAL(5, 2) NOT NULL,
    chest DECIMAL(5, 2) NOT NULL,
    waist DECIMAL(5, 2) NOT NULL,
    fit_preference VARCHAR(50) NOT NULL,
    predicted_size VARCHAR(10) NOT NULL,
    confidence DECIMAL(5, 2) NOT NULL,
    bmi DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed Sample Products
INSERT INTO products (name, category, description, price, image, sizes, stock) VALUES
('Classic Denim Jacket', 'Men\'s Wear', 'A classic denim jacket with premium stitching and buttons. Durable and stylish.', 1899.00, 'classic_denim_jacket.jpg', 'S,M,L,XL,XXL', 45),
('Slim Fit Cotton Chinos', 'Men\'s Wear', 'Comfortable stretch cotton chinos in a slim fit, perfect for smart-casual wear.', 1499.00, 'slim_fit_chinos.jpg', 'M,L,XL', 60),
('Casual Oxford Shirt', 'Shirts', 'Breathable cotton oxford shirt, button-down collar, regular fit.', 1299.00, 'casual_oxford_shirt.jpg', 'S,M,L,XL,XXL', 35),
('Summer Floral Dress', 'Dresses', 'Beautiful, lightweight floral printed dress with a flounce hemline.', 2199.00, 'summer_floral_dress.jpg', 'S,M,L', 25),
('Graphic Print Tee', 'T-Shirts', 'Premium 100% cotton crewneck graphic t-shirt. Soft-washed and pre-shrunk.', 599.00, 'graphic_print_tee.jpg', 'S,M,L,XL,XXL', 100),
('Athletic Jogger Pants', 'Pants', 'High-performance quick-dry joggers with zip pockets and drawstring waist.', 999.00, 'athletic_joggers.jpg', 'S,M,L,XL', 50),
('Cozy Fleece Pajamas', 'Night Wear', 'Super-soft fleece pajama set for warm and cozy nights.', 1599.00, 'cozy_fleece_pajamas.jpg', 'M,L,XL,XXL', 30),
('Seamless Sports Bra', 'Inner Wear', 'High-support wire-free sports bra with moisture-wicking technology.', 799.00, 'sports_bra.jpg', 'S,M,L', 40),
('Pima Cotton Undershirt 3-Pack', 'Inner Wear', 'Ultra-soft Pima cotton crew neck undershirts, tagless design.', 1199.00, 'cotton_undershirt_pack.jpg', 'M,L,XL', 80),
('Elegant Silk Nightgown', 'Night Wear', 'Lustrous mulberry silk nightgown with lace trim details.', 3499.00, 'silk_nightgown.jpg', 'S,M,L', 15),
('Linen Summer Pants', 'Pants', 'Lightweight breathable linen pants with drawstring waist.', 1799.00, 'linen_summer_pants.jpg', 'S,M,L,XL', 30),
('Striped Cotton Shirt', 'Shirts', 'Classic vertical stripe pattern casual shirt, slim fit.', 1199.00, 'striped_cotton_shirt.jpg', 'S,M,L,XL', 45),
('Elegant Evening Gown', 'Dresses', 'Floor-length satin evening gown with a high slit and cross-back straps.', 3999.00, 'evening_gown.jpg', 'S,M,L,XL', 20),
('Boho Maxi Summer Dress', 'Dresses', 'V-neck tier layered bohemian maxi dress in breathable rayon fabric.', 2499.00, 'boho_maxi_dress.jpg', 'S,M,L,XXL', 35),
('Velvet Party Bodycon Dress', 'Dresses', 'Luxurious royal velvet bodycon dress with sweetheart neckline.', 2899.00, 'velvet_party_dress.jpg', 'S,M,L', 15),
('Classic Little Black Dress', 'Dresses', 'Timeless knee-length sheath dress with tailored stretch crepe fabric.', 1999.00, 'little_black_dress.jpg', 'S,M,L,XL', 40),
('Chiffon A-Line Midi Dress', 'Dresses', 'Flowy pleated chiffon midi dress with delicate waist belt.', 2299.00, 'chiffon_midi_dress.jpg', 'S,M,L,XL', 25),
('Satin Slip Cocktail Dress', 'Dresses', 'Cowl neck bias cut silk-satin slip dress for evening outings.', 2799.00, 'satin_slip_dress.jpg', 'S,M,L', 18),
('Embroidered Anarkali Dress', 'Women\'s Wear', 'Traditional embroidered flared Anarkali dress with dupatta set.', 3199.00, 'anarkali_kurti_dress.jpg', 'S,M,L,XL,XXL', 30),
('Casual Wrap Denim Shirt Dress', 'Dresses', 'Button-down denim shirt dress with tie-up belt and roll-up sleeves.', 1899.00, 'denim_shirt_dress.jpg', 'S,M,L,XL', 28);


