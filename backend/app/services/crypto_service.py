"""API Key 加密/解密服务，使用 Fernet 对称加密。"""
from __future__ import annotations

import logging

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

logger = logging.getLogger(__name__)


def _get_fernet() -> Fernet:
    secret = settings.model_config_secret_key
    if not secret or secret == "change-me":
        raise RuntimeError("未配置 MODEL_CONFIG_SECRET_KEY，请在 .env 中设置")
    return Fernet(secret.encode())


def encrypt_api_key(api_key: str) -> str:
    return _get_fernet().encrypt(api_key.encode()).decode()


def decrypt_api_key(encrypted: str) -> str:
    try:
        return _get_fernet().decrypt(encrypted.encode()).decode()
    except InvalidToken:
        raise RuntimeError("API Key 解密失败，请检查 MODEL_CONFIG_SECRET_KEY")


def mask_api_key(api_key: str) -> str:
    if not api_key:
        return ""
    if len(api_key) <= 8:
        return "****"
    return f"{api_key[:2]}****{api_key[-4:]}"


def is_crypto_configured() -> bool:
    secret = settings.model_config_secret_key
    return bool(secret) and secret != "change-me"
