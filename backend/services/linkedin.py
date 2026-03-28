import csv
import io
import zipfile


def parse_linkedin_zip(file_bytes: bytes) -> dict:
    """Parse a LinkedIn data export ZIP into structured profile data.

    Handles: Positions.csv, Education.csv, Skills.csv, Certifications.csv,
    Profile.csv, Shares.csv (posts).
    """
    profile = {
        "positions": [],
        "education": [],
        "skills": [],
        "certifications": [],
        "posts": [],
        "info": {},
    }

    with zipfile.ZipFile(io.BytesIO(file_bytes), "r") as zf:
        for name in zf.namelist():
            if not name.endswith(".csv"):
                continue

            try:
                with zf.open(name) as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8"))
                    rows = list(reader)
            except Exception:
                continue

            basename = name.split("/")[-1].lower()

            if "position" in basename:
                profile["positions"] = [
                    {
                        "company": r.get("Company Name", ""),
                        "title": r.get("Title", ""),
                        "description": r.get("Description", ""),
                        "location": r.get("Location", ""),
                        "started_on": r.get("Started On", ""),
                        "finished_on": r.get("Finished On", ""),
                    }
                    for r in rows
                ]

            elif "education" in basename:
                profile["education"] = [
                    {
                        "school": r.get("School Name", ""),
                        "degree": r.get("Degree Name", ""),
                        "field": r.get("Notes", ""),
                        "start_date": r.get("Start Date", ""),
                        "end_date": r.get("End Date", ""),
                    }
                    for r in rows
                ]

            elif "skill" in basename:
                profile["skills"] = [r.get("Name", "") for r in rows if r.get("Name")]

            elif "certification" in basename:
                profile["certifications"] = [
                    {
                        "name": r.get("Name", ""),
                        "authority": r.get("Authority", ""),
                        "started_on": r.get("Started On", ""),
                        "finished_on": r.get("Finished On", ""),
                    }
                    for r in rows
                ]

            elif "share" in basename:
                profile["posts"] = [
                    {
                        "date": r.get("Date", ""),
                        "text": r.get("ShareCommentary", ""),
                        "url": r.get("ShareLink", ""),
                        "shared_url": r.get("SharedUrl", ""),
                    }
                    for r in rows
                    if r.get("ShareCommentary")
                ]

            elif "profile" in basename:
                if rows:
                    r = rows[0]
                    profile["info"] = {
                        "first_name": r.get("First Name", ""),
                        "last_name": r.get("Last Name", ""),
                        "headline": r.get("Headline", ""),
                        "summary": r.get("Summary", ""),
                        "industry": r.get("Industry", ""),
                        "location": r.get("Geo Location", ""),
                    }

    return profile
