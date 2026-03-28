import yaml
from pathlib import Path

_PROMPTS_PATH = Path(__file__).parent.parent / "prompts.yaml"
_cache: dict | None = None


def get_prompts() -> dict:
    global _cache
    if _cache is None:
        with open(_PROMPTS_PATH) as f:
            _cache = yaml.safe_load(f)
    return _cache


def get_prompt(key: str, subkey: str, **kwargs) -> str:
    """Get a prompt by key.subkey, formatting with kwargs.

    Example: get_prompt("interview", "system", user_name="Alice", ...)
    """
    text = get_prompts()[key][subkey]
    if kwargs:
        text = text.format(**kwargs)
    return text


def reload():
    """Force reload prompts from disk (useful for dev)."""
    global _cache
    _cache = None
