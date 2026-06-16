"""
Advanced Document Parser Service
Supports: PDF, CSV, Excel, plain text
Extracts transactions with AI-powered categorization and confidence scoring
"""

import re
import io
import csv
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger("document-parser")

# ────────────────────────────────────────────
# SMART CATEGORY KEYWORD MAP
# ────────────────────────────────────────────
CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "Food & Dining": [
        "swiggy", "zomato", "blinkit", "bigbasket", "dominos", "domino",
        "mcdonald", "kfc", "pizza", "burger", "cafe", "coffee", "starbucks",
        "haldiram", "subway", "dunkin", "biryani", "restaurant", "dining",
        "food", "grocery", "grocer", "fresh", "daily", "box8", "faasos",
        "rebel foods", "eatclub", "licious", "milkbasket",
    ],
    "Shopping": [
        "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "snapdeal",
        "shopsy", "tata cliq", "reliance", "h&m", "zara", "westside",
        "lifestyle", "pantaloon", "shoppers stop", "urban ladder", "ikea",
        "pepperfry", "firstcry", "decathlon", "bewakoof", "goods",
    ],
    "Entertainment": [
        "netflix", "hotstar", "disney", "prime video", "amazon prime",
        "spotify", "youtube", "gaana", "jiosaavn", "zee5", "sonyliv",
        "bookmyshow", "pvr", "inox", "carnival", "games", "gaming",
        "playstation", "xbox", "steam", "epic", "subscription",
    ],
    "Travel": [
        "ola", "uber", "rapido", "meru", "indrive", "yulu", "vogo",
        "makemytrip", "goibibo", "cleartrip", "ixigo", "easemytrip",
        "irctc", "indigo", "spicejet", "air india", "vistara", "airline",
        "redbus", "abhibus", "yatra", "metro", "bus", "cab", "taxi", "travel",
        "hotel", "oyo", "zostel", "airbnb", "booking.com",
    ],
    "Fuel": [
        "indian oil", "iocl", "bpcl", "hpcl", "shell", "reliance petrol",
        "petrol", "diesel", "cng", "fuel", "hp petroleum",
    ],
    "Rent": [
        "rent", "housing", "landlord", "pg payment", "accommodation",
        "society maintenance", "flat", "lease",
    ],
    "Utilities": [
        "electricity", "bescom", "msedcl", "tata power", "adani electricity",
        "water", "bwssb", "gas", "mahanagar gas", "indraprastha gas",
        "airtel", "jio", "bsnl", "vi ", "vodafone", "idea", "recharge",
        "broadband", "internet", "postpaid", "lpg", "cylinder", "bill payment",
        "bbps", "utility", "d2h", "tatasky", "dish tv",
    ],
    "SIP / MF": [
        "sip", "mutual fund", "mf ", "axis mutual", "hdfc mutual", "sbi mutual",
        "mirae", "nippon", "parag parikh", "icici prudential", "kotak mutual",
        "uti mutual", "franklin", "motilal", "dsp mutual", "aditya birla",
    ],
    "Investment": [
        "zerodha", "groww", "angel one", "upstox", "5paisa", "motilal oswal",
        "sharekhan", "iifl", "nse", "bse", "nifty", "stocks", "equity",
        "demat", "trading", "ppf", "nps", "gold bond", "sovereign", "fd ",
        "fixed deposit", "rd ", "recurring deposit",
    ],
    "Healthcare": [
        "apollo", "fortis", "max hospital", "manipal", "aiims", "doctor",
        "hospital", "clinic", "pharmacy", "medplus", "netmeds", "1mg",
        "pharmeasy", "practo", "healthkart", "medicine", "health", "dental",
        "optical", "lab test", "diagnostic", "pathology",
    ],
    "Education": [
        "school", "college", "university", "tuition", "coaching", "byju",
        "vedantu", "unacademy", "coursera", "udemy", "simplilearn", "upgrad",
        "skillshare", "exam fee", "admission", "fees", "education",
    ],
    "Salary": [
        "salary", "sal cr", "payroll", "wages", "income", "neft cr",
        "credit by", "employer", "tcs", "infosys", "wipro", "accenture",
        "capgemini", "hcl", "tech mahindra", "cognizant", "ibm", "deloitte",
    ],
    "EMI": [
        "emi", "loan emi", "home loan", "car loan", "personal loan",
        "nach debit", "nach return", "hdfc loan", "sbi loan", "icici loan",
        "axis loan", "bajaj finance", "muthoot", "manappuram",
    ],
}

