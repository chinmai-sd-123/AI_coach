from datetime import date, timedelta


def calculate_streak(logs):
    latest_logs_by_date = {}
    today = date.today()
    yesterday = today - timedelta(days=1)

    for log in sorted(logs, key=lambda x: (x.date, getattr(x, "id", 0)), reverse=True):
        if log.date > today:
            continue

        if log.date not in latest_logs_by_date:
            latest_logs_by_date[log.date] = log.status

    if latest_logs_by_date.get(today) is True:
        current_date = today
    elif latest_logs_by_date.get(yesterday) is True:
        current_date = yesterday
    else:
        return 0

    streak = 0
    while latest_logs_by_date.get(current_date) is True:
        streak += 1
        current_date -= timedelta(days=1)

    return streak
