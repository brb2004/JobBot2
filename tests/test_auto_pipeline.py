import os

os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost/db"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["SECRET_KEY"] = "testsecret"

import unittest
from unittest.mock import MagicMock, patch
from agents.auto_pipeline import run


class TestAutoPipeline(unittest.TestCase):
    def setUp(self):
        self.user_id = "user123"
        self.url = "https://example.com/job"
        self.progress_cb = MagicMock()

    @patch("agents.auto_pipeline.eval_agent")
    @patch("agents.auto_pipeline.pdf_agent")
    def test_run_success_high_score(self, mock_pdf, mock_eval):
        # Mock evaluation result
        mock_eval.run.return_value = {
            "eval_id": "eval123",
            "score": 85,
            "grade": "A",
            "company": "TestCorp",
            "role": "Engineer",
        }
        # Mock PDF result
        mock_pdf.run.return_value = "storage/eval123.pdf"

        result = run(self.user_id, self.url, self.progress_cb)

        self.assertTrue(result["success"])
        self.assertEqual(result["eval_id"], "eval123")
        self.assertEqual(result["pdf_path"], "storage/eval123.pdf")
        mock_eval.run.assert_called_once()
        mock_pdf.run.assert_called_once()
        self.progress_cb.assert_any_call(100, "Auto-pipeline completed successfully.")

    @patch("agents.auto_pipeline.eval_agent")
    @patch("agents.auto_pipeline.pdf_agent")
    def test_run_success_low_score(self, mock_pdf, mock_eval):
        # Mock evaluation result with low score
        mock_eval.run.return_value = {
            "eval_id": "eval123",
            "score": 60,
            "grade": "C",
            "company": "TestCorp",
            "role": "Engineer",
        }
        mock_pdf.run.return_value = "storage/eval123.pdf"

        result = run(self.user_id, self.url, self.progress_cb)

        self.assertTrue(result["success"])
        self.progress_cb.assert_any_call(
            70, "Stage 3/3: Low score detected. Resume build recommended (T39)."
        )

    @patch("agents.auto_pipeline.eval_agent")
    def test_run_disqualified(self, mock_eval):
        # Mock disqualified result
        mock_eval.run.return_value = {
            "eval_id": None,
            "score": 20,
            "grade": "F",
            "company": "TestCorp",
            "role": "Engineer",
        }

        result = run(self.user_id, self.url, self.progress_cb)

        self.assertFalse(result["success"])
        self.assertEqual(result["reason"], "disqualified")
        self.progress_cb.assert_any_call(
            100, "Pipeline stopped: Candidate disqualified based on evaluation."
        )

    @patch("agents.auto_pipeline.eval_agent")
    def test_run_failure(self, mock_eval):
        # Mock exception
        mock_eval.run.side_effect = Exception("Eval failed")

        result = run(self.user_id, self.url, self.progress_cb)

        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "Eval failed")
        self.progress_cb.assert_any_call(0, "Pipeline failed: Eval failed")


if __name__ == "__main__":
    unittest.main()