# Recurring subscription patterns
RECURRING_KEYWORDS = [
    "netflix", "spotify", "hotstar", "prime", "youtube premium", "jio",
    "airtel", "bsnl", "vi ", "broadband", "d2h", "tatasky", "dish tv",
    "sip", "emi", "nach", "standing instruction", "si ", "auto debit",
    "recurring", "subscription", "annual fee", "renewal",
]

# ────────────────────────────────────────────
# DATE PATTERNS
# ────────────────────────────────────────────
DATE_PATTERNS = [
    r'\b(\d{2}[-/]\d{2}[-/]\d{4})\b',      # DD-MM-YYYY or DD/MM/YYYY
    r'\b(\d{4}[-/]\d{2}[-/]\d{2})\b',      # YYYY-MM-DD
    r'\b(\d{2}[-/]\d{2}[-/]\d{2})\b',      # DD-MM-YY
    r'\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4})\b',
    r'\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})\b',
]

# ────────────────────────────────────────────
# AMOUNT PATTERNS
# ────────────────────────────────────────────
AMOUNT_PATTERNS = [
    r'(?:INR|₹|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)',
    r'\b([\d,]+\.\d{2})\b',
    r'\b([\d]{3,})\b',
]

# ────────────────────────────────────────────
# FULL TRANSACTION LINE PATTERNS (for statement tables)
# ────────────────────────────────────────────
TX_LINE_PATTERNS = [
    # DD/MM/YYYY DESCRIPTION AMOUNT Dr/Cr
    r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s+(.{5,60}?)\s+([\d,]+(?:\.\d{2})?)\s*(Dr|Cr|DR|CR|Debit|Credit)?',
    # DATE DESCRIPTION DEBIT CREDIT BALANCE
    r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s+(.{5,60}?)\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)',
]


def normalize_amount(amount_str: str) -> float:
    """Clean and parse amount string to float"""
    if not amount_str:
        return 0.0
    cleaned = re.sub(r'[₹,INR Rs\s]', '', str(amount_str)).strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def normalize_date(date_str: str) -> str:
    """Try to parse various date formats to YYYY-MM-DD"""
    date_str = date_str.strip()
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y",
        "%Y-%m-%d", "%Y/%m/%d",
        "%d %b %Y", "%d %b %y", "%b %d, %Y", "%b %d %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return date_str


def classify_category(description: str) -> Tuple[str, int]:
    """
    Returns (category, confidence_percent) based on keyword matching.
    Confidence is higher when more specific keywords match.
    """
    desc_lower = description.lower()

    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in desc_lower:
                # More specific match → higher confidence
                specificity = len(kw) / max(len(desc_lower), 1)
                confidence = min(98, int(75 + specificity * 100))
                return category, confidence

    return "Uncategorized", 45


def is_recurring(description: str) -> bool:
    """Detect if this looks like a recurring payment"""
    desc_lower = description.lower()
    return any(kw in desc_lower for kw in RECURRING_KEYWORDS)


def detect_transaction_type(row_data: dict, description: str) -> str:
    """Detect if transaction is Credit or Debit"""
    desc_lower = description.lower()

    # Explicit markers
    if any(x in desc_lower for x in ["salary", "sal cr", "credit by", "received from", "refund"]):
        return "Credit"

    # Check if type column provided
    tx_type = str(row_data.get("type", row_data.get("Type", row_data.get("txn_type", "")))).lower()
    if "credit" in tx_type or " cr" in tx_type or tx_type == "cr":
        return "Credit"
    if "debit" in tx_type or " dr" in tx_type or tx_type == "dr":
        return "Debit"

    return "Debit"


# ────────────────────────────────────────────
# PDF PARSER
# ────────────────────────────────────────────
def parse_pdf(file_bytes: bytes) -> List[dict]:
    """Extract transactions from PDF bank statement using pdfplumber"""
    try:
        import pdfplumber
    except ImportError:
        logger.error("pdfplumber not installed. Run: pip install pdfplumber")
        return []

    transactions = []

    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            full_text = ""
            all_table_rows = []

            for page in pdf.pages:
                # Extract tables (structured data)
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        all_table_rows.extend(table)

                # Extract raw text as fallback
                page_text = page.extract_text()
                if page_text:
                    full_text += page_text + "\n"

            # Try table extraction first (most accurate)
            if all_table_rows:
                transactions.extend(_parse_table_rows(all_table_rows))

            # Fallback: regex on raw text
            if not transactions and full_text:
                transactions.extend(_parse_text_lines(full_text))

    except Exception as e:
        logger.error(f"PDF parsing error: {e}")

    return transactions


