"""
The "AI Security Analyst" (Part B).

Turns LinkGuard's deterministic verdict + extracted feature signals into a
plain-English explanation, and answers follow-up questions, using a hosted LLM.

Provider-agnostic -- set LINKGUARD_LLM_PROVIDER to "gemini" (default) or "claude":
  - gemini -> needs GEMINI_API_KEY (or GOOGLE_API_KEY).  pip install google-genai
  - claude -> needs ANTHROPIC_API_KEY.                   pip install anthropic
Clients are created lazily, so importing this module never requires any key and
never imports an SDK you are not using. Override the model per provider with
LINKGUARD_GEMINI_MODEL / LINKGUARD_CLAUDE_MODEL.

The model is grounded strictly in the evidence we pass it (the verdict, the ML
output, the explainable-AI signals from explanation.py, and the external
threat-intel results). It must not invent facts about the URL beyond that.
"""
import os
import json

from explanation import FEATURE_LEGEND

PROVIDER = os.getenv("LINKGUARD_LLM_PROVIDER", "gemini").lower()
GEMINI_MODEL = os.getenv("LINKGUARD_GEMINI_MODEL", "gemini-2.5-flash")
CLAUDE_MODEL = os.getenv("LINKGUARD_CLAUDE_MODEL", "claude-opus-4-8")
MAX_TOKENS = 1024


def _feature_glossary() -> str:
    return "\n".join(f"- {meta['label']}: {meta['why']}" for meta in FEATURE_LEGEND.values())


SYSTEM_PROMPT = f"""You are LinkGuard's AI Security Analyst. You help everyday, non-technical users understand whether a web link is safe, in clear and calm language.

For one URL you are given the result of an automated phishing check: the final verdict, the machine-learning model's output, a set of explainable-AI "signals" derived from the URL's structure, and results from external threat-intelligence services (Google Safe Browsing, VirusTotal, URLhaus) plus WHOIS data.

How the structural signals are derived (glossary):
{_feature_glossary()}

Rules you MUST follow:
- Ground every statement ONLY in the evidence provided. Never claim to have visited the page or to know anything not present in the evidence.
- If the evidence is thin, mixed, or contradictory, say so honestly instead of overstating risk or safety.
- Explain the "why" by referring to the specific signals (e.g. "the domain is only days old and has no valid HTTPS certificate").
- Finish with one short, concrete recommendation for the user.
- Be concise and warm. No markdown headings, no preamble like "Certainly" or "Here is". Plain prose."""

ANALYSIS_PROMPT = "\n\nIn plain English, explain to the user why this verdict was reached and what it means for them."


def _evidence_text(evidence: dict) -> str:
    return (
        "Automated check result for the URL under review:\n```json\n"
        + json.dumps(evidence, indent=2, default=str)
        + "\n```"
    )


# ------------------------------ Gemini ------------------------------
_gemini_client = None


def _gemini():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        _gemini_client = genai.Client(api_key=key) if key else genai.Client()
    return _gemini_client


def _gemini_config():
    from google.genai import types
    return types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        max_output_tokens=MAX_TOKENS,
        temperature=0.3,
    )


def _gemini_generate(evidence: dict) -> str:
    client = _gemini()
    resp = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=_evidence_text(evidence) + ANALYSIS_PROMPT,
        config=_gemini_config(),
    )
    return (resp.text or "").strip()


def _gemini_stream(context: dict, history: list):
    from google.genai import types
    client = _gemini()
    contents = [types.Content(role="user", parts=[types.Part(text=_evidence_text(context))])]
    for turn in history:
        role = "model" if turn.get("role") == "assistant" else "user"
        text = str(turn.get("content", "")).strip()
        if text:
            contents.append(types.Content(role=role, parts=[types.Part(text=text)]))
    for chunk in client.models.generate_content_stream(
        model=GEMINI_MODEL, contents=contents, config=_gemini_config()
    ):
        if chunk.text:
            yield chunk.text


# ------------------------------ Claude ------------------------------
_anthropic_client = None


def _claude():
    global _anthropic_client
    if _anthropic_client is None:
        import anthropic
        _anthropic_client = anthropic.Anthropic()
    return _anthropic_client


def _claude_system():
    return [{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}]


def _claude_generate(evidence: dict) -> str:
    client = _claude()
    msg = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=MAX_TOKENS,
        thinking={"type": "adaptive"},
        output_config={"effort": "low"},
        system=_claude_system(),
        messages=[{"role": "user", "content": _evidence_text(evidence) + ANALYSIS_PROMPT}],
    )
    return "".join(b.text for b in msg.content if b.type == "text").strip()


def _claude_stream(context: dict, history: list):
    client = _claude()
    messages = [{
        "role": "user",
        "content": [{"type": "text", "text": _evidence_text(context), "cache_control": {"type": "ephemeral"}}],
    }]
    for turn in history:
        role = "assistant" if turn.get("role") == "assistant" else "user"
        content = str(turn.get("content", "")).strip()
        if content:
            messages.append({"role": role, "content": content})
    with client.messages.stream(
        model=CLAUDE_MODEL, max_tokens=MAX_TOKENS,
        thinking={"type": "adaptive"}, output_config={"effort": "low"},
        system=_claude_system(), messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield text


# ----------------------------- dispatch -----------------------------
def generate_analysis(evidence: dict) -> str:
    """One-shot, plain-English explanation of why the verdict was reached."""
    if PROVIDER == "claude":
        return _claude_generate(evidence)
    return _gemini_generate(evidence)


def stream_analysis_chat(context: dict, history: list):
    """Yield text deltas for an interactive follow-up chat grounded in `context`."""
    if PROVIDER == "claude":
        yield from _claude_stream(context, history)
    else:
        yield from _gemini_stream(context, history)
