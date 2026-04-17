import asyncio
from engine.llm_client import LLMClient
from engine.resume_engine import ResumeEngine
from engine.eval_engine import EvalResult, DimensionScore


async def test_resume_engine():
    llm = LLMClient()
    engine = ResumeEngine(llm)

    resume_md = """
    # John Doe
    
    ## Summary
    Experienced software engineer with a focus on backend systems.
    
    ## Experience
    Company A | Senior Backend Engineer | 2020 - 2023
    - Built a high-performance API using Python.
    - Optimized database queries for better latency.
    - Led a team of 3 engineers.
    
    Company B | Software Engineer | 2017 - 2020
    - Developed features for a web application.
    - Fixed critical bugs in the production system.
    
    ## Skills
    Python, Go, SQL, AWS
    
    ## Education
    BS in Computer Science, State University
    """

    eval_result = EvalResult(
        disqualified=False,
        disqualification_reason=None,
        score=4.2,
        grade="A",
        dimensions={},  # Simplified
        company="AI Tech",
        role="AI Platform Engineer",
        keywords=["Kubernetes", "LLMs", "PyTorch", "Distributed Systems"],
        archetype="ai-platform-engineer",
        raw_jd="Looking for an AI Platform Engineer experienced with Kubernetes and PyTorch to build distributed systems for LLMs.",
        jd_language="en",
        jd_region="US",
    )

    try:
        html = engine.build(resume_md, eval_result)
        print("Build successful!")
        print("HTML length:", len(html))
        # Print a snippet to verify it's HTML
        print("Snippet:", html[:100])
    except Exception as e:
        print("Build failed:", e)
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_resume_engine())
