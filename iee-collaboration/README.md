# IEE Collaboration Interface

This folder manages all communication and artifacts between TagTeam and the Integral Ethics Engine (IEE) team.

---

## 📁 Structure

```
iee-collaboration/
├── from-iee/                # Artifacts FROM IEE team
│   ├── requirements/        # Requirements documents
│   ├── data/                # JSON data (compound terms, test corpus, values)
│   ├── validators/          # Validation scripts
│   └── communication/       # Q&A, delivery summaries
│
└── to-iee/                  # Deliverables TO IEE team
    └── week1/               # Week 1 deliverables
        ├── DELIVERABLE.md
        ├── INTEGRATION_COMPLETE.md
        ├── FORMAT_UPDATES.md
        └── STATUS.md
```

---

## 👉 FROM IEE

**[from-iee/](from-iee/)** contains artifacts received from the IEE team:

- **Requirements:** Integration specs, test plans
- **Data:** compound-terms.json (150 terms), test-corpus-week1.json (5 scenarios), value-definitions-core.json (20 values)
- **Validators:** Official validation scripts
- **Communication:** Q&A, delivery summaries, testing handoffs

---

## 👈 TO IEE

**[to-iee/](to-iee/)** contains deliverables sent to the IEE team:

### Week 1 (Complete ✅)
- Semantic role extraction
- 150 compound terms integrated
- IEE format compliance
- Test suite with 4/4 scenarios passing

---

## 🔄 Collaboration Workflow

1. **IEE delivers artifacts** → saved in `from-iee/`
2. **TagTeam integrates** → implementation in `src/`
3. **TagTeam validates** → tests in `tests/`
4. **TagTeam delivers** → packaged in `to-iee/weekN/`

---

## 📦 Packaging Deliverables

To package Week 1 deliverables for IEE:

```bash
cd iee-collaboration/to-iee
zip -r week1-deliverables.zip week1/
```

---

## 📝 Communication Log

All IEE communication preserved in `from-iee/communication/`:
- questions-answered.md
- delivery-summary.md
- testing-handoff.md

---

**Last Updated:** 2026-01-10
**Current Week:** Week 1 (Complete ✅)
