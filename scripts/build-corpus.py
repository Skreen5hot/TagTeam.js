#!/usr/bin/env python3
"""Build the 50-sentence CBP domain test corpus from the CMS/DHS MOA."""
import json

corpus = [
    # === shall (UnconditionalObligation) ===
    {"id": "MOA-01", "text": "CMS shall allow USCIS to monitor and review all records and documents under CMS control related to this Agreement.", "tags": ["OBL","COORD","ENTITY"], "source": "p6"},
    {"id": "MOA-02", "text": "CMS shall provide USCIS with data and information regarding operation of the data exchange program.", "tags": ["OBL","ENTITY"], "source": "p6"},
    {"id": "MOA-03", "text": "CMS shall cooperate and collaborate with USCIS and consider its input and recommendations.", "tags": ["OBL","COORD"], "source": "p6"},
    {"id": "MOA-04", "text": "CMS shall take corrective measures in a timely manner.", "tags": ["OBL"], "source": "p6"},
    {"id": "MOA-05", "text": "Both Parties shall maintain a level of security that is commensurate with the risk and magnitude of the harm that could result from misuse of the information.", "tags": ["OBL","COMPLEX","HYP"], "source": "p14"},
    {"id": "MOA-06", "text": "Both Parties shall comply with the limitations on use and disclosure.", "tags": ["OBL","COORD"], "source": "p14"},
    {"id": "MOA-07", "text": "Each Party to this Agreement shall be liable for acts and omissions of its own employees.", "tags": ["OBL","COMPLEX"], "source": "p20"},
    {"id": "MOA-08", "text": "Neither Party shall be liable for any injury to another party's personnel or damage to another party's property.", "tags": ["OBL","NEG","COORD"], "source": "p20"},
    {"id": "MOA-09", "text": "CMS shall allow DHS and its components to monitor CMS and CMS sub-user system access.", "tags": ["OBL","ENTITY","COORD"], "source": "p7"},
    {"id": "MOA-10", "text": "CMS shall require compliance with the same or more stringent privacy and security standards.", "tags": ["OBL","COMPLEX"], "source": "p18"},

    # === must (UnconditionalObligation) ===
    {"id": "MOA-11", "text": "The AE must submit such documentation electronically.", "tags": ["OBL"], "source": "p12"},
    {"id": "MOA-12", "text": "An individual seeking to contest the content of USCIS information must contact USCIS or the record's owner.", "tags": ["OBL","COMPLEX"], "source": "p13"},
    {"id": "MOA-13", "text": "A state Medicaid or CHIP agency must determine or renew eligibility in accordance with 42 CFR Part 435.", "tags": ["OBL","ENTITY","COORD"], "source": "p14"},
    {"id": "MOA-14", "text": "The Party requesting permission must specify the following in writing.", "tags": ["OBL","COMPLEX"], "source": "p17"},
    {"id": "MOA-15", "text": "Marketplace matching programs must continue in the absence of a cost-effectiveness finding.", "tags": ["OBL","COMPLEX"], "source": "p41"},

    # === should (DefeasibleObligation) ===
    {"id": "MOA-16", "text": "Alternative verification methods should use the AE's direct SAVE access method.", "tags": ["OBL","ENTITY"], "source": "p12"},
    {"id": "MOA-17", "text": "Retained records should meet legal evidentiary requirements.", "tags": ["OBL"], "source": "p14"},

    # === may not / cannot (UnconditionalProhibition) ===
    {"id": "MOA-18", "text": "CMS and AEs may not deny an application based on a verification response that fails to confirm the applicant's status.", "tags": ["PRO","ENTITY","COMPLEX","COORD"], "source": "p12"},
    {"id": "MOA-19", "text": "CMS and AEs may not suspend, terminate, reduce, or make a final denial regarding the eligibility of an individual.", "tags": ["PRO","COORD"], "source": "p12"},
    {"id": "MOA-20", "text": "The Parties will not use the data to extract information concerning individuals therein for any purpose not authorized by this Agreement.", "tags": ["PRO","COMPLEX","NEG"], "source": "p17"},

    # === may (GrantedPermission) ===
    {"id": "MOA-21", "text": "CMS, through the Hub, may disclose to AEs the data received from USCIS under this Agreement.", "tags": ["PERM","ENTITY"], "source": "p6"},
    {"id": "MOA-22", "text": "CMS, through the Hub, may request verification for individuals currently enrolled whose immigration status has an expiration date.", "tags": ["PERM","COMPLEX"], "source": "p6"},
    {"id": "MOA-23", "text": "USCIS may request this information at any time throughout the duration or any extension of this Agreement.", "tags": ["PERM"], "source": "p6"},
    {"id": "MOA-24", "text": "Each party may request an on-site inspection in addition to requesting reports.", "tags": ["PERM","COORD"], "source": "p15"},
    {"id": "MOA-25", "text": "The AE may implement an approved alternative verification method to determine the applicant's immigration status.", "tags": ["PERM","COMPLEX"], "source": "p12"},

    # === will (DeclaredIntention) ===
    {"id": "MOA-26", "text": "USCIS will provide CMS with electronic access to immigrant, nonimmigrant, and naturalized citizen data.", "tags": ["INT","ENTITY","COORD"], "source": "p1"},
    {"id": "MOA-27", "text": "CMS will notify the USCIS Safeguards and Recordkeeping Procedures Contact immediately upon discovery of a breach.", "tags": ["INT","ENTITY","COMPLEX"], "source": "p6"},
    {"id": "MOA-28", "text": "CMS will report this Data Exchange Agreement to OMB and to the appropriate Committees of Congress for review.", "tags": ["INT","ENTITY","COORD"], "source": "p7"},
    {"id": "MOA-29", "text": "CMS will enter into agreements with AEs that include terms consistent with this Agreement.", "tags": ["INT","COMPLEX"], "source": "p7"},
    {"id": "MOA-30", "text": "USCIS will conduct an additional verification search of available databases.", "tags": ["INT"], "source": "p8"},
    {"id": "MOA-31", "text": "CMS will provide USCIS with the following identifying information about an individual who is the subject of an inquiry.", "tags": ["INT","COMPLEX"], "source": "p12"},
    {"id": "MOA-32", "text": "The Exchange will verify citizenship and immigration status in accordance with the applicable regulations.", "tags": ["INT","ENTITY"], "source": "p13"},

    # === Passive voice ===
    {"id": "MOA-33", "text": "The terms and conditions of this Agreement will be carried out by authorized officers, employees, and contractors of CMS and USCIS.", "tags": ["INT","PASS","COORD","ENTITY"], "source": "p1"},
    {"id": "MOA-34", "text": "The Applicant will be provided the opportunity to appeal denials of eligibility.", "tags": ["INT","PASS"], "source": "p13"},
    {"id": "MOA-35", "text": "USCIS shall be allowed to conduct compliance assistance visits.", "tags": ["OBL","PASS"], "source": "p7"},

    # === Actual acts (no modal) ===
    {"id": "MOA-36", "text": "SAVE provides immigration status information to authorized agencies.", "tags": ["ACT","ENTITY"], "source": "p1"},
    {"id": "MOA-37", "text": "The Hub transmits the verification request to SAVE and returns the response to the AE.", "tags": ["ACT","ENTITY","COORD"], "source": "p5"},
    {"id": "MOA-38", "text": "CMS operates the federally-facilitated Exchange through the Hub.", "tags": ["ACT","ENTITY"], "source": "p2"},
    {"id": "MOA-39", "text": "The responsible DHS component is the Verification Division within the USCIS Immigration Records and Identity Services Directorate.", "tags": ["ACT","ENTITY","COMPLEX"], "source": "p2"},
    {"id": "MOA-40", "text": "This Agreement establishes the terms and conditions for the data exchange between CMS and USCIS.", "tags": ["ACT","ENTITY"], "source": "p1"},

    # === Complex syntax ===
    {"id": "MOA-41", "text": "If the DOS provides USCIS with timely information about certificates of citizenship, SAVE will be able to verify an individual's acquired citizenship status.", "tags": ["INT","COMPLEX","ENTITY"], "source": "p2"},
    {"id": "MOA-42", "text": "When USCIS cannot verify immigration status through second step verification, the AE will be prompted to submit the case for third step verification.", "tags": ["INT","COMPLEX","NEG"], "source": "p12"},
    {"id": "MOA-43", "text": "If third level verification is required, the AE will facilitate the transfer of the Applicant's immigration documentation to USCIS.", "tags": ["INT","COMPLEX","PASS"], "source": "p12"},
    {"id": "MOA-44", "text": "CMS estimates that approximately 5.8 million records may be transacted through SAVE queries for the purpose of verifying eligibility.", "tags": ["PERM","COMPLEX"], "source": "p10"},
    {"id": "MOA-45", "text": "Nothing in this Agreement shall be construed as a waiver of sovereign immunity against suits by third persons.", "tags": ["OBL","NEG","COMPLEX"], "source": "p20"},

    # === Multi-word entities ===
    {"id": "MOA-46", "text": "The Department of Homeland Security provides verification services through the Systematic Alien Verification for Entitlements program.", "tags": ["ACT","ENTITY"], "source": "p1"},
    {"id": "MOA-47", "text": "United States Citizenship and Immigration Services operates the SAVE system.", "tags": ["ACT","ENTITY"], "source": "p1"},
    {"id": "MOA-48", "text": "The Centers for Medicare and Medicaid Services administers the federally-facilitated Exchange.", "tags": ["ACT","ENTITY"], "source": "p2"},

    # === Coordination ===
    {"id": "MOA-49", "text": "CMS and AEs will use the USCIS information in determining eligibility for enrollment in qualified health plans and insurance affordability programs.", "tags": ["INT","COORD","ENTITY","COMPLEX"], "source": "p1"},
    {"id": "MOA-50", "text": "USCIS will advise the AE through the Hub or the AE's direct SAVE access method.", "tags": ["INT","COORD"], "source": "p8"},
]

