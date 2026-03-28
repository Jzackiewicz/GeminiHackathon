import os
from google import genai

MODEL = "gemini-3.1-pro-preview"

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
