from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.llmaas import get_langchain_chat
from app.rag.chroma import query_knowledge

class GraphState(TypedDict):
    """
    Represents the state of our graph.
    """
    question: str
    filter_dict: dict
    documents: List[str]
    sources: List[dict]
    generation: str
    exact_quotes: List[str]
    is_relevant: bool

# We define structured output for grading
class GradeDocuments(BaseModel):
    """Binary score for relevance check on retrieved documents."""
    binary_score: str = Field(description="Documents are relevant to the question, 'yes' or 'no'")

def retrieve(state: GraphState):
    """
    Retrieve documents
    """
    question = state["question"]
    filter_dict = state.get("filter_dict", {})
    
    # Retrieval
    results = query_knowledge(question, n_results=4, filter_dict=filter_dict)
    
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    
    return {"documents": docs, "sources": metas, "question": question}

def grade_documents(state: GraphState):
    """
    Determines whether the retrieved documents are relevant to the question.
    """
    question = state["question"]
    documents = state["documents"]
    
    if not documents:
        return {"is_relevant": False}
        
    # Set up LLM with structured output
    try:
        llm = get_langchain_chat(temperature=0)
        structured_llm_grader = llm.with_structured_output(GradeDocuments)
    
        system = """You are a grader assessing relevance of a retrieved document to a user question. \n 
        If the document contains keyword(s) or semantic meaning related to the user question, grade it as relevant. \n
        It does not need to be a stringent test. The goal is to filter out erroneous retrievals. \n
        Give a binary score 'yes' or 'no' score to indicate whether the document is relevant to the question."""
        
        # Combine docs
        docs_content = "\n\n".join(documents)
        
        grade_prompt = f"Retrieved document: \n\n {docs_content} \n\n User question: {question}"
        messages = [SystemMessage(content=system), HumanMessage(content=grade_prompt)]
        
        score = structured_llm_grader.invoke(messages)
        grade = score.binary_score
    except Exception as e:
        print(f"Grading error: {e}")
        # Default to False if grading fails to prevent hallucination
        grade = "no"
        
    is_relevant = (grade == "yes")
    
    return {"is_relevant": is_relevant}

class FinalAnswer(BaseModel):
    answer: str = Field(description="The final markdown response to the user's question.")
    exact_quotes: List[str] = Field(description="List of verbatim sentences from the context that were used to formulate the answer. MUST be exact substrings of the context.")

def generate(state: GraphState):
    """
    Generate answer using the RAG context
    """
    question = state["question"]
    documents = state["documents"]
    
    try:
        llm = get_langchain_chat(temperature=0.3)
        structured_llm_generator = llm.with_structured_output(FinalAnswer)
        
        docs_content = "\n\n".join(documents)
        
        system = """You are BoomerBot, a helpful Knowledge Assistant for the organization.
        Use the following pieces of retrieved context to answer the user's question.
        If you don't know the answer based on the context, just say that you don't know. 
        Use three sentences maximum and keep the answer concise."""
        
        messages = [
            SystemMessage(content=system),
            HumanMessage(content=f"Question: {question} \n\n Context: {docs_content}")
        ]
        
        response = structured_llm_generator.invoke(messages)
        content = response.answer
        quotes = response.exact_quotes
    except Exception as e:
        print(f"Generation error: {e}")
        content = "I encountered an error while trying to answer."
        quotes = []
    
    return {"generation": content, "exact_quotes": quotes}

def handle_fallback(state: GraphState):
    """
    Provide a safe fallback answer if documents are irrelevant.
    """
    return {"generation": "I'm sorry, I couldn't find any captured knowledge relevant to your question. Please ensure an expert has been interviewed on this topic and that their SOPs are published.", "exact_quotes": []}

def decide_to_generate(state: GraphState):
    """
    Determines whether to generate an answer, or fallback.
    """
    if state["is_relevant"]:
        return "generate"
    else:
        return "handle_fallback"

# Compile the Graph
workflow = StateGraph(GraphState)

# Define the nodes
workflow.add_node("retrieve", retrieve)
workflow.add_node("grade_documents", grade_documents)
workflow.add_node("generate", generate)
workflow.add_node("handle_fallback", handle_fallback)

# Build graph
workflow.set_entry_point("retrieve")
workflow.add_edge("retrieve", "grade_documents")
workflow.add_conditional_edges(
    "grade_documents",
    decide_to_generate,
    {
        "generate": "generate",
        "handle_fallback": "handle_fallback"
    }
)
workflow.add_edge("generate", END)
workflow.add_edge("handle_fallback", END)

# Compile
app = workflow.compile()
