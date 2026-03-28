import asyncio
import logging
from collections import deque

_subscribers: list[asyncio.Queue] = []
_history: deque[str] = deque(maxlen=100)


class StreamHandler(logging.Handler):
    def emit(self, record):
        line = self.format(record)
        _history.append(line)
        for q in _subscribers:
            try:
                q.put_nowait(line)
            except asyncio.QueueFull:
                pass


def setup():
    handler = StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s", datefmt="%H:%M:%S"))
    root = logging.getLogger()
    root.addHandler(handler)
    root.setLevel(logging.INFO)
    # Also capture uvicorn access logs
    for name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        logging.getLogger(name).addHandler(handler)


def subscribe() -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=200)
    # Send history
    for line in _history:
        q.put_nowait(line)
    _subscribers.append(q)
    return q


def unsubscribe(q: asyncio.Queue):
    try:
        _subscribers.remove(q)
    except ValueError:
        pass
