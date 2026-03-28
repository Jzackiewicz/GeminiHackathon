from pydantic import BaseModel, EmailStr, Field


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

class TechnologyDetail(BaseModel):
    name: str
    category: str
    proficiency: str
    evidence: str | None = None


class NotableProject(BaseModel):
    name: str
    description: str | None = None
    technologies: list[str] = []


class ProfileOut(BaseModel):
    github_username: str | None = None
    technologies: list[TechnologyDetail] = []
    summary: str | None = None
    experience_level: str | None = None
    primary_role: str | None = None
    strengths: list[str] = []
    interests: list[str] = []
    notable_projects: list[NotableProject] = []
    analysis_ready: bool = False


class GitHubConnect(BaseModel):
    username: str


class GitHubCallbackRequest(BaseModel):
    code: str


# --- Jobs ---

class CompanyInsight(BaseModel):
    summary: str | None = None
    recent_news: list[str] = Field(default_factory=list)
    positive_signals: list[str] = Field(default_factory=list)
    risk_signals: list[str] = Field(default_factory=list)
    applicant_takeaways: list[str] = Field(default_factory=list)
    source_urls: list[str] = Field(default_factory=list)
    researched_at: str | None = None


class JobOfferOut(BaseModel):
    id: int
    title: str
    company: str | None = None
    url: str | None = None
    description: str | None = None
    requirements: str | None = None
    company_insight: CompanyInsight | None = None


class JobSearchQuery(BaseModel):
    keywords: list[str] = []
    location: str | None = None
    remote: bool = True


class JobSelectRequest(BaseModel):
    job_offer_id: int


# --- Interview ---

class InterviewSave(BaseModel):
    mode: str = "interview"
    job_title: str = ""
    company: str = ""
    requirements: str = ""
    transcript: list[dict] = []
    review: dict | None = None
    score: int | None = None


class InterviewOut(BaseModel):
    id: int
    mode: str
    job_title: str | None = None
    company: str | None = None
    requirements: str | None = None
    transcript: list[dict] = []
    review: dict | None = None
    score: int | None = None
    created_at: str | None = None
