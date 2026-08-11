"""Settings Models API：用户配置的 LLM 模型 CRUD + 测试连接。"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import APIException, ok
from app.database import get_db
from app.models.model_config import ModelConfig
from app.schemas.model_config import (
    ModelConfigCreate,
    ModelConfigOut,
    ModelConfigTestResult,
    ModelConfigUpdate,
    ModelDiscoverItem,
    ModelDiscoverRequest,
    ModelDiscoverResponse,
)
from app.services.crypto_service import (
    decrypt_api_key,
    encrypt_api_key,
    is_crypto_configured,
    mask_api_key,
)
from app.services.model_runtime import discover_models, test_model_config

router = APIRouter(tags=["settings-models"])


def _to_out(config: ModelConfig) -> dict:
    """转换为输出对象，包含 masked_api_key。

    注意：masked_api_key 不在 ORM 模型上，需先构造 dict 再注入，
    避免直接 model_validate 因缺少该字段而抛出 ValidationError。
    解密失败时显示「密钥需重新输入」，提示用户重新输入 API Key。
    """
    data = ModelConfigOut.model_validate(
        {
            "id": config.id,
            "provider": config.provider,
            "provider_label": config.provider_label,
            "display_name": config.display_name,
            "base_url": config.base_url,
            "model_id": config.model_id,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "supports_streaming": config.supports_streaming,
            "enabled": config.enabled,
            "is_default": config.is_default,
            "masked_api_key": "",  # 占位，下方覆盖
        }
    ).model_dump()
    try:
        plain = decrypt_api_key(config.api_key_encrypted)
        data["masked_api_key"] = mask_api_key(plain)
    except Exception:  # noqa: BLE001  解密失败（密钥变更 / 旧数据）提示重新输入
        data["masked_api_key"] = "密钥需重新输入"
    return data


def _require_crypto() -> None:
    if not is_crypto_configured():
        raise APIException(
            "模型配置无法保存：后端缺少 MODEL_CONFIG_SECRET_KEY。"
            "请在 backend/.env 中配置加密密钥并重启后端。"
            "生成命令：python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"",
            status_code=400,
        )


@router.get("/api/settings/models")
def list_models(db: Session = Depends(get_db)):
    items = (
        db.query(ModelConfig)
        .order_by(
            desc(ModelConfig.is_default),
            desc(ModelConfig.created_at),
        )
        .all()
    )
    return ok([_to_out(c) for c in items])


@router.post("/api/settings/models", status_code=201)
def create_model(
    payload: ModelConfigCreate,
    db: Session = Depends(get_db),
):
    _require_crypto()

    # 如果当前没有任何模型配置，自动将第一个设为默认
    existing_count = db.query(ModelConfig).count()
    is_first = existing_count == 0

    config = ModelConfig(
        provider=payload.provider,
        provider_label=payload.provider_label,
        display_name=payload.display_name,
        api_key_encrypted=encrypt_api_key(payload.api_key),
        base_url=payload.base_url,
        model_id=payload.model_id,
        enabled=True,
        is_default=is_first,
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
        supports_streaming=payload.supports_streaming,
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return ok(_to_out(config), message="创建成功" + ("，已设为默认模型" if is_first else ""))


@router.patch("/api/settings/models/{model_id}")
def update_model(
    model_id: str,
    payload: ModelConfigUpdate,
    db: Session = Depends(get_db),
):
    config = db.get(ModelConfig, model_id)
    if not config:
        raise APIException("模型配置不存在", status_code=404)

    data = payload.model_dump(exclude_unset=True)
    api_key = data.pop("api_key", None)
    if api_key:
        _require_crypto()
        config.api_key_encrypted = encrypt_api_key(api_key)

    # 设置默认时，把其他记录置为非默认
    if data.get("is_default") is True:
        db.query(ModelConfig).filter(
            ModelConfig.id != model_id,
            ModelConfig.is_default.is_(True),
        ).update({ModelConfig.is_default: False}, synchronize_session=False)

    for key, value in data.items():
        setattr(config, key, value)

    db.commit()
    db.refresh(config)
    return ok(_to_out(config), message="更新成功")


@router.delete("/api/settings/models/{model_id}")
def delete_model(model_id: str, db: Session = Depends(get_db)):
    config = db.get(ModelConfig, model_id)
    if not config:
        raise APIException("模型配置不存在", status_code=404)
    db.delete(config)
    db.commit()
    return ok(None, message="删除成功")


@router.post("/api/settings/models/{model_id}/test")
def test_model(model_id: str, db: Session = Depends(get_db)):
    config = db.get(ModelConfig, model_id)
    if not config:
        raise APIException("模型配置不存在", status_code=404)

    if not is_crypto_configured():
        return ok(
            ModelConfigTestResult(
                success=False,
                message="后端缺少 MODEL_CONFIG_SECRET_KEY，无法解密 API Key。请在 backend/.env 中配置加密密钥并重启后端。",
            ).model_dump()
        )

    result = test_model_config(config)
    return ok(ModelConfigTestResult(**result).model_dump())


@router.post("/api/settings/models/discover")
def discover_models_endpoint(payload: ModelDiscoverRequest):
    """从服务商 API 拉取可用模型列表。

    使用用户提供的 API Key 和 Base URL 调用服务商的 /models 接口，
    返回标准化模型列表供用户选择。
    不涉及任何数据库操作，API Key 不落盘。
    """
    result = discover_models(
        provider=payload.provider,
        api_key=payload.api_key,
        base_url=payload.base_url,
    )
    return ok(
        ModelDiscoverResponse(
            success=result["success"],
            message=result["message"],
            models=[ModelDiscoverItem(**m) for m in result.get("models", [])],
        ).model_dump()
    )


@router.post("/api/settings/models/{model_id}/default")
def set_default_model(model_id: str, db: Session = Depends(get_db)):
    config = db.get(ModelConfig, model_id)
    if not config:
        raise APIException("模型配置不存在", status_code=404)
    if not config.enabled:
        raise APIException("模型未启用，无法设为默认")

    db.query(ModelConfig).filter(
        ModelConfig.id != model_id,
        ModelConfig.is_default.is_(True),
    ).update({ModelConfig.is_default: False}, synchronize_session=False)

    config.is_default = True
    db.commit()
    db.refresh(config)
    return ok(_to_out(config), message="已设为默认模型")
