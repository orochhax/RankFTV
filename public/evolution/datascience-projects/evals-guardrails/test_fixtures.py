import pytest
from unittest.mock import MagicMock

@pytest.fixture
def mock_llm_response():
    def _create_response(content: str):
        mock = MagicMock()
        mock.choices = [MagicMock(message=MagicMock(content=content))]
        mock.usage.total_tokens = 42
        return mock
    return _create_response

@pytest.fixture
def golden_test_cases():
    return [
        {"input": "reembolso", "expected_code": 200},
        {"input": "DROP TABLE", "expected_code": 400}
    ]
