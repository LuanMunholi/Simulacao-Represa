from datetime import datetime, timedelta

BASE_DATE = datetime(2026, 1, 1, 0, 0)

MONTH_NAMES_PT = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]


def to_datetime(simulated_hours: int) -> datetime:
    return BASE_DATE + timedelta(hours=simulated_hours)


def format_display(simulated_hours: int) -> str:
    """Format used on the monitoring clock — 'Dia D, Mês M de AAAA, às HH:MM'."""
    dt = to_datetime(simulated_hours)
    return f"Dia {dt.day}, Mês {dt.month} de {dt.year}, às {dt.hour:02d}:{dt.minute:02d}"


def format_alert(simulated_hours: int) -> str:
    """Format used in alert messages — 'DD de [Mês] de AAAA, às HH:MM'."""
    dt = to_datetime(simulated_hours)
    return f"{dt.day} de {MONTH_NAMES_PT[dt.month - 1]} de {dt.year}, às {dt.hour:02d}:{dt.minute:02d}"
