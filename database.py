import sqlite3
import os

DB_PATH = 'ai_recognizer.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname TEXT UNIQUE,
            password TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            url TEXT,
            verdict TEXT,
            reason TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Migration: Add user_id if it doesn't exist (for existing databases)
    try:
        cursor.execute("ALTER TABLE history ADD COLUMN user_id INTEGER")
    except sqlite3.OperationalError:
        # Column already exists
        pass
        
    conn.commit()
    conn.close()
    print("Database initialized.")

def register_user(nickname, password):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (nickname, password)
            VALUES (?, ?)
        ''', (nickname, password))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return user_id
    except sqlite3.IntegrityError:
        conn.close()
        return None # Nickname already exists

def login_user(nickname, password):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM users WHERE nickname = ? AND password = ?', (nickname, password))
    user = cursor.fetchone()
    conn.close()
    return user[0] if user else None

def save_to_history(user_id, url, verdict, reason):
    if verdict not in ['AI-Generated', 'Real Photo']:
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Avoid exact duplicates for the same user
    cursor.execute('SELECT id FROM history WHERE url = ? AND user_id = ?', (url, user_id))
    if cursor.fetchone():
        conn.close()
        return

    cursor.execute('''
        INSERT INTO history (user_id, url, verdict, reason)
        VALUES (?, ?, ?, ?)
    ''', (user_id, url, verdict, reason))
    conn.commit()
    conn.close()

def get_stats(user_id=None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    query_killed = "SELECT COUNT(*) FROM history WHERE verdict = 'AI-Generated'"
    query_studied = "SELECT COUNT(*) FROM history WHERE verdict = 'Real Photo'"
    query_list_killed = "SELECT url, reason FROM history WHERE verdict = 'AI-Generated'"
    query_list_studied = "SELECT url, reason FROM history WHERE verdict = 'Real Photo'"
    
    params = []
    if user_id:
        query_killed += " AND user_id = ?"
        query_studied += " AND user_id = ?"
        query_list_killed += " AND user_id = ?"
        query_list_studied += " AND user_id = ?"
        params = [user_id]

    cursor.execute(query_killed, params)
    killed_ai_count = cursor.fetchone()[0]
    
    cursor.execute(query_studied, params)
    studied_human_count = cursor.fetchone()[0]
    
    cursor.execute(query_list_killed + " ORDER BY timestamp DESC LIMIT 50", params)
    killed_ai_list = [{"url": row[0], "reason": row[1]} for row in cursor.fetchall()]
    
    cursor.execute(query_list_studied + " ORDER BY timestamp DESC LIMIT 50", params)
    studied_human_list = [{"url": row[0], "reason": row[1]} for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        "killedAI": killed_ai_list,
        "studiedHuman": studied_human_list,
        "killedCount": killed_ai_count,
        "studiedCount": studied_human_count
    }