# Tag distribution
from collections import Counter
tags = Counter()
for s in corpus:
    for t in s["tags"]:
        tags[t] += 1

print(f"Corpus: {len(corpus)} sentences")
print("\nTag distribution:")
for t, c in tags.most_common():
    print(f"  {t}: {c}")

print("\nModal distribution:")
modal_counts = Counter()
for s in corpus:
    text = s["text"].lower()
    if " shall " in text: modal_counts["shall"] += 1
    elif " must " in text: modal_counts["must"] += 1
    elif "may not" in text: modal_counts["may not"] += 1
    elif " may " in text: modal_counts["may"] += 1
    elif " should " in text: modal_counts["should"] += 1
    elif "will not" in text: modal_counts["will not"] += 1
    elif " will " in text: modal_counts["will"] += 1
    elif "cannot" in text: modal_counts["cannot"] += 1
    else: modal_counts["(none)"] += 1
for m, c in modal_counts.most_common():
    print(f"  {m}: {c}")

# Save corpus skeleton (without results yet)
with open("tests/corpus/cbp-policy-corpus.json", "w") as f:
    json.dump({"version": "1.0", "source": "cms-2303-dhs-data-exch.pdf", "date": "2026-03-27", "sentences": corpus}, f, indent=2)

print("\nSaved to tests/corpus/cbp-policy-corpus.json")
