# 🌌 ApexWealth AI: Claude Master Reconstruction & System Prompt

Copy this entire document and paste it directly into Claude or any advanced LLM. It contains a **highly structured system prompt** that tells the AI exactly how to recreate this complete application from scratch, along with an **under-the-hood technical explanation** of every premium feature.

---

# PART 1: THE MASTER CLAUDE RECONSTRUCTION PROMPT
*(Copy from the line below to feed directly into Claude)*

---

```markdown
You are a Staff Full-Stack AI Engineer. Your goal is to generate a complete, high-fidelity, production-ready GenAI MVP project named "ApexWealth AI Banking Personalized Financial Advice Generator". 

Strictly implement a decoupled, fast architecture with a FastAPI (Python) backend and a React + Vite + Tailwind CSS frontend. Use OpenRouter API securely with the model "google/gemini-2.5-flash" (using the API Key environment variable "OPENROUTER_API_KEY") returning strict parsed JSON payloads.

Generate code for all files without placeholders or truncations.

### 📁 PROJECT DIRECTORY STRUCTURE TO RECREATE:
- backend/
  - requirements.txt (fastapi, uvicorn, pydantic, requests, python-dotenv)
  - .env (OPENROUTER_API_KEY, OPENROUTER_MODEL, PORT)
  - main.py (FastAPI entrypoint, routes: health, generate-advice, history, chat)
  - schemas/
    - advice.py (Pydantic models: FinancialInput, AdviceResponse, ChatMessage, ChatRequest)
  - services/
    - gemini.py (OpenRouter API calling wrapper, chat message handler)
  - data/
    - history.json (Auto-generated file saving advice logs)
- frontend/
  - package.json (react, vite, tailwindcss, lucide-react, axios)
  - tailwind.config.js (Neo-banking premium dark palette: HSL glowing emeralds, deep navies)
  - src/
    - main.jsx
    - App.jsx (Global layout, status handler, page routing)
    - index.css (Tailwind base, custom glassmorphism panels, glowing shadows)
    - services/
      - api.js (Axios base configuration with health check, generate advice, send chat, fetch history)
    - components/
      - Header.jsx (App header displaying active backend status via polling)
      - FinancialForm.jsx (User input with tier presets and real-time expense ratio calculations)
      - AdviceDashboard.jsx (Tabbed Glassmorphic advice grids, SVG Visual Charts, Context Chatbot, print export)
      - Spinner.jsx (Premium glassmorphic loader with a rotating wealth-vault animation)

---

### 🛠️ CORE FEATURES & IMPLEMENTATION LOGIC:

#### 1. Live Client-Side Calculations (FinancialForm.jsx)
- Do not make API requests as user types. Use standard React state hook tracking.
- Calculate: Total Expenses = Rent + Food + Shopping + Travel + Entertainment.
- Calculate: Savings Capacity = Income - Total Expenses.
- Compute dynamic percentage bars next to input fields representing the percentage of income swallowed by each category. Highlight in crimson if rent > 35% or food > 20%.

#### 2. Structured Pydantic Payload (backend/schemas/advice.py)
- Enforce strict validation: Income, savings_goal, timeline > 0. Expenses >= 0.
- `AdviceResponse` must contain: `spending_analysis`, `budgeting_advice`, `savings_recommendation`, `investment_suggestion`, `emergency_fund_recommendation`, `personalized_summary`.

#### 3. Secure REST Calling & Strict JSON Response (backend/services/gemini.py)
- Make a POST request to "https://openrouter.ai/api/v1/chat/completions" passing Authorization and System context.
- System Context: "You are a certified Senior Financial Advisor. Respond strictly in valid JSON matching the schema. No markdown code blocks."
- Programmatic Sanitization: If Gemini returns wrapped code blocks like "```json", strip them out before passing to `json.loads()` to guarantee 100% parsing success.

#### 4. JSON Historical Auditing (backend/main.py & history.json)
- In the `POST /generate-advice` endpoint, capture the inputs and calculated output.
- Create an entry with an ISO timestamp and append it to `backend/data/history.json`.
- Implement `GET /history` to read and return this local JSON log database.

#### 5. Interactive SVG Visual Analytics (AdviceDashboard.jsx)
- Do not use heavy charting libraries (recharts/chartjs) to avoid install version mismatches.
- Draw a custom, high-fidelity circular SVG doughnut gauge showing the Savings Rate (e.g. Income vs Expenses) dynamically.
- Draw neomorphic linear progress bars for Rent, Food, Shopping, Travel, and Entertainment, displaying calculated percentages of overall income.

#### 6. Context-Bound AI Financial Chatbot (AdviceDashboard.jsx & backend/main.py)
- Embed a Chatbot drawer. Onmount, the bot greets the user with their custom numbers: e.g. "I've reviewed your goal of $5,000 in 12 months..."
- Formulate follow-up requests by sending: User Financial Data + AI-Generated Advice + Message History + New User Message.
- The backend compiles this into a master System Prompt for OpenRouter. This preserves "memory context" without requiring heavy server database sessions.
```

---

# PART 2: SYSTEM ARCHITECTURE & UNDER-THE-HOOD EXPLANATIONS
*(Use this to study or explain the mechanics to your mentor/video audience)*

### 1. The Interactive SVG Analytics Engine
*   **How it works**: Standard charting libraries rely on canvas drawing and heavy bundle footprints which can fail during production compiling. Instead, we use a fully responsive, native **SVG Circle Path** utilizing the `strokeDasharray` and `strokeDashoffset` properties.
*   **The Math**:
    *   The circumference of a circle is $C = 2\pi r$. For a viewbox circle with radius $r = 15.9155$, the circumference is exactly **$100$ units**.
    *   This allows us to pass raw percentage values directly into `strokeDasharray` (e.g. `strokeDasharray="45, 100"` represents exactly a $45\%$ slice!).
    *   We stack these layers dynamically (one for expenses, one for savings offset) to form a stunning neomorphic dashboard ring without a single line of external charting Javascript.

### 2. JSON Historical Database Logger
*   **How it works**: Whenever a user submits the advisor form, the backend routes to `generate_advice()`. 
*   **The Persistence**: Before returning the response, FastAPI calls a thread-safe helper `save_to_history()`. This helper creates a `data/` folder, safely reads `history.json` (falling back to an empty list `[]` if it doesn't exist), appends the new transaction + response with an ISO timestamp, and writes it back to the disk. 
*   **The Benefit**: This gives a fully auditable database record that runs without any setup overhead (no Docker, no PostgreSQL, no SQLite configuration needed).

### 3. Context-Bound Chatbot Memory
*   **How it works**: Normal LLM chatbot sessions have no context of what advice was generated unless you pass a session ID to a complex database. We solve this elegantly using a **State-Hydrated Payload**.
*   **The Flow**:
    1. The frontend retains the user's initial financial inputs and the AI-generated response in active React state.
    2. When the user types a chat question, the frontend packages the entire context (original inputs + original advice + chat bubble history) and posts it to `/chat`.
    3. The backend dynamically injects this context as a **System Instruction Boundary** before sending the request to OpenRouter.
    4. The AI responds perfectly, knowing exactly how much the user spends on rent, food, and what their savings gap is, giving a fully personalized conversation in real time!
