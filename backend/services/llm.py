import json
import os
from datetime import datetime, timezone

from google import genai
from google.genai import types

from services.prompts import get_prompt

MODEL = "gemini-3.1-flash-lite-preview"

_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        _client = genai.Client(api_key=api_key)
    return _client


def prompt(text: str, system: str | None = None) -> str:
    """Send a simple text prompt and return the response."""
    client = get_client()
    config = types.GenerateContentConfig()
    if system:
        config.system_instruction = system
    response = client.models.generate_content(
        model=MODEL,
        contents=text,
        config=config,
    )
    return response.text


def prompt_with_context(context: str, question: str, system: str | None = None) -> str:
    """Send a prompt with large context (e.g., repo data) and a question about it."""
    full_prompt = f"<context>\n{context}\n</context>\n\n{question}"
    return prompt(full_prompt, system=system)


def analyze_github_profile(github_data: dict) -> dict:
    """Use Gemini to analyze scraped GitHub data and produce a structured profile."""
    system = get_prompt("profile_analysis", "system")
    user_prompt = get_prompt("profile_analysis", "user")
    context = json.dumps(github_data, indent=2, default=str)

    raw = prompt_with_context(context, user_prompt, system=system)

    # Strip markdown code fences if present
    return json.loads(_strip_markdown_fences(raw))


def _strip_markdown_fences(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    return cleaned.strip()


def _extract_grounding_urls(response) -> list[str]:
    urls = []
    seen = set()

    for candidate in getattr(response, "candidates", []) or []:
        grounding_metadata = getattr(candidate, "grounding_metadata", None)
        if not grounding_metadata:
            continue
        for chunk in getattr(grounding_metadata, "grounding_chunks", []) or []:
            web = getattr(chunk, "web", None)
            url = getattr(web, "uri", None) if web else None
            if url and url not in seen:
                seen.add(url)
                urls.append(url)

    return urls


def _truncate_words(text: str | None, max_words: int) -> str | None:
    cleaned = " ".join((text or "").strip().split())
    if not cleaned:
        return None
    words = cleaned.split(" ")
    if len(words) <= max_words:
        return cleaned
    return " ".join(words[:max_words]).rstrip(".,;:") + "…"


def _compact_list(values, *, max_items: int, max_words: int) -> list[str]:
    compacted = []
    for value in values or []:
        shortened = _truncate_words(str(value), max_words)
        if shortened:
            compacted.append(shortened)
        if len(compacted) >= max_items:
            break
    return compacted


def _compact_company_insight(insight: dict, fallback_urls: list[str]) -> dict:
    return {
        "summary": _truncate_words(insight.get("summary"), 24),
        "recent_news": _compact_list(insight.get("recent_news"), max_items=2, max_words=14),
        "positive_signals": _compact_list(insight.get("positive_signals"), max_items=2, max_words=14),
        "risk_signals": _compact_list(insight.get("risk_signals"), max_items=2, max_words=14),
        "applicant_takeaways": _compact_list(insight.get("applicant_takeaways"), max_items=2, max_words=14),
        "source_urls": _compact_list(insight.get("source_urls") or fallback_urls, max_items=3, max_words=50),
        "researched_at": datetime.now(timezone.utc).isoformat(),
    }


def research_company_insight(
    *,
    company_name: str,
    company_url: str | None = None,
    role_title: str | None = None,
    offer_summary: str | None = None,
) -> dict | None:
    """Research company-level news and signals using Gemini with Google Search."""
    if not company_name:
        return None

    client = get_client()
    system = get_prompt("company_insight_research", "system")
    user_prompt = get_prompt(
        "company_insight_research",
        "user",
        today=datetime.now(timezone.utc).date().isoformat(),
        company_name=company_name,
        company_url=company_url or "Unknown",
        role_title=role_title or "Unknown",
        offer_summary=offer_summary or "Not available",
    )

    config = types.GenerateContentConfig(
        system_instruction=system,
        response_mime_type="application/json",
        temperature=0.2,
        tools=[types.Tool(google_search=types.GoogleSearch())],
    )
    response = client.models.generate_content(
        model=MODEL,
        contents=user_prompt,
        config=config,
    )

    raw_insight = json.loads(_strip_markdown_fences(response.text or ""))
    insight = _compact_company_insight(raw_insight, _extract_grounding_urls(response))

    if any(insight.get(key) for key in ("summary", "recent_news", "positive_signals", "risk_signals", "applicant_takeaways", "source_urls")):
        return insight
    return None
