# BoomerBot Enterprise Architecture

BoomerBot is a scalable, AI-powered enterprise knowledge preservation system. The architecture is split between a React frontend and a FastAPI backend, heavily utilizing LangGraph for complex agentic workflows and ChromaDB for both Vector Retrieval and LLM Prompt Caching.

## System Architecture Diagram

```mermaid
graph TD
    %% Styling
    classDef frontend fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    classDef backend fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    classDef ai fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff
    classDef db fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    classDef cache fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#fff

    subgraph Client [Frontend - React / Tailwind]
        UI[BoomerBot Web App]:::frontend
        UI --> |REST HTTP| API[FastAPI REST Router]
        UI <--> |WebSocket| WS[FastAPI WS Router]
    end

    subgraph Server [Backend - FastAPI]
        API:::backend
        WS:::backend
        
        API --> REST_Logic[Endpoints: Dashboard, Assets, RAG Query]
        WS --> Stream_Logic[Real-time Interview State Machine]
    end

    subgraph AI Agents & Orchestration [LangGraph / Groq]
        REST_Logic --> |1. Check Cache| Cache_Layer[LLM Caching Layer]:::cache
        
        Cache_Layer --> |Cache Miss| RAG_Agent[RAG Assistant Graph]:::ai
        Cache_Layer --> |Cache Miss| Asset_Gen[Parallel Asset Generators]:::ai
        
        Stream_Logic --> Voice_Agent[Interview StateGraph]:::ai
        Stream_Logic --> Insight_Extractor[Async Insight Extractor]:::ai
        Stream_Logic --> Memory_Compressor[Rolling Memory Summarizer]:::ai
    end

    subgraph Data Persistence [Databases]
        REST_Logic --> SQL[(SQLite DB)]:::db
        Stream_Logic --> SQL
        
        RAG_Agent --> VectorDB[(ChromaDB Vector Store)]:::db
        Asset_Gen --> SQL
        
        Cache_Layer --> |Semantic Cache| VectorDB
        Cache_Layer --> |Hash Cache| VectorDB
    end

    %% Interactions
    Voice_Agent -.-> |Streams State Thoughts| WS
    Memory_Compressor -.-> |Bounded Context| Voice_Agent
```

## Key Components

### 1. The Frontend (React + Framer Motion)
The client application handles robust state management and fluid UI animations. Key features include the `Capture.tsx` live-streaming websocket interface that visualizes agent thoughts in real-time, and the `Assistant.tsx` citation split-pane which strictly highlights RAG source documents.

### 2. Live Voice Agent (LangGraph + WebSockets)
Located in `ws.py` and `voice_graph.py`, this is a bidirectional streaming agent. Rather than a simple LLM call, it uses a StateGraph to route user input dynamically (e.g. mapping workflows vs troubleshooting errors). It utilizes **Rolling Memory Summarization** to mathematically bound its context window, ensuring it never hits an API rate limit regardless of interview length.

### 3. Asynchronous Asset Generation
Located in `rest.py`, the asset generator transforms unstructured interview transcripts into structured Markdown (`SOP`, `FAQ`, `Troubleshooting Guide`). It utilizes `asyncio.gather` to trigger 3 separate AI Agents in parallel, aggressively bypassing Token-Per-Minute restrictions.

### 4. RAG Knowledge Assistant (LangGraph)
Located in `langgraph_agent.py`, the assistant allows users to query preserved knowledge. It features a grading node to detect hallucinations and prevent irrelevant answers.

### 5. Multi-Tier Caching System (ChromaDB)
To optimize LLM costs and latency without relying on external infrastructure like Redis, ChromaDB was re-purposed as a robust Edge Cache:
- **Semantic Cache:** Detects if a user's question semantically matches a previous question (Distance < 0.20) and instantly returns the cached JSON.
- **Hash Cache:** MD5-hashes the raw interview transcript before Asset Generation, bypassing the AI entirely if an expert regenerates assets without modifying the source text.
