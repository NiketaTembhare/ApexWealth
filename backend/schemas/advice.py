from pydantic import BaseModel, Field

class FinancialInput(BaseModel):
    monthly_income: float = Field(..., gt=0, description="Monthly Income in USD or local currency")
    rent_expense: float = Field(..., ge=0, description="Monthly rent or housing expense")
    food_expense: float = Field(..., ge=0, description="Monthly food/grocery expense")
    shopping_expense: float = Field(..., ge=0, description="Monthly shopping/clothing expense")
    travel_expense: float = Field(..., ge=0, description="Monthly travel/commute expense")
    entertainment_expense: float = Field(..., ge=0, description="Monthly entertainment/leisure expense")
    savings_goal: float = Field(..., gt=0, description="Total Target Savings Goal")
    financial_goal_timeline: int = Field(..., gt=0, description="Timeline to achieve the savings goal in months")

class AdviceResponse(BaseModel):
    spending_analysis: str = Field(..., description="Detailed analysis of where the user spends their money")
    budgeting_advice: str = Field(..., description="Actionable plans to optimize monthly budgets")
    savings_recommendation: str = Field(..., description="Strategies to reach their specific savings goals")
    investment_suggestion: str = Field(..., description="Conservative or beginner-friendly investment paths")
    emergency_fund_recommendation: str = Field(..., description="Assessment of emergency fund size and target timeline")
    personalized_summary: str = Field(..., description="Empowering general wrap-up of the financial strategy")

from typing import List

class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    financial_data: FinancialInput
    advice: AdviceResponse
    history: List[ChatMessage]
    message: str

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=1)

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    name: str
    username: str


