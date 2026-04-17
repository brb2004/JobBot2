from server.queue.celery_app import celery
from server.queue.sse import publish_sse
from agents import eval as eval_agent
from agents import pdf as pdf_agent
from agents import auto_pipeline as auto_pipeline_agent
from agents import build as build_agent
from agents import interview_prep as interview_prep_agent
from agents import compare as compare_agent
from agents import deep as deep_agent
from agents import outreach as outreach_agent
from agents import negotiation as negotiation_agent
from agents import patterns as patterns_agent
from agents import training as training_agent


@celery.task(bind=True, name="tasks.run_eval")
def run_eval(self, user_id: str, url: str) -> dict:
    def progress(pct: int, message: str):
        self.update_state(state="PROGRESS", meta={"progress": pct, "message": message})
        publish_sse(
            user_id,
            "job:progress",
            {
                "job_id": self.request.id,
                "mode": "eval",
                "progress": pct,
                "message": message,
            },
        )

    try:
        result = eval_agent.run(user_id=user_id, url=url, progress_cb=progress)
        publish_sse(user_id, "job:complete", {"job_id": self.request.id, **result})
        return result
    except Exception as e:
        publish_sse(user_id, "job:failed", {"job_id": self.request.id, "error": str(e)})
        raise


@celery.task(bind=True, name="tasks.run_pdf")
def run_pdf(self, user_id: str, eval_id: str) -> str:
    def progress(pct: int, message: str):
        self.update_state(state="PROGRESS", meta={"progress": pct, "message": message})
        publish_sse(
            user_id,
            "job:progress",
            {
                "job_id": self.request.id,
                "mode": "pdf",
                "progress": pct,
                "message": message,
            },
        )

    try:
        result = pdf_agent.run(user_id=user_id, eval_id=eval_id, progress_cb=progress)
        publish_sse(
            user_id, "job:complete", {"job_id": self.request.id, "pdf_path": result}
        )
        return result
    except Exception as e:
        publish_sse(user_id, "job:failed", {"job_id": self.request.id, "error": str(e)})
        raise


@celery.task(bind=True, name="tasks.run_auto_pipeline")
def run_auto_pipeline(self, user_id: str, url: str) -> dict:
    def progress(pct: int, message: str):
        self.update_state(state="PROGRESS", meta={"progress": pct, "message": message})
        publish_sse(
            user_id,
            "job:progress",
            {
                "job_id": self.request.id,
                "mode": "auto_pipeline",
                "progress": pct,
                "message": message,
            },
        )

    try:
        result = auto_pipeline_agent.run(user_id=user_id, url=url, progress_cb=progress)
        publish_sse(user_id, "job:complete", {"job_id": self.request.id, **result})
        return result
    except Exception as e:
        publish_sse(user_id, "job:failed", {"job_id": self.request.id, "error": str(e)})
        raise


@celery.task(bind=True, name="tasks.run_build")
def run_build(self, user_id: str, eval_id: str, feedback: str = None) -> dict:
    def progress(message: str):
        self.update_state(state="PROGRESS", meta={"progress": 0, "message": message})
        publish_sse(
            user_id,
            "job:progress",
            {
                "job_id": self.request.id,
                "mode": "build",
                "progress": 0,
                "message": message,
            },
        )

    try:
        result = build_agent.run(
            user_id=user_id, eval_id=eval_id, feedback=feedback, progress_cb=progress
        )
        publish_sse(user_id, "job:complete", {"job_id": self.request.id, **result})
        return result
    except Exception as e:
        publish_sse(user_id, "job:failed", {"job_id": self.request.id, "error": str(e)})
        raise


@celery.task(bind=True, name="tasks.run_interview_prep")
def run_interview_prep(self, user_id: str, eval_id: str) -> dict:
    def progress(message: str):
        self.update_state(state="PROGRESS", meta={"progress": 0, "message": message})
        publish_sse(
            user_id,
            "job:progress",
            {
                "job_id": self.request.id,
                "mode": "interview-prep",
                "progress": 0,
                "message": message,
            },
        )

    try:
        result = interview_prep_agent.run(
            user_id=user_id, eval_id=eval_id, progress_cb=progress
        )
        publish_sse(user_id, "job:complete", {"job_id": self.request.id, **result})
        return result
    except Exception as e:
        publish_sse(user_id, "job:failed", {"job_id": self.request.id, "error": str(e)})
        raise


