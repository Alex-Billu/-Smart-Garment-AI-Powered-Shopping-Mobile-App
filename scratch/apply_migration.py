import sqlite3
import re

def apply():
    conn = sqlite3.connect('smart_garment.db')
    with open('migrations/001_mobile_tables.sql', 'r') as f:
        sql = f.read()

    # Apply the same regex replacements as app.py just to be sure
    sql = re.sub(r'INT AUTO_INCREMENT PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bON UPDATE\s+\S+', '', sql, flags=re.IGNORECASE)

    try:
        conn.executescript(sql)
        print("Migration applied successfully.")
    except Exception as e:
        print("Error applying migration:", e)
    
    # Verify tables
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    print("Tables:", [r[0] for r in cursor.fetchall()])
    
if __name__ == '__main__':
    apply()
