## 1. Overview

The **Merchant Lifecycle Trust Platform** is an AI-driven risk intelligence system that evaluates merchant trust:

- At Onboarding (Day 0 Risk)
- During Continuous Monitoring (Behavioral Risk)
- With a unified AI Copilot Layer

The system combines document intelligence, website intent analysis, transaction behavior modeling, and multimodal AI to generate a dynamic, explainable merchant risk score.

---

## 2. System Architecture Overview

The solution consists of three major layers:

1. **Onboarding Intelligence Layer**
2. **Continuous Risk Monitoring Layer**
3. **AI Copilot & Alerting Layer**

All layers feed into a centralized **Risk Engine**.

---

## 3. High-Level Architecture Diagram (Logical View)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MERCHANT PORTAL                                   │
│                    (Registration & Activity Interface)                      │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼                               ▼
┌────────────────────────────────┐  ┌───────────────────────────────────────┐
│   ONBOARDING INTELLIGENCE      │  │   CONTINUOUS MONITORING LAYER         │
│                                │  │                                       │
│  • Website Understanding       │  │  • Transaction Monitoring             │
│  • Document Intelligence       │  │  • Listing & Content Analysis         │
│  • KYC Validation              │  │  • Image Intelligence                 │
│  • Website Risk Scoring        │  │  • Review & Complaint Analysis        │
│  • Initial Decision            │  │  • External Signals                   │
└────────────────┬───────────────┘  └───────────────┬───────────────────────┘
                 │                                  │
                 └──────────────┬───────────────────┘
                                │
                                ▼
                 ┌──────────────────────────────┐
                 │      RISK ENGINE             │
                 │  (Unified Risk Scoring)      │
                 │                              │
                 │  • Feature Aggregation       │
                 │  • ML Risk Models            │
                 │  • Dynamic Score Calculation │
                 └──────────────┬───────────────┘
                                │
                                ▼
                 ┌──────────────────────────────┐
                 │   DECISION & ALERT ENGINE    │
                 │                              │
                 │  • Threshold Evaluation      │
                 │  • Action Triggering         │
                 │  • Escalation Logic          │
                 └──────────────┬───────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
    ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
    │   Activate   │  │   Review    │  │    Block     │
    │   Merchant   │  │   Manual    │  │   Merchant   │
    └──────────────┘  └─────────────┘  └──────────────┘
                                │
                                ▼
                 ┌──────────────────────────────┐
                 │      AI COPILOT LAYER        │
                 │   (RAG-Powered Assistant)    │
                 │                              │
                 │  • Risk Explanation          │
                 │  • Evidence Retrieval        │
                 │  • Action Recommendations    │
                 │  • Audit Report Generation   │
                 └──────────────────────────────┘
                                │
                                ▼
                 ┌──────────────────────────────┐
                 │    DATA PERSISTENCE LAYER    │
                 │                              │
                 │  • Risk Event Store          │
                 │  • Merchant Timeline         │
                 │  • Feature Store             │
                 └──────────────────────────────┘
```

---

## 4. Onboarding Intelligence Layer (Day 0 Risk)

### 4.1 Merchant Signup

- Merchant registers on platform
- Website URL, GSTIN, PAN, and business details collected
- Documents uploaded

### 4.2 Website Understanding Engine

**Components:**
- Web crawler
- Content extraction
- NLP intent classification
- Keyword risk detection

**Output:**
- Merchant category
- Risk keywords
- Intent classification
- Initial website risk score

### 4.3 Document Intelligence & Auto-Fill

- OCR extraction from uploaded documents
- Auto-fill merchant form fields
- Cross-validation with:
  - CKYC APIs
  - GST APIs
  - PAN validation
- Merchant can correct mismatches

### 4.4 Agent-less KYC Validation

**Automated checks:**
- Name matching score
- Address similarity
- GST status verification
- Blacklist screening
- Duplicate merchant detection

Outputs structured compliance flags.

### 4.5 Website Risk Scoring (Keywords + RAG)

- Keyword risk scoring model
- RAG-based similarity:
  - Compare merchant website embedding
  - Against known risky merchants
  - Against trusted merchants

**Generates:**
- Similarity score
- Pattern risk score

### 4.6 Decision Engine

**Input:**
- KYC Score
- Website Score
- Validation Flags

**Decision:**
- Low Risk → Auto Activate
- Medium Risk → Conditional Approval
- High Risk → Human Review

---

## 5. Continuous Monitoring Layer (Lifecycle Risk)

Risk score evolves based on merchant behavior.

### 5.1 Transaction Monitoring

**Signals:**
- Refund rate
- Chargeback rate
- Transaction velocity spikes
- Geographic mismatch
- Payment mode anomalies

Behavioral risk score generated daily.

### 5.2 Listing & Content Monitoring

- NLP-based product description analysis
- Illegal keyword detection
- Restricted category matching

### 5.3 Image Intelligence

- Image classification model
- Text-to-image consistency check
- Illegal product detection
- Flags mismatch between listing and image

### 5.4 Review & Complaint Analysis

- Sentiment analysis
- Fraud pattern detection
- Abuse keyword extraction

### 5.5 External Signals

- Social media sentiment scan
- News scraping
- Regulatory notices
- Public complaints

### 5.6 Dynamic Risk Score Engine

**Risk Score Formula:**

```
Risk Score = Weighted(
    Onboarding Risk,
    Transaction Risk,
    Listing Risk,
    Image Risk,
    Review Risk,
    External Risk
)
```

Score updated daily or in near real-time.

---

## 6. AI Copilot Layer

Unified conversational interface for:
- Compliance team
- Risk team
- Operations
- Merchant support

**Capabilities:**
- Explain why merchant flagged
- Show evidence snapshots
- Compare similar risky merchants
- Recommend actions
- Generate audit report

**Uses RAG over:**
- Merchant history
- Risk events
- Policy documentation

---

## 7. Alerting & Escalation Engine

**Triggers when:**
- Risk crosses threshold
- Sudden spike in behavior
- New illegal listing detected

**Actions:**
- Notify compliance
- Freeze payouts
- Request re-KYC
- Escalate to manual review

---

## 8. Data Flow (Simplified)

```
Merchant → Onboarding AI → Risk Engine → Activation

Merchant Activity → Monitoring AI → Risk Engine → Alert Engine → Copilot
```

**All risk events stored in:**
- Risk Event Store
- Merchant Risk Timeline
- Feature Store

---

## 9. Non-Functional Requirements

### Scalability
- Support 1M+ merchants
- Near real-time risk updates

### Explainability
- Every risk decision must be auditable
- Store feature-level contribution

### Security
- Encrypted document storage
- Role-based access control
- Compliance with Indian data laws

### Availability
- 99.9% uptime
- Fault-tolerant architecture

---

## 10. Key Benefits

- Reduce fraudulent merchant onboarding
- Detect bad actors post-activation
- Reduce manual compliance effort
- Lower revenue leakage
- Improve trust ecosystem