@celery.task(bind=True, name="tasks.run_compare")
def run_compare(
    self,
    user_id: str,
    eval_id_1: str = None,
    eval_id_2: str = None,
    resume_id_1: str = None,
    resume_id_2: str = None,
) -> dict:
    def progress(message: str):
        self.update_state(state="PROGRESS", meta={"progress": 0, "message": message})
        publish_sse(
            user_id,
            "job:progress",
            {
                "job_id": self.request.id,
                "mode": "compare",
                "progress": 0,
                "message": message,
            },
        )

    try:
        result = compare_agent.run(
            user_id=user_id,
            eval_id_1=eval_id_1,
            eval_id_2=eval_id_2,
            resume_id_1=resume_id_1,
            resume_id_2=resume_id_2,
            progress_cb=progress,
        )
        publish_sse(user_id, "job:complete", {"job_id": self.request.id, **result})
        return result
    except Exception as e:
        publish_sse(user_id, "job:failed", {"job_id": self.request.id, "error": str(e)})
        raise


@celery.task(bind=True, name="tasks.run_deep")
def run_deep(self, user_id: str, url: str) -> dict:
    def progress(message: str):
        self.update_state(state="PROGRESS", meta={"progress": 0, "message": message})
        publish_sse(
            user_id,
            "job:progress",
            {
                "job_id": self.request.id,
                "mode": "deep",
                "progress": 0,
                "message": message,
            },
        )

    try:
        result = deep_agent.run(url=url, progress_cb=progress)
        publish_sse(user_id, "job:complete", {"job_id": self.request.id, **result})
        return result
    except Exception as e:
        publish_sse(user_id, "job:failed", {"job_id": self.request.id, "error": str(e)})
        raise


@celery.task(bind=True, name="tasks.run_outreach")
def run_outreach(self, user_id: str, eval_id: str) -> dict:
    def progress(message: str):
        self.update_state(state="PROGRESS", meta={"progress": 0, "message": message})
        publish_sse(
            user_id,
            "job:progress",
            {
                "job_id": self.request.id,
                "mode": "outreach",
                "progress": 0,
                "message": message,
            },
        )

    try:
        result = outreach_agent.run(
            user_id=user_id, eval_id=eval_id, progress_cb=progress
        )
        publish_sse(user_id, "job:complete", {"job_id": self.request.id, **result})
        return result
    except Exception as e:
        publish_sse(user_id, "job:failed", {"job_id": self.request.id, "error": str(e)})
        raise


@celery.task(bind=True, name="tasks.run_negotiation")
def run_negotiation(self, user_id: str, eval_id: str) -> dict:
    def progress(message: str):
        self.update_state(state="PROGRESS", meta={"progress": 0, "message": message})
        publish_sse(
            user_id,
            "job:progress",
            {
                "job_id": self.request.id,
                "mode": "negotiation",
                "progress": 0,
                "message": message,
            },
        )

    try:
        result = negotiation_agent.run(
            user_id=user_id, eval_id=eval_id, progress_cb=progress
        )
        publish_sse(user_id, "job:complete", {"job_id": self.request.id, **result})
        return result
    except Exception as e:
        publish_sse(user_id, "job:failed", {"job_id": self.request.id, "error": str(e)})
        raise


@celery.task(bind=True, name="tasks.run_patterns")
def run_patterns(self, user_id: str) -> dict:
    def progress(message: str):
        self.update_state(state="PROGRESS", meta={"progress": 0, "message": message})
        publish_sse(
            user_id,
            "job:progress",
            {
                "job_id": self.request.id,
                "mode": "patterns",
                "progress": 0,
                "message": message,
            },
        )

    try:
        result = patterns_agent.run(user_id=user_id, progress_cb=progress)
        publish_sse(user_id, "job:complete", {"job_id": self.request.id, **result})
        return result
    except Exception as e:
        publish_sse(user_id, "job:failed", {"job_id": self.request.id, "error": str(e)})
        raise


@celery.task(bind=True, name="tasks.run_training")
def run_training(self, user_id: str, eval_id: str) -> dict:
    def progress(message: str):
        self.update_state(state="PROGRESS", meta={"progress": 0, "message": message})
        publish_sse(
            user_id,
            "job:progress",
            {
                "job_id": self.request.id,
                "mode": "training",
                "progress": 0,
                "message": message,
            },
        )

    try:
        result = training_agent.run(
            user_id=user_id, eval_id=eval_id, progress_cb=progress
        )
        publish_sse(user_id, "job:complete", {"job_id": self.request.id, **result})
        return result
    except Exception as e:
        publish_sse(user_id, "job:failed", {"job_id": self.request.id, "error": str(e)})
        raise
