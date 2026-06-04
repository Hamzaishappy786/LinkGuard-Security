"""
Explainable-AI (XAI) layer for LinkGuard.

The ML model is a StackingClassifier, which exposes no per-feature
`feature_importances_`, so we explain a verdict in a model-agnostic way:

  1. A human-readable LEGEND maps each *genuinely computed* URL feature
     (from url_features.compute_dataset_like_features) and its value to a
     plain-English signal with a severity.
  2. An optional global importance map (models/feature_importance.pkl, produced
     offline by compute_importance.py via sklearn permutation importance) is used
     only to RANK the signals. If that file is absent, the legend's default
     weights are used instead -- so this module works with zero setup.

Hard-coded / placeholder features in the extractor (Favicon, Iframe, Request_URL,
SFH, web_traffic, Page_Rank, Google_Index, ...) are deliberately NOT listed here:
they are constants, not real evidence about the URL, so the explanation never
cites them.
"""
import os
import re
import joblib
from urllib.parse import urlparse

# Severity ordering used for sorting (higher = surfaced first).
_SEV_RANK = {"high": 3, "medium": 2, "safe": 0}

# feature -> {label, why, weight (default importance), group (optional, for de-dup),
#             states: {feature_value: (severity, human phrase)}}
FEATURE_LEGEND = {
    "having_IPhaving_IP_Address": {
        "label": "IP address in URL",
        "why": "Legitimate sites use a domain name; a raw IP address is a common phishing tell.",
        "weight": 0.90,
        "states": {
            -1: ("high", "Uses a raw IP address instead of a domain name"),
            1:  ("safe", "Uses a proper domain name (not a raw IP)"),
        },
    },
    "URLURL_Length": {
        "label": "URL length",
        "why": "Very long URLs are often used to hide the real destination or stuff in fake keywords.",
        "weight": 0.40,
        "states": {
            -1: ("medium", "Unusually long URL"),
            0:  ("medium", "Moderately long URL"),
            1:  ("safe", "Normal URL length"),
        },
    },
    "Shortining_Service": {
        "label": "URL shortener",
        "why": "Shorteners hide the true destination behind a redirect.",
        "weight": 0.70,
        "states": {
            -1: ("high", "Uses a URL-shortening service that hides the real destination"),
            1:  ("safe", "Does not use a URL shortener"),
        },
    },
    "having_At_Symbol": {
        "label": "'@' symbol",
        "why": "Everything before an '@' in a URL is ignored by the browser -- a classic redirect trick.",
        "weight": 0.60,
        "states": {
            -1: ("high", "Contains an '@' symbol that can mask the real destination"),
            1:  ("safe", "No '@' trick in the URL"),
        },
    },
    "double_slash_redirecting": {
        "label": "'//' redirect",
        "why": "A '//' appearing late in the path can bounce you to another site.",
        "weight": 0.40,
        "states": {
            -1: ("medium", "Has a '//' redirect late in the path"),
            1:  ("safe", "No suspicious '//' redirect"),
        },
    },
    "Prefix_Suffix": {
        "label": "Hyphen in domain",
        "why": "Hyphenated domains (e.g. 'pay-pal-secure.com') are frequently used to imitate brands.",
        "weight": 0.40,
        "states": {
            -1: ("medium", "Hyphen ('-') in the domain name, often used to imitate brands"),
            1:  ("safe", "No hyphen in the domain name"),
        },
    },
    "having_Sub_Domain": {
        "label": "Sub-domains",
        "why": "Stacked sub-domains (login.secure.account.example.co) are used to look official.",
        "weight": 0.40,
        "states": {
            -1: ("medium", "Many sub-domains -- a tactic used to look official"),
            0:  ("safe", "Standard sub-domain (e.g. www)"),
            1:  ("safe", "Simple domain with no excess sub-domains"),
        },
    },
    "SSLfinal_State": {
        "label": "HTTPS certificate",
        "why": "A valid HTTPS certificate that matches the domain is a strong trust signal.",
        "weight": 0.95,
        "states": {
            -1: ("high", "Invalid, expired, mismatched, or missing HTTPS certificate"),
            0:  ("medium", "Certificate issued by a free CA -- not fully trusted"),
            1:  ("safe", "Valid HTTPS certificate that matches the domain"),
        },
    },
    "Domain_registeration_length": {
        "label": "Registration length",
        "why": "Phishing domains are usually registered for the minimum time; legit ones renew years ahead.",
        "weight": 0.50,
        "states": {
            -1: ("medium", "Domain registered for a short period (or registration date unknown)"),
            1:  ("safe", "Domain registered well into the future"),
        },
    },
    "port": {
        "label": "Network port",
        "why": "Real websites serve over the standard ports (80/443); odd ports are suspicious.",
        "weight": 0.40,
        "states": {
            -1: ("medium", "Uses a non-standard network port"),
            1:  ("safe", "Uses standard web ports"),
        },
    },
    "HTTPS_token": {
        "label": "'https' in host name",
        "why": "Putting 'https' inside the host name (https-paypal.com) is a trick to look secure.",
        "weight": 0.50,
        "states": {
            -1: ("medium", "The word 'https' appears inside the host name -- a spoofing trick"),
            1:  ("safe", "No 'https' token misused in the host name"),
        },
    },
    "Abnormal_URL": {
        "label": "Abnormal URL",
        "why": "If the host cannot be found in DNS, the URL is abnormal and likely throw-away.",
        "weight": 0.60,
        "group": "dns",
        "states": {
            -1: ("high", "URL looks abnormal -- the host could not be found in DNS"),
            1:  ("safe", "Host resolves normally"),
        },
    },
    "Redirect": {
        "label": "Redirects",
        "why": "Redirecting to a different or suspicious domain is common phishing behaviour.",
        "weight": 0.50,
        "states": {
            -1: ("medium", "Redirects to a different or suspicious domain"),
            1:  ("safe", "No suspicious redirects"),
        },
    },
    "age_of_domain": {
        "label": "Domain age",
        "why": "Most phishing domains are only days old; established domains are far safer.",
        "weight": 0.80,
        "states": {
            -1: ("medium", "Domain age could not be verified (WHOIS lookup failed or the domain is very new)"),
            0:  ("medium", "Domain is relatively new (1-6 months old)"),
            1:  ("safe", "Domain is well-established (6+ months old)"),
        },
    },
    "DNSRecord": {
        "label": "DNS record",
        "why": "A missing DNS record means the domain is not properly registered.",
        "weight": 0.60,
        "group": "dns",
        "states": {
            -1: ("high", "No DNS record found for this domain"),
            1:  ("safe", "Domain has a valid DNS record"),
        },
    },
    "Statistical_report": {
        "label": "Known phishing patterns",
        "why": "Flags IPs / top-level domains that match known phishing statistics.",
        "weight": 0.50,
        "states": {
            -1: ("medium", "Matches known phishing patterns (suspicious IP or top-level domain)"),
            1:  ("safe", "No match against known phishing statistics"),
        },
    },
}

