import os
from vapi import VapiClient

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

    system_prompt = f"""You are a friendly career advisor helping a candidate find the right job.

Candidate Profile:
- Name: {user_name}
- Technologies: {', '.join(technologies)}
- Background: {summary}

Your task:
1. Greet the candidate warmly
2. Ask what kind of role they're looking for (frontend, backend, fullstack, data, etc.)
3. Ask about preferred company size and culture
4. Ask about salary expectations and location/remote preferences
5. Ask about any specific technologies they want to work with
6. Summarize their preferences back to them

Keep the conversation natural and concise — aim for about 3-5 minutes.
When you have enough information, thank them and end the conversation."""

    assistant = client.assistants.create(
        name=f"Job Discovery - {user_name}",
        first_message=f"Hi {user_name}! I'm here to help you find the perfect job. Let's talk about what you're looking for. What kind of role interests you most right now?",
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

    system_prompt = f"""You are a professional technical interviewer conducting a mock interview.

Position: {job_title}
Company: {company or 'Not specified'}
Required Skills: {requirements or 'Not specified'}

Candidate Background:
- Name: {user_name}
- Technologies: {', '.join(technologies)}
- Background: {summary}

Interview Guidelines:
- Ask 4-5 technical questions related to the required skills
- Tailor questions to the candidate's actual experience
- Start with easier questions, gradually increase difficulty
- Ask follow-up questions based on their answers
- Be professional, encouraging, and constructive
- After all questions, give brief feedback on their performance
- Keep the interview to about 10 minutes"""

    assistant = client.assistants.create(
        name=f"Interview - {user_name} - {job_title}",
        first_message=f"Hello {user_name}! Welcome to your mock interview for the {job_title} position{f' at {company}' if company else ''}. I'll be asking you some technical questions today. Ready to begin?",
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

    # Handle both dict and object access patterns
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
