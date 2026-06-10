import os
import sys

# Add backend directory to path so we can import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.rag import add_document_chunks, init_rag_system

# Default compliance regulations to bootstrap system
SAMPLE_REGULATIONS = {
    "rbi_circular_103_cash_reporting.txt": """
[REGULATOR: RBI]
[SECTION: High-Value Financial Transactions Reporting]
1. Mandatory Reporting of High-Value Cash Transactions: 
All scheduled commercial banks and cooperative banks must report cash transactions exceeding INR 50,000 to the Financial Intelligence Unit (FIU-IND). Any single debit or credit transaction above INR 50,000 must verify and store permanent account number (PAN) details.
2. Suspicious Transaction Reporting (STR):
Banks must flag accounts demonstrating sudden, unexplained velocity spikes. For example, multiple cash deposits totaling more than INR 10,00,000 in a month from a salary account earning less than INR 1,00,000 must trigger an immediate internal audit alert.
3. Daily ATM and Cash Withdrawal Caps:
Standard retail savings accounts are capped at INR 50,000 cash withdrawal per day unless special branch approval is recorded. High-value ATM withdrawals occurring in sequential 24-hour cycles represent high risk for credential theft or card cloning.
""",
    "sebi_circular_2025_mutual_funds.txt": """
[REGULATOR: SEBI]
[SECTION: Mutual Fund SIP & Retail Investment Caps]
1. Systemic Investment Plan (SIP) Disclosures:
Asset Management Companies (AMCs) must notify investors of high portfolio volatility if investing in small-cap funds. Individual retail investors are suggested to allocate no more than 20% of their investable surplus to small-cap categories due to downside volatility risks.
2. Mandatory KYC Checks:
Every mutual fund application, including SIP auto-debits, must be linked to a verified KYC profile. Mutual fund auto-debits that fail sequentially 3 times must be auto-suspended by the bank under standing instruction protocols.
3. Tax Saving Investment Caps (Section 80C):
Equity Linked Savings Schemes (ELSS) mutual funds have a lock-in period of 3 years. Under Section 80C of the Indian Income Tax Act, the maximum tax deduction allowed is INR 1,50,000 per financial year. Excess investments do not yield additional tax rebate benefits.
""",
    "banking_fraud_patterns_best_practices.txt": """
[REGULATOR: Banking Association]
[SECTION: Retail Online Fraud & Anomaly Indicators]
1. Velocity Control Best Practices:
A sudden sequence of small-value transactions (e.g. INR 100 to INR 500) within minutes to the same unknown vendor (often referred to as 'micro-probing') is a primary indicator of card skimming or account takeover. The card must be auto-blocked after 5 sequential transactions within 15 minutes.
2. Subscription Harvester Scams:
Recurring monthly charges from unrecognized international vendors (especially entertainment or retail subscriptions) that are not authorized via dynamic OTP represent billing leaks. Banks should advise customers to review all subscription charges monthly.
3. Salary Accounts Risk Profiling:
Salary accounts typically display structured incoming credits on fixed calendar dates. Sudden credit activities from non-payroll vendors followed immediately by high-value external debit transfers to lifestyle categories represent high risk of financial exploitation or account leasing.
"""
}

def bootstrap_compliance_dir():
    kb_dir = "data/compliance"
    os.makedirs(kb_dir, exist_ok=True)
    
    # Check if files already exist
    files = [f for f in os.listdir(kb_dir) if f.endswith(".txt") or f.endswith(".pdf")]
    
    if not files:
        print("Seeding compliance directory with default RBI/SEBI regulations...")
        for filename, content in SAMPLE_REGULATIONS.items():
            filepath = os.path.join(kb_dir, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content.strip())
        print("Compliance directory seeded.")

def parse_txt_to_chunks(filepath: str) -> list:
    filename = os.path.basename(filepath)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Extract regulator if defined
    regulator = "Unknown"
    if "[REGULATOR:" in content:
        import re
        m = re.search(r'\[REGULATOR:\s*([^\]]+)\]', content)
        if m:
            regulator = m.group(1).strip()
            
    # Simple semantic splitting by double newlines or numbered items
    raw_paragraphs = content.split("\n\n")
    chunks = []
    
    for i, para in enumerate(raw_paragraphs):
        para = para.strip()
        if not para or len(para) < 40:
            continue
            
        # Clean tags from display text
        clean_text = para
        section = "General"
        
        # Check if paragraph has section header
        if "[SECTION:" in para:
            m = re.search(r'\[SECTION:\s*([^\]]+)\]', para)
            if m:
                section = m.group(1).strip()
            # Remove header tags for indexing content
            clean_text = re.sub(r'\[SECTION:[^\]]+\]', '', clean_text).strip()
        clean_text = re.sub(r'\[REGULATOR:[^\]]+\]', '', clean_text).strip()
        
        chunks.append({
            "text": clean_text,
            "source": filename,
            "page": 1,
            "section": section,
            "regulator": regulator
        })
        
    return chunks

def run_ingest():
    # Make sure collection exists
    init_rag_system()
    
    bootstrap_compliance_dir()
    
    kb_dir = "data/compliance"
    all_chunks = []
    
    for filename in os.listdir(kb_dir):
        if filename.endswith(".txt"):
            filepath = os.path.join(kb_dir, filename)
            print(f"Parsing txt file: {filename}")
            chunks = parse_txt_to_chunks(filepath)
            all_chunks.extend(chunks)
            
    if all_chunks:
        print(f"Uploading {len(all_chunks)} compliance chunks to vector database...")
        add_document_chunks(all_chunks)
        print("Ingestion complete. RAG database is loaded and active.")
    else:
        print("No chunks found to ingest.")

if __name__ == "__main__":
    run_ingest()
