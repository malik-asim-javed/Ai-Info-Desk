from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.database import get_db
from app.models.query_log import QueryLog
from app.models.admin import Admin
from app.schemas import AnalyticsOut, RecentQuery
from app.dependencies import get_current_admin

router = APIRouter()

RECENT_QUESTIONS_LIMIT = 10

@router.get("/{university_id}", response_model=AnalyticsOut)
def get_analytics(
    university_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    if str(university_id) != str(current_admin.university_id):
        raise HTTPException(status_code=403, detail="You can only view analytics for your own university")

    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    week_start = now - timedelta(days=7)

    base_query = db.query(QueryLog).filter(QueryLog.university_id == university_id)

    queries_today = base_query.filter(QueryLog.created_at >= today_start).count()
    queries_this_week = base_query.filter(QueryLog.created_at >= week_start).count()
    total_queries = base_query.count()

    recent = (
        base_query
        .order_by(QueryLog.created_at.desc())
        .limit(RECENT_QUESTIONS_LIMIT)
        .all()
    )

    return AnalyticsOut(
        queries_today=queries_today,
        queries_this_week=queries_this_week,
        total_queries=total_queries,
        recent_questions=[
            RecentQuery(question=q.question, created_at=q.created_at) for q in recent
        ]
    )