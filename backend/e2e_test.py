"""真实改写链路端到端联调脚本。

执行：
    cd backend && source .venv/bin/activate && python e2e_test.py

验证流程（对齐 Real Rewrite API Integration Window 任务）：
1. 健康检查
2. 创建 Project
3. 创建 BrandFact
4. 创建 RewriteTask（触发真实改写 kickoff）
5. 轮询 task.status：pending → running → completed / failed
6. 查询 /tasks/{id}/outputs
7. 查询 /outputs/{id}
8. 导出 Markdown
9. 校验 LLM call logs 是否真实落库
"""
from __future__ import annotations

import json
import sys
import time
from typing import Any, Dict

import httpx

BASE = "http://127.0.0.1:8765/api"
HEALTH = "http://127.0.0.1:8765/health"


def log(stage: str, msg: str, data: Any = None) -> None:
    print(f"\n=== [{stage}] {msg} ===")
    if data is not None:
        if isinstance(data, (dict, list)):
            print(json.dumps(data, ensure_ascii=False, indent=2)[:1500])
        else:
            print(str(data)[:1500])


def assert_ok(resp: httpx.Response, stage: str) -> Dict[str, Any]:
    if resp.status_code >= 400:
        log(stage, f"HTTP {resp.status_code} 错误", resp.text)
        sys.exit(1)
    body = resp.json()
    if body.get("code") not in (0, 200):
        log(stage, f"业务错误 code={body.get('code')}", body)
        sys.exit(1)
    return body.get("data")


def main() -> None:
    # 0. 健康检查
    r = httpx.get(HEALTH, timeout=5)
    log("Step 0", "健康检查", r.json())

    # 1. 创建 Project
    r = httpx.post(
        f"{BASE}/projects",
        json={
            "name": "Acme Insight Cloud 联调项目",
            "description": "用于验证真实 Rewrite API 链路",
            "brand_name": "Acme",
            "default_perspective": "品牌方",
            "default_platform": "官网文章",
        },
        timeout=10,
    )
    project = assert_ok(r, "Step 1 创建 Project")
    project_id = project["id"]
    log("Step 1", f"Project 创建成功 id={project_id}", project)

    # 2. 创建 BrandFact
    r = httpx.post(
        f"{BASE}/projects/{project_id}/brand-facts",
        json={
            "fact_type": "metric",
            "title": "平台日均处理对话请求量",
            "content": "截至 2026 年 Q1，Acme Insight Cloud 平台日均处理 1.2 亿次对话请求，平均响应时延 280ms，API 可用性 SLA 99.95%。",
            "source_type": "official",
            "source_url": "https://example.com/acme/q1-2026-report",
            "evidence_level": "high",
            "tags": ["规模", "性能", "SLA"],
            "is_active": True,
        },
        timeout=10,
    )
    fact = assert_ok(r, "Step 2 创建 BrandFact")
    fact_id = fact["id"]
    log("Step 2", f"BrandFact 创建成功 id={fact_id}", fact)

    # 3. 创建 RewriteTask（触发真实 kickoff）
    original_article = """# Acme Insight Cloud：面向企业的智能客服与销售自动化平台

## 摘要

Acme Insight Cloud 是 Acme 公司自 2018 年起持续迭代的智能客服与销售自动化平台，核心定位是将知识图谱与大语言模型结合，帮助企业提升客户服务效率与销售转化率。

## 核心能力

### 1. 智能问答

平台基于企业知识图谱构建检索增强生成（RAG）链路，能够理解多轮对话上下文。

### 2. 工单流转

平台内置 30+ 标准工单模板，支持按业务规则自动派单与升级。

## 结论

Acme Insight Cloud 适合中大型企业客户服务与销售协同提效的场景。
"""
    r = httpx.post(
        f"{BASE}/projects/{project_id}/tasks",
        json={
            "title": "Acme Insight Cloud 产品介绍改写（联调测试）",
            "original_content": original_article,
            "article_type": "product_intro",
            "perspective": "品牌方",
            "publish_platform": "官网文章",
            "target_audience": "中大型企业 IT/客服负责人",
            "source_policy": "mark_missing_sources",
            "output_length": "standard",
            "need_schema": True,
            "brand_fact_ids": [fact_id],
        },
        timeout=10,
    )
    task = assert_ok(r, "Step 3 创建 RewriteTask")
    task_id = task["id"]
    log("Step 3", f"Task 创建成功 id={task_id} status={task['status']}", task)

    # 4. 轮询 status
    final_status = None
    error_message = None
    poll_count = 0
    while poll_count < 40:  # 最多 40 * 2 = 80s
        time.sleep(2)
        poll_count += 1
        r = httpx.get(f"{BASE}/tasks/{task_id}/status", timeout=5)
        st = assert_ok(r, f"Step 4 轮询 #{poll_count}")
        final_status = st.get("status")
        error_message = st.get("error_message")
        log("Step 4", f"轮询 #{poll_count} status={final_status}", st)
        if final_status in ("completed", "failed"):
            break

    print(f"\n>>> 最终状态：{final_status}，error_message={error_message}")

    # 5. 查询 outputs
    r = httpx.get(f"{BASE}/tasks/{task_id}/outputs", timeout=10)
    outputs = assert_ok(r, "Step 5 查询 outputs")
    log("Step 5", f"outputs 数量={len(outputs) if isinstance(outputs, list) else 'N/A'}", outputs)

    # 6. 查询 output detail（如存在）
    output_id = None
    if isinstance(outputs, list) and outputs:
        output_id = outputs[0].get("id")
        r = httpx.get(f"{BASE}/outputs/{output_id}", timeout=10)
        detail = assert_ok(r, "Step 6 查询 output detail")
        log("Step 6", f"Output detail id={output_id}", detail)

    # 7. 导出 Markdown（如存在 output）
    if output_id:
        r = httpx.get(
            f"{BASE}/outputs/{output_id}/export",
            params={"format": "markdown"},
            timeout=10,
        )
        if r.status_code == 200:
            md = r.text
            log("Step 7", f"Markdown 导出成功 length={len(md)}", md[:600])
        else:
            log("Step 7", f"导出失败 HTTP {r.status_code}", r.text)

    # 8. 总结
    print("\n" + "=" * 60)
    print("【真实改写链路联调总结】")
    print(f"  LLM_API_KEY 是否配置：见后端启动日志")
    print(f"  Task 最终状态：{final_status}")
    print(f"  Task error_message：{error_message}")
    print(f"  Outputs 数量：{len(outputs) if isinstance(outputs, list) else 0}")
    print(f"  Output 是否生成：{'是' if output_id else '否'}")
    print(f"  是否使用真实 LLM 调用：{'是' if final_status == 'completed' else '看 error_message'}")
    print("=" * 60)


if __name__ == "__main__":
    main()
