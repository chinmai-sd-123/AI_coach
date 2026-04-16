from datetime import date, timedelta


def calculate_streak(logs):
    # sort logs by date
    sorted_logs = sorted(logs, key=lambda x: x.date, reverse=True)
    streak = 0

    today = date.today()
    for i, log in enumerate(sorted_logs):
        expected_date = today - timedelta(days=i)

        #check if log date matches expected date and status is done
        if log.date == expected_date and log.status:
            streak += 1
        else:
            break
    return streak
