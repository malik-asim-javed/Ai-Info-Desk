from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from uuid import uuid4
from groq import Groq
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from app.database import get_db
from app.models.faq import FAQ
from app.models.policy import Policy
from app.models.session import Session as ChatSession
from app.models.query_log import QueryLog
from app.schemas import ChatRequest, ChatResponse
from app.config import settings

router = APIRouter()

client = Groq(api_key=settings.GROQ_API_KEY.strip())
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Cap how many prior messages get sent back to the model, so prompts
# stay bounded for long conversations.
MAX_HISTORY_MESSAGES = 6

def get_embedding(text: str) -> np.ndarray:
    return embedding_model.encode(text, convert_to_numpy=True).astype(np.float32)

def build_faiss_index(texts: list) -> tuple:
    embeddings = [get_embedding(t) for t in texts]
    dimension = len(embeddings[0])
    index = faiss.IndexFlatL2(dimension)
    vectors = np.array(embeddings)
    index.add(vectors)
    return index, texts

def retrieve_relevant_chunks(query: str, texts: list, top_k: int = 3) -> list:
    if not texts:
        return []
    index, stored_texts = build_faiss_index(texts)
    query_vector = get_embedding(query).reshape(1, -1)
    distances, indices = index.search(query_vector, min(top_k, len(texts)))
    return [stored_texts[i] for i in indices[0] if i < len(stored_texts)]

@router.post("/", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):

    session_id = request.session_id
    if session_id:
        existing_session = db.query(ChatSession).filter(
            ChatSession.id == session_id
        ).first()
        if not existing_session or existing_session.expires_at < datetime.utcnow():
            session_id = None

    if not session_id:
        new_session = ChatSession(
            id=uuid4(),
            university_id=request.university_id,
            expires_at=datetime.utcnow() + timedelta(hours=2)
        )
        db.add(new_session)
        db.commit()
        session_id = new_session.id

    faqs = db.query(FAQ).filter(FAQ.university_id == request.university_id).all()
    policies = db.query(Policy).filter(Policy.university_id == request.university_id).all()

    texts = []
    for faq in faqs:
        texts.append(f"Q: {faq.question}\nA: {faq.answer}")
    for policy in policies:
        texts.append(f"{policy.title}:\n{policy.content}")

    if not texts:
        return ChatResponse(
            response="I don't have any information for this university yet. Please check back later.",
            session_id=session_id
        )

    relevant_chunks = retrieve_relevant_chunks(request.query, texts)
    context = "\n\n".join(relevant_chunks)

    system_message = f"""You are an information desk assistant for a university.
Answer the student's question using ONLY the information provided below.
If the answer is not in the provided information, say "I don't have information about that. Please contact the university directly."
Use the conversation history for context on follow-up questions (e.g. "anything else?" or "what about the deadline?"), but still only answer using the University Information below — do not invent details that aren't there, even if implied by earlier turns.

University Information:
{context}"""

    messages = [{"role": "system", "content": system_message}]

    for msg in (request.history or [])[-MAX_HISTORY_MESSAGES:]:
        role = "assistant" if msg.role == "bot" else "user"
        messages.append({"role": role, "content": msg.text})

    messages.append({"role": "user", "content": request.query})

    completion = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=messages
    )

    # Anonymous usage log for admin-facing analytics — only recorded once we
    # actually had context to answer from, so the "no data yet" early-return
    # above doesn't pollute the count.
    db.add(QueryLog(university_id=request.university_id, question=request.query))
    db.commit()

    return ChatResponse(
        response=completion.choices[0].message.content,
        session_id=session_id
    )