def _parse_table_rows(rows: List[list]) -> List[dict]:
    """Parse structured table rows from pdfplumber"""
    transactions = []
    header = None
    header_map = {}

    for row in rows:
        if row is None:
            continue
        row = [str(c).strip() if c else "" for c in row]

        # Detect header row
        if header is None:
            row_lower = [c.lower() for c in row]
            if any(kw in " ".join(row_lower) for kw in ["date", "narration", "description", "amount", "debit", "credit"]):
                header = row_lower
                # Map column positions
                for i, col in enumerate(header):
                    if "date" in col: header_map["date"] = i
                    elif any(x in col for x in ["narration", "description", "particular", "detail"]): header_map["desc"] = i
                    elif "debit" in col: header_map["debit"] = i
                    elif "credit" in col: header_map["credit"] = i
                    elif "amount" in col: header_map["amount"] = i
                    elif any(x in col for x in ["type", "dr/cr", "txn type"]): header_map["type"] = i
                continue

        # Parse data row
        if len(row) < 2:
            continue

        # Get date
        date_val = ""
        if "date" in header_map:
            date_val = normalize_date(row[header_map["date"]])
        else:
            # Try to find date in any column
            for cell in row:
                for pat in DATE_PATTERNS:
                    m = re.search(pat, cell, re.IGNORECASE)
                    if m:
                        date_val = normalize_date(m.group(1))
                        break
                if date_val:
                    break

        if not date_val:
            continue

        # Get description
        desc = ""
        if "desc" in header_map:
            desc = row[header_map["desc"]]
        else:
            # Use the longest non-numeric, non-date column
            desc = max(row, key=lambda c: len(c) if not re.match(r'^[\d,\.\s]+$', c) else 0)

        if not desc or len(desc) < 2:
            continue

        # Get amount and type
        amount = 0.0
        tx_type = "Debit"

        if "debit" in header_map and "credit" in header_map:
            debit_val = normalize_amount(row[header_map["debit"]])
            credit_val = normalize_amount(row[header_map["credit"]])
            if credit_val > 0:
                amount = credit_val
                tx_type = "Credit"
            elif debit_val > 0:
                amount = debit_val
                tx_type = "Debit"
        elif "amount" in header_map:
            amount = normalize_amount(row[header_map["amount"]])
            if "type" in header_map:
                raw_type = row[header_map["type"]].lower()
                tx_type = "Credit" if any(x in raw_type for x in ["cr", "credit"]) else "Debit"
            else:
                tx_type = detect_transaction_type({}, desc)
        else:
            # Find amount in any numeric-looking column
            for cell in row:
                amt = normalize_amount(cell)
                if amt > 0:
                    amount = amt
                    break
            tx_type = detect_transaction_type({}, desc)

        if amount <= 0:
            continue

        category, confidence = classify_category(desc)

        transactions.append({
            "date": date_val,
            "description": desc.strip(),
            "category": category,
            "amount": round(amount, 2),
            "type": tx_type,
            "confidence": confidence,
            "recurring": is_recurring(desc),
            "source": "pdf_table",
        })

    return transactions


def _parse_text_lines(text: str) -> List[dict]:
    """Parse raw text lines using regex patterns"""
    transactions = []
    lines = text.split("\n")

    for line in lines:
        line = line.strip()
        if len(line) < 10:
            continue

        # Try each transaction line pattern
        for pattern in TX_LINE_PATTERNS:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                groups = match.groups()
                date_str = normalize_date(groups[0])
                desc = groups[1].strip() if len(groups) > 1 else ""
                amount_str = groups[2] if len(groups) > 2 else ""
                type_str = groups[3] if len(groups) > 3 else ""

                amount = normalize_amount(amount_str)
                if amount <= 0 or not desc:
                    continue

                if type_str:
                    tx_type = "Credit" if any(x in type_str.lower() for x in ["cr", "credit"]) else "Debit"
                else:
                    tx_type = detect_transaction_type({}, desc)

                category, confidence = classify_category(desc)

                transactions.append({
                    "date": date_str,
                    "description": desc,
                    "category": category,
                    "amount": round(amount, 2),
                    "type": tx_type,
                    "confidence": confidence,
                    "recurring": is_recurring(desc),
                    "source": "pdf_text",
                })
                break

    return transactions


