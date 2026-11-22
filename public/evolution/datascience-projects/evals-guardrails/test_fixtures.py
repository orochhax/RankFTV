import re
import pytest

PII_PATTERNS = {
    "CPF": re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b"),
    "CARD": re.compile(r"\b(?:\d{4}[- ]){3}\d{4}\b"),
    "EMAIL": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
}

def mask_pii_lgpd(text: str) -> str:
    masked = text
    for label, pattern in PII_PATTERNS.items():
        masked = pattern.sub(f"[REDACTED_{label}]", masked)
    return masked

def test_lgpd_pii_masking_blocks_sensitive_data():
    raw = "Cliente CPF 123.456.789-00 e email joao@empresa.com.br"
    clean = mask_pii_lgpd(raw)
    assert "123.456.789-00" not in clean
    assert "joao@empresa.com.br" not in clean
    assert "[REDACTED_CPF]" in clean
    assert "[REDACTED_EMAIL]" in clean
