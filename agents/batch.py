from typing import List
import uuid

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from server.config import settings
from server.db.models import Profile, Evaluation, DedupLog
from engine.llm_client import LLMClient
from engine.eval_engine import (
    EvalEngine,
    EXTRACT_JD_PROMPT,
    SCORE_DIMENSIONS_PROMPT,
    score_to_grade,
    JDFields,
    _DimensionsResponse,
)

# Convert async URL to sync URL
sync_url = settings.database_url.replace(
    "postgresql+asyncpg://", "postgresql+psycopg2://"
)
sync_engine = create_engine(sync_url)


def run_batch(user_id: str, urls: List[str]) -> List[dict]:
    """
    Evaluate multiple job URLs in batch using the Anthropic Batch API.
    Returns a list of summaries for each evaluation.
    """
    with Session(sync_engine) as session:
        # 1. Setup: Fetch Profile and initialize engines
        profile = session.scalar(select(Profile).where(Profile.user_id == user_id))
        if not profile:
            raise ValueError(f"Profile not found for user {user_id}")

        llm = LLMClient()
        eval_engine = EvalEngine(llm, profile)
        resume_summary = eval_engine._build_resume_summary()

        # 2. Fetch all JDs locally
        # We do this first because the Batch API only handles LLM requests, not HTTP fetches.
        jd_texts = []
        valid_urls = []
        for url in urls:
            try:
                text = eval_engine._fetch_jd(url)
                jd_texts.append(text)
                valid_urls.append(url)
            except Exception as e:
                print(f"Failed to fetch {url}: {e}")

        if not jd_texts:
            return []

        # 3. Batch 1: Extract JD Fields
        extract_requests = [
            {
                "messages": [
                    {"role": "user", "content": EXTRACT_JD_PROMPT.format(jd=text)}
                ],
                "model": llm.MODEL,
                "max_tokens": 4096,
            }
            for text in jd_texts
        ]
        batch_id_extract = llm.batch_create(extract_requests)
        extract_results_raw = llm.batch_poll(batch_id_extract)

        # Process extract results
        extracted_jds = []
        for res in extract_results_raw:
            try:
                raw_text = (
                    res.content[0]
                    .text.strip()
                    .removeprefix("```json")
                    .removesuffix("```")
                    .strip()
                )
                jd_fields = JDFields.model_validate_json(raw_text)
                extracted_jds.append(jd_fields)
            except Exception as e:
                print(f"Failed to parse JD fields for a URL: {e}")
                extracted_jds.append(None)

        # 4. Batch 2: Score Dimensions
        # Only score those that were successfully extracted
        score_requests = []
        scoring_indices = []

        for i, jd_fields in enumerate(extracted_jds):
            if jd_fields:
                score_requests.append(
                    {
                        "messages": [
                            {
                                "role": "user",
                                "content": SCORE_DIMENSIONS_PROMPT.format(
                                    jd_fields_json=jd_fields.model_dump_json(indent=2),
                                    resume_summary=resume_summary,
                                ),
                            }
                        ],
                        "model": llm.MODEL,
                        "max_tokens": 4096,
                    }
                )
                scoring_indices.append(i)

        if not score_requests:
            # Handle case where no JDs were successfully extracted
            return []

        batch_id_score = llm.batch_create(score_requests)
        score_results_raw = llm.batch_poll(batch_id_score)

        # 5. Process Scoring Results and Persist
        results_summary = []

        # Map score results back to original URLs/JDs
        # Note: results from batch_poll should match order of requests
        for idx, res in zip(scoring_indices, score_results_raw):
            url = valid_urls[idx]
            jd_fields = extracted_jds[idx]

            try:
                raw_text = (
                    res.content[0]
                    .text.strip()
                    .removeprefix("```json")
                    .removesuffix("```")
                    .strip()
                )
                dims_response = _DimensionsResponse.model_validate_json(raw_text)

                # Calculate weighted score
                weights = (
                    profile.dimension_weights
                    if profile.dimension_weights
                    else {
                        "role_match": 0.15,
                        "skills_alignment": 0.15,
                        "seniority": 0.12,
                        "compensation": 0.12,
                        "interview_likelihood": 0.10,
                        "company_stage": 0.08,
                        "product_market_fit": 0.08,
                        "geographic_feasibility": 0.08,
                        "growth_trajectory": 0.07,
                        "hiring_timeline": 0.05,
                    }
                )

                dimensions = {
                    "role_match": dims_response.role_match,
                    "skills_alignment": dims_response.skills_alignment,
                    "seniority": dims_response.seniority,
                    "compensation": dims_response.compensation,
                    "interview_likelihood": dims_response.interview_likelihood,
                    "company_stage": dims_response.company_stage,
                    "product_market_fit": dims_response.product_market_fit,
                    "geographic_feasibility": dims_response.geographic_feasibility,
                    "growth_trajectory": dims_response.growth_trajectory,
                    "hiring_timeline": dims_response.hiring_timeline,
                }

                weighted_sum = sum(
                    dimensions[dim].raw * weights.get(dim, 0.0) for dim in dimensions
                )
                grade = score_to_grade(weighted_sum)

                # Gate-pass check
                is_disqualified = (
                    dims_response.role_match.raw < 2
                    or dims_response.skills_alignment.raw < 2
                )

                if not is_disqualified:
                    # Insert Evaluation
                    evaluation = Evaluation(
                        user_id=user_id,
                        url=url,
                        company=jd_fields.company,
                        role=jd_fields.title,
                        score=weighted_sum,
                        grade=grade,
                        status="new",
                        raw_eval={
                            "dimensions": {
                                k: v.model_dump() for k, v in dimensions.items()
                            },
                            "jd_fields": jd_fields.model_dump(),
                        },
                    )
                    session.add(evaluation)
                    session.flush()

                    # Insert DedupLog
                    stmt = (
                        pg_insert(DedupLog)
                        .values(user_id=user_id, url=url)
                        .on_conflict_do_nothing()
                    )
                    session.execute(stmt)

                    results_summary.append(
                        {
                            "url": url,
                            "grade": grade,
                            "score": weighted_sum,
                            "company": jd_fields.company,
                            "role": jd_fields.title,
                        }
                    )
                else:
                    results_summary.append(
                        {
                            "url": url,
                            "grade": "F",
                            "score": 1.0,
                            "company": jd_fields.company,
                            "role": jd_fields.title,
                            "disqualified": True,
                        }
                    )

            except Exception as e:
                print(f"Failed to process scoring result for {url}: {e}")

        session.commit()
        return results_summary