# ────────────────────────────────────────────
# CSV PARSER
# ────────────────────────────────────────────
def parse_csv_bytes(file_bytes: bytes) -> List[dict]:
    """Parse CSV, TSV, or WSV/fixed-width bank statement"""
    transactions = []
    try:
        text = file_bytes.decode("utf-8-sig", errors="replace")
        
        # Strip trailing/leading spaces and split into lines
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if not lines:
            return []
            
        header = lines[0]
        
        # Define candidate splitters
        def split_csv_line(line: str) -> List[str]:
            try:
                reader = csv.reader([line])
                return [c.strip() for c in next(reader)]
            except Exception:
                return [c.strip() for c in line.split(',')]

        # 1. Tab-separated
        if '\t' in header:
            cols = [c.strip() for c in header.split('\t')]
            rows = []
            for line in lines[1:]:
                parts = [p.strip() for p in line.split('\t')]
                rows.append(dict(zip(cols, parts)))
        # 2. Comma-separated
        elif ',' in header:
            cols = split_csv_line(header)
            rows = []
            for line in lines[1:]:
                parts = split_csv_line(line)
                rows.append(dict(zip(cols, parts)))
        else:
            # 3. Space-separated with exact token counts (strict layout)
            header_words = header.split()
            all_same_len = True
            for line in lines[1:]:
                if len(line.split()) != len(header_words):
                    all_same_len = False
                    break
            if all_same_len and len(header_words) > 1:
                cols = header_words
                rows = []
                for line in lines[1:]:
                    rows.append(dict(zip(cols, line.split())))
            else:
                # 4. Aligned/Fixed-width columns
                # Split header by 2 or more spaces to find column names
                cols = [c.strip() for c in re.split(r'\s{2,}', header) if c.strip()]
                if len(cols) > 1:
                    slices = []
                    for i, col in enumerate(cols):
                        start = header.find(col)
                        if i > 0:
                            prev_start = slices[i-1]
                            start = header.find(col, prev_start + len(cols[i-1]))
                        slices.append(start)
                        
                    ranges = []
                    for i in range(len(slices)):
                        start = slices[i]
                        end = slices[i+1] if i + 1 < len(slices) else None
                        ranges.append((start, end))
                        
                    rows = []
                    for line in lines[1:]:
                        row = {}
                        for col, (start, end) in zip(cols, ranges):
                            val = line[start:end].strip() if start < len(line) else ""
                            row[col] = val
                        rows.append(row)
                else:
                    rows = []

        # Process standard keys
        for row_normalized in rows:
            # Normalize keys to lower-case
            norm_row = {k.strip().lower(): str(v).strip() for k, v in row_normalized.items() if k}
            
            # Find Date
            date_val = ""
            date_key = next((k for k in norm_row.keys() if 'date' in k), None)
            if date_key:
                date_val = normalize_date(norm_row[date_key])
            else:
                for val in norm_row.values():
                    # Check if cell matches a date format
                    for pat in DATE_PATTERNS:
                        m = re.search(pat, val, re.IGNORECASE)
                        if m:
                            date_val = normalize_date(m.group(1))
                            break
                    if date_val:
                        break
            
            # Find Description
            desc = ""
            desc_key = next((k for k in norm_row.keys() if any(x in k for x in ['desc', 'narration', 'particular', 'remark'])), None)
            if desc_key:
                desc = norm_row[desc_key]
            else:
                # Use the longest non-numeric cell that is not the date or type
                non_numeric = [v for v in norm_row.values() if v and not re.match(r'^[\d,\.\s-]+$', v) and v != date_val]
                # Filter out obvious type words
                non_numeric = [v for v in non_numeric if v.lower() not in ['credit', 'debit', 'cr', 'dr']]
                if non_numeric:
                    desc = max(non_numeric, key=len)
            
            if not desc:
                continue

            # Find Amount & Type
            amount = 0.0
            tx_type = "Debit"
            
            debit_key = next((k for k in norm_row.keys() if any(x in k for x in ['debit', 'withdrawal'])), None)
            credit_key = next((k for k in norm_row.keys() if any(x in k for x in ['credit', 'deposit'])), None)
            
            if debit_key or credit_key:
                dv = normalize_amount(norm_row.get(debit_key, ''))
                cv = normalize_amount(norm_row.get(credit_key, ''))
                if cv > 0:
                    amount, tx_type = cv, "Credit"
                elif dv > 0:
                    amount, tx_type = dv, "Debit"
            else:
                # Single amount column
                amt_key = next((k for k in norm_row.keys() if 'amount' in k and 'balance' not in k), None)
                if amt_key:
                    amount = normalize_amount(norm_row[amt_key])
                else:
                    # find first numeric-looking value that is not the date
                    for k, v in norm_row.items():
                        if re.match(r'^[\d,\.]+$', v) and v != date_val:
                            amount = normalize_amount(v)
                            break
                            
                # Find Type column
                type_key = next((k for k in norm_row.keys() if any(x in k for x in ['type', 'dr/cr'])), None)
                if type_key:
                    raw_type = norm_row[type_key].lower()
                    tx_type = "Credit" if any(x in raw_type for x in ['cr', 'credit']) else "Debit"
                else:
                    tx_type = detect_transaction_type(norm_row, desc)

            # Use provided category or auto-detect
            category = norm_row.get("category", "")
            if not category or category.lower() in ["", "uncategorized", "other"]:
                category, confidence = classify_category(desc)
            else:
                confidence = 95  # User-provided category is trusted

            if amount > 0 and desc:
                transactions.append({
                    "date": date_val,
                    "description": desc,
                    "category": category,
                    "amount": round(amount, 2),
                    "type": tx_type,
                    "confidence": confidence if "confidence" in dir() else 90,
                    "recurring": is_recurring(desc),
                    "source": "csv",
                })

    except Exception as e:
        logger.error(f"CSV parsing error: {e}")

    return transactions


