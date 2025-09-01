import os
import sqlite3
from flask import Flask, request, jsonify, send_from_directory

# --- App Setup ---
app = Flask(__name__, static_folder='public', static_url_path='')
app.config['JSON_SORT_KEYS'] = False # Keep JSON order as is
DB_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database')
DB_PATH = os.path.join(DB_FOLDER, 'groceries.db')

# --- Database Setup ---
def init_db():
    """Initializes the database and creates the table if it doesn't exist."""
    if not os.path.exists(DB_FOLDER):
        os.makedirs(DB_FOLDER)
    
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS groceries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                tags TEXT NOT NULL,
                expiry_date DATE,
                image_base64 TEXT NOT NULL,
                consumed INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
    print("Database initialized and table is ready.")

def dict_factory(cursor, row):
    """Converts database query results (tuples) into dictionaries."""
    fields = [column[0] for column in cursor.description]
    return {key: value for key, value in zip(fields, row)}

# --- API Routes ---

@app.route('/api/groceries', methods=['GET'])
def get_groceries():
    """Get all non-consumed groceries."""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = dict_factory
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM groceries WHERE consumed = 0 ORDER BY created_at DESC")
            items = cursor.fetchall()
            return jsonify(items)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/grocery', methods=['POST'])
def add_grocery():
    """Add a new grocery item."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid input"}), 400

    name = data.get('name')
    tags = data.get('tags')
    expiry_date = data.get('expiry_date')
    image_base64 = data.get('image_base64')

    sql = "INSERT INTO groceries (name, tags, expiry_date, image_base64) VALUES (?, ?, ?, ?)"
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(sql, (name, tags, expiry_date, image_base64))
            conn.commit()
            return jsonify({"id": cursor.lastrowid}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/grocery/consume/<int:item_id>', methods=['POST'])
def consume_grocery(item_id):
    """Mark a grocery item as consumed."""
    sql = "UPDATE groceries SET consumed = 1 WHERE id = ?"
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(sql, (item_id,))
            conn.commit()
            return jsonify({"success": True, "changes": cursor.rowcount})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Serve Frontend ---

@app.route('/')
def index():
    """Serves the main index.html file."""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serves other static files like gallery.html, css, js."""
    return send_from_directory(app.static_folder, path)


# --- Main Execution ---
if __name__ == '__main__':
    init_db()
    # Host='0.0.0.0' is important for running inside Docker
    app.run(host='0.0.0.0', port=3000, debug=True)