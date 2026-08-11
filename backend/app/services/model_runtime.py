"""统一模型调用适配层（OpenAI-compatible）。"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from openai import APIError, APIConnectionError, APITimeoutError, OpenAI

from app.models.model_config import ModelConfig
from app.services.crypto_service import decrypt_api_key

logger = logging.getLogger(__name__)


def build_client(config: ModelConfig) -> OpenAI:
    api_key = decrypt_api_key(config.api_key_encrypted)
    return OpenAI(api_key=api_key, base_url=config.base_url, timeout=60)


def _build_discover_client(api_key: str, base_url: str) -> OpenAI:
    """为模型发现构建客户端（不依赖数据库加密）。"""
    return OpenAI(api_key=api_key, base_url=base_url, timeout=30)


def discover_models(provider: str, api_key: str, base_url: str) -> Dict[str, Any]:
    """从服务商 API 拉取可用模型列表。

    Args:
        provider: 服务商标识，用于错误提示
        api_key: 明文 API Key（前端直传，不落盘）
        base_url: API Base URL

    Returns:
        {"success": bool, "message": str, "models": [{"id": str, "owned_by": str}]}
    """
    try:
        client = _build_discover_client(api_key, base_url)
        resp = client.models.list()
    except APITimeoutError:
        return {"success": False, "message": "请求超时，请检查 Base URL 或网络", "models": []}
    except APIConnectionError:
        return {"success": False, "message": "Base URL 无法访问", "models": []}
    except APIError as exc:
        msg = str(exc)
        if "401" in msg or "authentication" in msg.lower():
            return {"success": False, "message": "API Key 无效，无法获取模型列表", "models": []}
        if "403" in msg or "forbidden" in msg.lower():
            return {"success": False, "message": "API Key 无权限访问模型列表接口", "models": []}
        return {"success": False, "message": f"API 错误：{msg[:200]}", "models": []}
    except Exception as exc:  # noqa: BLE001
        logger.warning("discover_models failed for provider=%s: %s", provider, exc)
        return {"success": False, "message": f"获取模型列表失败：{type(exc).__name__}", "models": []}

    models: List[Dict[str, str]] = []
    for m in resp.data:
        model_id = getattr(m, "id", "") or ""
        owned_by = getattr(m, "owned_by", "") or ""
        if model_id:
            models.append({"id": model_id, "owned_by": owned_by})

    if not models:
        return {"success": False, "message": "服务商返回了空的模型列表，请检查 API Key 权限", "models": []}

    return {"success": True, "message": f"获取到 {len(models)} 个模型", "models": models}


def test_model_config(config: ModelConfig) -> Dict[str, Any]:
    """测试连接，返回 { success, message }。"""
    try:
        client = build_client(config)
        client.chat.completions.create(
            model=config.model_id,
            messages=[{"role": "user", "content": 'Return "ok".'}],
            max_tokens=10,
        )
        return {"success": True, "message": "连接成功"}
    except APITimeoutError:
        return {"success": False, "message": "请求超时，请检查 Base URL 或网络"}
    except APIConnectionError:
        return {"success": False, "message": "Base URL 无法访问"}
    except APIError as exc:
        msg = str(exc)
        if "401" in msg or "authentication" in msg.lower():
            return {"success": False, "message": "API Key 无效"}
        if "model" in msg.lower() and "not found" in msg.lower():
            return {"success": False, "message": "模型 ID 不存在"}
        return {"success": False, "message": f"API 错误：{msg[:200]}"}
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "message": f"未知错误：{type(exc).__name__}"}
