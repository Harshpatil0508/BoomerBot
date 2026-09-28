import json
import asyncio
from app.core.config import settings
from app.core import llmaas


def _async_client():
    """Resolved per call so a rotated LLMaaS token is always picked up."""
    return llmaas.get_async_client()


def _sync_client():
    return llmaas.get_sync_client()


class _LazyClient:
    """Keeps `if client:` and `client.chat...` call sites working while resolving lazily."""

    def __init__(self, resolver):
        self._resolver = resolver

    def __bool__(self):
        try:
            return self._resolver() is not None
        except Exception as e:
            print("LLM client unavailable:", e)
            return False

    def __getattr__(self, name):
        return getattr(self._resolver(), name)


client = _LazyClient(_async_client)
sync_client = _LazyClient(_sync_client)

async def generate_streaming_conversation(session_context: dict, transcript: list[dict]):
    if not client:
        # Demo fallback
        yield "That is very insightful. "
        await asyncio.sleep(0.5)
        yield "Let's dig a bit deeper. "
        await asyncio.sleep(0.5)
        yield "Can you explain the next step?"
        return

    expert_name = session_context.get("expert_name") or "an Expert"
    domain = session_context.get("domain") or "their domain"
    
    transcript_text = "\n".join([f"{'Expert' if msg['role'] == 'expert' else 'Interviewer'}: {msg['content']}" for msg in transcript])
    
    initial_state = {
        "expert_name": expert_name,
        "domain": domain,
        "projects": session_context.get("projects", []),
        "experience_details": session_context.get("experience_details", []),
        "topic_checklist": session_context.get("topic_checklist", []),
        "topic_turn_count": session_context.get("topic_turn_count", 0),
        "transcript_text": transcript_text,
        "current_stage": "",
        "generation": ""
    }
    
    try:
        from app.services.voice_graph import voice_app
        
        yield "__STATE__:Analyzing transcript..."
        
        final_state = initial_state
        async for output in voice_app.astream(initial_state):
            for node_name, state_update in output.items():
                if node_name == "route_interview":
                    yield f"__STATE__:Routing to {state_update.get('current_stage', 'mapping')} mode..."
                elif node_name == "ask_process":
                    yield "__STATE__:Drafting process question..."
                elif node_name == "ask_troubleshooting":
                    yield "__STATE__:Drafting troubleshooting question..."
                elif node_name == "critique_and_rewrite":
                    yield "__STATE__:Critiquing drafted question..."
                elif node_name == "handle_barge_in":
                    yield "__STATE__:Adapting to topic change..."
                elif node_name == "wrap_up":
                    yield "__STATE__:Preparing to conclude interview..."
                
                # Keep accumulating the state
                final_state.update(state_update)
                
        content = final_state.get("generation", "I understand. Could you please tell me more?")
        
        # Simulate streaming for the frontend TTS
        words = content.split(" ")
        for word in words:
            yield word + " "
            await asyncio.sleep(0.05)
            
        import json
        yield f"__INTERNAL_STATE__:{json.dumps(final_state)}"
            
    except Exception as e:
        print("LangGraph Voice API Error:", e)
        yield "I'm having trouble connecting right now. Let's try that again."


async def extract_insights_async(session_context: dict, transcript: list[dict]):
    if not client:
        await asyncio.sleep(1)
        return {
            "insights": [
                {"type": "process", "category": "Trigger Condition", "content": "Order value exceeds available credit limit."}
            ],
            "gaps": [],
            "coverage_increase": 15,
            "is_complete": False
        }
        
    system_prompt = f"""You are a background knowledge extraction engine.
Analyze the provided transcript of an interview about {session_context.get("domain")}.
Extract tacit knowledge, process steps, and identify gaps.
Also evaluate if the AI interviewer has successfully concluded the interview (look for the AI saying "This concludes our interview" or similar).

Respond ONLY with a valid JSON object in the following format:
{{
  "insights": [
    {{
      "type": "process" | "tacit",
      "category": "Short Category Name",
      "content": "The extracted knowledge"
    }}
  ],
  "gaps": [
    {{
      "category": "Short Category Name",
      "content": "Description of gap"
    }}
  ],
  "coverage_increase": <integer between 0 and 15>,
  "is_complete": <boolean true if AI concluded interview>
}}"""

    messages = [{"role": "system", "content": system_prompt}]
    transcript_text = "\n".join([f"{'Expert' if msg['role'] == 'expert' else 'Interviewer'}: {msg['content']}" for msg in transcript])
    messages.append({"role": "user", "content": f"Here is the interview transcript:\n\n{transcript_text}"})

    try:
        chat_completion = await client.chat.completions.create(
            messages=messages,
            model=settings.chat_model,
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        content = chat_completion.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print("Insights Extraction API Error:", e)
        return {"insights": [], "gaps": [], "coverage_increase": 0, "is_complete": False}

async def summarize_chat_history(old_summary: str, recent_messages: list) -> str:
    """Condense the old summary + new messages into a tight, highly compressed running summary."""
    if not client:
        return old_summary

    transcript_text = "\n".join([f"{'Expert' if msg['role'] == 'expert' else 'Interviewer'}: {msg['content']}" for msg in recent_messages])
    
    prompt = f"""You are a memory condensation AI.
Your job is to read an existing summary and the most recent transcript, and merge them into a single, concise running summary of the entire interview.

EXISTING SUMMARY:
{old_summary if old_summary else "None"}

NEW TRANSCRIPT:
{transcript_text}

Write a tight, factual summary of everything discussed so far. Do NOT add conversational text. Return ONLY the raw text summary."""
    try:
        chat_completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=settings.chat_model,
            temperature=0.2,
            max_tokens=1000
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception as e:
        print("Summarization error:", e)
        return old_summary
