import sqlite3

MIGRATIONS = [
    ("knowledge_sessions", "department", "VARCHAR"),
    ("knowledge_sessions", "role", "VARCHAR"),
    ("knowledge_sessions", "experience", "VARCHAR"),
    ("knowledge_sessions", "expertise", "VARCHAR"),
    ("knowledge_sessions", "parent_session_id", "VARCHAR"),
    ("knowledge_insights", "resolved_by_session_id", "VARCHAR"),
    ("knowledge_insights", "resolved_at", "DATETIME"),
    ("knowledge_assets", "supersedes_asset_id", "VARCHAR"),
]

conn = sqlite3.connect('boomerbot.db')
cursor = conn.cursor()

for table, column, coltype in MIGRATIONS:
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {coltype};")
        print(f"Added {table}.{column}")
    except sqlite3.OperationalError as e:
        print(f"Skipped {table}.{column}: {e}")

conn.commit()
conn.close()
print("Migration complete")
