"""RewriteService：改写流程编排。

流程：
用户提交任务 → 保存 pending → 读取品牌事实 → Call 1 评分诊断
→ Call 2 改写出包 → 可选 Call 3 质检 → 保存结果 → 前端展示

所有 LLM 调用通过 LLMService，状态机：pending/running/completed/failed。
"""
from __future__ import annotations

import json
import logging
import threading
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.brand_fact import BrandFact
from app.models.model_config import ModelConfig
from app.models.rewrite_output import RewriteOutput
from app.models.rewrite_task import RewriteTask
from app.services.brand_fact_service import brand_fact_service
from app.services.llm_service import llm_service
from app.services.prompt_service import prompt_service
from app.services.scoring_service import scoring_service, serialize_brand_facts

logger = logging.getLogger(__name__)

MAX_FACTS_PER_TASK = 20  # 单次关联事实上限，防止 Context 超限


class RewriteService:
    # ---- 后台执行入口 ----
    def kickoff(
        self, task_id: str, parent_version_id: Optional[str] = None
    ) -> None:
        """在后台线程中启动改写（非阻塞）。"""
        thread = threading.Thread(
            target=self._run_in_thread,
            args=(task_id, parent_version_id),
            daemon=True,
            name=f"rewrite-{task_id[:8]}",
        )
        thread.start()

    def _run_in_thread(self, task_id: str, parent_version_id: Optional[str]) -> None:
        db = SessionLocal()
        try:
            self.run_rewrite(db, task_id, parent_version_id=parent_version_id)
        except Exception as exc:  # noqa: BLE001
            logger.exception("改写任务异常 task_id=%s: %s", task_id, exc)
            self._mark_failed(db, task_id, str(exc))
        finally:
            db.close()

    # ---- 主流程 ----
    def run_rewrite(
        self,
        db: Session,
        task_id: str,
        *,
        parent_version_id: Optional[str] = None,
    ) -> RewriteOutput:
        task = db.get(RewriteTask, task_id)
        if task is None:
            raise RuntimeError(f"任务不存在: {task_id}")
        if task.status == "running":
            raise RuntimeError("任务正在执行中，请勿重复提交")

        # 置为 running
        task.status = "running"
        task.error_message = None
        db.commit()

        # 读取品牌事实
        facts = self._load_facts(db, task)

        # 加载任务关联的 ModelConfig（若不存在则回退到全局 LLM 配置）
        model_config: Optional[ModelConfig] = None
        if task.model_config_id:
            model_config = db.get(ModelConfig, task.model_config_id)
            if model_config is not None and not model_config.enabled:
                # 配置被禁用，回退到全局
                logger.warning(
                    "task_id=%s 关联的 model_config_id=%s 已禁用，回退到全局 LLM 配置",
                    task_id,
                    task.model_config_id,
                )
                model_config = None

        # Call 1：评分 + 诊断 + 策略
        call1 = scoring_service.score_and_diagnose(
            db, task, facts, model_config=model_config
        )
        score_before_obj = call1.get("score_before") or {}
        is_high_quality = bool(call1.get("is_high_quality", False))
        optimization_strategy = call1.get("optimization_strategy") or []

        # Call 2：改写 + FAQ + Schema + 改后评分
        call2 = self._call_rewrite_package(
            db, task, facts, call1, is_high_quality, optimization_strategy,
            model_config=model_config,
        )

        # 可选 Call 3：质量检查
        review_status = "review"
        if settings.enable_quality_check:
            try:
                call3 = self._call_quality_check(
                    db, task, facts, call1, call2,
                    model_config=model_config,
                )
                qs = call3.get("quality_status")
                if qs in ("ready", "review", "needs_material"):
                    review_status = qs
            except Exception as exc:  # noqa: BLE001
                logger.warning("质量检查失败（不影响主流程）: %s", exc)

        # 组装并持久化输出
        output = self._persist_output(
            db,
            task=task,
            call2=call2,
            call1=call1,
            score_before_obj=score_before_obj,
            review_status=review_status,
            parent_version_id=parent_version_id,
        )

        # 任务完成
        task.status = "completed"
        task.error_message = None
        db.commit()
        db.refresh(output)
        return output

    # ---- 各 Call 实现 ----
    def _call_rewrite_package(
        self,
        db: Session,
        task: RewriteTask,
        facts: List[BrandFact],
        call1: Dict[str, Any],
        is_high_quality: bool,
        optimization_strategy: List[Any],
        model_config: Optional[ModelConfig] = None,
    ) -> Dict[str, Any]:
        system_prompt = prompt_service.load("system-role.md")
        template = prompt_service.load("rewrite-package.md")

        project = task.project
        brand_name = project.brand_name if project else None
        perspective_rules = prompt_service.get_perspective_rules(task.perspective)
        platform_rules = prompt_service.get_platform_rules(task.publish_platform)
        brand_facts_json = json.dumps(serialize_brand_facts(facts), ensure_ascii=False)

        user_prompt = prompt_service.interpolate(
            template,
            {
                "article": task.original_content,
                "brand_facts": brand_facts_json,
                "perspective": task.perspective,
                "perspective_rules": perspective_rules or "（无特殊视角规则）",
                "platform": task.publish_platform,
                "platform_rules": platform_rules or "（无特殊平台规则）",
                "source_policy": task.source_policy,
                "output_length": task.output_length,
                "is_high_quality": is_high_quality,
                "optimization_strategy": optimization_strategy,
                "need_schema": task.need_schema,
                "brand": brand_name or "",
                "product": "",
                "audience": task.target_audience or "",
                "article_type": task.article_type or "",
            },
        )

        return llm_service.chat_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            prompt_type="rewrite",
            temperature=0.3,
            task_id=task.id,
            model_config=model_config,
        )

    def _call_quality_check(
        self,
        db: Session,
        task: RewriteTask,
        facts: List[BrandFact],
        call1: Dict[str, Any],
        call2: Dict[str, Any],
        model_config: Optional[ModelConfig] = None,
    ) -> Dict[str, Any]:
        system_prompt = prompt_service.load("system-role.md")
        template = prompt_service.load("quality-check.md")

        diagnosis = call1.get("diagnosis") or {}
        hard_blockers = diagnosis.get("hard_blockers") or []
        missing_sources = call2.get("missing_sources") or []
        brand_facts_json = json.dumps(serialize_brand_facts(facts), ensure_ascii=False)

        user_prompt = prompt_service.interpolate(
            template,
            {
                "original_article": task.original_content,
                "rewritten_article": call2.get("final_article", ""),
                "brand_facts": brand_facts_json,
                "source_policy": task.source_policy,
                "hard_blockers_before": hard_blockers,
                "missing_sources_list": missing_sources,
            },
        )

        return llm_service.chat_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            prompt_type="quality",
            temperature=0.1,
            task_id=task.id,
            model_config=model_config,
        )

    # ---- 持久化 ----
    def _persist_output(
        self,
        db: Session,
        *,
        task: RewriteTask,
        call2: Dict[str, Any],
        call1: Dict[str, Any],
        score_before_obj: Dict[str, Any],
        review_status: str,
        parent_version_id: Optional[str],
    ) -> RewriteOutput:
        # 计算版本号
        last_version = (
            db.query(RewriteOutput)
            .filter(RewriteOutput.task_id == task.id)
            .order_by(RewriteOutput.version.desc())
            .first()
        )
        next_version = (last_version.version + 1) if last_version else 1

        score_after_obj = call2.get("score_after") or {}
        optimization_strategy = call1.get("optimization_strategy") or []

        output = RewriteOutput(
            task_id=task.id,
            version=next_version,
            parent_version_id=parent_version_id,
            title=call2.get("title"),
            final_article=call2.get("final_article", ""),
            faq_content=call2.get("faq_content"),
            schema_suggestions=call2.get("schema_suggestions"),
            optimization_strategy=optimization_strategy,
            comparison_summary=call2.get("comparison_summary"),
            missing_sources=call2.get("missing_sources") or [],
            missing_facts=call2.get("missing_facts") or [],
            review_status=review_status,
            raw_response=json.dumps(
                {"call1": call1, "call2": call2}, ensure_ascii=False
            ),
        )
        db.add(output)
        db.flush()  # 拿到 output.id

        # 改前评分
        before_score = scoring_service.build_content_score(
            score_before_obj, "before", output.id
        )
        db.add(before_score)
        # 改后评分
        after_score = scoring_service.build_content_score(
            score_after_obj, "after", output.id
        )
        db.add(after_score)
        return output

    # ---- 辅助 ----
    def _load_facts(self, db: Session, task: RewriteTask) -> List[BrandFact]:
        fact_ids = list(task.brand_fact_ids or [])
        if not fact_ids:
            return []
        # 保持用户选择顺序，且限制数量
        facts = brand_fact_service.get_many(db, fact_ids)
        fact_map = {f.id: f for f in facts}
        ordered = [fact_map[fid] for fid in fact_ids if fid in fact_map]
        return ordered[:MAX_FACTS_PER_TASK]

    def _mark_failed(self, db: Session, task_id: str, message: str) -> None:
        try:
            # 先回滚未完成的事务，清除 session 中残留的脏数据
            db.rollback()
            task = db.get(RewriteTask, task_id)
            if task is not None:
                task.status = "failed"
                task.error_message = message
                db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.error("标记任务失败状态时出错: %s", exc)
            db.rollback()


rewrite_service = RewriteService()
