from pydantic import BaseModel, EmailStr


# --- Auth ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Profile ---

class ProfileOut(BaseModel):
    github_username: str | None = None
    technologies: list[str] = []
    summary: str | None = None


class GitHubConnect(BaseModel):
    username: str


class GitHubCallbackRequest(BaseModel):
    code: str


# --- Jobs ---

class JobOfferOut(BaseModel):
    id: int
    title: str
    company: str | None = None
    url: str | None = None
    description: str | None = None
    requirements: str | None = None


class JobSearchQuery(BaseModel):
    keywords: list[str] = []
    location: str | None = None
    remote: bool = True


class JobSelectRequest(BaseModel):
    job_offer_id: int


# --- Interview ---

class InterviewOut(BaseModel):
    id: int
    job_offer_id: int
    vapi_call_id: str | None = None
    transcript: str | None = None
    score: int | None = None
    feedback: str | None = None
