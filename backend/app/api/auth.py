from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.session import KnowledgeSession
from app.core.security import verify_password, create_access_token, get_current_user, require_role, get_password_hash
from pydantic import BaseModel

class InviteRequest(BaseModel):
    email: str

router = APIRouter()

@router.post("/api/auth/token")
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/api/auth/me")
def read_users_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    active_session_id = None
    if current_user.role == "EXPERT":
        from app.models.session import Expert
        expert = db.query(Expert).filter(Expert.email == current_user.email).first()
        if expert:
            # Only an in-progress session should pull the expert back into the capture screen
            latest_session = db.query(KnowledgeSession).filter(
                KnowledgeSession.expert_id == expert.id,
                KnowledgeSession.status == "active"
            ).order_by(KnowledgeSession.created_at.desc()).first()
            if latest_session:
                active_session_id = latest_session.id
            
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "active_session_id": active_session_id
    }

@router.post("/api/users/invite")
def invite_user(req: InviteRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    user = db.query(User).filter(User.email == req.email).first()
    if user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    password = "user123"
    new_user = User(
        email=req.email,
        hashed_password=get_password_hash(password),
        role="USER"
    )
    db.add(new_user)
    db.commit()
    
    return {
        "email": new_user.email,
        "password": password,
        "role": new_user.role
    }

@router.get("/api/users/invited")
def get_invited_users(db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    users = db.query(User).filter(User.role == "USER").all()
    return [{"id": u.id, "email": u.email, "created_at": u.created_at.isoformat() if u.created_at else None} for u in users]

@router.delete("/api/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    user = db.query(User).filter(User.id == user_id, User.role == "USER").first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"status": "deleted"}
