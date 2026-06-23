import re

from plane.app.ai.tools.registry import get_tool
from plane.utils.exception_logger import log_exception

_UUID_RE = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
    re.IGNORECASE,
)


def _sanitize_args(args: dict) -> dict:
    """Extract bare UUID from values where the LLM wrapped it in stray quotes."""
    import logging
    logger = logging.getLogger("plane.ai.executor")
    cleaned = {}
    for k, v in args.items():
        if isinstance(v, str) and ("_id" in k or k == "id"):
            match = _UUID_RE.search(v)
            result = match.group(0) if match else v
            if result != v:
                logger.warning("sanitize_args: key=%s raw=%r cleaned=%r", k, v, result)
            else:
                logger.info("sanitize_args: key=%s value=%r (no change)", k, v)
            cleaned[k] = result
        else:
            cleaned[k] = v
    return cleaned


def execute_tool(name: str, args: dict, workspace_slug: str, user) -> dict:
    fn = get_tool(name)
    if not fn:
        return {"error": f"Unknown tool: {name}"}
    try:
        return fn(workspace_slug=workspace_slug, user=user, **_sanitize_args(args))
    except Exception as e:
        log_exception(e)
        return {"error": str(e)}
