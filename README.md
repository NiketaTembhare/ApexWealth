# 💎 ApexWealth - GenAI-Powered Personalized Financial Advisor

### 👥 Team Members
- **Niketa Tembhare**
- **Vaishnavi Bodele**
- **Chetan Dongre**
- **Kunal Wandhare**

ApexWealth is a modern, high-performance web application designed to act as an intelligent, automated financial advisor. By combining a sleek, dark-theme neomorphic React frontend with a high-concurrency FastAPI python backend, ApexWealth leverages Google Gemini-2.5-Flash to construct custom, data-backed budgeting strategies, emergency fund timelines, and diversified investment paths tailored to user habits.

---

## 🌟 Core Features

- **🔐 Secure Session Authentication**: Fully decoupled JWT-based authentication system storing securely hashed credentials.
- **🧠 Generative AI Personal Advice Engine**: Integrates with Google Gemini-2.5-Flash via OpenRouter to analyze incomes, expenses, and target timelines, returning custom financial blueprints.
- **📈 Live SVG Visual Analytics**: Displays expense ratios, cashflow trends, and an interactive **Financial Health Score Gauge** calculated from user metrics.
- **📁 Universal Bank Statement Parser**: Supports drag-and-drop document upload (PDF, CSV, Excel `.xlsx`/`.xls`, and plain text `.txt`). It automatically parses transactions, auto-categorizes them using keyword-density models, and estimates recurring subscriptions.
- **💬 Interactive follow-up AI Chatbot**: Conversational interface matching the context of the user's financial advice, allowing point-wise, structured Q&A.
- **💾 Audit Logs & JSON Storage**: Appends structured advising logs with detailed timestamps to a local history database (`history.json`) for persistence and session recalls.

---

## 🛠️ Tech Stack

### Frontend (UI Layer)
- **React.js & Vite** — Next-generation frontend tooling for fast development.
- **Tailwind CSS** — Sleek custom styling, dark-mode gradients, and glassmorphism.
- **Lucide React** — Premium iconography.
- **Recharts** — Responsive interactive charts for trendlines and gauges.

### Backend (Server Layer)
- **FastAPI & Uvicorn** — Asynchronous Python framework with built-in Pydantic data validations.
- **PyJWT & Hashlib** — Secure user credential storage and session signing.
- **pdfplumber & openpyxl** — Python libraries for structural table extraction from PDFs and spreadsheets.
- **Google Generative AI / OpenRouter** — Large Language Model integration for structured JSON generation.

---

## 📂 Project Structure

```text
ApexWealth/
├── backend/                  # FastAPI Backend Server
│   ├── data/                 # Local JSON databases (users.json, history.json)
│   ├── schemas/              # Pydantic data validation schemas
│   ├── services/             # Auth, document parsing, and Gemini AI connectors
│   ├── .env.example          # Local backend template variables
│   ├── main.py               # Main API router and server runner
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # React Vite Frontend Application
│   ├── src/                  # React source files
│   │   ├── components/       # Dashboard widgets, charts, chatbot, and upload forms
│   │   ├── services/         # Axios API connection client
│   │   └── App.jsx           # Main layout router
│   ├── package.json          # Node dependencies
│   └── tailwind.config.js    # Neomorphic dark-theme tailwind definitions
│
├── .gitignore                # Root Git ignore configuration
├── .env.example              # Root environment template
└── README.md                 # Project documentation
```

---

## ⚙️ Quick Start Installation

### 1️⃣ Clone the Repository
```bash
git clone <your-repository-url>
cd ApexWealth
```

### 2️⃣ Setup FastAPI Backend
```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
# Edit .env and enter your OPENROUTER_API_KEY
```

To run the backend server:
```bash
python main.py
```
*Backend is served at: `http://localhost:8000`*

---

### 3️⃣ Setup React Frontend
In a new terminal window:
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server
npm run dev
```
*Frontend is served at: `http://localhost:3000`*

---

## 🔮 Demo Prompts to Try in AI Chat
*   **Budgeting Check**: *"Based on my numbers, my Swiggy and Zomato spending is high. Suggest a 50/30/20 budget modification."*
*   **Emergency Fund Calculations**: *"What is the exact target amount for a 4-month emergency cushion, and how long does it take me to save at my current savings rate?"*
*   **Investment Differences**: *"What is the safety difference between putting my savings in a liquid FD vs a mutual fund for my goal timeline?"*
