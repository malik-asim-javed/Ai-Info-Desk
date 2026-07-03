from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.models import University, Admin, FAQ, Policy, Session, QueryLog
from app.routes import auth, universities, admins, faqs, policies, chat, analytics

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="InfoDesk API",
    description="AI-Powered University Information Desk System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(universities.router, prefix="/api/universities", tags=["Universities"])
app.include_router(admins.router, prefix="/api/admins", tags=["Admins"])
app.include_router(faqs.router, prefix="/api/faqs", tags=["FAQs"])
app.include_router(policies.router, prefix="/api/policies", tags=["Policies"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])

@app.get("/")
def root():
    return {"message": "InfoDesk API is running"}
