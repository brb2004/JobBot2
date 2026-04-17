from pydantic import BaseModel, ConfigDict, Field

AGENT_MODES = {
    "auto-pipeline", "eval", "pdf", "scan", "batch",
    "pipeline", "apply", "compare", "deep", "patterns",
    "outreach", "interview-prep", "build", "negotiation", "training"
}

TASK_MAP = {
    "auto-pipeline": "tasks.run_auto_pipeline",
    "eval": "tasks.run_eval",
    "pdf": "tasks.run_pdf",
    "scan": "tasks.run_scan",
    "batch": "tasks.run_batch",
    "pipeline": "tasks.run_pipeline",
    "apply": "tasks.run_apply",
    "compare": "tasks.run_compare",
    "deep": "tasks.run_deep",
    "patterns": "tasks.run_patterns",
    "outreach": "tasks.run_outreach",
    "interview-prep": "tasks.run_interview_prep",
    "build": "tasks.run_build",
    "negotiation": "tasks.run_negotiation",
    "training": "tasks.run_training",
}


class AgentRequest(BaseModel):
    model_config = ConfigDict(extra="allow")  # mode-specific fields pass through
    url: str = Field(pattern=r"^https?://")
