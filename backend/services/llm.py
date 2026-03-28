import json
import os
from google import genai
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
    config = {}
    if system:
        config["system_instruction"] = system
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
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    cleaned = cleaned.strip()

    return json.loads(cleaned)