# Load the optional global-importance map once at import time.
_IMPORTANCE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "feature_importance.pkl")
try:
    _IMPORTANCE = joblib.load(_IMPORTANCE_PATH) if os.path.exists(_IMPORTANCE_PATH) else {}
except Exception:
    _IMPORTANCE = {}


def _weight(feature):
    """Data-driven global importance if available, else the legend's default weight."""
    imp = _IMPORTANCE.get(feature)
    if imp is not None:
        try:
            return float(abs(imp))
        except (TypeError, ValueError):
            pass
    return float(FEATURE_LEGEND[feature].get("weight", 0.30))


def build_explanation(row: dict, extra_signals=None) -> dict:
    """
    Turn a feature row ({feature_name: value}) into human-readable signals.

    Returns:
        {
          "top_signals":  [ {feature, label, phrase, why, value, severity, weight}, ... ],
          "safe_signals": [ ... ],
          "summary": str,
          "counts": {"high": int, "medium": int, "safe": int},
        }
    """
    risk, safe, seen_groups = [], [], {}

    for feature, meta in FEATURE_LEGEND.items():
        if feature not in row:
            continue
        state = meta["states"].get(row[feature])
        if state is None:
            continue  # value carries no clear signal -> don't invent one
        severity, phrase = state
        signal = {
            "feature": feature,
            "label": meta["label"],
            "phrase": phrase,
            "why": meta["why"],
            "value": row[feature],
            "severity": severity,
            "weight": round(_weight(feature), 4),
        }
        if severity == "safe":
            safe.append(signal)
            continue

        # De-duplicate signals that probe the same thing (e.g. DNS) -- keep the heaviest.
        group = meta.get("group")
        if group:
            prev = seen_groups.get(group)
            if prev is not None:
                if signal["weight"] <= prev["weight"]:
                    continue
                risk.remove(prev)
            seen_groups[group] = signal
        risk.append(signal)

    # Merge externally-computed signals (homograph / typosquat / brand impersonation).
    for sig in (extra_signals or []):
        (safe if sig.get("severity") == "safe" else risk).append(sig)

    risk.sort(key=lambda s: (_SEV_RANK[s["severity"]], s["weight"]), reverse=True)
    safe.sort(key=lambda s: s["weight"], reverse=True)

    n_high = sum(1 for s in risk if s["severity"] == "high")
    n_med = sum(1 for s in risk if s["severity"] == "medium")
    if not risk:
        summary = "No structural risk indicators were detected in this URL."
    else:
        parts = []
        if n_high:
            parts.append(f"{n_high} high-risk")
        if n_med:
            parts.append(f"{n_med} medium-risk")
        total = n_high + n_med
        summary = f"Detected {' and '.join(parts)} indicator{'s' if total != 1 else ''} in the URL's structure."

    return {
        "top_signals": risk[:6],
        "safe_signals": safe[:4],
        "summary": summary,
        "counts": {"high": n_high, "medium": n_med, "safe": len(safe)},
    }


