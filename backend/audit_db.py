import sqlite3
import json

db_path = 'data/copilot.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- SQLITE AUDIT ---")
print(f"1. Database file location: d:/Apex/backend/{db_path}")

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
tables = [t[0] for t in tables]
print(f"2. All tables: {', '.join(tables)}")

print("\n3. Table schemas:")
for table in tables:
    print(f"\nSchema for {table}:")
    cursor.execute(f"PRAGMA table_info({table});")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")

print("\n4. Row counts in each table:")
for table in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {table};")
    count = cursor.fetchone()[0]
    print(f"  - {table}: {count} rows")

conn.close()
