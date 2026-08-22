from types import SimpleNamespace

import pytest

from syp.ai_coach.agent import run_openai_agent


def test_agents_sdk_adapter_exposes_only_read_tools(monkeypatch: pytest.MonkeyPatch) -> None:
    agents = pytest.importorskip("agents")

    class Toolbox:
        def plan_overview(self) -> str:
            return "{}"

        def progress(self, start_date: object, end_date: object) -> str:
            return "{}"

        def recent_records(self, days: int) -> str:
            return "[]"

        def weekly_summary(self, week_start: object) -> str:
            return "{}"

        def weak_areas(self, start_date: object, end_date: object) -> str:
            return "[]"

    def fake_run_sync(agent: object, question: str, max_turns: int) -> SimpleNamespace:
        names = {tool.name for tool in agent.tools}  # type: ignore[attr-defined]
        assert names == {
            "get_plan_overview",
            "get_plan_progress",
            "get_recent_progress_entries",
            "get_weekly_summary",
            "get_weak_areas",
        }
        assert not any("create" in name or "update" in name or "delete" in name for name in names)
        assert question == "Why am I behind?"
        assert max_turns == 8
        return SimpleNamespace(final_output="Grounded answer")

    monkeypatch.setattr(agents.Runner, "run_sync", fake_run_sync)
    answer = run_openai_agent(
        "Why am I behind?",
        Toolbox(),
        "gpt-5-mini",
        "test-key",  # type: ignore[arg-type]
    )
    assert answer == "Grounded answer"