# ---------------------------------------------------------------------------
# Brand-safety signals: homograph (IDN look-alike) + typosquatting / impersonation.
# These are computed from the raw URL (not the 30 model features) and merged into
# build_explanation() via its `extra_signals` argument.
# ---------------------------------------------------------------------------
_BRANDS = {
    "paypal", "google", "microsoft", "apple", "amazon", "facebook", "instagram",
    "netflix", "whatsapp", "linkedin", "twitter", "gmail", "outlook", "office365",
    "icloud", "dropbox", "steam", "coinbase", "binance", "chase", "wellsfargo",
    "bankofamerica", "citibank", "hsbc", "dhl", "fedex", "ups", "usps", "alibaba",
    "ebay", "spotify", "github", "discord", "roblox", "snapchat", "tiktok",
}


def _levenshtein(a, b):
    if a == b:
        return 0
    if not a or not b:
        return len(a) or len(b)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def _registrable_label(host):
    # Crude second-level label (e.g. "paypa1" in "paypa1.com"). Good enough for
    # common .com/.net brands; multi-part TLDs (.co.uk) are not fully handled.
    parts = [p for p in host.split(".") if p]
    if len(parts) >= 2:
        return parts[-2]
    return parts[0] if parts else ""


def brand_safety_signals(url: str):
    """Homograph (IDN look-alike) and typosquat / brand-impersonation signals for a URL."""
    signals = []
    try:
        host = (urlparse(url).hostname or "").lower()
    except Exception:
        host = ""
    if not host:
        return signals

    # --- Homograph / internationalized look-alike domain ---
    is_punycode = "xn--" in host
    has_non_ascii = any(ord(ch) > 127 for ch in host)
    if is_punycode or has_non_ascii:
        shown = host
        if is_punycode:
            try:
                shown = host.encode("ascii").decode("idna")
            except Exception:
                shown = host
        signals.append({
            "feature": "homograph",
            "label": "Look-alike (IDN) characters",
            "phrase": f"Domain uses internationalized / look-alike characters ({shown}) that can mimic a real brand",
            "why": "Homograph attacks swap letters for identical-looking Unicode characters (e.g. Cyrillic 'a' for Latin 'a').",
            "value": -1,
            "severity": "high",
            "weight": 0.85,
        })

    # --- Typosquatting / brand impersonation ---
    label = _registrable_label(host)
    matched, kind = None, None
    if label and label not in _BRANDS:
        for brand in _BRANDS:
            d = _levenshtein(label, brand)
            if 1 <= d <= 2 and abs(len(label) - len(brand)) <= 2:
                matched, kind = brand, "typo"
                break
        if not matched:
            for brand in _BRANDS:
                if re.search(r"(^|[^a-z0-9])" + re.escape(brand) + r"([^a-z0-9]|$)", host):
                    matched, kind = brand, "impersonation"
                    break
    if matched:
        phrase = (
            f"Domain name closely resembles '{matched}' (possible typosquatting)"
            if kind == "typo"
            else f"Uses the brand name '{matched}' but is not its official domain"
        )
        signals.append({
            "feature": "typosquat",
            "label": "Brand look-alike",
            "phrase": phrase,
            "why": "Attackers register near-identical or brand-containing domains to impersonate trusted services.",
            "value": -1,
            "severity": "high",
            "weight": 0.80,
        })

    return signals
