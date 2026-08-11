"""LLMService：统一封装 OpenAI 兼容 LLM 调用。

所有 LLM 调用必须经过本服务，统一处理：
- OpenAI 兼容接口
- JSON Mode
- 自动重试（最多 2 次）
- 超时（默认 120s，可通过 LLM_TIMEOUT 环境变量配置）
- token 用量记录到 llm_call_logs（独立事务，任务失败也不丢失日志）
"""
from __future__ import annotations

import json
import re
import time
import logging
from typing import Any, Dict, Optional

from openai import OpenAI, APIError, APITimeoutError

from app.config import settings
from app.database import SessionLocal
from app.models.llm_call_log import LLMCallLog
from app.models.model_config import ModelConfig

logger = logging.getLogger(__name__)


_JSON_FENCE_RE = re.compile(r"^```(?:json)?\s*\n?(.*?)\n?```\s*$", re.DOTALL)
_OBJECT_RE = re.compile(r"\{.*\}", re.DOTALL)


class LLMService:
    """统一 LLM 调用入口。"""

    def __init__(self) -> None:
        self._client: Optional[OpenAI] = None

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            self._client = OpenAI(
                api_key=settings.llm_api_key or "missing",
                base_url=settings.llm_base_url,
                timeout=settings.llm_timeout,
            )
        return self._client

    def is_configured(self) -> bool:
        return bool(settings.llm_api_key)

    def chat_json(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        prompt_type: str,
        temperature: float = 0.2,
        max_retries: int = 2,
        task_id: Optional[str] = None,
        output_id: Optional[str] = None,
        model_config: Optional[ModelConfig] = None,
    ) -> Dict[str, Any]:
        """调用 LLM 并解析为 JSON。

        失败时抛出 RuntimeError，调用方负责捕获并把任务置为 failed。

        若传入 model_config，则使用该用户配置的模型（OpenAI 兼容）；
        否则走全局 settings.llm_* 配置。
        """
        # 选择 client / model / temperature / provider
        if model_config is not None:
            from app.services.model_runtime import build_client

            client = build_client(model_config)
            use_model = model_config.model_id
            use_temperature = (
                model_config.temperature
                if model_config.temperature is not None
                else temperature
            )
            use_provider = model_config.provider
        else:
            if not self.is_configured():
                raise RuntimeError(
                    "LLM 未配置 API Key，请在 .env 中设置 LLM_API_KEY"
                )
            client = self.client
            use_model = settings.llm_model
            use_temperature = temperature
            use_provider = settings.llm_provider

        use_json_mode = True
        last_error: Optional[str] = None
        attempt = 0

        while attempt <= max_retries:
            attempt += 1
            started = time.time()
            try:
                kwargs: Dict[str, Any] = {
                    "model": use_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": use_temperature,
                }
                if use_json_mode:
                    kwargs["response_format"] = {"type": "json_object"}

                response = client.chat.completions.create(**kwargs)
                content = response.choices[0].message.content or ""
                parsed = self._parse_json(content)

                latency_ms = int((time.time() - started) * 1000)
                usage = getattr(response, "usage", None)
                prompt_tokens = getattr(usage, "prompt_tokens", 0) or 0
                completion_tokens = getattr(usage, "completion_tokens", 0) or 0
                total_tokens = getattr(usage, "total_tokens", 0) or (
                    prompt_tokens + completion_tokens
                )

                self._write_log(
                    task_id=task_id,
                    output_id=output_id,
                    prompt_type=prompt_type,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens,
                    latency_ms=latency_ms,
                    success=True,
                    error_message=None,
                    provider=use_provider,
                    model_name=use_model,
                )
                return parsed

            except (APIError, APITimeoutError, RuntimeError) as exc:
                latency_ms = int((time.time() - started) * 1000)
                last_error = str(exc)
                # 若错误与 response_format 相关，后续关闭 JSON Mode
                if "response_format" in last_error or "json" in last_error.lower():
                    if "response_format" in last_error:
                        use_json_mode = False
                logger.warning(
                    "LLM 调用失败 (prompt_type=%s, attempt=%d): %s",
                    prompt_type,
                    attempt,
                    last_error,
                )
                continue
            except Exception as exc:  # noqa: BLE001
                latency_ms = int((time.time() - started) * 1000)
                last_error = f"{type(exc).__name__}: {exc}"
                logger.warning(
                    "LLM 调用异常 (prompt_type=%s, attempt=%d): %s",
                    prompt_type,
                    attempt,
                    last_error,
                )
                continue

        # 全部重试失败
        self._write_log(
            task_id=task_id,
            output_id=output_id,
            prompt_type=prompt_type,
            prompt_tokens=0,
            completion_tokens=0,
            total_tokens=0,
            latency_ms=0,
            success=False,
            error_message=last_error,
            provider=use_provider,
            model_name=use_model,
        )
        raise RuntimeError(
            f"LLM 调用失败（重试 {max_retries} 次后仍失败）：{last_error}"
        )

    @staticmethod
    def _parse_json(content: str) -> Dict[str, Any]:
        """从模型输出中解析 JSON，兼容被代码块包裹或带多余文字的情况。"""
        text = content.strip()
        # 1. 直接解析
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        # 2. 去掉 ```json ... ``` 代码块
        fence = _JSON_FENCE_RE.match(text)
        if fence:
            try:
                return json.loads(fence.group(1).strip())
            except json.JSONDecodeError:
                pass
        # 3. 提取第一个 {...} 块
        match = _OBJECT_RE.search(text)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        raise RuntimeError(f"无法解析 LLM 输出为 JSON：{text[:200]}")

    def _write_log(
        self,
        *,
        task_id: Optional[str],
        output_id: Optional[str],
        prompt_type: str,
        prompt_tokens: int,
        completion_tokens: int,
        total_tokens: int,
        latency_ms: int,
        success: bool,
        error_message: Optional[str],
        provider: Optional[str] = None,
        model_name: Optional[str] = None,
    ) -> None:
        """用独立 Session 写日志，保证任务失败时日志不丢失。"""
        db = SessionLocal()
        try:
            log = LLMCallLog(
                task_id=task_id,
                output_id=output_id,
                model_name=model_name or settings.llm_model,
                provider=provider or settings.llm_provider,
                prompt_type=prompt_type,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                latency_ms=latency_ms,
                success=success,
                error_message=error_message,
            )
            db.add(log)
            db.commit()
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            logger.error("写入 llm_call_logs 失败: %s", exc)
        finally:
            db.close()


llm_service = LLMService()
