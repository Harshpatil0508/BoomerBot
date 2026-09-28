import json
import asyncio
import io
from datetime import datetime, timezone
from typing import List, Optional
import pypdf
import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.models.session import Expert, KnowledgeSession, TranscriptMessage, KnowledgeInsight, KnowledgeAsset
from app.services.ai_service import sync_client, client
from app.rag.chroma import index_knowledge_asset, delete_knowledge_asset, check_semantic_cache, store_semantic_cache, check_asset_cache, store_asset_cache, clear_semantic_cache
from app.services.anomaly_detector import scan_dataset
from app.rag.langgraph_agent import app as graph_app
from pydantic import BaseModel
from app.core.config import settings
from app.core.security import require_role
from app.models.user import User

if settings.CLOUDINARY_URL:
    url = settings.CLOUDINARY_URL
    if url.startswith("cloudinary://"):
        url = url.replace("cloudinary://", "")
        auth, cloud_name = url.split("@")
        api_key, api_secret = auth.split(":")
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )

router = APIRouter()


def _open_gaps_for_expert(db: Session, expert_id: str):
    return (
        db.query(KnowledgeInsight)
        .join(KnowledgeSession, KnowledgeInsight.session_id == KnowledgeSession.id)
        .filter(
            KnowledgeSession.expert_id == expert_id,
            KnowledgeInsight.insight_type == "gap",
            KnowledgeInsight.resolved_at.is_(None),
        )
        .order_by(KnowledgeInsight.created_at.desc())
        .all()
    )


def _resolve_assigned_gaps(db: Session, session_id: str):
    now = datetime.now(timezone.utc)
    assigned = db.query(KnowledgeInsight).filter(
        KnowledgeInsight.resolved_by_session_id == session_id,
        KnowledgeInsight.resolved_at.is_(None),
    ).all()
    for gap in assigned:
        gap.resolved_at = now
    return len(assigned)

# ---------------------
# Dashboard Stats
# ---------------------
@router.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    total_assets = db.query(func.count(KnowledgeAsset.id)).scalar() or 0
    total_sessions = db.query(func.count(KnowledgeSession.id)).scalar() or 0
    total_insights = db.query(func.count(KnowledgeInsight.id)).scalar() or 0
    total_experts = db.query(func.count(Expert.id)).scalar() or 0
    domains = db.query(func.count(func.distinct(KnowledgeSession.domain))).scalar() or 0
    
    avg_coverage = db.query(func.avg(KnowledgeSession.coverage)).scalar() or 0
    
    recent_sessions = db.query(KnowledgeSession).order_by(KnowledgeSession.created_at.desc()).limit(5).all()
    
    return {
        "total_assets": total_assets,
        "total_sessions": total_sessions,
        "total_insights": total_insights,
        "total_experts": total_experts,
        "domains": domains,
        "avg_coverage": round(avg_coverage, 1),
        "recent_sessions": [
            {
                "id": s.id,
                "expert_name": s.expert.name if s.expert else "Unknown",
                "domain": s.domain,
                "coverage": s.coverage,
                "status": s.status,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "message_count": db.query(func.count(TranscriptMessage.id)).filter(TranscriptMessage.session_id == s.id).scalar() or 0,
                "insight_count": db.query(func.count(KnowledgeInsight.id)).filter(KnowledgeInsight.session_id == s.id).scalar() or 0,
            }
            for s in recent_sessions
        ]
    }

