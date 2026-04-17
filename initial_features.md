The Career-Ops framework is a modular, multi-agent system designed for high-signal job searching. Below is the combined list of features, categorized by their role in the job search lifecycle.
1. Operational "Skill Modes" (14 Agents)

The system uses specialized agents (modes) to handle specific tasks through a command-line interface:

    auto-pipeline: The primary mode that extracts a job description, scores it, generates a tailored PDF, and logs it in the tracker.

    scan: A background agent that monitors 45+ company career portals (Greenhouse, Ashby, Lever) for new listings with automatic deduplication.

    batch: A high-volume orchestrator that uses parallel workers to evaluate up to 122 URLs simultaneously.

    apply: Uses browser automation (Playwright) to pre-fill job application forms using your profile and previous evaluation data.

    pdf: A dedicated engine for rendering ATS-optimized resumes that are customized per listing.

    tracker: A Terminal UI (TUI) dashboard for browsing, filtering, and managing your application pipeline.

    oferta / ofertas: Modes for performing standalone evaluations of a single job or comparative analysis between multiple offers.

    pipeline: Manages a queue of job URLs from a text-based inbox (data/pipeline.md).

    contacto: Maps networks at target companies and drafts personalized outreach or LinkedIn messages.

    deep: Conducts comprehensive research on company culture, financials, and news.

    training: Analyzes skill gaps and suggests certifications based on your target "North Star" roles.

    interview-prep: Generates process-specific intel (rounds, difficulty) and STAR+R stories tailored to the role.

    negotiation: Develops compensation strategies, salary anchoring scripts, and competing-offer leverage frameworks.

    patterns: Analyzes rejection data to identify strategy pivots or "kill" non-viable targeting hypotheses.

2. The 10-Dimension Evaluation Framework

Every job is evaluated across 10 weighted dimensions to assign an A-F grade and a 1-5 numeric score:

    Gate-Pass Filters: Role Match (structural alignment) and Skills Alignment (tech stack overlap).

    Priority Metrics: Seniority (responsibility level), Compensation (market rate vs. target), and Interview Likelihood (callback probability).

    Cultural & Structural Fit: Company Stage (Startup/Enterprise), Product-Market Fit, and Geographic feasibility (Remote/Hybrid/Timezones).

    Secondary Metrics: Growth Trajectory (ladder visibility) and Hiring Timeline (urgency).

3. Dynamic Resume & Content Personalization

The system functions as a "just-in-time" resume builder rather than a static template:

    Keyword Injection: Automatically extracts 15-20 keywords from the job description and injects them into the summary, professional experience, and skills sections.

    Archetype Adaptation: Detects the role's "archetype" (e.g., AI Platform Engineer vs. Technical PM) and shifts the narrative framing and project selection to match.

    Relevance Reordering: Programmatically reorders your experience bullet points to front-load the most relevant achievements for the specific listing.

    Localization: Automatically detects JD language and region to adjust the PDF language and paper format (US Letter vs. Europe A4).

4. System Infrastructure & Data Integrity

    Onboarding Wizard: A 5-minute setup that builds your cv.md and profile.yml from LinkedIn URLs or existing text.

    Auto-Deduplication: Maintains a history of ~680+ URLs to ensure you never re-evaluate the same job twice.

    Bifurcated Data Contract: A strict split between the User Layer (personal data like CVs and trackers) and the System Layer (core logic) so updates never overwrite your files.

    Integrity Checks: Automated health scripts (verify-pipeline.mjs, doctor.mjs) that normalize statuses and validate the structural integrity of the tracker.

    "STAR+R" Story Bank: An accumulating repository of interview stories that includes a "Reflection" column to signal seniority and maturity.