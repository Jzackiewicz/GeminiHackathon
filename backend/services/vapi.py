import os
from vapi import VapiClient
from services.prompts import get_prompt

_client: VapiClient | None = None


def get_vapi() -> VapiClient:
    global _client
    if _client is None:
        token = os.getenv("VAPI_API_KEY")
        if not token:
            raise RuntimeError("VAPI_API_KEY not set")
        _client = VapiClient(token=token)
    return _client


def create_job_discovery_assistant(
    user_name: str,
    technologies: list[str],
    summary: str,
) -> str:
    """Create a VAPI assistant that asks the user about job preferences.

    Returns the assistant ID.
    """
    client = get_vapi()

    system_prompt = get_prompt(
        "job_discovery", "system",
        user_name=user_name,
        technologies=", ".join(technologies),
        summary=summary,
    )
    first_message = get_prompt(
        "job_discovery", "first_message",
        user_name=user_name,
    )

    assistant = client.assistants.create(
        name=f"Job Discovery - {user_name}",
        first_message=first_message,
        model={
            "provider": "google",
            "model": "gemini-2.0-flash",
            "messages": [{"role": "system", "content": system_prompt}],
            "temperature": 0.7,
        },
        voice={
            "provider": "openai",
            "voiceId": "nova",
        },
        transcriber={
            "provider": "deepgram",
            "model": "nova-2",
            "language": "en",
        },
        max_duration_seconds=600,
        silence_timeout_seconds=30,
    )
    return assistant.id


def create_interview_assistant(
    user_name: str,
    technologies: list[str],
    summary: str,
    job_title: str,
    company: str | None,
    requirements: str | None,
) -> str:
    """Create a VAPI assistant that conducts a mock technical interview.

    Returns the assistant ID.
    """
    client = get_vapi()

    system_prompt = get_prompt(
        "interview", "system",
        user_name=user_name,
        technologies=", ".join(technologies),
        summary=summary,
        job_title=job_title,
        company=company or "Not specified",
        requirements=requirements or "Not specified",
    )
    first_message = get_prompt(
        "interview", "first_message",
        user_name=user_name,
        job_title=job_title,
        company_suffix=f" at {company}" if company else "",
    )

    assistant = client.assistants.create(
        name=f"Interview - {user_name} - {job_title}",
        first_message=first_message,
        model={
            "provider": "google",
            "model": "gemini-2.0-flash",
            "messages": [{"role": "system", "content": system_prompt}],
            "temperature": 0.7,
        },
        voice={
            "provider": "openai",
            "voiceId": "nova",
        },
        transcriber={
            "provider": "deepgram",
            "model": "nova-2",
            "language": "en",
        },
        max_duration_seconds=900,
        silence_timeout_seconds=30,
    )
    return assistant.id


def get_call_transcript(call_id: str) -> dict:
    """Fetch transcript and analysis for a completed call."""
    client = get_vapi()
    call = client.calls.get(call_id)
    artifact = call.artifact or {}
    analysis = call.analysis or {}

    def _get(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    return {
        "transcript": _get(artifact, "transcript", ""),
        "messages": _get(artifact, "messages", []),
        "duration": call.duration,
        "summary": _get(analysis, "summary"),
        "status": call.status,
    }


def delete_assistant(assistant_id: str):
    """Clean up an assistant after use."""
    get_vapi().assistants.delete(assistant_id)
