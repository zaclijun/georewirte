"""PromptService：Prompt 文件加载、变量插值、视角/平台规则提取。"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Dict

from app.config import PROMPTS_DIR


# P0 使用「知乎问答」，但 platforms.md 中章节名为「知乎专栏」，做别名映射
_PLATFORM_ALIASES: Dict[str, str] = {
    "知乎问答": "知乎专栏",
}

_VAR_PATTERN = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}")


class PromptService:
    """加载并组装 Prompt。"""

    def __init__(self, prompts_dir: Path = PROMPTS_DIR) -> None:
        self.prompts_dir = prompts_dir

    # ---- 文件加载 ----
    @lru_cache(maxsize=32)
    def _read_file(self, name: str) -> str:
        path = self.prompts_dir / name
        if not path.exists():
            raise FileNotFoundError(f"Prompt 文件不存在: {path}")
        return path.read_text(encoding="utf-8")

    def load(self, name: str) -> str:
        """加载 Prompt 模板原文（带缓存）。"""
        return self._read_file(name)

    # ---- 插值 ----
    def interpolate(self, template: str, variables: Dict[str, object]) -> str:
        """替换 {{variable}} 占位符。自动序列化 dict/list/bool。"""

        def repl(match: re.Match) -> str:
            key = match.group(1)
            if key not in variables:
                # 未提供的变量保留原文，避免误删
                return match.group(0)
            return self._stringify(variables[key])

        return _VAR_PATTERN.sub(repl, template)

    @staticmethod
    def _stringify(value: object) -> str:
        if isinstance(value, bool):
            return "true" if value else "false"
        if isinstance(value, (dict, list)):
            return json.dumps(value, ensure_ascii=False)
        if value is None:
            return ""
        return str(value)

    # ---- 视角 / 平台规则 ----
    @lru_cache(maxsize=64)
    def _extract_section(self, file_name: str, header: str) -> str:
        """从 Markdown 参考文件中提取 `## {header}` 下的内容（到下一个 `## ` 或文件结尾）。"""
        text = self._read_file(file_name)
        lines = text.splitlines()
        target = header.strip()
        collecting = False
        collected: list[str] = []
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("## "):
                if collecting:
                    # 进入下一个同级章节，结束
                    break
                current_header = stripped[3:].strip()
                if current_header == target:
                    collecting = True
                    continue
            elif collecting:
                collected.append(line)
        # 去掉首尾空行
        return "\n".join(collected).strip()

    def get_perspective_rules(self, perspective: str) -> str:
        """从 references/perspectives.md 提取视角规则文本。"""
        return self._extract_section("references/perspectives.md", perspective)

    def get_platform_rules(self, platform: str) -> str:
        """从 references/platforms.md 提取平台规则文本（带别名处理）。"""
        # 先精确匹配，再尝试别名
        rules = self._extract_section("references/platforms.md", platform)
        if not rules:
            alias = _PLATFORM_ALIASES.get(platform)
            if alias:
                rules = self._extract_section("references/platforms.md", alias)
        return rules


prompt_service = PromptService()
