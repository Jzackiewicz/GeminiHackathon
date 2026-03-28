import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "interview_ai.db"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            github_id INTEGER UNIQUE,
            github_token TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
            github_username TEXT,
            linkedin_data TEXT,
            technologies TEXT,
            summary TEXT,
            experience_level TEXT,
            primary_role TEXT,
            strengths TEXT,
            interests TEXT,
            notable_projects TEXT,
            github_raw TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS job_offers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            title TEXT NOT NULL,
            company TEXT,
            url TEXT,
            description TEXT,
            requirements TEXT,
            company_insight TEXT,
            selected BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS interviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            mode TEXT NOT NULL DEFAULT 'interview',
            job_title TEXT,
            company TEXT,
            requirements TEXT,
            transcript TEXT,
            review TEXT,
            score INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Migrations: add columns that may be missing from older DBs
    cursor = conn.execute("PRAGMA table_info(users)")
    existing = {row[1] for row in cursor.fetchall()}
    if "github_token" not in existing:
        conn.execute("ALTER TABLE users ADD COLUMN github_token TEXT")

    cursor = conn.execute("PRAGMA table_info(job_offers)")
    existing = {row[1] for row in cursor.fetchall()}
    if "company_insight" not in existing:
        conn.execute("ALTER TABLE job_offers ADD COLUMN company_insight TEXT")

    conn.commit()
    conn.close()
