"""Seed the MongoDB database with sample legal documents.

Drops existing documents and inserts a clean set of sample records
covering all document types and statuses. Designed to be run via
``python -m api.db.seed`` for local development.
"""

import asyncio
from datetime import datetime, timezone
from io import BytesIO

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from api.core.config import get_settings
from api.models.document import DocumentModel, DocumentStatus, DocumentType
from api.models.reference import ReferenceModel

# ---------------------------------------------------------------------------
# Legal content templates keyed by document title
# ---------------------------------------------------------------------------

LEGAL_CONTENT: dict[str, list[str]] = {
    "SaaS Subscription Agreement": [
        "SAAS SUBSCRIPTION AGREEMENT",
        "This SaaS Subscription Agreement ('Agreement') is entered into as of the "
        "Effective Date by and between the Provider and the Client.",
        "1. SUBSCRIPTION GRANT. Provider grants Client a non-exclusive, "
        "non-transferable right to access and use the Service during the "
        "Subscription Term.",
        "2. FEES AND PAYMENT. Client shall pay the subscription fees set forth in "
        "the applicable Order Form within thirty (30) days of invoice date.",
        "3. TERM AND TERMINATION. This Agreement commences on the Effective Date "
        "and continues for the Initial Term unless terminated earlier.",
        "4. DATA SECURITY. Provider shall maintain administrative, physical, and "
        "technical safeguards for protection of Client Data.",
        "5. LIMITATION OF LIABILITY. In no event shall either party's aggregate "
        "liability exceed the fees paid during the twelve (12) months preceding "
        "the claim.",
    ],
    "Freelance Services Contract": [
        "FREELANCE SERVICES CONTRACT",
        "This Freelance Services Contract ('Contract') is made between the Company "
        "and the Contractor for software development services.",
        "1. SCOPE OF WORK. Contractor shall perform the services described in "
        "Exhibit A attached hereto.",
        "2. COMPENSATION. Company shall pay Contractor at the rate specified in "
        "Exhibit A upon satisfactory completion of deliverables.",
        "3. INDEPENDENT CONTRACTOR. Contractor is an independent contractor and "
        "not an employee of the Company.",
        "4. INTELLECTUAL PROPERTY. All work product created under this Contract "
        "shall be the sole property of the Company.",
    ],
    "Vendor Supply Agreement": [
        "VENDOR SUPPLY AGREEMENT",
        "This Vendor Supply Agreement ('Agreement') governs the supply of raw "
        "materials between the Vendor and the Purchaser.",
        "1. SUPPLY OBLIGATIONS. Vendor shall deliver the goods described in the "
        "Purchase Order in accordance with the delivery schedule.",
        "2. PRICING. Prices shall remain fixed for the term unless adjusted by "
        "mutual written agreement.",
        "3. QUALITY STANDARDS. All goods shall conform to the specifications and "
        "quality standards set forth in Exhibit B.",
        "4. WARRANTY. Vendor warrants that goods shall be free from defects in "
        "materials and workmanship for twelve (12) months.",
    ],
    "Privacy Policy": [
        "PRIVACY POLICY",
        "This Privacy Policy describes how we collect, use, and share personal "
        "information in compliance with GDPR and CCPA.",
        "1. INFORMATION WE COLLECT. We collect information you provide directly, "
        "such as name, email address, and payment information.",
        "2. USE OF INFORMATION. We use personal information to provide and improve "
        "our services, communicate with you, and comply with legal obligations.",
        "3. DATA RETENTION. We retain personal information only as long as "
        "necessary to fulfill the purposes outlined in this policy.",
        "4. YOUR RIGHTS. You have the right to access, correct, delete, and port "
        "your personal data at any time.",
    ],
    "Acceptable Use Policy": [
        "ACCEPTABLE USE POLICY",
        "This Acceptable Use Policy outlines the guidelines for use of company "
        "information technology resources.",
        "1. PERMITTED USE. IT resources are provided for business purposes and "
        "limited personal use that does not interfere with work.",
        "2. PROHIBITED ACTIVITIES. Users shall not engage in unauthorized access, "
        "distribution of malware, or harassment.",
        "3. MONITORING. The company reserves the right to monitor use of IT "
        "resources to ensure compliance with this policy.",
    ],
    "Data Retention Policy": [
        "DATA RETENTION POLICY",
        "This Data Retention Policy establishes rules governing how long different "
        "categories of data are retained by the organization.",
        "1. RETENTION PERIODS. Financial records shall be retained for seven (7) "
        "years. Employee records for the duration of employment plus five (5) years.",
        "2. DISPOSAL. Data that has exceeded its retention period shall be securely "
        "destroyed using approved methods.",
        "3. LEGAL HOLDS. Retention periods may be extended when data is subject to "
        "litigation holds or regulatory investigations.",
    ],
    "Senior Engineer Offer Letter": [
        "OFFER LETTER",
        "Dear Candidate,",
        "We are pleased to offer you the position of Senior Software Engineer at "
        "our company. This letter outlines the terms of your employment.",
        "1. POSITION AND DUTIES. You will report to the VP of Engineering and "
        "perform duties consistent with a senior engineering role.",
        "2. COMPENSATION. Your annual base salary will be paid on a semi-monthly "
        "basis, subject to applicable withholdings.",
        "3. BENEFITS. You will be eligible for the company's standard benefits "
        "package including health insurance, 401(k), and equity.",
    ],
    "Employee Handbook": [
        "EMPLOYEE HANDBOOK",
        "Welcome to the company. This handbook outlines our policies, procedures, "
        "and expectations for all employees.",
        "1. EMPLOYMENT RELATIONSHIP. Employment with the company is at-will and "
        "may be terminated by either party at any time. Nothing in this handbook "
        "constitutes a contract of employment or a guarantee of continued "
        "employment. The company reserves the right to modify policies, benefits, "
        "and procedures at any time with or without notice.",
        "2. WORKPLACE CONDUCT. All employees are expected to conduct themselves "
        "professionally and treat colleagues with respect. Harassment, "
        "discrimination, and retaliation of any kind are strictly prohibited and "
        "may result in disciplinary action up to and including termination. "
        "Employees are encouraged to report any concerns through the designated "
        "reporting channels without fear of reprisal.",
        "3. EQUAL EMPLOYMENT OPPORTUNITY. The company is committed to providing "
        "equal employment opportunities regardless of race, color, religion, sex, "
        "national origin, age, disability, genetic information, veteran status, "
        "sexual orientation, gender identity, or any other characteristic "
        "protected by applicable law. This policy applies to all terms and "
        "conditions of employment, including recruiting, hiring, placement, "
        "promotion, termination, layoff, recall, transfer, leaves of absence, "
        "compensation, and training.",
        "4. HOURS OF WORK AND ATTENDANCE. Standard business hours are Monday "
        "through Friday, 9:00 AM to 5:00 PM local time. Flexible work "
        "arrangements may be approved by your manager on a case-by-case basis. "
        "All employees are expected to maintain regular and punctual attendance. "
        "Excessive absenteeism or tardiness may result in disciplinary action.",
        "5. REMOTE WORK POLICY. Employees eligible for remote work must maintain "
        "a dedicated workspace, ensure reliable internet connectivity, and remain "
        "available during core business hours. Remote employees are subject to "
        "the same performance expectations, policies, and procedures as on-site "
        "employees. The company reserves the right to require on-site presence "
        "for meetings, training, or other business needs.",
        "6. LEAVE POLICIES. The company provides paid time off, sick leave, and "
        "parental leave in accordance with applicable law. Paid time off accrues "
        "at a rate determined by length of service and must be scheduled in "
        "advance with manager approval. Unused PTO may be carried over up to a "
        "maximum balance as specified in the benefits summary. Sick leave may be "
        "used for personal illness, medical appointments, or care of an "
        "immediate family member.",
        "7. COMPENSATION AND BENEFITS. Salary reviews are conducted annually. "
        "Benefits enrollment occurs during the open enrollment period. The "
        "company offers a comprehensive benefits package including medical, "
        "dental, and vision insurance, a 401(k) retirement plan with employer "
        "matching, life insurance, disability coverage, and an employee "
        "assistance program. Details of each benefit plan are provided in "
        "separate plan documents available from Human Resources.",
        "8. PERFORMANCE MANAGEMENT. The company utilizes a continuous performance "
        "management process that includes regular one-on-one meetings, quarterly "
        "check-ins, and an annual performance review. Employees are expected to "
        "set goals collaboratively with their managers and actively participate "
        "in their own professional development. Performance ratings may impact "
        "compensation adjustments, bonus eligibility, and promotion decisions.",
        "9. PROFESSIONAL DEVELOPMENT. The company supports employee growth "
        "through tuition reimbursement, conference attendance, and internal "
        "training programs. Employees may request up to the annual professional "
        "development budget amount for approved learning activities. All "
        "professional development requests must be submitted to and approved by "
        "your manager prior to enrollment.",
        "10. CODE OF ETHICS. All employees must adhere to the highest standards "
        "of ethical conduct. Conflicts of interest must be disclosed promptly to "
        "your manager or the Legal department. Employees shall not accept gifts "
        "or entertainment that could influence or appear to influence business "
        "decisions. Violations of this code may result in disciplinary action up "
        "to and including termination of employment.",
        "11. CONFIDENTIALITY AND DATA PROTECTION. Employees must protect "
        "confidential company information, trade secrets, and personally "
        "identifiable information of clients, vendors, and fellow employees. "
        "Confidential information must not be disclosed to unauthorized persons "
        "or used for personal gain. Upon termination, all company materials and "
        "confidential information must be returned immediately.",
        "12. TECHNOLOGY AND ACCEPTABLE USE. Company-provided technology resources "
        "including computers, mobile devices, email, and internet access are "
        "intended primarily for business use. Limited personal use is permitted "
        "provided it does not interfere with work responsibilities or violate "
        "company policies. The company reserves the right to monitor use of its "
        "technology resources. Employees shall not install unauthorized software "
        "or access prohibited websites on company equipment.",
        "13. HEALTH AND SAFETY. The company is committed to providing a safe and "
        "healthy work environment. All employees are responsible for following "
        "safety procedures, reporting hazards, and participating in safety "
        "training. Workplace injuries must be reported immediately to your "
        "supervisor and Human Resources. The company maintains workers' "
        "compensation insurance as required by law.",
        "14. DISPUTE RESOLUTION. Any disputes arising out of or relating to "
        "employment shall first be addressed through the company's internal "
        "grievance procedure. If the matter cannot be resolved internally, the "
        "parties agree to submit the dispute to binding arbitration in "
        "accordance with the rules of the American Arbitration Association. "
        "Each party shall bear its own costs and attorneys' fees unless "
        "otherwise required by applicable law.",
        "15. AMENDMENTS. This handbook may be amended or supplemented at any "
        "time at the sole discretion of the company. Employees will be notified "
        "of material changes through company communication channels. Continued "
        "employment after notification of changes constitutes acceptance of the "
        "revised policies. The most current version of this handbook is "
        "available on the company intranet.",
    ],
    "Severance Agreement": [
        "SEVERANCE AGREEMENT AND GENERAL RELEASE",
        "This Severance Agreement ('Agreement') is entered into between the "
        "Company and the Employee in connection with Employee's separation.",
        "1. SEVERANCE BENEFITS. In consideration of Employee's execution of this "
        "Agreement, Company shall provide severance pay equal to the amount "
        "specified in the attached schedule.",
        "2. GENERAL RELEASE. Employee releases Company from any and all claims "
        "arising out of or related to Employee's employment.",
        "3. NON-COMPETE. For a period of twelve (12) months following separation, "
        "Employee shall not engage in competitive activities.",
    ],
    "Mutual NDA — Acme Corp": [
        "MUTUAL NON-DISCLOSURE AGREEMENT",
        "This Mutual Non-Disclosure Agreement ('Agreement') is entered into "
        "between the parties for the purpose of protecting confidential "
        "information exchanged during partnership discussions.",
        "1. DEFINITION OF CONFIDENTIAL INFORMATION. 'Confidential Information' "
        "means any non-public information disclosed by either party.",
        "2. OBLIGATIONS. Each party shall hold the other party's Confidential "
        "Information in strict confidence and not disclose it to third parties.",
        "3. TERM. This Agreement shall remain in effect for two (2) years from "
        "the Effective Date.",
    ],
    "One-Way NDA — Investor Review": [
        "UNILATERAL NON-DISCLOSURE AGREEMENT",
        "This Non-Disclosure Agreement ('Agreement') is made to protect the "
        "Company's proprietary information during investor due diligence.",
        "1. PURPOSE. The Receiving Party wishes to evaluate a potential investment "
        "in the Company and requires access to confidential information.",
        "2. NON-DISCLOSURE. The Receiving Party shall not disclose any "
        "Confidential Information to any person or entity without prior written "
        "consent.",
        "3. RETURN OF MATERIALS. Upon request, the Receiving Party shall return "
        "or destroy all materials containing Confidential Information.",
    ],
    "NDA — Board Advisory": [
        "NON-DISCLOSURE AGREEMENT — BOARD ADVISORY",
        "This Non-Disclosure Agreement ('Agreement') governs the confidentiality "
        "obligations of incoming board advisory members.",
        "1. SCOPE. Advisory Member shall have access to board materials, financial "
        "reports, and strategic plans.",
        "2. CONFIDENTIALITY. Advisory Member agrees to maintain the "
        "confidentiality of all information received in their advisory capacity.",
        "3. DURATION. Confidentiality obligations shall survive for three (3) "
        "years following termination of the advisory relationship.",
    ],
    "Office Lease Agreement": [
        "COMMERCIAL OFFICE LEASE AGREEMENT",
        "This Lease Agreement ('Lease') is entered into between the Landlord and "
        "the Tenant for the premises located at the downtown headquarters.",
        "1. PREMISES. Landlord leases to Tenant the office space described in "
        "Exhibit A for the purpose of conducting business operations.",
        "2. TERM. The initial lease term shall be five (5) years commencing on "
        "the Commencement Date.",
        "3. RENT. Tenant shall pay monthly rent as specified in the Rent Schedule "
        "on or before the first day of each calendar month.",
        "4. MAINTENANCE. Tenant shall maintain the premises in good condition and "
        "comply with all applicable building codes and regulations.",
    ],
    "Cookie Policy": [
        "COOKIE POLICY",
        "This Cookie Policy explains how our website uses cookies and similar "
        "tracking technologies.",
        "1. WHAT ARE COOKIES. Cookies are small text files stored on your device "
        "when you visit our website.",
        "2. TYPES OF COOKIES. We use essential cookies for site functionality and "
        "analytics cookies to understand usage patterns.",
        "3. MANAGING COOKIES. You may control cookie preferences through your "
        "browser settings or our consent management tool.",
    ],
    # --- Reference document templates ---
    "NDA Template": [
        "NON-DISCLOSURE AGREEMENT TEMPLATE",
        "This Non-Disclosure Agreement ('Agreement') is entered into by and "
        "between the Disclosing Party and the Receiving Party as of the "
        "Effective Date set forth on the signature page.",
        "1. DEFINITION OF CONFIDENTIAL INFORMATION. 'Confidential Information' "
        "means any non-public technical, business, or financial information "
        "disclosed by the Disclosing Party, whether orally, in writing, or "
        "by inspection of tangible objects.",
        "2. OBLIGATIONS OF RECEIVING PARTY. The Receiving Party shall hold and "
        "maintain the Confidential Information in strict confidence, using "
        "the same degree of care it uses to protect its own confidential "
        "information, but in no event less than reasonable care.",
        "3. EXCLUSIONS. Confidential Information does not include information "
        "that: (a) is or becomes publicly available through no fault of the "
        "Receiving Party; (b) was already known to the Receiving Party prior "
        "to disclosure; (c) is independently developed without use of the "
        "Confidential Information.",
        "4. TERM AND TERMINATION. This Agreement shall remain in effect for a "
        "period of two (2) years from the Effective Date unless terminated "
        "earlier by either party upon thirty (30) days written notice.",
        "5. RETURN OF MATERIALS. Upon termination or request, the Receiving "
        "Party shall promptly return or destroy all materials containing "
        "Confidential Information and certify such destruction in writing.",
    ],
    "Service Agreement": [
        "GENERAL SERVICE AGREEMENT",
        "This Service Agreement ('Agreement') is made and entered into by and "
        "between the Service Provider and the Client as of the Effective Date.",
        "1. SCOPE OF SERVICES. The Service Provider shall perform the services "
        "described in the Statement of Work attached as Exhibit A, including "
        "all deliverables, milestones, and acceptance criteria specified therein.",
        "2. COMPENSATION. The Client shall pay the Service Provider the fees "
        "set forth in the applicable Statement of Work. Invoices shall be "
        "submitted monthly and are due within thirty (30) days of receipt.",
        "3. TERM. This Agreement commences on the Effective Date and shall "
        "continue until all services have been completed, unless terminated "
        "earlier in accordance with the termination provisions herein.",
        "4. INTELLECTUAL PROPERTY. All work product, inventions, and materials "
        "created by the Service Provider in the course of performing services "
        "shall be the exclusive property of the Client upon full payment.",
        "5. WARRANTIES. The Service Provider warrants that all services shall "
        "be performed in a professional and workmanlike manner consistent with "
        "generally accepted industry standards and practices.",
        "6. LIMITATION OF LIABILITY. Neither party shall be liable for any "
        "indirect, incidental, or consequential damages arising out of this "
        "Agreement, regardless of the form of action or theory of liability.",
    ],
    "Privacy Policy Template": [
        "PRIVACY POLICY TEMPLATE",
        "This Privacy Policy describes how the Organization collects, uses, "
        "stores, and discloses personal information in compliance with "
        "applicable data protection laws including GDPR and CCPA.",
        "1. INFORMATION WE COLLECT. We collect personal information that you "
        "provide directly, such as name, email address, phone number, and "
        "payment information, as well as information collected automatically "
        "through cookies and similar tracking technologies.",
        "2. HOW WE USE YOUR INFORMATION. We use personal information to "
        "provide and improve our services, process transactions, communicate "
        "with you, comply with legal obligations, and protect our rights.",
        "3. DATA SHARING AND DISCLOSURE. We do not sell personal information. "
        "We may share information with service providers who assist in our "
        "operations, subject to confidentiality obligations, or as required "
        "by law or legal process.",
        "4. DATA RETENTION. We retain personal information only for as long as "
        "necessary to fulfill the purposes for which it was collected, or as "
        "required by applicable law or regulation.",
        "5. YOUR RIGHTS AND CHOICES. You have the right to access, correct, "
        "delete, and port your personal data. You may also opt out of certain "
        "data processing activities by contacting us at the address below.",
        "6. SECURITY MEASURES. We implement appropriate technical and "
        "organizational measures to protect personal information against "
        "unauthorized access, alteration, disclosure, or destruction.",
    ],
    "Employment Handbook": [
        "EMPLOYMENT HANDBOOK TEMPLATE",
        "This Employment Handbook establishes the policies, procedures, and "
        "expectations applicable to all employees of the Organization.",
        "1. EMPLOYMENT RELATIONSHIP. Employment is at-will and may be "
        "terminated by either party at any time with or without cause. "
        "Nothing in this handbook creates an express or implied contract "
        "of employment.",
        "2. WORKPLACE CONDUCT. All employees are expected to conduct "
        "themselves professionally, treat colleagues with respect, and "
        "maintain a harassment-free work environment. Violations may result "
        "in disciplinary action up to and including termination.",
        "3. COMPENSATION AND BENEFITS. Salary reviews are conducted annually. "
        "The company offers a comprehensive benefits package including health "
        "insurance, retirement plan contributions, paid time off, and "
        "professional development opportunities.",
        "4. LEAVE POLICIES. The company provides paid time off, sick leave, "
        "and parental leave in accordance with applicable law. Leave requests "
        "must be submitted in advance and approved by the employee's manager.",
        "5. EQUAL EMPLOYMENT OPPORTUNITY. The Organization is committed to "
        "providing equal employment opportunities regardless of race, color, "
        "religion, sex, national origin, age, disability, or any other "
        "characteristic protected by applicable law.",
        "6. CONFIDENTIALITY. Employees must protect confidential company "
        "information and trade secrets during and after employment. All "
        "company materials must be returned upon termination.",
    ],
    "Vendor Agreement": [
        "VENDOR AGREEMENT TEMPLATE",
        "This Vendor Agreement ('Agreement') governs the commercial "
        "relationship between the Company and the Vendor for the supply of "
        "goods and services as described herein.",
        "1. SUPPLY OBLIGATIONS. The Vendor shall deliver goods and services "
        "in accordance with the specifications, quantities, and delivery "
        "schedule set forth in each Purchase Order issued under this Agreement.",
        "2. PRICING AND PAYMENT. Prices shall be as set forth in the "
        "applicable Purchase Order and shall remain firm for the duration "
        "of the order. Payment terms are net thirty (30) days from invoice.",
        "3. QUALITY ASSURANCE. All goods shall conform to the specifications "
        "and quality standards set forth in Exhibit A. The Vendor shall "
        "maintain a quality management system and permit audits upon request.",
        "4. WARRANTIES. The Vendor warrants that all goods shall be free from "
        "defects in materials and workmanship for a period of twelve (12) "
        "months from the date of delivery.",
        "5. INDEMNIFICATION. The Vendor shall indemnify and hold harmless the "
        "Company from any claims, damages, or expenses arising from the "
        "Vendor's breach of this Agreement or negligent acts.",
        "6. DISPUTE RESOLUTION. Any disputes arising under this Agreement "
        "shall be resolved through good faith negotiation, followed by "
        "mediation, and if necessary, binding arbitration.",
    ],
}


