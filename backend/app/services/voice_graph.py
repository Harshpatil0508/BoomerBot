from typing import TypedDict
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field
from app.core.config import settings
from app.core.llmaas import get_langchain_chat

class VoiceGraphState(TypedDict):
    expert_name: str
    domain: str
    projects: list
    experience_details: list
    topic_checklist: list
    topic_turn_count: int
    transcript_text: str
    current_stage: str
    generation: str

class RouterDecision(BaseModel):
    """Decision on what stage of the interview we are in."""
    stage: str = Field(description="The stage of the interview: 'mapping', 'troubleshooting', 'wrap_up', or 'barge_in'")
    barge_in_topic: str = Field(default="", description="If stage is 'barge_in', the topic the expert wants to discuss.")

def route_interview(state: VoiceGraphState):
    """
    Decides the next state of the interview based on the transcript.
    """
    transcript = state["transcript_text"]
    topic_turn_count = state.get("topic_turn_count", 0) + 1
    
    # Check for forced pivot
    if topic_turn_count >= 3 and state.get("topic_checklist"):
        return {"current_stage": "pivot_topic", "topic_turn_count": topic_turn_count}
    
    # If there is very little transcript, we are obviously in mapping.
    if len(transcript.split('\n')) < 4:
        return {"current_stage": "mapping", "topic_turn_count": topic_turn_count}
        
    try:
        llm = get_langchain_chat(temperature=0)
        structured_llm_router = llm.with_structured_output(RouterDecision)
        
        system = """You are an interview router. Read the transcript of the interview so far.
        Rules:
        1. If the expert is still explaining the basic step-by-step process of their domain, output 'mapping'.
        2. If the basic process is fully mapped, but we haven't discussed edge cases, exceptions, or things going wrong, output 'troubleshooting'.
        3. If we have already discussed the process AND the edge cases (or if the transcript is very long with 5+ deep questions asked), output 'wrap_up'.
        4. CRITICAL OVERRIDE 1: If the expert explicitly asks to change the topic, asks a question about something else, or says they worked on another product/skill, output 'barge_in' and set barge_in_topic to the new topic.
        5. CRITICAL OVERRIDE 2: If the expert explicitly asks to stop, conclude, finish, or says they are done with the interview, you MUST output 'wrap_up' immediately.
        """
        
        messages = [
            SystemMessage(content=system), 
            HumanMessage(content=f"Transcript:\n{transcript}")
        ]
        
        decision = structured_llm_router.invoke(messages)
        stage = decision.stage
        
        if stage not in ["mapping", "troubleshooting", "wrap_up", "barge_in"]:
            stage = "mapping"
            
    except Exception as e:
        print(f"Router error: {e}")
        stage = "mapping"
        
    return {"current_stage": stage, "topic_turn_count": topic_turn_count}

def ask_process(state: VoiceGraphState):
    """
    Generates a response focused on process mapping.
    """
    expert = state["expert_name"]
    domain = state["domain"]
    projects = state.get("projects", [])
    experiences = state.get("experience_details", [])
    transcript = state["transcript_text"]
    
    import json
    projects_str = json.dumps(projects, indent=2)
    experiences_str = json.dumps(experiences, indent=2)
    
    llm = get_langchain_chat(temperature=0.5)
    
    system = f"""You are BoomerBot, interviewing {expert} about {domain}.
    You are currently in the PROCESS MAPPING stage.
    
    Expert's Projects:
    {projects_str}
    
    Expert's Experience:
    {experiences_str}
    
    If the expert has NOT listed the steps yet, ask a concise question to understand the step-by-step workflow.
    If the expert HAS listed the steps, DO NOT ASK FOR THEM AGAIN. Instead, pick ONE specific step they mentioned and ask them to explain how they execute it in detail.
    Do not ask about edge cases yet.
    
    CRITICAL RULES:
    1. NEVER use markdown, asterisks, bolding, bullet points, or special characters. 
    2. Speak casually and conversationally for Text-to-Speech.
    3. Keep your question concise.
    """
    
    messages = [SystemMessage(content=system), HumanMessage(content=f"Transcript:\n{transcript}\n\nRespond with your next question:")]
    response = llm.invoke(messages)
    
    return {"generation": response.content}

def ask_troubleshooting(state: VoiceGraphState):
    """
    Generates a response focused on edge cases.
    """
    expert = state["expert_name"]
    domain = state["domain"]
    projects = state.get("projects", [])
    experiences = state.get("experience_details", [])
    transcript = state["transcript_text"]
    
    import json
    projects_str = json.dumps(projects, indent=2)
    experiences_str = json.dumps(experiences, indent=2)
    
    llm = get_langchain_chat(temperature=0.5)
    
    system = f"""You are BoomerBot, interviewing {expert} about {domain}.
    You are currently in the TROUBLESHOOTING stage.
    
    Expert's Projects:
    {projects_str}
    
    Expert's Experience:
    {experiences_str}
    The main process is mapped. Now, you must extract edge cases.
    
    If you haven't asked yet, ask a concise question about exceptions, what usually goes wrong, or hidden gotchas.
    If they have already listed some exceptions, DO NOT ASK FOR THEM AGAIN. Pick one specific exception they mentioned and ask how they resolve it.
    
    CRITICAL RULES:
    1. NEVER use markdown, asterisks, bolding, bullet points, or special characters. 
    2. Speak casually and conversationally for Text-to-Speech.
    3. Keep your question concise.
    """
    
    messages = [SystemMessage(content=system), HumanMessage(content=f"Transcript:\n{transcript}\n\nRespond with your next question:")]
    response = llm.invoke(messages)
    
    return {"generation": response.content}

