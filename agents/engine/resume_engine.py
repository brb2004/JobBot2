import json
import re
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader
from pydantic import BaseModel, Field

from engine.eval_engine import EvalResult
from engine.llm_client import LLMClient

# ---------------------------------------------------------------------------
# Pydantic models for resume structure
# ---------------------------------------------------------------------------


class Role(BaseModel):
    company: str
    title: str
    start_date: str
    end_date: str
    bullets: list[str]


class ResumeSections(BaseModel):
    name: str = ""
    summary: str = ""
    experience: list[Role] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    education: list[str] = Field(default_factory=list)
    other: dict[str, Any] = Field(default_factory=dict)


class ReorderResponse(BaseModel):
    # This is a flexible model to match the structure of experience
    experience: list[Role]


# ---------------------------------------------------------------------------
# ResumeEngine
# ---------------------------------------------------------------------------


class ResumeEngine:
    def __init__(self, llm: LLMClient):
        self.llm = llm
        self._prompts_dir = Path(__file__).parent.parent / "system" / "prompts"
        self._archetypes_dir = Path(__file__).parent.parent / "system" / "archetypes"
        self._templates_dir = Path(__file__).parent.parent / "system" / "templates"

    def build(self, resume_md: str, eval_result: EvalResult) -> str:
        """
        Builds a customized resume based on a job evaluation.
        Returns rendered HTML string.
        """
        # 1. Parse resume
        sections = self._parse_resume_md(resume_md)

        # 2. Inject keywords
        sections = self._inject_keywords(sections, eval_result.keywords)

        # 3. Adapt archetype
        sections = self._adapt_archetype(sections, eval_result.archetype)

        # 4. Reorder bullets
        sections = self._reorder_bullets(sections, eval_result.raw_jd)

        # 5. Detect locale
        lang, paper_format = self._detect_locale(
            eval_result.jd_language, eval_result.jd_region
        )

        # 6. Render template
        return self._render_template(sections, lang, paper_format)

    def _parse_resume_md(self, content_md: str) -> ResumeSections:
        """Basic markdown parser to extract resume sections."""
        sections = ResumeSections()

        # Simple heuristic parsing
        lines = content_md.splitlines()
        if not lines:
            return sections

        sections.name = lines[0].strip()

        current_section = None
        experience_data = []
        current_role = None

        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue

            if line.startswith("## Summary") or line.startswith("# Summary"):
                current_section = "summary"
                continue
            elif line.startswith("## Experience") or line.startswith("# Experience"):
                current_section = "experience"
                continue
            elif line.startswith("## Skills") or line.startswith("# Skills"):
                current_section = "skills"
                continue
            elif line.startswith("## Education") or line.startswith("# Education"):
                current_section = "education"
                continue

            if current_section == "summary":
                sections.summary += " " + line
            elif current_section == "skills":
                # Handle comma separated or bulleted skills
                if line.startswith("- ") or line.startswith("* "):
                    sections.skills.append(line[2:].strip())
                else:
                    for skill in line.split(","):
                        sections.skills.append(skill.strip())
            elif current_section == "education":
                sections.education.append(line)
            elif current_section == "experience":
                # Very basic role parsing: assume a line with dates/company is a new role
                if any(char.isdigit() for char in line) and (
                    "-" in line or "to" in line.lower()
                ):
                    if current_role:
                        experience_data.append(current_role)
                    # Heuristic for role line: "Company | Title | Date"
                    parts = [p.strip() for p in line.split("|")]
                    if len(parts) >= 2:
                        current_role = Role(
                            company=parts[0],
                            title=parts[1],
                            start_date="",  # Simplified
                            end_date="",  # Simplified
                            bullets=[],
                        )
                    else:
                        current_role = Role(
                            company=line,
                            title="",
                            start_date="",
                            end_date="",
                            bullets=[],
                        )
                elif line.startswith("- ") or line.startswith("* "):
                    if current_role:
                        current_role.bullets.append(line[2:].strip())

        if current_role:
            experience_data.append(current_role)

        sections.experience = experience_data
        sections.summary = sections.summary.strip()
        return sections

    def _inject_keywords(
        self, sections: ResumeSections, keywords: list[str]
    ) -> ResumeSections:
        """
        Uses LLM to naturally inject keywords into the resume.
        """
        if not keywords:
            return sections

        prompt = f"""
        You are a resume expert. Your task is to naturally inject the following keywords into the candidate's resume to improve ATS matching.
        
        Keywords to inject: {", ".join(keywords)}
        
        Resume Sections (JSON):
        {sections.model_dump_json(indent=2)}
        
        Instructions:
        1. Prioritize injecting keywords into the Summary.
        2. Then, naturally integrate them into the Experience bullet points.
        3. Finally, add them to the Skills list if appropriate.
        4. Maintain the original meaning and professional tone. Do not overstuff.
        5. Return the updated ResumeSections JSON.
        
        Return ONLY the JSON object.
        """

        updated_sections = self.llm.structured(prompt, ResumeSections)
        return updated_sections

    def _adapt_archetype(
        self, sections: ResumeSections, archetype_id: str
    ) -> ResumeSections:
        """
        Adapts the narrative framing based on the archetype config.
        """
        archetype_path = self._archetypes_dir / f"{archetype_id}.json"
        if not archetype_path.exists():
            return sections

        with open(archetype_path, "r") as f:
            config = json.load(f)

        prompt = f"""
        You are a resume expert. Adapt the candidate's resume to fit the following archetype: {config.get("id")}
        
        Archetype Config:
        - Summary Framing: {config.get("summary_framing")}
        - Prioritized Skills: {config.get("prioritized_skills")}
        - Bullet Emphasis: {config.get("bullet_emphasis")}
        - De-emphasize: {config.get("de_emphasize")}
        
        Current Resume Sections (JSON):
        {sections.model_dump_json(indent=2)}
        
        Instructions:
        1. Rewrite the Summary to align with the 'Summary Framing'.
        2. Adjust the phrasing of experience bullets to emphasize the 'Bullet Emphasis' keywords.
        3. Downplay or remove mentions of things in 'De-emphasize'.
        4. Ensure the overall tone matches the archetype.
        
        Return the updated ResumeSections JSON.
        Return ONLY the JSON object.
        """

        updated_sections = self.llm.structured(prompt, ResumeSections)
        return updated_sections

    def _reorder_bullets(self, sections: ResumeSections, raw_jd: str) -> ResumeSections:
        """
        Reorders experience bullets based on relevance to the JD.
        """
        if not sections.experience:
            return sections

        prompt_template = (self._prompts_dir / "resume_reorder_bullets.txt").read_text()

        # Create a summary of the JD for the prompt
        jd_summary = raw_jd[:2000]  # Basic truncation

        # We only send the experience part to the reorder prompt
        bullets_json = json.dumps(
            [r.model_dump() for r in sections.experience], indent=2
        )

        prompt = (
            prompt_template.format(jd_summary=jd_summary, bullets_json=bullets_json)
            + "\n\nReturn the result as a JSON object with a single key 'experience' containing the list of roles."
        )

        # The prompt expects a JSON with the same structure as bullets_json
        # We use ReorderResponse as a wrapper for the expected output
        reordered_data = self.llm.structured(prompt, ReorderResponse)

        sections.experience = reordered_data.experience
        return sections

    def _detect_locale(self, language: str, region: str) -> tuple[str, str]:
        """
        Detects locale and returns (language_code, paper_format).
        """
        # Very basic mapping
        paper_format = "letter"
        if region in ["EU", "UK", "CA", "AU"]:  # Simplified
            paper_format = "a4"

        return language, paper_format

    def _render_template(
        self, sections: ResumeSections, lang: str, paper_format: str
    ) -> str:
        """
        Renders the final HTML using Jinja2.
        """
        env = Environment(loader=FileSystemLoader(str(self._templates_dir)))
        template = env.get_template("resume.html.j2")

        return template.render(
            name=sections.name,
            summary=sections.summary,
            experience=sections.experience,
            skills=sections.skills,
            education=sections.education,
            lang=lang,
            paper_format=paper_format,
        )
