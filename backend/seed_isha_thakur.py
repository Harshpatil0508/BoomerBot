import os
import sys

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Base
from app.models.session import Expert, KnowledgeSession, TranscriptMessage, KnowledgeInsight

SQLALCHEMY_DATABASE_URL = "sqlite:///./boomerbot.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_isha_thakur():
    db = SessionLocal()
    
    print("Checking for existing Isha Thakur...")
    existing_expert = db.query(Expert).filter(Expert.name == "Isha Thakur").first()
    if existing_expert:
        print("Found existing Isha Thakur. Deleting to start fresh...")
        db.delete(existing_expert)
        db.commit()

    print("Creating Isha Thakur profile...")
    isha = Expert(
        name="Isha Thakur",
        email="isha.thakur@boomerbot.com",
        department="Engineering",
        role="Lead AI Architect",
        experience="12 Years",
        expertise="FastAPI, LangGraph, React, GenAI, Postgres",
        projects='["Enterprise Agentic Workflow Platform"]',
        experience_details='["Designed and implemented stateful multi-agent systems using LangGraph, persisting state to PostgreSQL.", "Built high-performance async APIs with FastAPI and real-time streaming interfaces in React."]'
    )
    db.add(isha)
    db.commit()
    db.refresh(isha)

    print("Creating Knowledge Session...")
    session = KnowledgeSession(
        expert_id=isha.id,
        domain="Agentic AI Architecture",
        coverage=94.0,
        status="completed",
        topic_checklist='["LangGraph State Machines", "Postgres Checkpointing", "FastAPI SSE Streaming", "React Zustand Integration", "pgvector"]',
        topic_turn_count=12
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    print("Injecting 12-turn Technical Transcript...")
    conversation = [
        ("ai", "Welcome Isha. Could you walk me through the high-level architecture of the Enterprise Agentic Workflow Platform you designed?"),
        ("expert", "Sure. The core is built on LangGraph for stateful agent orchestration. The backend is powered by FastAPI, and we use PostgreSQL for both relational data and vector storage using pgvector. The frontend is a React application that consumes real-time updates."),
        ("ai", "Let's dive into LangGraph. Why did you choose it over standard LangChain chains or autonomous agents like AutoGPT?"),
        ("expert", "We needed strict deterministic routing with cycles. Standard chains are too rigid, and AutoGPT is too unpredictable for enterprise compliance. LangGraph allowed us to define clear state machines where human-in-the-loop nodes could interrupt the flow."),
        ("ai", "You mentioned human-in-the-loop. How is the state persisted while waiting for human input, especially since FastAPI is stateless?"),
        ("expert", "That was the main architectural challenge. We built a custom Postgres Checkpointer for LangGraph. Whenever the graph halts for input, the entire state dictionary is serialized into a JSONB column in Postgres."),
        ("ai", "How do you handle concurrent agent executions in this setup? What if two users trigger the same graph?"),
        ("expert", "FastAPI handles the concurrent HTTP requests asynchronously. Each request generates a unique thread_id for the LangGraph execution. The Postgres checkpointer queries state by this thread_id, ensuring complete isolation between concurrent graph runs."),
        ("ai", "Speaking of FastAPI, how are you handling the long-running LLM calls without timing out the HTTP requests?"),
        ("expert", "We don't use standard request-response for the agent execution. When a user starts a task, FastAPI kicks off the LangGraph execution in a background task and immediately returns a 202 Accepted with a task ID."),
        ("ai", "If it returns immediately, how does the React frontend know what the agent is doing or when it finishes?"),
        ("expert", "We implemented Server-Sent Events (SSE) in FastAPI. The React frontend establishes an SSE connection using the task ID. As LangGraph transitions between nodes or streams LLM tokens, we push those events directly to the frontend."),
        ("ai", "How did you implement the SSE streaming in FastAPI alongside LangGraph?"),
        ("expert", "We use LangGraph's `.astream_events()` API. We wrapped it in an async generator function in FastAPI that yields formatted SSE strings. React consumes this using the standard EventSource API or fetch with a stream reader."),
        ("ai", "Let's talk about the GenAI components. Which models are you using, and how do you handle prompt management?"),
        ("expert", "We use OpenAI's GPT-4o for complex reasoning nodes and a local Llama-3 model for data extraction tasks to save costs. Prompts are managed as templates in a dedicated Postgres table, allowing us to tweak them without redeploying code."),
        ("ai", "How are you managing context window limits when passing data between multiple LangGraph nodes?"),
        ("expert", "We implemented a memory compression node. If the conversation history in the state exceeds 80% of the token limit, this node triggers, summarizing older messages while retaining key facts, and updates the state before passing it to the next LLM node."),
        ("ai", "For the vector storage, why choose pgvector over a dedicated vector database like Pinecone or Weaviate?"),
        ("expert", "Operational simplicity. By using pgvector, we keep our relational metadata, like user RBAC permissions and session history, in the exact same database as our embeddings. This allows us to do hybrid SQL joins between vector similarity and strict row-level security."),
        ("ai", "That makes sense. Finally, on the React side, how are you managing the complex state of a multi-agent conversation?"),
        ("expert", "We use Zustand for global state management. As the SSE stream comes in, a custom React hook parses the chunks and updates the Zustand store. This automatically triggers re-renders for the specific chat bubbles or workflow visualizations without bogging down the whole DOM."),
        ("ai", "This is a highly robust architecture, Isha. Thank you for walking me through the FastAPI, LangGraph, and Postgres integration details so thoroughly."),
        ("expert", "Happy to share. The shift to agentic architectures requires a lot of these bespoke infrastructure bridges, but the result is incredibly powerful.")
    ]

    for role, content in conversation:
        msg = TranscriptMessage(
            session_id=session.id,
            role=role,
            content=content
        )
        db.add(msg)
    
    db.commit()

    print("Injecting Insights...")
    insights = [
        KnowledgeInsight(
            session_id=session.id,
            insight_type="process",
            category="State Management",
            content="Custom Postgres Checkpointer serializes LangGraph state dictionary into JSONB for stateless persistence across human-in-the-loop nodes."
        ),
        KnowledgeInsight(
            session_id=session.id,
            insight_type="tacit",
            category="API Architecture",
            content="FastAPI handles long-running LLM calls in background tasks and uses Server-Sent Events (SSE) to push token streams to React without blocking the main event loop."
        ),
        KnowledgeInsight(
            session_id=session.id,
            insight_type="tacit",
            category="Memory Optimization",
            content="A custom LangGraph compression node triggers when token usage exceeds 80%, rolling up historical messages into a dense summary while retaining critical key facts."
        ),
        KnowledgeInsight(
            session_id=session.id,
            insight_type="gap",
            category="Frontend Optimization",
            content="Expert detailed how Zustand handles incoming SSE streams, but did not explain how the global store is garbage collected after a session ends to prevent memory leaks."
        )
    ]
    db.add_all(insights)
    db.commit()

    print("✅ Isha Thakur successfully seeded! You can now demo asset generation from the UI.")

if __name__ == "__main__":
    seed_isha_thakur()
