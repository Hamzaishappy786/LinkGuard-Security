
import ssl
import socket
from urllib.parse import urlparse

def validate_ssl_certificate(url):
    """
    Validates SSL certificate for a URL to determine if it's legitimate
    Returns 1 for valid SSL, 0 for suspicious/invalid SSL, -1 for no SSL
    """
    if not url.startswith('https://'):
        return -1  # Not HTTPS
    
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname
        port = parsed.port or 443
        
        # List of common free certificate authorities often used by phishers
        suspicious_issuers = {
            "Let's Encrypt", "cPanel, Inc.", "COMODO CA Limited", "Sectigo Limited"
        }
        
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
                    if issuer in suspicious_issuers:
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
