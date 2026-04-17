from celery import Celery
from server.config import settings

celery = Celery("jobbot", broker=settings.redis_url, backend=settings.redis_url)
celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    worker_send_task_events=True,
    task_routes={
        "tasks.run_eval": {"queue": "eval"},
        "tasks.run_pdf": {"queue": "pdf"},
        "tasks.run_batch": {"queue": "batch"},
        "tasks.run_scan": {"queue": "scan"},
        "tasks.run_build": {"queue": "build"},
        "tasks.run_apply": {"queue": "apply"},
        "tasks.*": {"queue": "general"},
    }
)
