from typing import Callable

from curl_cffi import requests as curl_requests
from bs4 import BeautifulSoup
from engine.llm_client import LLMClient


def _fetch_jd(url: str) -> str:
    """Fetch the page at *url* and return plain text (HTML stripped)."""
    response = curl_requests.get(url, impersonate="chrome", timeout=30)
    response.raise_for_status()

    content_type = response.headers.get("content-type", "")
    if "html" in content_type or response.text.lstrip().startswith("<"):
        soup = BeautifulSoup(response.text, "html.parser")
        for tag in soup(["script", "style", "noscript", "header", "footer", "nav"]):
            tag.decompose()
        text = soup.get_text(separator="\\n")
        lines = [line.strip() for line in text.splitlines()]
        text = "\\n".join(line for line in lines if line)
        return text

    return response.text


def run(url: str, progress_cb: Callable = None) -> dict:
    """
    Performs a deep-dive analysis of a job role or company based on the URL.
    Returns dict with key: analysis
    """
    llm = LLMClient()

    if progress_cb:
        progress_cb("Fetching job details for deep-dive analysis...")

    try:
        jd_text = _fetch_jd(url)
    except Exception as e:
        raise ValueError(f"Failed to fetch job details: {str(e)}")

    if progress_cb:
        progress_cb("Performing deep-dive analysis...")

    prompt = f"""
    You are a career strategist and industry analyst. Perform a deep-dive analysis of the following job posting.
    
    Job Posting:
    {jd_text}
    
    Your analysis should include:
    1. Company Analysis: What is the likely stage, culture, and goals of the company?
    2. Role Analysis: What are the unspoken requirements and the real challenges of this role?
    3. Strategic Advice: How should a candidate position themselves to be the 'obvious choice' for this specific role?
    4. Potential Red Flags: Any concerning language or patterns in the job description.
    
    Provide a comprehensive, professional analysis.
    """

    analysis = llm.prompt(prompt)

    return {"analysis": analysis}
