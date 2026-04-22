import argparse
from collections import defaultdict

from app.database import SessionLocal
from app.models import HabitLog


def find_duplicate_groups(logs):
    grouped_logs = defaultdict(list)

    for log in logs:
        grouped_logs[(log.habit_id, log.date)].append(log)

    duplicates = {}
    for key, grouped in grouped_logs.items():
        if len(grouped) > 1:
            duplicates[key] = sorted(grouped, key=lambda item: item.id)

    return duplicates


def main():
    parser = argparse.ArgumentParser(
        description="Remove duplicate habit log rows while keeping the latest row per habit/date."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually delete duplicate rows. Without this flag, the script only shows a dry run.",
    )
    args = parser.parse_args()

    db = SessionLocal()

    try:
        logs = db.query(HabitLog).order_by(HabitLog.habit_id, HabitLog.date, HabitLog.id).all()
        duplicate_groups = find_duplicate_groups(logs)

        if not duplicate_groups:
            print("No duplicate habit logs found.")
            return

        total_rows_to_delete = 0
        print("Duplicate habit log groups found:\n")

        for (habit_id, log_date), grouped_logs in duplicate_groups.items():
            kept_log = grouped_logs[-1]
            deleted_logs = grouped_logs[:-1]
            total_rows_to_delete += len(deleted_logs)

            deleted_ids = ", ".join(str(log.id) for log in deleted_logs)
            print(
                f"habit_id={habit_id} date={log_date} keep_id={kept_log.id} "
                f"delete_ids=[{deleted_ids}]"
            )

            if args.apply:
                for log in deleted_logs:
                    db.delete(log)

        print(f"\nDuplicate groups: {len(duplicate_groups)}")
        print(f"Rows to delete: {total_rows_to_delete}")

        if args.apply:
            db.commit()
            print("Cleanup applied successfully.")
        else:
            print("Dry run only. Re-run with --apply to delete duplicates.")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
