import os
import pyodbc
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv

# --- App Setup ---
load_dotenv() # Load environment variables from .env file for local development

app = Flask(__name__, static_folder='public', static_url_path='')
app.config['JSON_SORT_KEYS'] = False

# --- Database Connection ---
def get_db_connection():
    """Establishes a connection to the Azure SQL Database."""
    driver = os.environ.get('DB_DRIVER')
    server = os.environ.get('DB_SERVER')
    database = os.environ.get('DB_NAME')
    username = os.environ.get('DB_USER')
    password = os.environ.get('DB_PASSWORD')
    
    conn_str = f'DRIVER={driver};SERVER=tcp:{server};DATABASE={database};UID={username};PWD={password}'
    
    try:
        conn = pyodbc.connect(conn_str)
        return conn
    except pyodbc.Error as ex:
        sqlstate = ex.args[0]
        print(f"Database connection failed: {sqlstate}")
        # In a real app, you'd have more robust error handling
        raise ex

def init_db():
    """Creates the 'groceries' table if it doesn't already exist."""
    print("Checking if database table exists...")
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Use T-SQL syntax to check for table existence
            table_check_sql = """
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='groceries' and xtype='U')
            CREATE TABLE groceries (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(255),
                tags NVARCHAR(MAX) NOT NULL,
                expiry_date DATE,
                image_base64 NVARCHAR(MAX) NOT NULL,
                consumed BIT DEFAULT 0,
                created_at DATETIME DEFAULT GETDATE()
            )
            """
            cursor.execute(table_check_sql)
            conn.commit()
        print("Database initialized and table is ready.")
    except Exception as e:
        print(f"An error occurred during DB initialization: {e}")
        # This is critical. If DB init fails, the app cannot run.
        # We will exit to allow the container orchestration service to restart it.
        exit(1)


def query_db(query, params=(), fetchall=False):
    """Helper function to query the database and return results as dicts."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        if query.strip().upper().startswith('SELECT'):
            columns = [column[0] for column in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return results if fetchall else (results[0] if results else None)
        else:
            conn.commit()
            return cursor.rowcount

# --- API Routes (No changes needed to the logic here!) ---

@app.route('/api/groceries', methods=['GET'])
def get_groceries():
    sql = "SELECT * FROM groceries WHERE consumed = 0 ORDER BY created_at DESC"
    items = query_db(sql, fetchall=True)
    return jsonify(items)

@app.route('/api/grocery', methods=['POST'])
def add_grocery():
    data = request.get_json()
    sql = "INSERT INTO groceries (name, tags, expiry_date, image_base64) VALUES (?, ?, ?, ?)"
    params = (
        data.get('name'),
        data.get('tags'),
        data.get('expiry_date'),
        data.get('image_base64')
    )
    query_db(sql, params)
    # To get the last ID in SQL Server, it's a bit more complex. For simplicity, we'll return a success message.
    return jsonify({"success": True}), 201

@app.route('/api/grocery/consume/<int:item_id>', methods=['POST'])
def consume_grocery(item_id):
    sql = "UPDATE groceries SET consumed = 1 WHERE id = ?"
    changes = query_db(sql, (item_id,))
    return jsonify({"success": True, "changes": changes})

# --- Serve Frontend ---
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# --- Main Execution ---
if __name__ == '__main__':
    init_db()
    # Port will be set by the hosting environment, default to 8000 for ACA
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)