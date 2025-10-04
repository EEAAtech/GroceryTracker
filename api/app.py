import os
import pyodbc
from flask import Flask, request, jsonify
from datetime import datetime, timedelta, date

# --- App Setup (Flask app object is created as before) ---
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# --- Database Connection and Helpers (No changes in this section) ---
def get_db_connection():
    driver = os.environ.get('DB_DRIVER')
    server = os.environ.get('DB_SERVER')
    database = os.environ.get('DB_NAME')
    username = os.environ.get('DB_USER')
    password = os.environ.get('DB_PASSWORD')
    conn_str = f'DRIVER={driver};SERVER=tcp:{server};DATABASE={database};UID={username};PWD={password}'
    try:
        conn = pyodbc.connect(conn_str, autocommit=True) # autocommit=True is good practice for functions
        return conn
    except pyodbc.Error as ex:
        print(f"Database connection failed: {ex}")
        raise

def dict_factory(cursor, row):
    fields = [column[0] for column in cursor.description]
    return {key: value for key, value in zip(fields, row)}

def parse_relative_date(relative_str):
    if not relative_str or not isinstance(relative_str, str) or len(relative_str) < 2:
        return None
    today = date.today()
    unit = relative_str[-1].lower()
    try:
        value = int(relative_str[:-1])
    except ValueError:
        return None
    if unit == 'd': return today - timedelta(days=value)
    elif unit == 'w': return today - timedelta(weeks=value)
    elif unit == 'm': return today - timedelta(days=value * 30)
    else: return None

# --- API Routes (No changes to the routes themselves) ---
@app.route('/api/groceries', methods=['GET'])
def get_groceries():
    tag = request.args.get('tag')
    subtag = request.args.get('subtag')
    show_consumed = request.args.get('consumed', 'false').lower() == 'true'
    from_date_str = request.args.get('from_date')
    to_date_str = request.args.get('to_date')

    if not tag or not subtag:
        return jsonify([])

    try:
        params = []
        sql = "SELECT * FROM groceries WHERE "
        consumed_status = 1 if show_consumed else 0
        sql += "consumed = ? "
        params.append(consumed_status)
        tags_filter = f"{tag},{subtag}"
        sql += "AND tags = ? "
        params.append(tags_filter)

        if show_consumed:
            start_date = parse_relative_date(from_date_str)
            end_date = parse_relative_date(to_date_str) if to_date_str else date.today()
            if start_date:
                end_date_inclusive = datetime.combine(end_date, datetime.max.time())
                sql += "AND consumed_at BETWEEN ? AND ? "
                params.extend([start_date, end_date_inclusive])
        
        order_by_clause = "ORDER BY consumed_at DESC" if show_consumed else "ORDER BY expiry_date IS NULL DESC, expiry_date ASC"
        sql += order_by_clause
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, tuple(params))
            items = [dict_factory(cursor, row) for row in cursor.fetchall()]
            return jsonify(items)
    except Exception as e:
        print(f"Error fetching filtered groceries: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/grocery', methods=['POST'])
def add_grocery():
    data = request.get_json()
    sql = "INSERT INTO groceries (name, tags, expiry_date, image_base_64) VALUES (?, ?, ?, ?)"
    params = (data.get('name'), data.get('tags'), data.get('expiry_date'), data.get('image_base64'))
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
    return jsonify({"success": True}), 201

@app.route('/api/grocery/consume/<int:item_id>', methods=['POST'])
def consume_grocery(item_id):
    sql = "UPDATE groceries SET consumed = 1, consumed_at = GETDATE() WHERE id = ?"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, item_id)
        changes = cursor.rowcount
    return jsonify({"success": True, "changes": changes})

