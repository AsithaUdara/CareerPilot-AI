"""IT-focused role and seniority constants shared across API, agents, and seed data."""

from __future__ import annotations

IT_TARGET_ROLES: tuple[str, ...] = (
    "Backend Developer",
    "Frontend Developer",
    "Full Stack Developer",
    "DevOps / Platform Engineer",
    "Data Engineer",
    "Cloud Engineer",
    "QA / Test Automation Engineer",
    "Mobile Developer",
)

SENIORITY_LEVELS: tuple[str, ...] = ("Intern", "Junior", "Mid")

# Maps UI / analyze target_role → knowledge_seed role_key
ROLE_KEY_ALIASES: dict[str, str] = {
    "backend developer": "backend developer",
    "frontend developer": "frontend developer",
    "full stack developer": "full stack developer",
    "devops / platform engineer": "devops engineer",
    "devops engineer": "devops engineer",
    "data engineer": "data engineer",
    "cloud engineer": "cloud engineer",
    "qa / test automation engineer": "qa automation engineer",
    "qa automation engineer": "qa automation engineer",
    "mobile developer": "mobile developer",
}


def normalize_role_key(target_role: str) -> str:
    key = target_role.strip().lower()
    return ROLE_KEY_ALIASES.get(key, key)


def normalize_seniority(seniority: str) -> str:
    cleaned = seniority.strip().lower()
    if cleaned in {"intern", "junior", "mid"}:
        return cleaned
    return "junior"
