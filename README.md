# BoomerBot 🧠
**Team:** SAP Knowledge Nexus (I-DS-A)
**Members:** Sagar Choudhari, Harshvardhan Patil

BoomerBot is an AI-powered Enterprise Knowledge Preservation System designed to capture, structure, and query the tacit knowledge of departing senior engineers ("Boomers") before they retire.

Built with **React**, **FastAPI**, **LangGraph**, and **ChromaDB**, BoomerBot orchestrates complex AI agents to conduct dynamic voice interviews, asynchronously generate documentation, and provide instant knowledge retrieval via Semantic Caching.

## 🚀 Features
- 🎙️ **Live Knowledge Capture:** Real-time bi-directional streaming Voice Agent that interviews experts and dynamically routes questions using LangGraph.
- ⚡ **Asynchronous Asset Generation:** Automatically converts raw interview transcripts into structured SOPs, FAQs, and Troubleshooting Guides.
- 🔍 **RAG Assistant with Exact Citations:** Ask questions about preserved knowledge with 100% trace-ability. 
- 📊 **"Flight Risk" Dashboard:** Aggregates HR exit dates to flag critical experts before their knowledge leaves the company.
- 🛡️ **Closed-Loop Talent Screening:** Actively evaluates incoming applicant resumes against the embedded tacit knowledge standard to identify exact skill gaps.

---

## 💻 How to Run Locally (For Judges)

Follow these exact instructions to run BoomerBot on your local machine using the unmodified synthetic dataset provided in the Hackathon kit.

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (3.10 or higher)
- **OpenAI API Key**: (Required for the LangGraph orchestrator)

### Step 1: Backend Setup (FastAPI + LangGraph)
The backend handles AI orchestration, RAG vector embeddings, and data persistence.

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python3 -m venv myvenv
source myvenv/bin/activate  # On Windows: myvenv\Scripts\activate

# Install all Python dependencies
pip install -r requirements.txt

# Configure your API key
cp .env.example .env
# Open .env and add your OPENAI_API_KEY="your_actual_key_here"
```

### Step 2: Start the Backend Server
```bash
# Start the FastAPI web server
uvicorn app.main:app --reload
```
*The backend server is now running on `http://localhost:8000`.*

### Step 3: Start the Frontend (React + Vite)
Open a **new** terminal window (leave the backend running).

```bash
# Navigate to the frontend directory
cd frontend

# Install all Node dependencies
npm install

# Start the React development server
npm run dev
```
*The web application is now running at `http://localhost:5173`. Open this URL in your browser!*

---

## Architecture

For a deep dive into the engineering, data flows, problem-to-agent mapping, and our Agentic architecture decisions, please refer to the `architecture.md` file included in this repository or the submitted PPT solution deck.
