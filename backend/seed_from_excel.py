# Runs outside app.main, so OS trust must be injected before any HTTPS client is built
import truststore
truststore.inject_into_ssl()

import os
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.security import get_password_hash
from app.models.base import Base
from app.models.user import User
from app.models.session import Expert, KnowledgeSession, TranscriptMessage, KnowledgeInsight, KnowledgeAsset
from app.rag.chroma import reset_collections, index_knowledge_asset

# Setup DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./boomerbot.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_db():
    print("Connecting to DB...")
    db = SessionLocal()
    
    print("Wiping existing data...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Drop all three collections, not just the knowledge one, or stale-dimension cache
    # vectors survive a model change and every cache lookup fails silently.
    print("Resetting ChromaDB collections...")
    reset_collections()

    file_path = "../BoomerBot_Synthetic_Dataset.xlsx"
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    print("Loading Excel file...")
    xls = pd.ExcelFile(file_path)
    
    df_domains = pd.read_excel(xls, "Knowledge_Domains")
    df_emps = pd.read_excel(xls, "Employees")
    df_questions = pd.read_excel(xls, "Question_Bank")
    df_sessions = pd.read_excel(xls, "Interview_Sessions")
    df_responses = pd.read_excel(xls, "Interview_Responses")
    df_articles = pd.read_excel(xls, "Knowledge_Articles")

    # Clean NaNs
    import math
    def clean(val, default=""):
        if isinstance(val, float) and math.isnan(val):
            return default
        return str(val)

    print("Creating Admin User...")
    admin = User(email="admin@boomerbot.com", hashed_password=get_password_hash("password123"), role="ADMIN")
    db.add(admin)

    print("Creating Experts and Users...")
    for _, row in df_emps.iterrows():
        emp_id = row['employee_id']
        name = row['full_name']
        dept = clean(row['department'])
        role_title = clean(row['role_title'])
        tenure = clean(row.get('tenure_years', '10'))
        primary_domain = clean(row.get('primary_domain_id'))
        
        # Get domain name
        domain_name = primary_domain
        dom_row = df_domains[df_domains['domain_id'] == primary_domain]
        if not dom_row.empty:
            domain_name = clean(dom_row.iloc[0]['domain_name'])
        
        expert = Expert(
            id=emp_id,
            name=name,
            department=dept,
            role=role_title,
            experience=f"{tenure} years",
            expertise=domain_name
        )
        db.add(expert)
        
        email = f"{name.lower().replace(' ', '.')}@boomerbot.com"
        user = User(
            email=email,
            hashed_password=get_password_hash("expert123"),
            role="EXPERT"
        )
        db.add(user)

    print("Creating Sessions...")
    for _, row in df_sessions.iterrows():
        ses_id = row['session_id']
        emp_id = row['employee_id']
        dom_id = row['domain_id']
        pct = row.get('completion_pct', 0)
        if math.isnan(pct): pct = 0
        status = row['status']
        if status == 'Completed':
            db_status = 'completed'
        else:
            db_status = 'active'
            
        # Get domain name
        domain_name = dom_id
        dom_row = df_domains[df_domains['domain_id'] == dom_id]
        if not dom_row.empty:
            domain_name = clean(dom_row.iloc[0]['domain_name'])

        session = KnowledgeSession(
            id=ses_id,
            expert_id=emp_id,
            domain=domain_name,
            coverage=float(pct),
            status=db_status
        )
        db.add(session)
        
    print("Creating Transcripts and Insights...")
    # Map questions
    q_dict = {}
    for _, row in df_questions.iterrows():
        q_dict[row['question_id']] = clean(row['question_text'])

    for _, row in df_responses.iterrows():
        ses_id = clean(row['session_id'])
        q_id = clean(row['question_id'])
        resp_text = clean(row.get('response_text'))
        gap_flag = clean(row.get('gap_flag'))
        
        q_text = q_dict.get(q_id, "Unknown Question")
        
        if q_text:
            msg_ai = TranscriptMessage(session_id=ses_id, role="ai", content=q_text)
            db.add(msg_ai)
            
        if resp_text:
            msg_expert = TranscriptMessage(session_id=ses_id, role="expert", content=resp_text)
            db.add(msg_expert)
            
        if gap_flag == 'Y':
            insight = KnowledgeInsight(
                session_id=ses_id,
                insight_type="gap",
                category="Flagged Gap",
                content=f"Missing knowledge identified during question: {q_text}"
            )
            db.add(insight)

    print("Creating Articles and indexing in ChromaDB...")
    for _, row in df_articles.iterrows():
        art_id = row['article_id']
        ses_id = clean(row['source_session_id'])
        dom_id = clean(row['domain_id'])
        title = clean(row['title'])
        art_type = clean(row['article_type'])
        status = clean(row['status'])
        sensitivity = clean(row.get('sensitivity', 'General'))
        
        if status == 'Published':
            db_status = 'PUBLISHED'
        else:
            db_status = 'DRAFT'
            
        # Get domain name
        domain_name = dom_id
        dom_row = df_domains[df_domains['domain_id'] == dom_id]
        if not dom_row.empty:
            domain_name = clean(dom_row.iloc[0]['domain_name'])

        # Build rich content from session Q&A
        article_content_lines = [f"Title: {title}", f"Domain: {domain_name}", f"Sensitivity: {sensitivity}"]
        semantic_tags = clean(row.get('semantic_tags'))
        if semantic_tags:
            article_content_lines.append(f"Tags: {semantic_tags}")
        
        article_content_lines.append("\n## Extracted Knowledge:")
        
        has_qa = False
        if ses_id:
            ses_responses = df_responses[df_responses['session_id'] == ses_id]
            for _, r_row in ses_responses.iterrows():
                q_id = clean(r_row['question_id'])
                resp_text = clean(r_row.get('response_text'))
                q_text = q_dict.get(q_id, "")
                if q_text and resp_text:
                    article_content_lines.append(f"**Q:** {q_text}\n**A:** {resp_text}\n")
                    has_qa = True
                    
        if not has_qa:
            article_content_lines.append("No specific procedural steps or details were captured for this topic.")
            
        rich_content = "\n".join(article_content_lines)

        asset = KnowledgeAsset(
            id=art_id,
            session_id=ses_id if ses_id else None,
            asset_type=art_type,
            title=title,
            content=rich_content,
            status=db_status
        )
        db.add(asset)
        
        if db_status == 'PUBLISHED':
            index_knowledge_asset(
                asset_id=art_id,
                title=title,
                content=asset.content,
                asset_type=art_type,
                domain=domain_name,
                sensitivity=sensitivity
            )

    db.commit()
    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_db()