@router.get("/api/dashboard/at-risk")
def get_at_risk_experts(db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    experts = db.query(Expert).all()
    at_risk = []
    
    for e in experts:
        sessions = db.query(KnowledgeSession).filter(KnowledgeSession.expert_id == e.id).all()
        open_gap_count = len(_open_gaps_for_expert(db, e.id))
        has_active = any(s.status == "active" for s in sessions)
        if not sessions:
            at_risk.append({
                "id": e.id,
                "name": e.name,
                "department": e.department,
                "risk_reason": "No capture sessions initiated",
                "coverage": 0,
                "open_gaps": open_gap_count,
                "has_active_session": has_active
            })
            continue
            
        completed_sessions = [s for s in sessions if s.status == "completed"]
        if not completed_sessions:
            at_risk.append({
                "id": e.id,
                "name": e.name,
                "department": e.department,
                "risk_reason": "Sessions incomplete or abandoned",
                "coverage": max([s.coverage for s in sessions] + [0]),
                "open_gaps": open_gap_count,
                "has_active_session": has_active
            })
            continue
            
        best_coverage = max(s.coverage for s in completed_sessions)
        if best_coverage < 70 or open_gap_count > 0:
            at_risk.append({
                "id": e.id,
                "name": e.name,
                "department": e.department,
                "risk_reason": "Low capture coverage" if best_coverage < 70 else "Unresolved knowledge gaps",
                "coverage": round(best_coverage, 1),
                "open_gaps": open_gap_count,
                "has_active_session": has_active
            })
            
    at_risk.sort(key=lambda x: x["coverage"])
    return at_risk

@router.post("/api/admin/scan-dataset")
async def api_scan_dataset(file: UploadFile = File(...), current_user: User = Depends(require_role(["ADMIN"]))):
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported")
        
    contents = await file.read()
    results = scan_dataset(contents)
    
    if "error" in results:
        raise HTTPException(status_code=400, detail=results["error"])
        
    return {"status": "success", "anomalies": results}

# ---------------------
# Experts Directory
# ---------------------
@router.get("/api/experts")
def get_experts(db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    experts = db.query(Expert).order_by(Expert.created_at.desc()).all()
    return [
        {
            "id": e.id,
            "name": e.name,
            "email": e.email,
            "department": e.department,
            "role": e.role,
            "expertise": e.expertise,
            "session_count": sum(1 for s in e.sessions if s.status == "completed" or len(s.messages) > 0),
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in experts
    ]

@router.get("/api/experts/{expert_id}")
def get_expert_detail(expert_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    expert = db.query(Expert).filter(Expert.id == expert_id).first()
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")
        
    assets = db.query(KnowledgeAsset).join(KnowledgeSession).filter(KnowledgeSession.expert_id == expert_id).all()
    open_gaps = _open_gaps_for_expert(db, expert_id)
    has_active_session = any(s.status == "active" for s in expert.sessions)
    
    return {
        "id": expert.id,
        "name": expert.name,
        "department": expert.department,
        "role": expert.role,
        "experience": expert.experience,
        "expertise": expert.expertise,
        "projects": json.loads(expert.projects) if getattr(expert, "projects", None) else [],
        "resume_url": expert.resume_url,
        "has_active_session": has_active_session,
        "open_gaps": [
            {"id": g.id, "category": g.category, "content": g.content, "assigned": g.resolved_by_session_id is not None}
            for g in open_gaps
        ],
        "sessions": [
            {
                "id": s.id,
                "domain": s.domain,
                "status": s.status,
                "coverage": s.coverage,
                "parent_session_id": s.parent_session_id,
                "created_at": s.created_at.isoformat() if s.created_at else None
            } for s in sorted(expert.sessions, key=lambda s: s.created_at or datetime.min, reverse=True)
        ],
        "assets": [
            {
                "id": a.id,
                "title": a.title,
                "type": a.asset_type,
                "created_at": a.created_at.isoformat() if a.created_at else None
            } for a in assets
        ]
    }

# ---------------------
# Sessions
# ---------------------
@router.get("/api/sessions")
def get_sessions(db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    sessions = db.query(KnowledgeSession).order_by(KnowledgeSession.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "expert_name": s.expert.name if s.expert else "Unknown",
            "domain": s.domain,
            "coverage": s.coverage,
            "status": s.status,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sessions
    ]

@router.get("/api/network-graph")
def get_network_graph(db: Session = Depends(get_db)):
    experts = db.query(Expert).all()
    sessions = db.query(KnowledgeSession).all()
    insights = db.query(KnowledgeInsight).all()
    
    nodes = []
    links = []
    
    departments = set()
    
    for expert in experts:
        dept = expert.department or "General"
        if dept not in departments:
            departments.add(dept)
            nodes.append({"id": f"dept_{dept}", "name": dept, "group": 1})
            
        nodes.append({"id": expert.id, "name": expert.name.split(" ")[0], "group": 2, "fullName": expert.name})
        links.append({"source": f"dept_{dept}", "target": expert.id, "value": 3})
        
    for session in sessions:
        nodes.append({"id": session.id, "name": session.domain, "group": 3})
        links.append({"source": session.expert_id, "target": session.id, "value": 2})
        
    for insight in insights:
        nodes.append({"id": insight.id, "name": insight.category, "group": 4, "type": insight.insight_type})
        links.append({"source": insight.session_id, "target": insight.id, "value": 1})
        
    return {"nodes": nodes, "links": links}

@router.delete("/api/experts/{expert_id}")
def delete_expert(expert_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    expert = db.query(Expert).filter(Expert.id == expert_id).first()
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")
        
    expert_email = expert.email
    db.delete(expert)
    
    if expert_email:
        user = db.query(User).filter(User.email == expert_email, User.role == "EXPERT").first()
        if user:
            db.delete(user)
            
    db.commit()
    return {"message": "Expert deleted successfully"}

class FollowUpSessionRequest(BaseModel):
    domain: Optional[str] = None
    focus_gap_ids: Optional[List[str]] = None

@router.post("/api/experts/{expert_id}/sessions")
def create_followup_session(
    expert_id: str,
    req: Optional[FollowUpSessionRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    expert = db.query(Expert).filter(Expert.id == expert_id).first()
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")

    req = req or FollowUpSessionRequest()

    prior_sessions = db.query(KnowledgeSession).filter(
        KnowledgeSession.expert_id == expert_id
    ).order_by(KnowledgeSession.created_at.desc()).all()

    active = next((s for s in prior_sessions if s.status == "active"), None)
    if active:
        raise HTTPException(
            status_code=409,
            detail={"message": "This expert already has an interview in progress", "session_id": active.id}
        )

    latest = prior_sessions[0] if prior_sessions else None
    domain = (req.domain or "").strip() or (latest.domain if latest else "General Operations")

    open_gaps = _open_gaps_for_expert(db, expert_id)
    if req.focus_gap_ids:
        wanted = set(req.focus_gap_ids)
        targeted = [g for g in open_gaps if g.id in wanted]
    else:
        targeted = open_gaps[:10]

    covered = db.query(KnowledgeInsight).join(
        KnowledgeSession, KnowledgeInsight.session_id == KnowledgeSession.id
    ).filter(
        KnowledgeSession.expert_id == expert_id,
        KnowledgeInsight.insight_type != "gap",
    ).order_by(KnowledgeInsight.created_at.desc()).limit(25).all()

    # Carry coverage forward so the follow-up continues toward 100% instead of restarting at zero
    inherited_coverage = max([s.coverage for s in prior_sessions] + [0.0])

    session = KnowledgeSession(
        expert_id=expert_id,
        domain=domain,
        coverage=inherited_coverage,
        parent_session_id=latest.id if latest else None,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    if prior_sessions:
        covered_text = "; ".join(f"{i.category}: {i.content}" for i in covered) or "no structured insights were captured"
        gaps_text = "; ".join(f"{g.category}: {g.content}" for g in targeted) or "none recorded"
        seed = (
            f"SUMMARY: This is a FOLLOW-UP interview with {expert.name} on {domain}. "
            f"{len(prior_sessions)} previous interview(s) already took place and reached {inherited_coverage:.0f}% coverage. "
            f"Already documented, do NOT ask about these again: {covered_text[:2500]}. "
            f"Unresolved knowledge gaps to focus this interview on: {gaps_text[:2000]}. "
            "Treat the documented ground as settled and open directly on the unresolved gaps."
        )
        db.add(TranscriptMessage(session_id=session.id, role="system", content=seed))

    for gap in targeted:
        gap.resolved_by_session_id = session.id

    db.commit()

    return {
        "session_id": session.id,
        "expert_id": expert_id,
        "domain": domain,
        "coverage": inherited_coverage,
        "parent_session_id": session.parent_session_id,
        "targeted_gaps": [{"id": g.id, "category": g.category, "content": g.content} for g in targeted],
        "is_follow_up": bool(prior_sessions),
    }

@router.post("/api/sessions/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    expert_email: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    if not expert_email or not expert_email.strip():
        raise HTTPException(status_code=400, detail="Expert email is required")
        
    # Check if email is already in use
    existing_user = db.query(User).filter(User.email == expert_email.strip()).first()
    existing_expert = db.query(Expert).filter(Expert.email == expert_email.strip()).first()
    if existing_user or existing_expert:
        raise HTTPException(status_code=400, detail="Email already registered")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    content = await file.read()

    # Parse PDF Text
    try:
        reader = pypdf.PdfReader(io.BytesIO(content))
        text = ""
        for page in reader.pages:
            text += (page.extract_text() or "") + "\n"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract readable text from the PDF. If it is a scanned image, please upload a text-based PDF.")
        
    # Ask Groq to extract details
    if sync_client:
        prompt = f"""Extract the following details from the document text below and format as a JSON object:
{{
  "expert_name": "Full Name",
  "department": "Most recent or relevant department",
  "role": "Current or most recent Job Title",
  "experience": "Total years of experience (e.g. '10 years')",
  "expertise": "Comma separated list of top 5 skills",
  "domain": "The primary domain or industry they work in",
  "topic_checklist": ["List of 4-6 specific projects, technical skills, or systems found in this resume"],
  "projects": [
      {{
        "name": "Project Name",
        "description": "Brief description",
        "tech_stack": ["Tech1", "Tech2"]
      }}
  ],
  "experiences": [
      {{
        "company": "Company Name",
        "role": "Role Name",
        "duration": "Duration",
        "responsibilities": ["Resp1", "Resp2"]
      }}
  ]
}}

DOCUMENT TEXT:
{text[:6000]}
"""
        try:
            res = sync_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=settings.chat_model,
                response_format={"type": "json_object"},
                temperature=0.1
            )
            raw = (res.choices[0].message.content or "").strip()
            if not raw:
                raise ValueError("The AI returned an empty response.")
                
            if raw.startswith("```json"):
                raw = raw[7:]
            elif raw.startswith("```"):
                raw = raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()
            
            data = json.loads(raw)
        except Exception as e:
            print("Extraction error:", e)
            raise HTTPException(
                status_code=422,
                detail="Couldn't extract the expert's details from this document. Please upload a clearer, text-based resume or profile PDF and try again."
            )
        if not data.get("expert_name"):
            raise HTTPException(
                status_code=422,
                detail="This document doesn't contain enough information to build an expert profile. Please upload a complete resume or profile PDF."
            )
    else:
        # Fallback for demo mode
        data = {
            "expert_name": "Rajesh Kulkarni (From Resume)",
            "department": "Enterprise Operations",
            "role": "Senior SAP Consultant",
            "experience": "18 years",
            "expertise": "SAP SD, Order Management, Credit Management, Billing",
            "domain": "SAP Credit Block Resolution",
            "topic_checklist": ["Credit Limit Checks", "Order Blocking Logic", "Release Workflows", "Risk Categories", "Reporting"]
        }

    # Persist the uploaded file only after extraction succeeds so failures leave no orphan files
    import os
    import uuid
    os.makedirs("uploads", exist_ok=True)
    safe_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join("uploads", safe_filename)
    with open(file_path, "wb") as f:
        f.write(content)
    resume_url = f"http://localhost:8000/uploads/{safe_filename}"

    expert = Expert(
        name=data.get("expert_name", "Unknown Expert"),
        email=expert_email.strip(),
        department=data.get("department", "General"),
        role=data.get("role", "Expert"),
        experience=data.get("experience", "Unknown"),
        expertise=data.get("expertise", ""),
        projects=json.dumps(data.get("projects", [])),
        experience_details=json.dumps(data.get("experiences", [])),
        resume_url=resume_url
    )
    db.add(expert)
    db.commit()
    db.refresh(expert)
    
    from app.core.security import get_password_hash
    # Create a user account for the expert to log in with
    user = User(
        email=expert_email.strip(),
        hashed_password=get_password_hash("expert123"),
        role="EXPERT"
    )
    db.add(user)
    db.commit()
    
    session = KnowledgeSession(
        expert_id=expert.id,
        domain=data.get("domain", "General Operations"),
        topic_checklist=json.dumps(data.get("topic_checklist", [])),
        topic_turn_count=0
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {
        "session_id": session.id, 
        "expert_id": expert.id,
        "credentials": {"email": expert_email.strip(), "password": "expert123"}
    }

@router.get("/api/sessions/{session_id}")
def get_session_detail(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN", "EXPERT"]))):
    session = db.query(KnowledgeSession).filter(KnowledgeSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if current_user.role == "EXPERT":
        if not session.expert or session.expert.email != current_user.email:
            raise HTTPException(status_code=403, detail="Not authorized to view this session")
    
    
    messages = db.query(TranscriptMessage).filter(TranscriptMessage.session_id == session_id).order_by(TranscriptMessage.created_at).all()
    insights = db.query(KnowledgeInsight).filter(KnowledgeInsight.session_id == session_id).all()
    
    expert = session.expert
    
    return {
        "id": session.id,
        "expert_name": expert.name if expert else "Unknown",
        "domain": session.domain,
        "department": expert.department if expert else None,
        "role": expert.role if expert else None,
        "experience": expert.experience if expert else None,
        "expertise": expert.expertise if expert else None,
        "coverage": session.coverage,
        "status": session.status,
        "messages": [{"role": m.role, "content": m.content} for m in messages],
        "insights": [{"id": i.id, "type": i.insight_type, "category": i.category, "content": i.content} for i in insights],
    }

@router.post("/api/sessions/{session_id}/complete")
def complete_session(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN", "EXPERT"]))):
    session = db.query(KnowledgeSession).filter(KnowledgeSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.status = "completed"
    resolved = _resolve_assigned_gaps(db, session_id)
    db.commit()
    return {"status": "completed", "gaps_resolved": resolved}

# ---------------------
# Asset Generation
# ---------------------
@router.post("/api/sessions/{session_id}/generate-assets")
async def generate_assets(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN", "EXPERT"]))):
    session = db.query(KnowledgeSession).filter(KnowledgeSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    existing_assets = db.query(KnowledgeAsset).filter(KnowledgeAsset.session_id == session_id).all()
    if len(existing_assets) > 0:
        for asset in existing_assets:
            db.delete(asset)
        db.commit()
        
    insights = db.query(KnowledgeInsight).filter(KnowledgeInsight.session_id == session_id).all()
    messages = db.query(TranscriptMessage).filter(TranscriptMessage.session_id == session_id).order_by(TranscriptMessage.created_at).all()
    # Filter out rolling memory summaries
    messages = [m for m in messages if m.role != "system"]
    
    expert = session.expert
    expert_name = expert.name if expert else "Unknown Expert"
    
    transcript_text = "\n".join([f"{msg.role}: {msg.content}" for msg in messages])
    
    import hashlib
    transcript_hash = hashlib.md5(transcript_text.encode()).hexdigest()
    
    insight_text = "\n".join([f"- [{ins.insight_type.upper()}] {ins.category}: {ins.content}" for ins in insights])
    # Truncate aggressively to strictly fit within 8000 TPM limit across 3 concurrent calls
    if len(transcript_text) > 4000:
        transcript_text = "...[Truncated]...\n" + transcript_text[-4000:]
    if len(insight_text) > 1500:
        insight_text = insight_text[:1500] + "\n...[Truncated]..."
    
    assets_to_create = []
    
    if client:
        async def fetch_asset(asset_type: str, description: str):
            prompt = f"""You are BoomerBot, an enterprise knowledge preservation AI. Generate a {asset_type} based on this expert interview on "{session.domain}".

EXPERT: {expert_name}

TRANSCRIPT:
{transcript_text}

EXTRACTED INSIGHTS:
{insight_text}

CRITICAL RULE: You must ONLY use facts, steps, and context explicitly mentioned in the TRANSCRIPT. If the transcript does not contain enough information to make a long document, make a short document. DO NOT hallucinate, guess, or add external knowledge from your pre-training.

Generate ONLY a markdown {asset_type}. Requirements:
{description}

Return raw markdown only. Do not include JSON blocks."""
            try:
                res = await client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=settings.chat_model,
                    temperature=0.0,
                    max_tokens=1500
                )
                content = res.choices[0].message.content.strip()
                if content.startswith("```markdown"):
                    content = content[11:]
                if content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                return {"type": asset_type, "title": f"{session.domain} — {asset_type}", "content": content.strip()}
            except Exception as e:
                print(f"Asset gen error for {asset_type}:", e)
                return None

        # Check Asset Cache
        cached_assets = check_asset_cache(transcript_hash)
        
        if cached_assets:
            print(f"ASSET CACHE HIT for session {session_id}")
            assets_to_create = cached_assets
        else:
            # Spawn 3 parallel agents!
            tasks = [
                fetch_asset("SOP", "Full markdown Standard Operating Procedure with numbered steps and notes."),
                fetch_asset("FAQ", "Full markdown FAQ with at least 5 Q&A pairs."),
                fetch_asset("Troubleshooting Guide", "Full markdown troubleshooting guide with common issues and solutions.")
            ]
            results = await asyncio.gather(*tasks)
            for r in results:
                if r:
                    assets_to_create.append(r)
            
            # Store new assets in cache
            if assets_to_create:
                store_asset_cache(transcript_hash, assets_to_create)

            
    if not assets_to_create:
        raise HTTPException(status_code=500, detail="AI generation failed. Please try again later.")
        
    created_assets = []
    for ast in assets_to_create:
        db_asset = KnowledgeAsset(
            session_id=session_id,
            asset_type=ast["type"],
            title=ast["title"],
            content=ast["content"]
        )
        db.add(db_asset)
        db.commit()
        db.refresh(db_asset)
        created_assets.append({
            "id": db_asset.id,
            "title": db_asset.title,
            "type": db_asset.asset_type,
            "status": db_asset.status,
            "created_at": db_asset.created_at.isoformat() if db_asset.created_at else None
        })
    
    # Mark session as completed
    session.status = "completed"
    _resolve_assigned_gaps(db, session_id)
    db.commit()
        
    return {"status": "success", "assets": created_assets}

# ---------------------
# Assets
# ---------------------
@router.get("/api/assets")
def get_assets(db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN", "USER", "EXPERT"]))):
    if current_user.role == "EXPERT":
        assets = db.query(KnowledgeAsset).join(KnowledgeSession).join(Expert).filter(Expert.email == current_user.email).order_by(KnowledgeAsset.created_at.desc()).all()
    else:
        assets = db.query(KnowledgeAsset).order_by(KnowledgeAsset.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "type": a.asset_type,
            "status": a.status,
            "domain": a.session.domain if a.session else "Unknown",
            "expert_name": a.session.expert.name if a.session and a.session.expert else "Unknown",
            "created_at": a.created_at.isoformat() if a.created_at else None
        }
        for a in assets
    ]

@router.get("/api/assets/{asset_id}")
def get_asset_detail(asset_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN", "USER", "EXPERT"]))):
    asset = db.query(KnowledgeAsset).filter(KnowledgeAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {
        "id": asset.id,
        "title": asset.title,
        "type": asset.asset_type,
        "content": asset.content,
        "status": asset.status,
        "domain": asset.session.domain if asset.session else "Unknown",
        "expert_name": asset.session.expert.name if asset.session and asset.session.expert else "Unknown",
        "created_at": asset.created_at.isoformat() if asset.created_at else None
    }

@router.post("/api/assets/{asset_id}/publish")
def publish_asset(asset_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    asset = db.query(KnowledgeAsset).filter(KnowledgeAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    asset.status = "PUBLISHED"

    # Archive the expert's earlier published asset of the same type so RAG never serves a stale duplicate
    if asset.session and asset.session.expert_id:
        superseded = db.query(KnowledgeAsset).join(
            KnowledgeSession, KnowledgeAsset.session_id == KnowledgeSession.id
        ).filter(
            KnowledgeSession.expert_id == asset.session.expert_id,
            KnowledgeAsset.asset_type == asset.asset_type,
            KnowledgeAsset.status == "PUBLISHED",
            KnowledgeAsset.id != asset.id,
        ).all()
        for old in superseded:
            old.status = "ARCHIVED"
            delete_knowledge_asset(old.id)
        if superseded:
            asset.supersedes_asset_id = superseded[0].id

    db.commit()
    
    # Index in Chroma for RAG
    index_knowledge_asset(
        asset_id=asset.id,
        title=asset.title,
        content=asset.content,
        asset_type=asset.asset_type,
        domain=asset.session.domain if asset.session else "Unknown",
        sensitivity="Internal" if asset.asset_type == "SOP" else "General"
    )
    # New knowledge just landed, so drop any cached "not found" answers that predate it.
    clear_semantic_cache()
    return {"status": "PUBLISHED"}

@router.post("/api/assets/{asset_id}/reject")
def reject_asset(asset_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    asset = db.query(KnowledgeAsset).filter(KnowledgeAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    asset.status = "REJECTED"
    db.commit()
    return {"status": "REJECTED"}

# ---------------------
# Knowledge Assistant
# ---------------------
class QueryRequest(BaseModel):
    query: str

@router.post("/api/assistant/query")
def ask_assistant(req: QueryRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN", "USER"]))):
    # Setup Role-Based filtering
    filter_dict = {}
    if current_user.role == "USER":
        filter_dict = {"sensitivity": {"$in": ["General", "Internal"]}}
        
    # Execute LangGraph
    initial_state = {
        "question": req.query,
        "filter_dict": filter_dict,
        "documents": [],
        "sources": [],
        "generation": "",
        "is_relevant": False
    }
    
    # Check Semantic Cache first
    cached_response = check_semantic_cache(req.query)
    if cached_response:
        print(f"CACHE HIT for query: {req.query}")
        return cached_response
    
    try:
        final_state = graph_app.invoke(initial_state)
        answer = final_state.get("generation", "I encountered an error.")
        exact_quotes = final_state.get("exact_quotes", [])
        raw_sources = final_state.get("sources", [])
        is_relevant = final_state.get("is_relevant", False)
        
        # Deduplicate sources by title
        sources = []
        seen_titles = set()
        for meta in raw_sources:
            title = meta.get('title', 'Unknown')
            if title not in seen_titles:
                sources.append(meta)
                seen_titles.add(title)
                
        # Also grab the raw documents for citation highlighting
        documents = final_state.get("documents", [])
                
        response_dict = {
            "answer": answer,
            "sources": sources,
            "exact_quotes": exact_quotes,
            "documents": documents
        }
        
        # Only cache confident, grounded answers. Caching a fallback / "I don't know" would
        # shadow the correct answer once the missing knowledge is published.
        if is_relevant and exact_quotes:
            store_semantic_cache(req.query, response_dict)
        
        return response_dict
        
    except Exception as e:
        print(f"Graph execution error: {e}")
        return {
            "answer": "I'm having trouble retrieving knowledge at the moment.",
            "sources": [],
            "exact_quotes": [],
            "documents": []
        }

@router.post("/api/screen-resume")
async def screen_resume(
    file: UploadFile = File(...),
    domain: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        pdf_reader = pypdf.PdfReader(io.BytesIO(await file.read()))
        resume_text = ""
        for page in pdf_reader.pages:
            resume_text += page.extract_text() + "\n"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse PDF: {str(e)}")

    sessions = db.query(KnowledgeSession).filter(KnowledgeSession.domain == domain).all()
    session_ids = [s.id for s in sessions]
    
    assets = db.query(KnowledgeAsset).filter(
        KnowledgeAsset.session_id.in_(session_ids),
        KnowledgeAsset.status == "PUBLISHED"
    ).all()
    
    standard_text = ""
    for a in assets:
        standard_text += f"Title: {a.title}\nContent: {a.content}\n\n"
        
    if not standard_text:
        standard_text = "No standard enterprise assets found for this domain. Evaluate based on general industry best practices for " + domain

    prompt = f"""
You are an expert HR and Technical Evaluator.
Compare the following Candidate Resume against our Internal Enterprise Standard Knowledge for the domain '{domain}'.

Internal Enterprise Standard Knowledge:
{standard_text[:12000]}

Candidate Resume:
{resume_text[:6000]}

Evaluate how well this candidate's experience aligns with our specific tacit knowledge and standards.
Return a JSON object with exactly these fields:
- "score": An integer from 0 to 100 representing alignment percentage.
- "strengths": A list of 2-4 strings detailing where the candidate strongly aligns with our standard.
- "gaps": A list of 2-4 strings detailing what tacit knowledge the candidate is missing based on our standard.

Return ONLY the JSON.
"""

    if not sync_client:
        return {
            "score": 65,
            "strengths": ["FastAPI and Python experience", "Understands basic LLM integration"],
            "gaps": ["Missing WebSocket/SSE real-time streaming experience", "Lacks advanced LangGraph state machine experience"]
        }

    try:
        response = sync_client.chat.completions.create(
            model=settings.chat_model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        result = json.loads(content)
        return result
    except Exception as e:
        print(f"Error calling LLM for screening: {e}")
        raise HTTPException(status_code=500, detail="Error evaluating resume")

@router.get("/api/available-domains")
def get_available_domains(db: Session = Depends(get_db)):
    domains = db.query(KnowledgeSession.domain).join(
        KnowledgeAsset, KnowledgeAsset.session_id == KnowledgeSession.id
    ).filter(
        KnowledgeSession.status == "completed",
        KnowledgeAsset.status == "PUBLISHED"
    ).distinct().all()
    
    return [d[0] for d in domains if d[0]]
