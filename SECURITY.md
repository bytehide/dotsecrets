# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

At ByteHide, we take the security of our projects seriously. If you believe you've found a security vulnerability in DotSecrets, please follow these steps to responsibly disclose it to us:

**DO NOT** create a public GitHub issue for security vulnerabilities.

### Reporting Process

Please report security vulnerabilities by emailing us at: **support@bytehide.com**

When reporting, please include:

1. Description of the vulnerability
2. Steps to reproduce the issue
3. Potential impact of the vulnerability
4. Any potential solutions you might suggest

You can optionally use our contact form at https://www.bytehide.com/contact.

### What to Expect

After you report a vulnerability:

- We will acknowledge receipt of your report within 48 hours
- We will provide an initial assessment of the report within 7 days
- We will work with you to understand and address the issue
- We will keep you informed of our progress throughout the process
- Once the issue is resolved, we will publicly acknowledge your responsible disclosure (unless you prefer to remain anonymous)

## Security Best Practices for DotSecrets Users

When using DotSecrets in your applications, please follow these security best practices:

1. **Never commit sensitive files to version control**
   - Always include `.secrets` and `.env` files in your `.gitignore`
   - Only commit `.public` files with non-sensitive information

2. **Use environment-specific configurations**
   - Create separate configuration files for different environments (development, staging, production)
   - Apply the principle of least privilege for cloud provider credentials

3. **Enable encryption when storing secrets locally**
   - Use the encryption features of DotSecrets when storing sensitive data
   - Securely manage your encryption keys

4. **Use dedicated secrets providers in production**
   - For production environments, prefer dedicated secret management services (AWS Secrets Manager, Azure Key Vault, etc.)
   - Avoid storing secrets in environment variables in production where possible

5. **Audit access to secrets regularly**
   - Monitor who has access to your secrets
   - Regularly rotate sensitive credentials

## Vulnerability Disclosure Policy

- Public disclosure of vulnerabilities will only occur after a fix has been developed and applied
- We request a reasonable amount of time to address reported vulnerabilities before any public disclosure
- We will credit you for your discovery (unless you prefer to remain anonymous)

---

Thank you for helping keep DotSecrets and its users safe!
