from enum import StrEnum


class UnitCode(StrEnum):
    MINUTE = "minute"
    HOUR = "hour"
    PAGE = "page"
    REPETITION = "repetition"
    NUMBER = "number"
    METER = "meter"
    KILOMETER = "kilometer"
    CUSTOM = "custom"


class MeasurementDimension(StrEnum):
    DURATION = "duration"
    COUNT = "count"
    DISTANCE = "distance"
    CUSTOM = "custom"


UNIT_DIMENSIONS: dict[UnitCode, MeasurementDimension] = {
    UnitCode.MINUTE: MeasurementDimension.DURATION,
    UnitCode.HOUR: MeasurementDimension.DURATION,
    UnitCode.PAGE: MeasurementDimension.COUNT,
    UnitCode.REPETITION: MeasurementDimension.COUNT,
    UnitCode.NUMBER: MeasurementDimension.COUNT,
    UnitCode.METER: MeasurementDimension.DISTANCE,
    UnitCode.KILOMETER: MeasurementDimension.DISTANCE,
    UnitCode.CUSTOM: MeasurementDimension.CUSTOM,
}


class ScheduleType(StrEnum):
    DAILY = "daily"
    WEEKLY = "weekly"
    SELECTED_DAYS = "selected_days"
