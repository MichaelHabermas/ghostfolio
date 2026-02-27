# Engineering Reliability: The Five-Stage Framework for LLM Evaluations (Evals)

## 1. Core Topic and Purpose

The primary topic of this session is **LLM Evaluations (Evals)**. The speaker, Baron, posits that while building an AI application is relatively simple, maintaining it at scale in production is exceptionally difficult.

**Main Thesis:** Evals are the "unit tests" and "integration tests" of the AI world. They are the only way to move from "flying blind" and "hoping the LLM gods" cooperate to having a measurable, regression-tested strategy for production-grade AI.

**Speaker’s Goal:** To provide a concrete framework for determining what level of evaluation a project needs and to guide developers through the first two critical stages of building an evaluation suite.

---

## 2. The Five Stages of Building Evals

The speaker outlines a maturity model for evaluations, moving from low-cost/immediate value to high-cost/strategic value.

### Stage 1: The Golden Set (The Baseline)

* **Definition:** A set of deterministic "smoke tests" that define what "correct" looks like.
* **Key Characteristic:** **Binary (Pass/Fail).** It is either there or it isn’t.
* **No "LLM as a Judge":** Grading should be done via code (deterministic), not by another LLM, to ensure speed and low cost.
* **Types of Checks:**
* **Tool Selection:** Did it call the correct function?
* **Source Citation:** Did it pull from the expected markdown or data source?
* **Content Validation:** Does the answer contain specific required phrases?
* **Negative Validation:** Does the answer avoid "I don't know" or banned content?

### Stage 2: Labeled Scenarios

* **Definition:** Categorized use cases that address "edge cases" or complex scenarios.
* **Key Characteristic:** **Aggregate Scoring.** Unlike Golden Sets (which must pass 100%), Labeled Scenarios are used to find an aggregate success rate (e.g., 80% passing is often acceptable).
* **Complexity:** Includes multi-tool calls and varying difficulty levels (Straightforward, Ambiguous, Edge Case).

### Stage 3: Replay Harness

* **Definition:** Capturing actual production interactions and "replaying" them to test code changes or grade outputs.
* **Purpose:** Allows humans to score production data and use those scores to refine prompts.

### Stage 4: Rubrics

* **Definition:** Using qualitative scales (e.g., 1–5 or A–F) to grade LLM performance.
* **⚠️ Warning:** The speaker considers rubrics **dangerous**. They are often too vague and subjective, leading to inconsistent results between humans and LLMs.

### Stage 5: Experiments

* **Definition:** High-value, high-cost testing used for strategic decisions.
* **Use Case:** Comparing different models (e.g., GPT-4o vs. GPT-5) to see how they impact pass rates, latency, and cost.

---

## 3. Actionable Items & Recommendations

### ✅ The "Must-Dos"

* **The Big Three:** Every successful AI project needs **Context, an Expert, and Evals**.
* **Run on Every Commit:** Golden Sets must be fast enough to run as a pre-commit hook to prevent "putting a hole in the boat".
* **Start Small:** Focus on 10–20 thoughtful cases rather than trying to be exhaustive.
* **Batching Calls:** Use the OpenAI SDK (or similar) to run evaluations in batch to save time.
* **Export Evals:** Keep eval cases in your codebase (e.g., YAML files) rather than locking them inside a third-party observability platform.

### ❌ The "Don'ts"

* **Don't Test the Language:** Do not write evals to see if an LLM "is doing LLM things." Test *your* code and *your* prompt logic, not the underlying model's basic capabilities.
* **Don't Use Scales:** Avoid 1–5 rating scales if a binary "Did it work?" check is possible.
* **Don't Fly Blind:** Moving to production without an eval suite means you are "just guessing".

---

## 4. Decisions, Judgments & Insights

### Deterministic Grading in a Non-Deterministic World

The most profound insight shared is that while LLM outputs are non-deterministic, **the tests themselves should be deterministic**. Sending an LLM output back to an LLM to ask "Did this work?" is often too slow, too expensive, and unnecessary if you know what tool names or keywords you are looking for.

### The Problem with "Human Evals"

The speaker notes that without automated evals, the "Expert" on the team becomes the eval. This is unsustainable and non-scalable because that human is forced to rigorously test the same things over and over.

### Observability Platform Verdict: Brain Trust vs. Langfuse

The speaker provides a specific professional judgment on tools:

* **Brain Trust:** Recommended for its superior scaling and "bonded" eval/trace workflow.
* **Langfuse:** Criticized for significant latency issues (up to 20-minute lag for data to appear) and scaling difficulties when using Open Source/Clickhouse backends.

---

## 5. Strategic & High-Leverage Takeaways

### Asymmetric Advantage: Regression Testing for AI

In traditional software, regression testing is standard. In AI, it is a competitive advantage. Having a "Golden Set" allows a team to swap models or update prompts with total confidence that they haven't broken the core "happy path".

