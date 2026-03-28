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


# --- JustJoinIT Job Search & Scoring ---

class JJITOfferOut(BaseModel):
    slug: str
    title: str
    company_name: str | None = None
    required_skills: list[str] = []
    nice_to_have_skills: list[str] = []
    experience_level: str | None = None
    workplace_type: str | None = None
    working_time: str | None = None
    salary_display: str | None = None
    city: str | None = None
    published_at: str | None = None
    url: str | None = None


class SkillMatchBreakdown(BaseModel):
    matched: list[str] = []
    missing: list[str] = []
    bonus: list[str] = []


class ExperienceFit(BaseModel):
    level_match: str
    reasoning: str


class Suggestion(BaseModel):
    type: str
    title: str
    description: str
    priority: str = "medium"


class ScoredOfferOut(BaseModel):
    offer: JJITOfferOut
    overall_score: int
    skill_match: SkillMatchBreakdown
    experience_fit: ExperienceFit
    suggestions: list[Suggestion] = []
    reasoning: str


class OfferDetailOut(BaseModel):
    offer: JJITOfferOut
    body_html: str | None = None
    company_url: str | None = None
    company_size: str | None = None
    apply_url: str | None = None
    languages: list[dict] = []
    score: ScoredOfferOut | None = None


class FetchStatusOut(BaseModel):
    status: str
    total_offers: int = 0
    last_fetched_at: str | None = None


class ScoreFilters(BaseModel):
    experience_levels: list[str] = []
    skills: list[str] = []
    workplace_type: str | None = None
    limit: int = 20
