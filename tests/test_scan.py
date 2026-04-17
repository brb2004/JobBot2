import unittest
from unittest.mock import MagicMock, patch
import uuid
from agents.scan import run


class TestScanAgent(unittest.TestCase):
    @patch("agents.scan.requests.get")
    @patch("agents.scan.Session")
    @patch("agents.scan.run_eval.delay")
    def test_run_success(self, mock_run_eval_delay, mock_session_cls, mock_get):
        # Setup mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
            <body>
                <a href="/jobs/1">Job 1</a>
                <a href="/jobs/2">Job 2</a>
                <a href="/about">About</a>
                <a href="https://other.com/vacancy/3">Job 3</a>
            </body>
        </html>
        """
        mock_get.return_value = mock_response

        # Setup mock session
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session
        # No existing queue items
        mock_session.scalars.return_value.all.return_value = []

        user_id = str(uuid.uuid4())
        portal_url = "https://example.com/careers"

        result = run(user_id, portal_url)

        self.assertTrue(result["success"])
        self.assertEqual(result["jobs_found"], 3)
        self.assertEqual(result["jobs_inserted"], 3)

        # Verify database insertions
        self.assertEqual(mock_session.add.call_count, 3)

        # Verify celery tasks triggered
        self.assertEqual(mock_run_eval_delay.call_count, 3)

    @patch("agents.scan.requests.get")
    @patch("agents.scan.Session")
    @patch("agents.scan.run_eval.delay")
    def test_run_with_existing_urls(
        self, mock_run_eval_delay, mock_session_cls, mock_get
    ):
        # Setup mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
            <body>
                <a href="/jobs/1">Job 1</a>
                <a href="/jobs/2">Job 2</a>
                <a href="/jobs/3">Job 3</a>
            </body>
        </html>
        """
        mock_get.return_value = mock_response

        # Setup mock session
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session

        # Mock that Job 1 already exists in the queue
        portal_url = "https://example.com/careers"
        existing_url = "https://example.com/jobs/1"
        mock_session.scalars.return_value.all.return_value = [existing_url]

        user_id = str(uuid.uuid4())

        result = run(user_id, portal_url)

        self.assertTrue(result["success"])
        self.assertEqual(result["jobs_found"], 3)
        self.assertEqual(result["jobs_inserted"], 2)

        # Verify only 2 new items added
        self.assertEqual(mock_session.add.call_count, 2)

        # Verify only 2 tasks triggered
        self.assertEqual(mock_run_eval_delay.call_count, 2)

    @patch("agents.scan.requests.get")
    def test_run_failure(self, mock_get):
        mock_get.side_effect = Exception("Connection error")

        user_id = str(uuid.uuid4())
        portal_url = "https://example.com/careers"

        result = run(user_id, portal_url)

        self.assertFalse(result["success"])
        self.assertIn("Failed to fetch portal", result["error"])


if __name__ == "__main__":
    unittest.main()
