import sqlite3

db_path = 'data/copilot.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("""
INSERT INTO reports (user_id, document_id, summary, reasoning, confidence_score, timeline, generated_at, recommendations, risk_score) 
VALUES (1, 1, 'Great summary', 'Good reasoning', 95.0, '[{"event": "Analyzed Finances", "date": "2026-06-09T18:56:00"}]', datetime('now'), '{"budgeting": "Save more"}', 80.0)
""")

conn.commit()
conn.close()
print("Report inserted successfully")
