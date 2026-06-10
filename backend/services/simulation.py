import random
import math
from typing import Dict, List

def run_financial_stress_simulation(
    monthly_income: float,
    necessities_expense: float,      # Rent, utilities, food, travel
    discretionary_expense: float,    # Shopping, entertainment
    current_savings: float,
    target_goal: float,
    timeline_months: int,
    discretionary_reduction_pct: float,  # Slider: 0 to 100%
    sip_addition: float,                 # Slider: additional monthly investments
    market_return_type: str,             # "conservative" | "balanced" | "aggressive"
    inflation_rate_annual: float,        # Slider: 3% to 15%
    shock_event: str = "none"            # "none" | "market_crash" | "income_shock" | "inflation_spike"
) -> Dict:
    """
    Runs 500 Monte Carlo paths simulating net worth trajectory over the timeline.
    Models discretionary reductions, dynamic SIP additions, annual inflation hikes,
    and handles specific distress shock scenarios.
    """
    # 1. Resolve asset growth returns and volatility
    # Annual parameters
    if market_return_type == "conservative":
        mean_return = 0.06
        volatility = 0.05
    elif market_return_type == "aggressive":
        mean_return = 0.14
        volatility = 0.18
    else:  # balanced
        mean_return = 0.10
        volatility = 0.10
        
    # Apply crisis shock impact directly to baseline asset parameters
    if shock_event == "market_crash":
        # Simulate immediate 30% drop in starting balance and high volatility
        current_savings = current_savings * 0.70
        mean_return = mean_return - 0.04
        volatility = volatility + 0.08
    elif shock_event == "inflation_spike":
        # Inflate baseline rate
        inflation_rate_annual = max(inflation_rate_annual, 0.12)
    elif shock_event == "income_shock":
        # Reduce incoming credit by 30%
        monthly_income = monthly_income * 0.70
        
    # Convert annual parameters to monthly
    monthly_mean_return = mean_return / 12.0
    monthly_volatility = volatility / math.sqrt(12)
    monthly_inflation = inflation_rate_annual / 12.0
    
    # Calculate initial monthly savings rate
    reduced_discretionary = discretionary_expense * (1.0 - (discretionary_reduction_pct / 100.0))
    base_monthly_expenses = necessities_expense + reduced_discretionary
    
    num_simulations = 500
    all_paths = []
    
    for sim in range(num_simulations):
        path = [current_savings]
        balance = current_savings
        
        # Monthly loop
        for m in range(1, timeline_months + 1):
            # Dynamic expenses adjusted by monthly inflation compounding
            adjusted_expenses = base_monthly_expenses * ((1.0 + monthly_inflation) ** m)
            
            # Net monthly cash surplus
            monthly_surplus = monthly_income - adjusted_expenses
            if monthly_surplus < 0:
                monthly_surplus = max(monthly_surplus, -balance)  # Cannot draw below zero
                
            # Add surplus and new SIP investments to the balance
            balance += monthly_surplus + sip_addition
            
            # Apply randomized investment growth return (geometric brownian motion step)
            # using random.gauss for zero-dependency standard normal distribution
            rand_factor = random.gauss(0, 1)
            growth_rate = monthly_mean_return + (monthly_volatility * rand_factor)
            balance = balance * (1.0 + growth_rate)
            
            # Bound balance to 0
            if balance < 0:
                balance = 0.0
                
            path.append(balance)
        all_paths.append(path)
        
    # 2. Extract percentiles for each month
    # percentile_10 (Pessimistic), percentile_50 (Median), percentile_90 (Optimistic)
    pessimistic_path = []
    median_path = []
    optimistic_path = []
    labels = []
    
    for m in range(timeline_months + 1):
        labels.append(f"Month {m}")
        monthly_values = sorted([all_paths[s][m] for s in range(num_simulations)])
        
        # Extract indices
        idx_10 = int(num_simulations * 0.10)
        idx_50 = int(num_simulations * 0.50)
        idx_90 = int(num_simulations * 0.90)
        
        pessimistic_path.append(round(monthly_values[idx_10], 2))
        median_path.append(round(monthly_values[idx_50], 2))
        optimistic_path.append(round(monthly_values[idx_90], 2))
        
    # Find goal achievement timeline based on the median path
    goal_achieved_month = -1
    for m in range(timeline_months + 1):
        if median_path[m] >= target_goal:
            goal_achieved_month = m
            break
            
    # Compute general summary metrics
    ending_balance_median = median_path[-1]
    net_savings_invested = (monthly_income - base_monthly_expenses + sip_addition) * timeline_months
    returns_earned = ending_balance_median - current_savings - net_savings_invested
    
    # Simple advice based on returns/risk
    advice = ""
    if ending_balance_median >= target_goal:
        advice = f"Target goal achieved in Month {goal_achieved_month}! Your plan shows solid resilience. Consider locking in short-term returns to protect your capital."
    else:
        gap = target_goal - ending_balance_median
        required_additional_savings = gap / timeline_months
        advice = f"Plan falls short of goal by ₹{gap:,.2f}. To close this gap, you must save an additional ₹{required_additional_savings:,.2f} per month or extend the timeline."
        
    return {
        "labels": labels,
        "pessimistic": pessimistic_path,
        "median": median_path,
        "optimistic": optimistic_path,
        "metrics": {
            "goal_achieved_month": goal_achieved_month,
            "ending_balance": ending_balance_median,
            "total_invested": round(net_savings_invested, 2),
            "estimated_returns": round(max(returns_earned, 0.0), 2),
            "resilience_status": "High" if ending_balance_median >= target_goal else "Medium" if ending_balance_median >= target_goal * 0.8 else "Low Risk Threshold"
        },
        "advisory_summary": advice
    }
