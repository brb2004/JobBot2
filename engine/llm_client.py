import json
import time
from datetime import datetime

import anthropic
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential


class LLMError(Exception):
    """Raised when an LLM operation fails."""


class LLMClient:
    MODEL = "claude-sonnet-4-6"

    def __init__(self):
        self.client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
    def structured(self, prompt: str, schema: type[BaseModel]) -> BaseModel:
        """Synchronous. Call from Celery worker context."""
        response = self.client.messages.create(
            model=self.MODEL,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text
        # Strip markdown fences if present
        raw = raw.strip().removeprefix("```json").removesuffix("```").strip()
        return schema.model_validate_json(raw)

    def batch_create(self, requests: list[dict]) -> str:
        """Submit a batch; return batch_id."""
        result = self.client.beta.messages.batches.create(requests=requests)
        return result.id

    def batch_poll(self, batch_id: str) -> list[dict]:
        """Poll until complete; return results."""
        while True:
            batch = self.client.beta.messages.batches.retrieve(batch_id)
            if batch.processing_status == "ended":
                return list(self.client.beta.messages.batches.results(batch_id))
            time.sleep(5)

    def _log_usage(self, response) -> None:
        entry = {
            "ts": datetime.utcnow().isoformat(),
            "model": self.MODEL,
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        }
        with open("/data/llm-usage.jsonl", "a") as f:
            f.write(json.dumps(entry) + "\n")
