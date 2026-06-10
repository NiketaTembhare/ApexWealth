import os
import json
import requests
from schemas.advice import FinancialInput, AdviceResponse

# Config-driven: supports local OpenRouter, AMD VM (127.0.0.1:8101/v1), or cloud deployment
# Set OPENROUTER_BASE_URL in .env to switch endpoints without code changes
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_URL = f"{OPENROUTER_BASE_URL}/chat/completions"

def get_financial_advice(data: FinancialInput) -> AdviceResponse:
    # Fetch API Key
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set. Please add it to your backend/.env file.")

    model = os.getenv("OPENROUTER_MODEL", os.getenv("PRIMARY_MODEL", "models/gemini-2.5-flash-lite"))

    # Calculate additional metrics for richer prompting
    total_expenses = (
        data.rent_expense + 
        data.food_expense + 
        data.shopping_expense + 
        data.travel_expense + 
        data.entertainment_expense
    )
    savings_capacity = data.monthly_income - total_expenses
    target_monthly_savings = data.savings_goal / data.financial_goal_timeline
    savings_gap = target_monthly_savings - savings_capacity
    
    # Generate structured prompt
    prompt = f"""
You are a highly experienced and certified Senior Personal Financial Advisor specializing in Indian personal finance (INR).
Analyze the following detailed personal financial breakdown and generate bespoke, professional, and actionable financial advice in Indian Rupees (₹).

USER FINANCIAL DATA:
- Monthly Net Income: ₹{data.monthly_income:,.2f}
- Monthly Rent/Housing: ₹{data.rent_expense:,.2f}
- Monthly Food & Groceries: ₹{data.food_expense:,.2f}
- Monthly Shopping & Lifestyle: ₹{data.shopping_expense:,.2f}
- Monthly Travel & Commute: ₹{data.travel_expense:,.2f}
- Monthly Entertainment & Leisure: ₹{data.entertainment_expense:,.2f}
- Total Current Monthly Expenses: ₹{total_expenses:,.2f}
- Current Monthly Savings Potential: ₹{savings_capacity:,.2f}
- Target Savings Goal: ₹{data.savings_goal:,.2f}
- Savings Timeline: {data.financial_goal_timeline} months
- Required Monthly Savings Rate to hit Goal: ₹{target_monthly_savings:,.2f}
- Current Savings Rate Gap: ₹{savings_gap:,.2f} (A positive number means they are falling short monthly, negative means they are saving more than enough)

You MUST respond strictly with a valid JSON object matching the JSON schema below. Do not include markdown code block formatting like ```json in the actual output. Just output the raw JSON string.

RESPONSE JSON SCHEMA:
{{
  "spending_analysis": "A detailed, professional breakdown of their expense distribution in Indian Rupees (₹). Write in clean, cohesive paragraph format. Do NOT use bullet points, list items, or dashes. Explain what percentage of their income goes to rent (standard rule is under 30%), necessities, and discretionary spend.",
  "budgeting_advice": "Actionable, customized advice on restructuring their budget. Write in a clean, cohesive paragraph format. Do NOT use bullet points, list items, or dashes. Reference the 50/30/20 rule or zero-based budgeting tailored to their situation.",
  "savings_recommendation": "Calculated recommendations on how to reach their target goal of ₹{data.savings_goal:,.2f} in {data.financial_goal_timeline} months. Write in a clean, cohesive paragraph format. Do NOT use bullet points, list items, or dashes. Address the Savings Rate Gap (₹{savings_gap:,.2f}) with direct strategies.",
  "investment_suggestion": "Practical, entry-level investment paths based on their timeline and cash flow. Write in a clean, cohesive paragraph format. Do NOT use bullet points, list items, or dashes. Suggest Indian asset classes (e.g., Public Provident Fund (PPF), Mutual Funds, High Yield Fixed Deposits (FDs), ETFs) appropriate for a {data.financial_goal_timeline}-month duration. *Disclaimer: Include a brief standard disclaimer that this is educational advice.*",
  "emergency_fund_recommendation": "Evaluation of their emergency fund needs. Write in a clean, cohesive paragraph format. Do NOT use bullet points, list items, or dashes. Standard emergency fund is 3 to 6 months of expenses (₹{total_expenses * 3:,.2f} - ₹{total_expenses * 6:,.2f}). Provide advice on how to build this concurrently.",
  "personalized_summary": "An encouraging, strategic wrap-up summarizing their immediate next wealth actions in Indian Rupees (₹). Write in a clean, cohesive paragraph format. Do NOT use bullet points, list items, or dashes."
}}
"""



    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "ApexWealth AI Banking Advisor"
        }

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a certified Senior Financial Advisor. Always respond with valid JSON only. No markdown formatting."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.2,
            "max_tokens": 4096
        }

        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=45)
        response.raise_for_status()

        result = response.json()

        # Extract the assistant's message content
        raw_text = result["choices"][0]["message"]["content"].strip()

        # Clean any potential enclosing code blocks
        if raw_text.startswith("```"):
            lines = raw_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_text = "\n".join(lines).strip()

        advice_data = json.loads(raw_text)

        # Ensure all required keys exist, fill in defaults if missing
        required_keys = [
            "spending_analysis", "budgeting_advice", "savings_recommendation",
            "investment_suggestion", "emergency_fund_recommendation", "personalized_summary"
        ]
        for key in required_keys:
            if key not in advice_data:
                advice_data[key] = "Detailed advice is being compiled for this section."

        return AdviceResponse(**advice_data)

    except json.JSONDecodeError:
        # If JSON parsing failed, create a structured response based on the raw text
        return AdviceResponse(
            spending_analysis="An error occurred parsing the AI's analysis, but here is raw feedback: " + raw_text[:400],
            budgeting_advice="Adjust your high categories to optimize cash flow.",
            savings_recommendation="Aim to narrow the monthly gap to achieve your target savings goal.",
            investment_suggestion="Consider low-risk high yield savings accounts for short-term goals. *Disclaimer: Educational purposes only.*",
            emergency_fund_recommendation="Secure 3-6 months of operating expenses in a liquid account.",
            personalized_summary="Review your inputs and try again, or consult with a financial advisor."
        )
    except requests.exceptions.HTTPError as he:
        error_detail = ""
        try:
            error_detail = he.response.json().get("error", {}).get("message", str(he))
        except Exception:
            error_detail = str(he)
        raise RuntimeError(f"OpenRouter API error: {error_detail}")
    except Exception as e:
        raise RuntimeError(f"Failed to generate advice: {str(e)}")

