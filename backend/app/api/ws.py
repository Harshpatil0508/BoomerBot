import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.database.session import SessionLocal
from app.models.session import KnowledgeSession, TranscriptMessage, KnowledgeInsight
from app.services.ai_service import generate_streaming_conversation, extract_insights_async
import asyncio
import random

async def background_summarize(session_id: str, old_summary: str, recent_msgs: list):
    from app.services.ai_service import summarize_chat_history
    new_summary = await summarize_chat_history(old_summary, recent_msgs)
    db = SessionLocal()
    sys_msg = TranscriptMessage(session_id=session_id, role="system", content=f"SUMMARY: {new_summary}")
    db.add(sys_msg)
    db.commit()
    db.close()

router = APIRouter()

@router.websocket("/ws/session/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    db = SessionLocal()
    
    session = db.query(KnowledgeSession).filter(KnowledgeSession.id == session_id).first()
    if not session:
        from app.models.session import Expert
        expert = Expert(name="Rajesh Kulkarni", role="Senior SAP Consultant", department="Enterprise Operations", experience="18 years", expertise="SAP SD, Order Management")
        db.add(expert)
        db.commit()
        db.refresh(expert)
        
        session = KnowledgeSession(id=session_id, expert_id=expert.id, domain="SAP Order Management")
        db.add(session)
        # Add initial AI greeting
        greeting_text = "Hello Rajesh. I'm BoomerBot. Today we're going to talk about SAP Credit Block Resolution. Could you start by explaining the general business context of when a credit block occurs?"
        initial_msg = TranscriptMessage(session_id=session_id, role="ai", content=greeting_text)
        db.add(initial_msg)
        db.commit()
        
        # DO NOT stream immediately. Wait for start_session event.
    
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            if payload.get("type") == "start_session":
                # Generate dynamic greeting based on expert profile
                expert_name = session.expert.name.split(" ")[0] if session.expert else "Expert"
                domain = session.domain if session else "your field of expertise"
                expertise = session.expert.expertise if session.expert else "your field"
                projects = session.expert.projects if session.expert else "your past projects"
                
                from app.core.llmaas import get_langchain_chat
                from langchain_core.messages import SystemMessage, HumanMessage
                
                try:
                    llm = get_langchain_chat(temperature=0.7)
                    system_prompt = f"""You are BoomerBot, an interviewer welcoming an expert. 
                    You must greet them by name ({expert_name}), state that you want to talk about {domain}, and ask a highly specific opening question based on their expertise: {expertise} and projects: {projects}. 
                    Keep it casual, concise, and under 2 sentences. Do not use markdown, asterisks, or bullet points."""
                    
                    messages = [SystemMessage(content=system_prompt), HumanMessage(content="Generate the opening greeting.")]
                    response = await llm.ainvoke(messages)
                    greeting_text = response.content
                except Exception as e:
                    print("Error generating dynamic greeting:", e)
                    greeting_text = f"Hello {expert_name}. I'm BoomerBot. Today we're going to talk about {domain}. Could you start by explaining the general business context or your primary responsibilities in this area?"
                
                words = greeting_text.split(" ")
                for word in words:
                    await websocket.send_text(json.dumps({
                        "type": "ai_stream",
                        "token": word + " "
                    }))
                    await asyncio.sleep(0.05)
                await websocket.send_text(json.dumps({
                    "type": "ai_stream_end"
                }))
                
                # Save initial greeting to DB
                initial_msg = TranscriptMessage(session_id=session_id, role="ai", content=greeting_text)
                db.add(initial_msg)
                db.commit()
                continue
                
            if payload.get("type") == "expert_message":
                expert_text = payload.get("content")
                
                # Save expert message
                msg = TranscriptMessage(session_id=session_id, role="expert", content=expert_text)
                db.add(msg)
                db.commit()
                
                # Rolling Memory Implementation
                db_msgs = db.query(TranscriptMessage).filter(TranscriptMessage.session_id == session_id).order_by(TranscriptMessage.created_at).all()
                
                # Find the latest system summary
                system_msgs = [m for m in db_msgs if m.role == "system"]
                latest_summary = system_msgs[-1].content.replace("SUMMARY: ", "") if system_msgs else ""
                
                if system_msgs:
                    latest_sys_index = db_msgs.index(system_msgs[-1])
                    recent_db_msgs = db_msgs[latest_sys_index + 1:]
                else:
                    recent_db_msgs = db_msgs
                    
                recent_transcript = [{"role": m.role, "content": m.content} for m in recent_db_msgs]
                
                # If memory window is getting large (e.g. 6 messages = 3 full conversational turns), condense it!
                if len(recent_transcript) > 6:
                    asyncio.create_task(background_summarize(session_id, latest_summary, recent_transcript))
                
                # The bounded transcript sent to the AI
                transcript = []
                if latest_summary:
                    transcript.append({"role": "system", "content": f"Here is a summary of the conversation so far: {latest_summary}"})
                transcript.extend(recent_transcript)
                
                expert = session.expert
                session_context = {
                    "expert_name": expert.name if expert else "Unknown",
                    "domain": session.domain,
                    "department": expert.department if expert else "Unknown",
                    "role": expert.role if expert else "Unknown",
                    "experience": expert.experience if expert else "Unknown",
                    "expertise": expert.expertise if expert else "Unknown",
                    "projects": json.loads(expert.projects) if expert and getattr(expert, "projects", None) else [],
                    "experience_details": json.loads(expert.experience_details) if expert and getattr(expert, "experience_details", None) else [],
                    "topic_checklist": json.loads(session.topic_checklist) if session.topic_checklist else [],
                    "topic_turn_count": session.topic_turn_count or 0
                }
                
                # Start insights extraction in parallel
                insights_task = asyncio.create_task(extract_insights_async(session_context, transcript))
                
                fillers = ["I see. ", "Got it. ", "Okay. ", "That makes sense. ", "Right. ", "Understood. "]
                selected_filler = random.choice(fillers)
                
                full_ai_response = selected_filler
                await websocket.send_text(json.dumps({
                    "type": "ai_stream",
                    "token": selected_filler
                }))
                
                async for token in generate_streaming_conversation(session_context, transcript):
                    if token.startswith("__STATE__:"):
                        state_msg = token.replace("__STATE__:", "").strip()
                        await websocket.send_text(json.dumps({
                            "type": "ai_state_change",
                            "state": state_msg
                        }))
                        # We must send a small sleep to allow the frontend UI to render it visibly
                        await asyncio.sleep(0.5)
                        continue
                        
                    if token.startswith("__INTERNAL_STATE__:"):
                        state_json = token.replace("__INTERNAL_STATE__:", "").strip()
                        try:
                            final_state = json.loads(state_json)
                            session.topic_checklist = json.dumps(final_state.get("topic_checklist", []))
                            session.topic_turn_count = final_state.get("topic_turn_count", 0)
                            db.commit()
                        except Exception as e:
                            print("Error parsing internal state:", e)
                        continue
                        
                    full_ai_response += token
                    await websocket.send_text(json.dumps({
                        "type": "ai_stream",
                        "token": token
                    }))
                    
                await websocket.send_text(json.dumps({
                    "type": "ai_stream_end"
                }))
                
                # Save AI message
                ai_msg = TranscriptMessage(session_id=session_id, role="ai", content=full_ai_response.strip())
                db.add(ai_msg)
                
                # Wait for insights extraction to finish
                ai_result = await insights_task
                
                # Save Insights
                insights = []
                for ins in ai_result.get("insights", []):
                    db_ins = KnowledgeInsight(
                        id=str(uuid.uuid4()),
                        session_id=session_id,
                        insight_type=ins["type"],
                        category=ins["category"],
                        content=ins["content"]
                    )
                    db.add(db_ins)
                    insights.append({
                        "id": db_ins.id,
                        "type": db_ins.insight_type,
                        "category": db_ins.category,
                        "content": db_ins.content
                    })

                gaps = []
                for gap in ai_result.get("gaps", []):
                    db_gap = KnowledgeInsight(
                        id=str(uuid.uuid4()),
                        session_id=session_id,
                        insight_type="gap",
                        category=gap["category"],
                        content=gap["content"]
                    )
                    db.add(db_gap)
                    gaps.append({
                        "id": db_gap.id,
                        "category": db_gap.category,
                        "content": db_gap.content
                    })
                
                # Update coverage
                session.coverage = min(100.0, session.coverage + ai_result.get("coverage_increase", 0))
                db.commit()
                
                # Send insights and final state
                await websocket.send_text(json.dumps({
                    "type": "ai_insights",
                    "insights": insights,
                    "gaps": gaps,
                    "coverage": session.coverage,
                    "is_complete": ai_result.get("is_complete", False)
                }))
                
    except WebSocketDisconnect:
        pass
    finally:
        db.close()
