import json
from flask import Blueprint, request
from api.utils import api_response, sanitize_db_dict, sanitize_db_list, generate_etag

products_bp = Blueprint('products', __name__)

def get_db():
    from app import get_db_connection
    return get_db_connection()

@products_bp.route('', methods=['GET'])
def list_products():
    """List products with pagination, category filter, price range, search query, and sorting."""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    sort_by = request.args.get('sort_by', 'newest').strip()

    offset = (page - 1) * limit

    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        where_clauses = []
        params = []

        if search:
            where_clauses.append("(name LIKE %s OR description LIKE %s)")
            params.extend([f"%{search}%", f"%{search}%"])

        if category:
            where_clauses.append("category = %s")
            params.append(category)

        if min_price is not None:
            where_clauses.append("price >= %s")
            params.append(min_price)

        if max_price is not None:
            where_clauses.append("price <= %s")
            params.append(max_price)

        where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        order_sql = " ORDER BY id DESC"
        if sort_by == 'price_asc':
            order_sql = " ORDER BY price ASC"
        elif sort_by == 'price_desc':
            order_sql = " ORDER BY price DESC"
        elif sort_by == 'name_asc':
            order_sql = " ORDER BY name ASC"

        # Count total
        def safe_val(row, key='total', default=0):
            if row is None:
                return default
            if isinstance(row, dict):
                v = row.get(key)
                return v if v is not None else default
            try:
                v = row[key]
                return v if v is not None else default
            except Exception:
                try:
                    return row[0] if row[0] is not None else default
                except Exception:
                    return default

        # Count total
        count_query = f"SELECT COUNT(*) as total FROM products{where_sql}"
        cursor.execute(count_query, params)
        total = safe_val(cursor.fetchone(), 'total', 0)

        # Fetch page
        data_query = f"SELECT * FROM products{where_sql}{order_sql} LIMIT %s OFFSET %s"
        cursor.execute(data_query, params + [limit, offset])
        products = cursor.fetchall()
        cursor.close()
        conn.close()

        sanitized_products = sanitize_db_list(products)
        # Parse sizes comma-separated string into list
        for p in sanitized_products:
            if isinstance(p.get('sizes'), str):
                p['sizes_list'] = [s.strip() for s in p['sizes'].split(',') if s.strip()]

        total_pages = (total + limit - 1) // limit if limit > 0 else 1

        result_payload = {
            "products": sanitized_products,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": total_pages
            }
        }

        # Check ETag header for HTTP caching
        raw_json = json.dumps(result_payload, sort_keys=True)
        etag = generate_etag(raw_json)
        if request.headers.get('If-None-Match') == etag:
            return api_response(status_code=304, headers={'ETag': etag})

        return api_response(data=result_payload, headers={'ETag': etag})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product_detail(product_id):
    """Fetch product details with average rating and reviews."""
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        product = cursor.fetchone()
        if not product:
            cursor.close()
            conn.close()
            return api_response(error={"code": "NOT_FOUND", "message": "Product not found"}, status_code=404)

        # Fetch reviews and avg rating
        cursor.execute(
            """SELECT r.*, u.name as user_name FROM reviews r
               JOIN users u ON r.user_id = u.id
               WHERE r.product_id = %s ORDER BY r.id DESC""",
            (product_id,)
        )
        reviews = cursor.fetchall()

        cursor.execute(
            "SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = %s",
            (product_id,)
        )
        stats = cursor.fetchone()
        cursor.close()
        conn.close()

        def safe_val_stat(row, key, default=0):
            if not row:
                return default
            if isinstance(row, dict):
                v = row.get(key)
                return v if v is not None else default
            try:
                v = row[key]
                return v if v is not None else default
            except Exception:
                try:
                    return row[0] if row[0] is not None else default
                except Exception:
                    return default

        sanitized_product = sanitize_db_dict(product)
        if isinstance(sanitized_product.get('sizes'), str):
            sanitized_product['sizes_list'] = [s.strip() for s in sanitized_product['sizes'].split(',') if s.strip()]

        sanitized_product['rating'] = {
            "average": round(float(safe_val_stat(stats, 'avg_rating', 0.0)), 1),
            "count": int(safe_val_stat(stats, 'review_count', 0))
        }
        sanitized_product['reviews'] = sanitize_db_list(reviews)

        return api_response(data={"product": sanitized_product})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@products_bp.route('/categories', methods=['GET'])
def list_categories():
    """List distinct product categories."""
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category ASC")
        rows = cursor.fetchall() or []
        cursor.close()
        conn.close()

        categories = [r['category'] if isinstance(r, dict) else r[0] for r in rows]
        return api_response(data={"categories": categories})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)