from typing import List
from schemas.advice import ChatMessage

def get_chat_response(financial_data: FinancialInput, advice: AdviceResponse, history: List[ChatMessage], message: str) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set. Please add it to your backend/.env file.")

    model = os.getenv("OPENROUTER_MODEL", os.getenv("PRIMARY_MODEL", "models/gemini-2.5-flash-lite"))

    # Format the context system prompt
    context_system_prompt = f"""
You are a highly experienced and certified Senior Personal Financial Advisor specializing in Indian personal finance (INR).
You recently generated the following financial advice for the user based on their data in Indian Rupees (₹):

USER FINANCIAL PROFILE:
- Monthly Net Income: ₹{financial_data.monthly_income:,.2f}
- Housing/Rent Expense: ₹{financial_data.rent_expense:,.2f}
- Food/Grocery Expense: ₹{financial_data.food_expense:,.2f}
- Shopping/Retail Expense: ₹{financial_data.shopping_expense:,.2f}
- Travel/Commute Expense: ₹{financial_data.travel_expense:,.2f}
- Entertainment/Leisure Expense: ₹{financial_data.entertainment_expense:,.2f}
- Target Savings Goal: ₹{financial_data.savings_goal:,.2f} over {financial_data.financial_goal_timeline} months


YOUR GENERATED ADVICE:
- Spending Analysis: {advice.spending_analysis}
- Budgeting Advice: {advice.budgeting_advice}
- Savings Recommendation: {advice.savings_recommendation}
- Investment Suggestion: {advice.investment_suggestion}
- Emergency Fund Recommendation: {advice.emergency_fund_recommendation}
- Summary: {advice.personalized_summary}

The user is asking you a follow-up question regarding their numbers, plans, or suggestions. 
Stay in character as their Personal Advisor. Always respond in a highly structured, point-wise, step-by-step format. Use clear bullet points (-) for every step or key detail to make it extremely easy to read, scan, and understand. Limit paragraphs and prioritize point-wise lists.

"""

    messages = [{"role": "system", "content": context_system_prompt}]
    
    # Append conversation history
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
        
    # Append current message
    messages.append({"role": "user", "content": message})

    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "ApexWealth AI Banking Advisor Chat"
        }

        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.5,
            "max_tokens": 1024
        }

        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        return result["choices"][0]["message"]["content"].strip()
        
    except Exception as e:
        raise RuntimeError(f"Chat service failed: {str(e)}")

