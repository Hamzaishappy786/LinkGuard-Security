"""
Compute dataset-like features from a URL for runtime inference.
Some HTML/JS features are approximated or given neutral defaults.
Improved version with better SSL certificate validation.
"""

import re
import socket
import ssl
from urllib.parse import urlparse
from datetime import datetime
import requests

try:
    import whois
except Exception:
    whois = None

SHORTENERS = {
    "bit.ly", "goo.gl", "t.co", "ow.ly", "tinyurl.com", "is.gd", "buff.ly",
    "adf.ly", "rebrand.ly", "cutt.ly", "rb.gy", "bl.ink", "s.id", "t.ly"
}

SUSPICIOUS_TLDS = {
    "ru", "tk", "cn", "ml", "ga", "cf", "gq", "work", "zip", "kim", "country", "xyz", "top", "loan", "men", "link", "click"
}

# List of common free certificate authorities often used by phishers
SUSPICIOUS_CERT_ISSUERS = {
    "Let's Encrypt", "cPanel, Inc.", "COMODO CA Limited", "Sectigo Limited"
}

def _len_to_label(n):
    if n < 54:
        return 1
    elif n <= 75:
        return 0
    return -1

def _subdomain_label(host):
    if not host:
        return -1
    parts = host.split(".")
    if len(parts) <= 2:
        return 1
    elif len(parts) == 3:
        return 0
    else:
        return -1

def _has_ip(url):
    ip_regex = r"((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)"
    return -1 if re.search(ip_regex, url) else 1

def _double_slash_redirect(url):
    try:
        pos = url.rfind("//")
        return -1 if pos > 6 else 1
    except:
        return 0

def _prefix_suffix(host):
    return -1 if host and "-" in host else 1

def _https_token_in_host(host):
    return -1 if host and "https" in host.replace("https://", "") else 1

def _shortening_service(url):
    host = urlparse(url).netloc.lower()
    return -1 if any(s in host for s in SHORTENERS) else 1

def _port_label(parsed):
    if parsed.port is None:
        return 1
    return 1 if parsed.port in (80, 443) else -1

def _tld_flag(host):
    try:
        tld = host.split(".")[-1]
        return -1 if tld in SUSPICIOUS_TLDS else 1
    except:
        return 0

def _dns_record(host):
    try:
        socket.gethostbyname(host)
        return 1
    except:
        return -1

def _whois_dates(host):
    if whois is None:
        return None, None
    try:
        w = whois.whois(host)
        c = w.creation_date
        e = w.expiration_date
        if isinstance(c, list):
            c = c[0]
        if isinstance(e, list):
            e = e[0]
        return c, e
    except:
        return None, None

def _domain_registration_len_label(host):
    c, e = _whois_dates(host)
    if not c or not e:
        return -1
    try:
        delta = (e - c).days
        return 1 if delta and delta > 365 else -1
    except:
        return -1

def _age_of_domain_label(host):
    c, _ = _whois_dates(host)
    if not c:
        return -1
    try:
        months = (datetime.utcnow() - c).days / 30.0
        if months >= 6:
            return 1
        elif months >= 1:
            return 0
        else:
            return -1
    except:
        return -1

def _validate_ssl_certificate(url):
    """
    Improved SSL validation that checks certificate legitimacy, not just presence
    """
    if not url.startswith('https://'):
        return -1  # Not HTTPS
    
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname
        port = parsed.port or 443
        
        # Create SSL context
        context = ssl.create_default_context()
        
        # Get certificate information
        with socket.create_connection((hostname, port), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                
                # Check if certificate is self-signed
                if cert.get('issuer') and cert.get('subject'):
                    issuer = cert['issuer'][0][0][1]
                    
                    # Check for suspicious certificate issuers
                    if issuer in SUSPICIOUS_CERT_ISSUERS:
                        return 0  # Neutral, not fully trusted
                    
                    # Check if domain matches certificate
                    subject_alt_names = cert.get('subjectAltName', [])
                    domain_matches = False
                    
                    # Check common name
                    if cert.get('subject'):
                        common_name = cert['subject'][0][0][1]
                        if common_name == hostname or common_name.startswith('*.'):
                            domain_matches = True
                    
                    # Check subject alternative names
                    for entry in subject_alt_names:
                        if entry[0] == 'DNS' and (entry[1] == hostname or entry[1].startswith('*.')):
                            domain_matches = True
                            break
                    
                    if not domain_matches:
                        return -1  # Domain doesn't match certificate
                    
                    # Check certificate validity period
                    not_before = datetime.strptime(cert['notBefore'], '%b %d %H:%M:%S %Y %Z')
                    not_after = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    now = datetime.now()
                    
                    if now < not_before or now > not_after:
                        return -1  # Certificate is not valid yet or expired
                    
                    # If all checks pass, certificate is valid
                    return 1
        
        return -1  # Default to unsafe if we can't validate
    except Exception as e:
        print(f"SSL validation error: {str(e)}")
        return -1  # Default to unsafe if validation fails

def _check_redirect_chain(url):
    """
    Check if URL redirects to suspicious destinations
    """
    try:
        response = requests.get(url, allow_redirects=True, timeout=10, verify=False)
        final_url = response.url
        
        # Check if redirected to a different domain
        original_domain = urlparse(url).netloc
        final_domain = urlparse(final_url).netloc
        
        if original_domain != final_domain:
            # Check if final domain is suspicious
            if final_domain in SUSPICIOUS_TLDS or _has_ip(final_url) == -1:
                return -1
        
        return 1
    except:
        return -1

def compute_dataset_like_features(url: str) -> dict:
    parsed = urlparse(url)
    host = parsed.netloc.lower()

    feats = {}
    feats["having_IPhaving_IP_Address"] = _has_ip(url)
    feats["URLURL_Length"] = _len_to_label(len(url))
    feats["Shortining_Service"] = _shortening_service(url)
    feats["having_At_Symbol"] = -1 if "@" in url else 1
    feats["double_slash_redirecting"] = _double_slash_redirect(url)
    feats["Prefix_Suffix"] = _prefix_suffix(host)
    feats["having_Sub_Domain"] = _subdomain_label(host)
    
    # IMPROVED: Use the new SSL validation function instead of just checking scheme
    feats["SSLfinal_State"] = _validate_ssl_certificate(url)
    
    feats["Domain_registeration_length"] = _domain_registration_len_label(host)
    feats["Favicon"] = 1
    feats["port"] = _port_label(parsed)
    feats["HTTPS_token"] = _https_token_in_host(host)
    feats["Request_URL"] = 0
    feats["URL_of_Anchor"] = 0
    feats["Links_in_tags"] = 0
    feats["SFH"] = 0
    feats["Submitting_to_email"] = 1
    feats["Abnormal_URL"] = _dns_record(host)
    
    # IMPROVED: Use redirect chain check
    feats["Redirect"] = _check_redirect_chain(url)
    
    feats["on_mouseover"] = 1
    feats["RightClick"] = 1
    feats["popUpWidnow"] = 1
    feats["Iframe"] = 1
    feats["age_of_domain"] = _age_of_domain_label(host)
    feats["DNSRecord"] = _dns_record(host)
    feats["web_traffic"] = 0
    feats["Page_Rank"] = 0
    feats["Google_Index"] = 1
    feats["Links_pointing_to_page"] = 0
    feats["Statistical_report"] = -1 if (feats["having_IPhaving_IP_Address"] == -1 or _tld_flag(host) == -1) else 1

    return feats