from database import get_connection


def main():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT current_database(), version();")
            result = cur.fetchone()

            print("Database:", result[0])
            print("PostgreSQL:", result[1])


if __name__ == "__main__":
    main()