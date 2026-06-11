"""
Shared HuggingFace API utilities with DNS fallback support
"""
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Ordered list of URL templates to try. First working match wins.
HF_API_URLS = [
    # 1. Primary OpenAI-compatible endpoint (supports all Inference API models)
    "https://api-inference.huggingface.co/v1/chat/completions",
    # 2. Router with generic path
    "https://router.huggingface.co/v1/chat/completions",
    # 3. Router with hf-inference provider
    "https://router.huggingface.co/hf-inference/models/{model}/v1/chat/completions",
    # 4. Direct model endpoint (TGI style)
    "https://api-inference.huggingface.co/models/{model}/v1/chat/completions",
]


async def _try_hf_request(
    url: str,
    api_key: str,
    model: str,
    payload: Dict[str, Any],
    timeout: float = 30.0,
) -> tuple[bool, Optional[str], Optional[str]]:
    """Try a single HF API request. Returns (success, response_or_error, url_used)."""
    import httpx

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                return True, None, url
            error_body = resp.text[:300]
            return False, f"API error ({resp.status_code}): {error_body}", url
    except ImportError:
        return False, "httpx package not installed", url
    except Exception as e:
        return False, str(e), url


async def test_hf_connection(
    api_key: str,
    model: str,
    endpoint: Optional[str] = None,
) -> Dict[str, Any]:
    """Test HuggingFace connectivity with automatic URL fallback."""
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Hello"}],
        "max_tokens": 5,
    }

    urls_to_try = []
    if endpoint:
        urls_to_try.append(endpoint)
    for url_template in HF_API_URLS:
        url = url_template.replace("{model}", model)
        if url not in urls_to_try:
            urls_to_try.append(url)

    last_error = None
    last_url = None
    had_dns_error = False

    for url in urls_to_try:
        success, error, used_url = await _try_hf_request(url, api_key, model, payload)
        if success:
            return {"connected": True, "message": f"Connected to {model}"}
        if error and "Name or service not known" in error:
            had_dns_error = True
        last_error = error
        last_url = used_url
        logger.warning(f"HF endpoint {url} failed: {error}")
        continue

    # Build a clear error message
    if had_dns_error:
        msg = (
            "Cannot reach HuggingFace API from this server (DNS resolution failed). "
            "The Docker container cannot resolve api-inference.huggingface.co. "
            "Fix options:\n"
            "1. Add `dns: 8.8.8.8` under the backend service in docker-compose.yml\n"
            "2. Restart Docker Desktop\n"
            "3. Set a Custom Endpoint URL above (e.g., your own TGI endpoint)"
        )
    else:
        msg = _format_error(last_error, last_url)

    return {"connected": False, "message": msg}


def _format_error(error: Optional[str], url: Optional[str]) -> str:
    if not error:
        return "Connection failed with no error details."

    hostname = url.split("/")[2] if url else "unknown"
    if "Name or service not known" in error:
        return f"Cannot resolve '{hostname}' from this server. Check DNS / internet."
    if "Connection refused" in error:
        return "Connection refused. Verify the endpoint is running and accessible."
    if "timeout" in error.lower():
        return "Connection timed out. The API may be down or network is blocking."
    if "Model not supported" in error:
        return (
            f"The endpoint '{hostname}' does not support this model. "
            f"This is a fallback endpoint — the primary HuggingFace API is unreachable from this server. "
            f"Fix the DNS issue (see above) or try a different model."
        )
    return error or "Unknown error"


async def get_hf_url_with_fallback(
    api_key: str,
    model: str,
    endpoint: Optional[str] = None,
) -> str:
    """Try each HF URL and return the first one that responds successfully."""
    if endpoint:
        return endpoint

    urls_to_try = [t.replace("{model}", model) for t in HF_API_URLS]
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 1,
    }

    import httpx

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    for url in urls_to_try:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code == 200:
                    logger.info(f"HF resolved working URL: {url}")
                    return url
        except Exception:
            continue

    logger.warning("No working HF URL found, using primary URL")
    return urls_to_try[0]