def wrap_up(state: VoiceGraphState):
    """
    Generates the termination response.
    """
    return {"generation": "Thank you so much for sharing your expertise. This concludes our interview."}

def pivot_topic(state: VoiceGraphState):
    """
    Forces a transition to the next topic on the checklist.
    """
    checklist = state.get("topic_checklist", [])
    if not checklist:
        return {"current_stage": "wrap_up"}
        
    next_topic = checklist.pop(0)
    
    llm = get_langchain_chat(temperature=0.5)
    system = f"""You are BoomerBot, an interviewer. 
    You have spent enough time on the current subject. 
    Your strict task: Acknowledge their last answer briefly, and immediately pivot to asking an opening question about this new topic: [{next_topic}].
    CRITICAL RULES:
    1. NEVER use markdown, asterisks, bolding, bullet points, or special characters. 
    2. Speak casually and conversationally.
    3. Keep your question concise."""
    
    messages = [SystemMessage(content=system), HumanMessage(content=f"Respond with your transition and question:")]
    response = llm.invoke(messages)
    
    return {
        "topic_checklist": checklist, 
        "topic_turn_count": 0, 
        "generation": response.content,
        "current_stage": "pivot_topic"
    }

def handle_barge_in(state: VoiceGraphState):
    """Handles when the expert forcefully changes the subject."""
    transcript = state["transcript_text"]
    
    llm = get_langchain_chat(temperature=0.7)
    system = """You are BoomerBot, interviewing an expert.
    The expert just forcefully changed the subject or asked to talk about a different topic.
    Acknowledge their request politely and ask an opening question about the new topic they brought up.
    CRITICAL RULES:
    1. NEVER use markdown, asterisks, bolding, bullet points, or special characters. 
    2. Speak casually and conversationally.
    3. Keep your response concise (max 2 sentences)."""
    
    messages = [SystemMessage(content=system), HumanMessage(content=f"Transcript:\n{transcript}\n\nRespond to their topic change:")]
    response = llm.invoke(messages)
    
    return {
        "topic_turn_count": 0, 
        "current_stage": "barge_in",
        "generation": response.content
    }

class CritiqueDecision(BaseModel):
    is_good: bool = Field(description="True if the question is concise, clear, and easy to understand. False if it is confusing, uses complex jargon, or is too long.")
    rewritten_question: str = Field(description="If the question is bad, provide a rewritten version that is casual, concise, and easy to understand. If the question is good, leave blank.")

def critique_and_rewrite(state: VoiceGraphState):
    """
    Evaluates the generated question and rewrites it if it's too complex.
    """
    generation = state["generation"]
    
    try:
        llm = get_langchain_chat(temperature=0)
        structured_llm_critique = llm.with_structured_output(CritiqueDecision)
        
        system = """You are an editor evaluating a question an AI is about to ask a human on a voice call.
        Grade the question. It must be:
        1. Concise and easy to understand via audio.
        2. Free of markdown or complex jargon.
        3. Casual and conversational.
        If it fails any of these, set is_good to False and provide a rewritten_question that fixes it."""
        
        messages = [
            SystemMessage(content=system), 
            HumanMessage(content=f"Question to evaluate: {generation}")
        ]
        
        evaluation = structured_llm_critique.invoke(messages)
        
        if not evaluation.is_good and evaluation.rewritten_question:
            print(f"[LANGGRAPH CRITIQUE] Wait, this question is too confusing. Rewriting...\nOriginal: {generation}\nRewritten: {evaluation.rewritten_question}")
            return {"generation": evaluation.rewritten_question}
            
    except Exception as e:
        print(f"Critique error: {e}")
        
    return {"generation": generation}

def decide_next_node(state: VoiceGraphState):
    """
    Routes to the correct node based on the router's decision.
    """
    return state["current_stage"]

# Compile Graph
workflow = StateGraph(VoiceGraphState)

workflow.add_node("route_interview", route_interview)
workflow.add_node("mapping", ask_process)
workflow.add_node("troubleshooting", ask_troubleshooting)
workflow.add_node("pivot_topic", pivot_topic)
workflow.add_node("handle_barge_in", handle_barge_in)
workflow.add_node("wrap_up", wrap_up)
workflow.add_node("critique_and_rewrite", critique_and_rewrite)

workflow.set_entry_point("route_interview")

workflow.add_conditional_edges(
    "route_interview",
    decide_next_node,
    {
        "mapping": "mapping",
        "troubleshooting": "troubleshooting",
        "pivot_topic": "pivot_topic",
        "barge_in": "handle_barge_in",
        "wrap_up": "wrap_up"
    }
)

workflow.add_edge("mapping", "critique_and_rewrite")
workflow.add_edge("troubleshooting", "critique_and_rewrite")
workflow.add_edge("pivot_topic", "critique_and_rewrite")
workflow.add_edge("handle_barge_in", "critique_and_rewrite")
workflow.add_edge("critique_and_rewrite", END)
workflow.add_edge("wrap_up", END)

voice_app = workflow.compile()
