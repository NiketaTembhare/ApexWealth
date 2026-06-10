import os
import json
import base64
import requests
import logging
from typing import Dict, List, Optional

logger = logging.getLogger("multimodal-service")

OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_URL = f"{OPENROUTER_BASE_URL}/chat/completions"

def encode_image_to_base64(image_bytes: bytes) -> str:
    """Encodes raw image bytes into a base64 string."""
    return base64.b64encode(image_bytes).decode("utf-8")

def parse_financial_image(image_bytes: bytes, filename: str, mime_type: str) -> Dict:
    """
    Sends a scanned receipt, invoice, or statement image to OpenRouter/Gemini VLM.
    Extracts structured transaction logs, vendor info, and confidence ratings.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set in backend/.env")
        
    # Default to Qwen2.5-VL or Gemini 2.5 Flash on OpenRouter
    model = os.getenv("OPENROUTER_MULTIMODAL_MODEL", "models/gemini-2.5-flash-lite")
    
    base64_image = encode_image_to_base64(image_bytes)
    
    prompt = """
    You are an expert forensic accountant and financial document analyst.
    Analyze the attached image (which is a scanned receipt, tax invoice, bank statement, or transaction slip) and extract all financial transactions.
    
    You must extract the following detail for every transaction:
    - date (normalized to YYYY-MM-DD if recognizable, otherwise return "")
    - description (merchant, vendor, or transfer narration, e.g. "Swiggy Dining", "HDFC Transfer")
    - amount (numerical float value only, e.g. 1500.50, excluding currency symbols)
    - type ("Debit" if money was spent/withdrawn, "Credit" if money was received/refunded)
    - category (one of: Food & Dining, Shopping, Entertainment, Travel, Fuel, Rent, Utilities, SIP / MF, Investment, Healthcare, Education, Salary, EMI, Uncategorized)
    - confidence (percentage probability integer between 10 and 100 indicating extraction accuracy)
    
    You MUST respond with a valid JSON object matching the schema below. Do not include markdown code block syntax (like ```json).
    
    RESPONSE JSON SCHEMA:
    {
      "transactions": [
        {
          "date": "YYYY-MM-DD",
          "description": "Merchant Name / Particulars",
          "amount": 250.00,
          "type": "Debit",
          "category": "Food & Dining",
          "confidence": 98
        }
      ],
      "document_metadata": {
        "document_type": "Invoice | Receipt | Statement | Unknown",
        "vendor_name": "Name of the issuing vendor/bank",
        "total_amount_extracted": 250.00,
        "currency": "INR | USD | etc.",
        "avg_extraction_confidence": 98
      }
    }
    """
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "ApexWealth Financial Copilot"
    }
    
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        "temperature": 0.1,
        "max_tokens": 2048
    }
    
    try:
        logger.info(f"Sending image {filename} ({mime_type}) to VLM model: {model}")
        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        raw_text = result["choices"][0]["message"]["content"].strip()
        
        # Clean potential code fences
        if raw_text.startswith("```"):
            lines = raw_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_text = "\n".join(lines).strip()
            
        parsed_data = json.loads(raw_text)
        logger.info(f"Successfully extracted {len(parsed_data.get('transactions', []))} transactions from scanned image.")
        return parsed_data
        
    except Exception as e:
        logger.error(f"Multimodal image parsing failed: {e}")
        # Fallback structured schema indicating extraction failure
        return {
            "transactions": [],
            "document_metadata": {
                "document_type": "Unknown",
                "vendor_name": "N/A",
                "total_amount_extracted": 0.0,
                "currency": "INR",
                "avg_extraction_confidence": 0,
                "error": str(e)
            }
        }

def parse_financial_text(text: str) -> Dict:
    """
    Sends raw unstructured bank statement text to OpenRouter/Gemini LLM.
    Extracts structured transaction logs, vendor info, and confidence ratings.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set in backend/.env")
        
    model = os.getenv("PRIMARY_MODEL", "models/gemini-2.5-flash-lite")
    
    prompt = f"""
    You are an expert forensic accountant and financial document analyst.
    Analyze the following raw bank statement text and extract all financial transactions.
    
    TEXT:
    {text}
    
    You must extract the following detail for every transaction:
    - date (normalized to YYYY-MM-DD if recognizable, otherwise return "")
    - description (merchant, vendor, or transfer narration, e.g. "Swiggy Dining", "HDFC Transfer")
    - amount (numerical float value only, e.g. 1500.50, excluding currency symbols)
    - type ("Debit" if money was spent/withdrawn, "Credit" if money was received/refunded)
    - category (one of: Food & Dining, Shopping, Entertainment, Travel, Fuel, Rent, Utilities, SIP / MF, Investment, Healthcare, Education, Salary, EMI, Uncategorized)
    - confidence (percentage probability integer between 10 and 100 indicating extraction accuracy)
    
    You MUST respond with a valid JSON object matching the schema below. Do not include markdown code block syntax (like ```json).
    
    RESPONSE JSON SCHEMA:
    {{
      "transactions": [
        {{
          "date": "YYYY-MM-DD",
          "description": "Merchant Name / Particulars",
          "amount": 250.00,
          "type": "Debit",
          "category": "Food & Dining",
          "confidence": 98
        }}
      ],
      "document_metadata": {{
        "document_type": "Statement | Unknown",
        "vendor_name": "Name of the issuing bank/vendor",
        "total_amount_extracted": 250.00,
        "currency": "INR | USD | etc.",
        "avg_extraction_confidence": 98
      }}
    }}
    """
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "ApexWealth Financial Copilot"
    }
    
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.1,
        "max_tokens": 2048
    }
    
    try:
        logger.info(f"Sending unstructured text to LLM model: {model}")
        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        raw_text = result["choices"][0]["message"]["content"].strip()
        
        # Clean potential code fences
        if raw_text.startswith("```"):
            lines = raw_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_text = "\n".join(lines).strip()
            
        parsed_data = json.loads(raw_text)
        logger.info(f"Successfully extracted {len(parsed_data.get('transactions', []))} transactions from raw text.")
        return parsed_data
        
    except Exception as e:
        logger.error(f"Text parsing via LLM failed: {e}")
        return {
            "transactions": [],
            "document_metadata": {
                "document_type": "Unknown",
                "vendor_name": "N/A",
                "total_amount_extracted": 0.0,
                "currency": "INR",
                "avg_extraction_confidence": 0,
                "error": str(e)
            }
        }