# ────────────────────────────────────────────
# EXCEL PARSER
# ────────────────────────────────────────────
def parse_excel_bytes(file_bytes: bytes) -> List[dict]:
    """Parse Excel bank statement using openpyxl"""
    transactions = []
    try:
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
        ws = wb.active

        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return []

        # Find header row (first non-empty row)
        header = None
        header_idx = 0
        for i, row in enumerate(rows):
            if row and any(row):
                row_strs = [str(c).strip().lower() if c else "" for c in row]
                if any(kw in " ".join(row_strs) for kw in ["date", "narration", "amount", "debit", "credit"]):
                    header = row_strs
                    header_idx = i
                    break

        if not header:
            return []

        # Map columns
        col_map = {}
        for i, col in enumerate(header):
            if "date" in col: col_map["date"] = i
            elif any(x in col for x in ["narration", "description", "particular", "remark"]): col_map["desc"] = i
            elif "debit" in col or "withdrawal" in col: col_map["debit"] = i
            elif "credit" in col or "deposit" in col: col_map["credit"] = i
            elif "amount" in col and "balance" not in col: col_map["amount"] = i
            elif any(x in col for x in ["type", "dr/cr"]): col_map["type"] = i

        for row in rows[header_idx + 1:]:
            if not row or not any(row):
                continue

            cells = [str(c).strip() if c is not None else "" for c in row]

            date_val = normalize_date(cells[col_map["date"]]) if "date" in col_map else ""
            desc = cells[col_map["desc"]] if "desc" in col_map else ""

            if not date_val or not desc:
                continue

            amount = 0.0
            tx_type = "Debit"

            if "debit" in col_map and "credit" in col_map:
                dv = normalize_amount(cells[col_map["debit"]])
                cv = normalize_amount(cells[col_map["credit"]])
                if cv > 0:
                    amount, tx_type = cv, "Credit"
                else:
                    amount, tx_type = dv, "Debit"
            elif "amount" in col_map:
                amount = normalize_amount(cells[col_map["amount"]])
                if "type" in col_map:
                    raw = cells[col_map["type"]].lower()
                    tx_type = "Credit" if any(x in raw for x in ["cr", "credit"]) else "Debit"
                else:
                    tx_type = detect_transaction_type({}, desc)

            if amount <= 0:
                continue

            category, confidence = classify_category(desc)
            transactions.append({
                "date": date_val,
                "description": desc,
                "category": category,
                "amount": round(amount, 2),
                "type": tx_type,
                "confidence": confidence,
                "recurring": is_recurring(desc),
                "source": "excel",
            })

    except Exception as e:
        logger.error(f"Excel parsing error: {e}")

    return transactions


# ────────────────────────────────────────────
# TEXT/TXT PARSER
# ────────────────────────────────────────────
def parse_text_bytes(file_bytes: bytes) -> List[dict]:
    """Parse raw text bank statement"""
    # Try parsing as a structured table first (CSV/TSV/WSV/aligned table)
    transactions = parse_csv_bytes(file_bytes)
    if transactions:
        logger.info(f"Successfully parsed text as structured table with {len(transactions)} rows.")
        return transactions

    text = file_bytes.decode("utf-8-sig", errors="replace")
    transactions = _parse_text_lines(text)
    
    # Fallback to LLM if regex fails (e.g., unstructured pasted text)
    if not transactions:
        try:
            from services.multimodal import parse_financial_text
            extracted = parse_financial_text(text)
            transactions = extracted.get("transactions", [])
        except Exception as e:
            logger.error(f"Fallback LLM parsing failed: {e}")
            
    return transactions


