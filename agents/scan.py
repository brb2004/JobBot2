from typing import List
import uuid
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from server.config import settings
from server.db.models import PipelineQueue
from server.queue.tasks import run_eval

# Convert async URL to sync URL
sync_url = settings.database_url.replace(
    "postgresql+asyncpg://", "postgresql+psycopg2://"
)
sync_engine = create_engine(sync_url)


def is_job_url(url: str) -> bool:
    """Simple heuristic to determine if a URL is likely a job posting."""
    job_keywords = ["job", "vacancy", "position", "career", "opening", "apply"]
    path = urlparse(url).path.lower()
    return any(keyword in path for keyword in job_keywords)


def run(user_id: str, portal_url: str) -> dict:
    """
    Scrapes a portal URL for job links, inserts them into the pipeline queue,
    and triggers evaluation tasks.
    """
    try:
        response = requests.get(portal_url, timeout=10)
        response.raise_for_status()
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to fetch portal: {str(e)}",
            "jobs_found": 0,
        }

    soup = BeautifulSoup(response.text, "html.parser")
    links = soup.find_all("a", href=True)

    discovered_urls = set()
    for link in links:
        href = link["href"]
        full_url = urljoin(portal_url, href)

        # Filter: must be a job-like URL and not the portal itself
        if full_url != portal_url and is_job_url(full_url):
            discovered_urls.add(full_url)

    jobs_inserted = 0
    new_urls = set()
    with Session(sync_engine) as session:
        # Efficiently find which discovered URLs are already in the queue for this user
        existing_urls_query = select(PipelineQueue.url).where(
            PipelineQueue.user_id == user_id, PipelineQueue.url.in_(discovered_urls)
        )
        existing_urls = set(session.scalars(existing_urls_query).all())

        new_urls = discovered_urls - existing_urls
        for url in new_urls:
            queue_item = PipelineQueue(user_id=user_id, url=url, status="pending")
            session.add(queue_item)
            jobs_inserted += 1

        session.commit()

    # Trigger run_eval only for newly inserted jobs
    for url in new_urls:
        run_eval.delay(user_id=user_id, url=url)

    return {
        "success": True,
        "jobs_found": len(discovered_urls),
        "jobs_inserted": jobs_inserted,
    }
