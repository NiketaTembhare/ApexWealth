import asyncio
from services.document_parser import parse_document

csv_text = """date,description,category,amount,type
2026-05-01,Salary Credit,Income,65000,CREDIT
2026-05-10,Swiggy Order,Food,350,DEBIT
2026-05-15,Electricity Bill,Utilities,1200,DEBIT"""

res = parse_document(csv_text.encode('utf-8'), "manual.txt", "text/plain")
print("RESULT:", res)