# ────────────────────────────────────────────
# RECURRING PAYMENT DETECTOR
# ────────────────────────────────────────────
def detect_recurring_payments(transactions: List[dict]) -> List[dict]:
    """
    Detect recurring payments and group them.
    Returns list of {name, count, monthly_cost, category}
    """
    desc_map: Dict[str, list] = {}
    for tx in transactions:
        if tx["type"] == "Debit":
            key = re.sub(r'\s+', ' ', tx["description"].lower().strip())
            # Normalize to first 30 chars for grouping
            key_short = key[:30]
            if key_short not in desc_map:
                desc_map[key_short] = []
            desc_map[key_short].append(tx["amount"])

    recurring = []
    for key, amounts in desc_map.items():
        if len(amounts) >= 2:  # Appeared at least twice
            avg_amount = sum(amounts) / len(amounts)
            # Check if amounts are consistent (within 20%)
            variance = max(amounts) - min(amounts)
            if variance / avg_amount < 0.2:
                recurring.append({
                    "name": key.title()[:40],
                    "count": len(amounts),
                    "monthly_cost": round(avg_amount, 2),
                    "category": classify_category(key)[0],
                })

    return sorted(recurring, key=lambda x: x["monthly_cost"], reverse=True)


# ────────────────────────────────────────────
# MAIN PARSE DISPATCHER
# ────────────────────────────────────────────
def parse_document(file_bytes: bytes, filename: str, content_type: str = "") -> dict:
    """
    Main dispatcher: detects file type and returns structured transaction data.
    """
    filename_lower = filename.lower()
    transactions = []

    is_image = (
        filename_lower.endswith((".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".gif")) or
        "image" in content_type
    )

    if is_image:
        from services.multimodal import parse_financial_image
        extracted = parse_financial_image(file_bytes, filename, content_type or "image/jpeg")
        transactions = extracted.get("transactions", [])
        source_type = f"Scanned {extracted.get('document_metadata', {}).get('document_type', 'Image')}"
    elif filename_lower.endswith(".pdf") or "pdf" in content_type:
        transactions = parse_pdf(file_bytes)
        source_type = "PDF"
    elif filename_lower.endswith(".csv") or "csv" in content_type:
        transactions = parse_csv_bytes(file_bytes)
        source_type = "CSV"
    elif filename_lower.endswith((".xlsx", ".xls")) or "excel" in content_type or "spreadsheet" in content_type:
        transactions = parse_excel_bytes(file_bytes)
        source_type = "Excel"
    elif filename_lower.endswith(".txt") or "text/plain" in content_type:
        transactions = parse_text_bytes(file_bytes)
        source_type = "Text"
    else:
        # Try CSV as default
        transactions = parse_csv_bytes(file_bytes)
        source_type = "Auto-detected"


    # Post-processing
    recurring = detect_recurring_payments(transactions)

    # Statistics
    total_debits = sum(t["amount"] for t in transactions if t["type"] == "Debit")
    total_credits = sum(t["amount"] for t in transactions if t["type"] == "Credit")
    category_summary: Dict[str, float] = {}
    for tx in transactions:
        if tx["type"] == "Debit":
            cat = tx["category"]
            category_summary[cat] = category_summary.get(cat, 0) + tx["amount"]

    avg_confidence = sum(t.get("confidence", 80) for t in transactions) / max(len(transactions), 1)
    low_confidence = [t for t in transactions if t.get("confidence", 100) < 60]

    return {
        "transactions": transactions,
        "total_count": len(transactions),
        "total_debits": round(total_debits, 2),
        "total_credits": round(total_credits, 2),
        "net_savings": round(total_credits - total_debits, 2),
        "category_summary": {k: round(v, 2) for k, v in sorted(category_summary.items(), key=lambda x: -x[1])},
        "recurring_payments": recurring,
        "avg_confidence": round(avg_confidence, 1),
        "low_confidence_count": len(low_confidence),
        "source_type": source_type,
        "parse_warnings": [f"Low confidence on: {t['description'][:30]}" for t in low_confidence[:3]],
    }
