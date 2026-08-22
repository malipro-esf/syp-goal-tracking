import json
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from time import monotonic
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from syp.activities.models import EnrollmentActivity
from syp.ai_coach.models import AgentToolCall
from syp.identity.models import User
from syp.plans.models import PlanEnrollment
from syp.progress.models import ProgressEntry
from syp.progress.reporting import build_progress_report


@dataclass
class CoachToolbox:
    session: Session
    user: User
    plan: PlanEnrollment
    run_id: uuid.UUID

    def _call(self, name: str, operation: object) -> str:
        started = monotonic()
        status = "completed"
        try:
            result = operation()
            return json.dumps(result, default=str)
        except Exception:
            status = "failed"
            raise
        finally:
            self.session.add(
                AgentToolCall(
                    agent_run_id=self.run_id,
                    tool_name=name,
                    status=status,
                    latency_ms=round((monotonic() - started) * 1000),
                )
            )
            self.session.commit()

    def plan_overview(self) -> str:
        def query() -> dict[str, object]:
            activities = self.session.scalars(
                select(EnrollmentActivity)
                .where(EnrollmentActivity.enrollment_id == self.plan.id)
                .order_by(EnrollmentActivity.display_order)
            ).all()
            return {
                "plan_id": str(self.plan.id),
                "title": self.plan.title,
                "description": self.plan.description,
                "status": self.plan.status,
                "start_date": self.plan.start_date,
                "end_date": self.plan.end_date,
                "activities": [
                    {
                        "id": str(item.id),
                        "name": item.name,
                        "unit": item.custom_unit_label or item.unit_code,
                    }
                    for item in activities
                ],
            }

        return self._call("get_plan_overview", query)

    def progress(self, start_date: date, end_date: date) -> str:
        def query() -> dict[str, object]:
            return self._report_payload(start_date, end_date)

        return self._call("get_plan_progress", query)

    def recent_records(self, days: int) -> str:
        limited_days = min(max(days, 1), 30)

        def query() -> list[dict[str, object]]:
            local_today = datetime.now(ZoneInfo(self.user.timezone)).date()
            since = local_today - timedelta(days=limited_days - 1)
            rows = self.session.execute(
                select(ProgressEntry, EnrollmentActivity.name)
                .join(EnrollmentActivity, EnrollmentActivity.id == ProgressEntry.activity_id)
                .where(
                    EnrollmentActivity.enrollment_id == self.plan.id,
                    ProgressEntry.participant_user_id == self.plan.participant_user_id,
                    ProgressEntry.performed_on >= since,
                    ProgressEntry.deleted_at.is_(None),
                )
                .order_by(ProgressEntry.performed_on.desc())
                .limit(100)
            ).all()
            return [
                {
                    "activity": name,
                    "quantity": entry.quantity,
                    "performed_on": entry.performed_on,
                    "note": entry.note,
                }
                for entry, name in rows
            ]

        return self._call("get_recent_progress_entries", query)

    def weekly_summary(self, week_start: date) -> str:
        return self._call(
            "get_weekly_summary",
            lambda: self._report_payload(week_start, week_start + timedelta(days=6)),
        )

    def weak_areas(self, start_date: date, end_date: date) -> str:
        def query() -> list[dict[str, object]]:
            report = build_progress_report(
                self.session, self.user, self.plan.id, start_date, end_date
            )
            ordered = sorted(report.activities, key=lambda item: item.adherence_percent)
            return [
                {
                    "activity": item.name,
                    "expected": item.expected,
                    "actual": item.actual,
                    "adherence_percent": item.adherence_percent,
                    "missed_occurrences": item.missed_occurrences,
                }
                for item in ordered[:5]
            ]

        return self._call("get_weak_areas", query)

    def _report_payload(self, start_date: date, end_date: date) -> dict[str, object]:
        report = build_progress_report(self.session, self.user, self.plan.id, start_date, end_date)
        return {
            "start_date": report.start_date,
            "end_date": report.end_date,
            "overall_adherence_percent": report.overall_adherence_percent,
            "activities": [item.__dict__ for item in report.activities],
        }
