// Synthetic 6-month Indian financial transaction generator

const CATEGORIES = {
  SALARY: 'Salary',
  FOOD: 'Food & Dining',
  SHOPPING: 'Shopping',
  ENTERTAINMENT: 'Entertainment',
  TRAVEL: 'Travel',
  FUEL: 'Fuel',
  INVESTMENT: 'Investment',
  SIP: 'SIP / MF',
  RENT: 'Rent',
  UTILITIES: 'Utilities',
  HEALTH: 'Health',
};

const MERCHANTS = {
  [CATEGORIES.FOOD]: ['Swiggy', 'Zomato', 'Blinkit', 'BigBasket', 'Dominos', 'McDonalds', 'Starbucks', 'Cafe Coffee Day', 'Haldirams'],
  [CATEGORIES.SHOPPING]: ['Amazon', 'Flipkart', 'Myntra', 'Meesho', 'Ajio', 'H&M', 'Zara', 'DMart'],
  [CATEGORIES.ENTERTAINMENT]: ['Netflix', 'Hotstar', 'Spotify', 'Prime Video', 'BookMyShow', 'PVR Cinemas', 'SonyLiv'],
  [CATEGORIES.TRAVEL]: ['Ola', 'Uber', 'Rapido', 'MakeMyTrip', 'IRCTC', 'IndiGo', 'RedBus'],
  [CATEGORIES.FUEL]: ['Indian Oil', 'BPCL', 'HP Petrol', 'Shell'],
  [CATEGORIES.INVESTMENT]: ['Zerodha', 'Groww', 'Angel One', 'Upstox'],
  [CATEGORIES.SIP]: ['HDFC Mutual Fund SIP', 'SBI Bluechip SIP', 'Axis Long Term SIP', 'Mirae Asset SIP'],
  [CATEGORIES.UTILITIES]: ['BESCOM Electricity', 'BWSSB Water', 'Airtel Broadband', 'Jio Recharge', 'LPG Refill'],
  [CATEGORIES.HEALTH]: ['Apollo Pharmacy', 'Practo', 'Cult Fit', 'HealthifyMe'],
};

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) / 10) * 10;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export function generateSyntheticTransactions(monthlyIncome = 65000) {
  const transactions = [];
  const now = new Date();
  const salary = monthlyIncome;

  // Generate 6 months of data
  for (let m = 5; m >= 0; m--) {
    const year = now.getFullYear();
    const month = now.getMonth() - m;
    const monthDate = new Date(year, month, 1);

    // Salary credit on 1st
    transactions.push({
      date: formatDate(new Date(year, month, 1)),
      description: 'Salary Credit - TCS Ltd',
      category: CATEGORIES.SALARY,
      amount: salary + randomBetween(-2000, 2000),
      type: 'Credit',
    });

    // Rent on 1st-3rd
    transactions.push({
      date: formatDate(new Date(year, month, 2)),
      description: 'Rent Payment',
      category: CATEGORIES.RENT,
      amount: randomBetween(14000, 20000),
      type: 'Debit',
    });

    // SIP on 5th
    transactions.push({
      date: formatDate(new Date(year, month, 5)),
      description: randomChoice(MERCHANTS[CATEGORIES.SIP]),
      category: CATEGORIES.SIP,
      amount: randomBetween(3000, 8000),
      type: 'Debit',
    });

    // Utilities mid-month
    for (let i = 0; i < 2; i++) {
      transactions.push({
        date: formatDate(new Date(year, month, randomBetween(7, 20))),
        description: randomChoice(MERCHANTS[CATEGORIES.UTILITIES]),
        category: CATEGORIES.UTILITIES,
        amount: randomBetween(300, 2500),
        type: 'Debit',
      });
    }

    // Food (8-12 transactions, more on weekends)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
      const foodChance = isWeekend ? 0.7 : 0.35;
      if (Math.random() < foodChance) {
        transactions.push({
          date: formatDate(dayDate),
          description: randomChoice(MERCHANTS[CATEGORIES.FOOD]),
          category: CATEGORIES.FOOD,
          amount: isWeekend ? randomBetween(200, 800) : randomBetween(100, 400),
          type: 'Debit',
        });
      }
    }

    // Shopping (3-5 transactions, weekend spikes)
    const shopCount = randomBetween(2, 5);
    for (let i = 0; i < shopCount; i++) {
      const day = randomBetween(1, daysInMonth);
      transactions.push({
        date: formatDate(new Date(year, month, day)),
        description: randomChoice(MERCHANTS[CATEGORIES.SHOPPING]),
        category: CATEGORIES.SHOPPING,
        amount: randomBetween(500, 5000),
        type: 'Debit',
      });
    }

    // Entertainment (2-4 transactions)
    const entCount = randomBetween(2, 4);
    for (let i = 0; i < entCount; i++) {
      transactions.push({
        date: formatDate(new Date(year, month, randomBetween(1, daysInMonth))),
        description: randomChoice(MERCHANTS[CATEGORIES.ENTERTAINMENT]),
        category: CATEGORIES.ENTERTAINMENT,
        amount: randomBetween(149, 1500),
        type: 'Debit',
      });
    }

    // Travel (3-6 transactions)
    const travelCount = randomBetween(3, 6);
    for (let i = 0; i < travelCount; i++) {
      transactions.push({
        date: formatDate(new Date(year, month, randomBetween(1, daysInMonth))),
        description: randomChoice(MERCHANTS[CATEGORIES.TRAVEL]),
        category: CATEGORIES.TRAVEL,
        amount: randomBetween(80, 3000),
        type: 'Debit',
      });
    }

    // Fuel (2-3 times/month)
    for (let i = 0; i < randomBetween(2, 3); i++) {
      transactions.push({
        date: formatDate(new Date(year, month, randomBetween(1, daysInMonth))),
        description: randomChoice(MERCHANTS[CATEGORIES.FUEL]),
        category: CATEGORIES.FUEL,
        amount: randomBetween(800, 2500),
        type: 'Debit',
      });
    }

    // Health (occasional)
    if (Math.random() < 0.4) {
      transactions.push({
        date: formatDate(new Date(year, month, randomBetween(1, daysInMonth))),
        description: randomChoice(MERCHANTS[CATEGORIES.HEALTH]),
        category: CATEGORIES.HEALTH,
        amount: randomBetween(200, 3000),
        type: 'Debit',
      });
    }

    // Investment (occasional - once every 2 months)
    if (m % 2 === 0) {
      transactions.push({
        date: formatDate(new Date(year, month, randomBetween(10, 20))),
        description: randomChoice(MERCHANTS[CATEGORIES.INVESTMENT]),
        category: CATEGORIES.INVESTMENT,
        amount: randomBetween(2000, 10000),
        type: 'Debit',
      });
    }
  }

  // Sort by date descending
  return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function analyzeTransactions(transactions, filter = 'monthly') {
  const now = new Date();
  let filtered = transactions;

  // Apply time filter
  if (filter === 'weekly') {
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    filtered = transactions.filter(t => new Date(t.date) >= weekAgo);
  } else if (filter === 'monthly') {
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
    filtered = transactions.filter(t => new Date(t.date) >= monthAgo);
  } else if (filter === 'quarterly') {
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    filtered = transactions.filter(t => new Date(t.date) >= threeMonthsAgo);
  }
  // yearly = all data

  const credits = filtered.filter(t => t.type === 'Credit');
  const debits = filtered.filter(t => t.type === 'Debit');

  const totalIncome = credits.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = debits.reduce((s, t) => s + t.amount, 0);
  const savings = totalIncome - totalExpenses;
  const savingsRatio = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  // Category breakdown
  const categoryMap = {};
  debits.forEach(t => {
    if (!categoryMap[t.category]) categoryMap[t.category] = 0;
    categoryMap[t.category] += t.amount;
  });

  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value: Math.round(value),
  })).sort((a, b) => b.value - a.value);

  // Monthly trend (last 6 months)
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const label = mDate.toLocaleString('default', { month: 'short' });

    const mIncome = transactions
      .filter(t => t.type === 'Credit' && new Date(t.date) >= mDate && new Date(t.date) <= mEnd)
      .reduce((s, t) => s + t.amount, 0);
    const mExpense = transactions
      .filter(t => t.type === 'Debit' && new Date(t.date) >= mDate && new Date(t.date) <= mEnd)
      .reduce((s, t) => s + t.amount, 0);

    monthlyTrend.push({ month: label, income: Math.round(mIncome), expenses: Math.round(mExpense), savings: Math.round(mIncome - mExpense) });
  }

  // Weekly heatmap (last 4 weeks, 7 days each)
  const heatmapData = [];
  const weeks = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  weeks.forEach((week, wi) => {
    days.forEach((day, di) => {
      heatmapData.push({
        week, day,
        value: randomBetween(100, di >= 5 ? 1500 : 700), // more on weekends
      });
    });
  });

  // Financial health score
  const investmentRatio = (categoryMap[CATEGORIES.SIP] || 0 + categoryMap[CATEGORIES.INVESTMENT] || 0) / (totalExpenses || 1) * 100;
  const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 100;
  
  let healthScore = 100;
  healthScore -= Math.max(0, expenseRatio - 50) * 0.8;
  healthScore += Math.min(20, savingsRatio * 0.5);
  healthScore = Math.max(10, Math.min(100, Math.round(healthScore)));

  // Prediction (next 3 months)
  const lastMonthExp = monthlyTrend[monthlyTrend.length - 1]?.expenses || 0;
  const predictionData = [...monthlyTrend];
  for (let i = 1; i <= 3; i++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    predictionData.push({
      month: futureDate.toLocaleString('default', { month: 'short' }) + ' (pred)',
      expenses: Math.round(lastMonthExp * (1 + (Math.random() * 0.1 - 0.05))),
      income: Math.round(totalIncome / 6),
      savings: null,
      predicted: true,
    });
  }

  return {
    totalIncome: Math.round(totalIncome),
    totalExpenses: Math.round(totalExpenses),
    savings: Math.round(savings),
    savingsRatio: Math.round(savingsRatio),
    categoryData,
    monthlyTrend,
    heatmapData,
    healthScore,
    predictionData,
    transactionCount: filtered.length,
  };
}

export const CATEGORY_COLORS = {
  'Food & Dining': '#f59e0b',
  'Shopping': '#ec4899',
  'Entertainment': '#8b5cf6',
  'Travel': '#3b82f6',
  'Fuel': '#6b7280',
  'Investment': '#10b981',
  'SIP / MF': '#14b8a6',
  'Rent': '#f97316',
  'Utilities': '#64748b',
  'Health': '#ef4444',
  'Salary': '#22c55e',
};
