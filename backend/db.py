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

        -- Global JustJoinIT offer cache
        CREATE TABLE IF NOT EXISTS jjit_offers (
            slug TEXT PRIMARY KEY,
            guid TEXT,
            title TEXT NOT NULL,
            company_name TEXT,
            required_skills TEXT,
            nice_to_have_skills TEXT,
            experience_level TEXT,
            workplace_type TEXT,
            working_time TEXT,
            employment_types TEXT,
            category_id INTEGER,
            city TEXT,
            published_at TEXT,
            expired_at TEXT,
            body_html TEXT,
            company_url TEXT,
            company_size TEXT,
            apply_url TEXT,
            languages TEXT,
            raw_json TEXT,
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Per-user scoring results
        CREATE TABLE IF NOT EXISTS offer_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            offer_slug TEXT NOT NULL REFERENCES jjit_offers(slug),
            overall_score INTEGER NOT NULL,
            skill_match TEXT,
            experience_fit TEXT,
            suggestions TEXT,
            reasoning TEXT,
            profile_hash TEXT,
            scored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, offer_slug)
        );

        -- Key-value store for fetch state tracking
        CREATE TABLE IF NOT EXISTS fetch_state (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Migrations: add columns that may be missing from older DBs
    cursor = conn.execute("PRAGMA table_info(users)")
    user_cols = {row[1] for row in cursor.fetchall()}
    if "github_token" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN github_token TEXT")

    cursor = conn.execute("PRAGMA table_info(profiles)")
    profile_cols = {row[1] for row in cursor.fetchall()}
    if "career_suggestions" not in profile_cols:
        conn.execute("ALTER TABLE profiles ADD COLUMN career_suggestions TEXT")

    conn.commit()
    conn.close()