def generate_pdf(title: str, paragraphs: list[str]) -> bytes:
    """Generate a simple PDF document with the given title and paragraphs.

    Args:
        title: The document title (used as the PDF heading).
        paragraphs: Body paragraphs to include in the document.

    Returns:
        Raw PDF bytes.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        topMargin=1 * inch,
        bottomMargin=1 * inch,
        leftMargin=1 * inch,
        rightMargin=1 * inch,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Title"],
        fontSize=16,
        spaceAfter=20,
    )
    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontSize=11,
        leading=15,
        spaceAfter=12,
    )

    story: list = []
    # First paragraph is the heading
    if paragraphs:
        story.append(Paragraph(paragraphs[0], title_style))
        story.append(Spacer(1, 12))
        for para in paragraphs[1:]:
            story.append(Paragraph(para, body_style))

    doc.build(story)
    return buffer.getvalue()


SAMPLE_DOCUMENTS = [
    # --- Contract ---
    {
        "title": "SaaS Subscription Agreement",
        "type": DocumentType.CONTRACT,
        "status": DocumentStatus.DONE,
        "description": (
            "Standard SaaS subscription terms between provider and enterprise client."
        ),
        "created_at": datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc),
        "page_count": 12,
    },
    {
        "title": "Freelance Services Contract",
        "type": DocumentType.CONTRACT,
        "status": DocumentStatus.DRAFT,
        "description": (
            "Independent contractor agreement for software development services."
        ),
        "created_at": datetime(2026, 1, 12, 14, 30, tzinfo=timezone.utc),
        "page_count": 8,
    },
    {
        "title": "Vendor Supply Agreement",
        "type": DocumentType.CONTRACT,
        "status": DocumentStatus.GENERATING,
        "description": "Supply chain agreement with raw material vendor.",
        "created_at": datetime(2026, 2, 3, 11, 0, tzinfo=timezone.utc),
        "page_count": 15,
    },
    # --- Policy ---
    {
        "title": "Privacy Policy",
        "type": DocumentType.POLICY,
        "status": DocumentStatus.DONE,
        "description": "Company-wide privacy policy compliant with GDPR and CCPA.",
        "created_at": datetime(2026, 1, 20, 8, 0, tzinfo=timezone.utc),
        "page_count": 10,
    },
    {
        "title": "Acceptable Use Policy",
        "type": DocumentType.POLICY,
        "status": DocumentStatus.DRAFT,
        "description": "Guidelines for acceptable use of company IT resources.",
        "created_at": datetime(2026, 2, 1, 10, 15, tzinfo=timezone.utc),
        "page_count": 6,
    },
    {
        "title": "Data Retention Policy",
        "type": DocumentType.POLICY,
        "status": DocumentStatus.GENERATING,
        "description": (
            "Rules governing how long different categories of data are retained."
        ),
        "created_at": datetime(2026, 2, 18, 16, 45, tzinfo=timezone.utc),
        "page_count": 5,
    },
    # --- Employment ---
    {
        "title": "Senior Engineer Offer Letter",
        "type": DocumentType.EMPLOYMENT,
        "status": DocumentStatus.DONE,
        "description": "Employment offer for a senior software engineering position.",
        "created_at": datetime(2026, 1, 8, 9, 30, tzinfo=timezone.utc),
        "page_count": 4,
    },
    {
        "title": "Employee Handbook",
        "type": DocumentType.EMPLOYMENT,
        "status": DocumentStatus.DRAFT,
        "description": "Comprehensive handbook covering company policies and benefits.",
        "created_at": datetime(2026, 2, 10, 13, 0, tzinfo=timezone.utc),
        "page_count": 3,
    },
    {
        "title": "Severance Agreement",
        "type": DocumentType.EMPLOYMENT,
        "status": DocumentStatus.GENERATING,
        "description": (
            "Standard severance terms including non-compete and release clauses."
        ),
        "created_at": datetime(2026, 3, 1, 11, 0, tzinfo=timezone.utc),
        "page_count": 7,
    },
    # --- NDA ---
    {
        "title": "Mutual NDA — Acme Corp",
        "type": DocumentType.NDA,
        "status": DocumentStatus.DONE,
        "description": "Mutual non-disclosure agreement for partnership discussions.",
        "created_at": datetime(2026, 1, 15, 10, 0, tzinfo=timezone.utc),
        "page_count": 3,
    },
    {
        "title": "One-Way NDA — Investor Review",
        "type": DocumentType.NDA,
        "status": DocumentStatus.DRAFT,
        "description": (
            "Unilateral NDA protecting company IP during investor due diligence."
        ),
        "created_at": datetime(2026, 2, 22, 15, 0, tzinfo=timezone.utc),
        "page_count": 4,
    },
    {
        "title": "NDA — Board Advisory",
        "type": DocumentType.NDA,
        "status": DocumentStatus.GENERATING,
        "description": "Non-disclosure agreement for incoming board advisory members.",
        "created_at": datetime(2026, 3, 5, 9, 45, tzinfo=timezone.utc),
        "page_count": 3,
    },
    # --- Extra records for pagination ---
    {
        "title": "Office Lease Agreement",
        "type": DocumentType.CONTRACT,
        "status": DocumentStatus.DONE,
        "description": "Commercial lease for the downtown headquarters office space.",
        "created_at": datetime(2026, 3, 10, 8, 0, tzinfo=timezone.utc),
        "page_count": 20,
    },
    {
        "title": "Cookie Policy",
        "type": DocumentType.POLICY,
        "status": DocumentStatus.DONE,
        "description": "Website cookie consent and tracking disclosure policy.",
        "created_at": datetime(2026, 3, 15, 12, 0, tzinfo=timezone.utc),
        "page_count": 3,
    },
]

# Attach generated PDF content to each sample document.
SAMPLE_REFERENCES = [
    {
        "title": "NDA Template",
        "type": DocumentType.CONTRACT,
        "description": (
            "A standard non-disclosure agreement template for protecting "
            "confidential information exchanged between two parties."
        ),
        "created_at": datetime(2026, 1, 2, 9, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Service Agreement",
        "type": DocumentType.CONTRACT,
        "description": (
            "General service agreement outlining terms, deliverables, payment "
            "schedules, and liability provisions for professional services."
        ),
        "created_at": datetime(2026, 1, 5, 10, 30, tzinfo=timezone.utc),
    },
    {
        "title": "Privacy Policy Template",
        "type": DocumentType.POLICY,
        "description": (
            "Comprehensive privacy policy template covering data collection, "
            "usage, retention, and user rights under GDPR and CCPA."
        ),
        "created_at": datetime(2026, 1, 10, 14, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Employment Handbook",
        "type": DocumentType.EMPLOYMENT,
        "description": (
            "Reference handbook template addressing workplace conduct, benefits, "
            "leave policies, and employee rights and responsibilities."
        ),
        "created_at": datetime(2026, 1, 15, 8, 45, tzinfo=timezone.utc),
    },
    {
        "title": "Vendor Agreement",
        "type": DocumentType.CONTRACT,
        "description": (
            "Template agreement for vendor relationships covering supply terms, "
            "quality standards, pricing, and dispute resolution."
        ),
        "created_at": datetime(2026, 1, 20, 11, 15, tzinfo=timezone.utc),
    },
]

for _doc in SAMPLE_DOCUMENTS:
    _content = LEGAL_CONTENT.get(_doc["title"])
    if _content:
        _doc["pdf_content"] = generate_pdf(_doc["title"], _content)

# Attach generated PDF content to each seed reference.
for _ref in SAMPLE_REFERENCES:
    _content = LEGAL_CONTENT.get(_ref["title"])
    if _content:
        _ref["pdf_content"] = generate_pdf(_ref["title"], _content)


async def seed():
    """Drop existing documents and references, then insert sample records.

    Connects to MongoDB, initialises Beanie, then replaces
    the ``documents`` and ``references`` collection contents with
    ``SAMPLE_DOCUMENTS`` and ``SAMPLE_REFERENCES``.
    """
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(
        database=client[settings.mongodb_db_name],
        document_models=[DocumentModel, ReferenceModel],
    )

    await DocumentModel.find_all().delete()
    await ReferenceModel.find_all().delete()

    documents = [DocumentModel(**data) for data in SAMPLE_DOCUMENTS]
    await DocumentModel.insert_many(documents)

    references = [ReferenceModel(**data) for data in SAMPLE_REFERENCES]
    await ReferenceModel.insert_many(references)

    print(f"Seeded {len(documents)} documents and {len(references)} references.")


if __name__ == "__main__":  # pragma: no cover
    asyncio.run(seed())
