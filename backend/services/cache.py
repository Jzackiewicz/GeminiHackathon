"""Simple in-memory request cache.

Usage:
    from services.cache import cached

    @router.post("/my/endpoint")
    @cached
    async def my_endpoint(body: MyModel):
        ...

Keys are derived from: method + path + sorted body JSON.
Works with both sync and async handlers.
Entries persist until manually invalidated.
"""
import hashlib
import json
import functools
from typing import Any


_store: dict[str, Any] = {}  # key -> value


def _make_key(method: str, path: str, body: Any) -> str:
    raw = f"{method}:{path}:{json.dumps(body, sort_keys=True, default=str)}"
    return hashlib.sha256(raw.encode()).hexdigest()


def cached(func):
    """Decorator for FastAPI route handlers. Caches response by request body forever."""

    @functools.wraps(func)
    async def async_wrapper(*args, **kwargs):
        body = None
        for k, v in kwargs.items():
            if hasattr(v, "model_dump"):
                body = v.model_dump()
                break
            elif isinstance(v, dict):
                body = v
                break

        request = kwargs.get("request")
        if request:
            key = _make_key(request.method, request.url.path, body)
        else:
            key = _make_key("POST", func.__name__, body)

        if key in _store:
            return _store[key]

        import asyncio
        if asyncio.iscoroutinefunction(func):
            result = await func(*args, **kwargs)
        else:
            result = func(*args, **kwargs)

        if isinstance(result, dict) and "error" in result:
            return result

        _store[key] = result
        return result

    @functools.wraps(func)
    def sync_wrapper(*args, **kwargs):
        body = None
        for k, v in kwargs.items():
            if hasattr(v, "model_dump"):
                body = v.model_dump()
                break
            elif isinstance(v, dict):
                body = v
                break

        key = _make_key("POST", func.__name__, body)

        if key in _store:
            return _store[key]

        result = func(*args, **kwargs)

        if isinstance(result, dict) and "error" in result:
            return result

        _store[key] = result
        return result

    import asyncio
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    return sync_wrapper


def invalidate_all():
    """Clear the entire cache."""
    _store.clear()


def cache_stats() -> dict:
    """Return cache statistics."""
    return {"entries": len(_store)}