### Strategic UX: Expensive Task Buffers

A strategic UI/UX insight: If an LLM task is "expensive" (in cost or time), design the UI to stop and ask the user clarifying questions before generating the artifact. This prevents the LLM from "failing" due to ambiguity and saves money.

---

## 6. Risks, Pitfalls & Common Mistakes

* **Ambiguity in Queries:** If the evaluation query is too vague, the LLM makes assumptions, making the output useless for grading.
* **"Cheating" on Tests:** Changing the test requirements just to make a failing prompt pass is a common but dangerous pitfall.
* **Complexity Overload:** Trying to jump straight to Rubrics or Experiments without a solid Golden Set baseline.

---

## 7. Executive Summary

The single biggest "value bomb" in this session is the **decoupling of LLM generation from evaluation grading**. Baron argues that the industry’s reliance on "LLM as a judge" for basic reliability is a mistake that leads to slow, expensive, and flaky systems.

Instead, the path to production-grade AI lies in treating LLM outputs like any other software output: **grade them with deterministic, binary code checks whenever possible.** By establishing a "Golden Set" of 10–20 binary tests that run on every commit, teams can ensure their "happy path" remains intact even as they iterate on complex prompts.

This framework moves AI development away from "vibes-based" engineering and into a disciplined, measurable practice. For professionals, this means the difference between a project that fails at the first sign of a model update and one that scales reliably across thousands of varied user interactions.

Would you like me to create a template for a **Golden Set YAML file** or a list of **deterministic check functions** based on this framework?

🏗️ The Golden Set: YAML TemplateBaron emphasizes that this should be static and checked into your codebase. This format allows you to define exactly what the "Happy Path" looks like.YAML# golden_evals.yaml
eval_suite: "MVP_Core_Functionality"
cases:

* id: "circle_001"
    query: "Draw a red circle on the board"
    checks:
      tool_selection:
        expected_tool: "draw_shape"
        expected_params:
          shape: "circle"
          color: "red"
      must_contain: ["circle", "drawn"]
      must_not_contain: ["I don't know", "error", "unable"]

* id: "policy_search_001"
    query: "What is the remote work policy?"
    checks:
      expected_sources: ["markdown_docs/hr_policies.md"]
      must_contain: ["remote", "core hours", "9 AM"]
      negative_check: "no information" # Ensure it doesn't hallucinate a lack of data
🛠️ Deterministic Check Functions (Python)These functions avoid "LLM-as-a-judge." They are fast, free to run, and provide the binary (pass/fail) results Baron recommends for Stage 1.1. The Tool Call ValidatorThis ensures the LLM actually triggered the right logic with the right arguments.Pythondef check_tool_selection(response_object, expected_tool, expected_params=None):
    """
    Verifies the LLM selected the correct tool and parameters.
    """
    actual_tool = response_object.get("tool_name")
    actual_params = response_object.get("parameters", {})

    if actual_tool != expected_tool:
        return False, f"Expected tool {expected_tool}, got {actual_tool}"

    if expected_params:
        for key, value in expected_params.items():
            if actual_params.get(key) != value:
                return False, f"Param mismatch: {key}. Expected {value}, got {actual_params.get(key)}"

    return True, "Tool selection passed"

2. The Content Validator (Binary Substring Check)Simple but effective for ensuring core information is present without paying for reasoning.Pythondef check_content_phrases(output_text, must_contain_list, must_not_contain_list):
    """
    Performs a binary search for required and forbidden phrases.
    """

   ## Check for required phrases

    for phrase in must_contain_list:
        if phrase.lower() not in output_text.lower():
            return False, f"Missing required phrase: {phrase}"

   ## Check for forbidden phrases

    for phrase in must_not_contain_list:
        if phrase.lower() in output_text.lower():
            return False, f"Contains forbidden phrase: {phrase}"

    return True, "Content validation passed"
⚡ Strategic Implementation ChecklistStepActionBenefit1Create 10-20 CasesFollows the "Start Small" rule to avoid over-engineering.2Map to System PromptsEnsure "Must Not Contain" items (like "I don't know") are handled in the system prompt first.3Set up Git HookUse a pre-commit hook to run these scripts locally so no "holes in the boat" reach the repo.4Log to TraceEven if the test fails, ensure the trace is sent to a dashboard (like Brain Trust) for debugging.⚠️ A Note on Difficulty (Stage 2)When you move to Labeled Scenarios, add a difficulty and category key to your YAML. This allows you to generate the aggregate tables Baron showed, where you might accept a $20\%$ failure rate on "Edge Cases" but $0\%$ on "Straightforward" ones.Expert Tip: If your Golden Set takes more than 5 seconds to run, you are probably passing too many tokens. Keep the queries brief and focused on specific function-calling or retrieval tasks.Would you like me to help you draft the 5 specific eval cases for your current MVP project? Just tell me what your agent is supposed to do!
