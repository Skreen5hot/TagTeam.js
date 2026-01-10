## Moral Deliberation Interface (MDI) — Version 2.0

**Status:** Draft v2.0 | **Date:** 2026-01-04
**Core Philosophy:** The interface is a "Moral Mirror." It must resist the user's desire for a quick answer and instead illuminate the structural complexity of the choice.

---

## 1. Updated Purpose & Non-Goals

### 1.1 Purpose

The MDI is a cognitive scaffolding tool. It exists to visualize the "geometry" of a moral problem across twelve worldviews, ensuring no perspective is ignored.

### 1.2 Added Constraint: The "Agentic Gap"

The UI MUST explicitly signal its own lack of moral agency. It must maintain a visual and linguistic "gap" between its analytical output and the user's final existential choice.

---

## 2. Core Design Principles (Normative Requirements)

### 2.1 The Void Center (New)

The center of the radial chart MUST NOT contain a single icon or score. It represents the "Space of Freedom" where the user must act. Synthesis is shown as a relationship between worldviews, not a destination at the center.

### 2.2 Delta Highlighting (New)

In comparison modes, the UI shall highlight **divergence** rather than **dominance**. It identifies where two actions create the most distinct "moral shapes."

### 2.3 Deliberative Pacing (New)

The UI MUST NOT feel "snappy" in a way that encourages mindless clicking. Transitions should be intentional and smooth, mirroring the gravity of the subject matter.

---

## 3. Primary Visualization: Twelve-Worldview Radial Chart

### 3.1 Structural Invariants

* **Fixed Arcs:** The 12 worldviews are mapped to a 360-degree circle.
* **Cluster Grouping:** Visual cues (subtle background shading) group the Material, Process, and Depth clusters.

### 3.2 Visual Encoding Semantics (Updated)

| Variable | Visual Encoding | Logic |
| --- | --- | --- |
| **Moral Salience** | **Radial Distance** | How "loud" this worldview is in this specific context. |
| **Judgment Polarity** | **Color Hue** | Use a divergent palette (e.g., Indigo for Affirming, Ochre for Concerning). Avoid Red/Green. |
| **Uncertainty** | **Opacity/Blur** | High uncertainty = "Fuzzy" edges or lower opacity. |
| **Internal Tension** | **Texture (Dashing)** | A dashed arc indicates that even within one worldview (e.g., Rationalism), there are conflicting principles. |

### 3.3 The "Fractured Synthesis" Glyph (Updated)

Instead of a single point in the center, the "Integral Synthesis" is represented as a **Constellation Overlay**:

* Lines connect the worldviews that are in the highest tension.
* A "Centroid of Gravity" dot may appear, but it MUST NOT be at the geometric center (to avoid the "average" fallacy).

---

## 4. Interaction Mechanics

### 4.1 Focus Modes (Cognitive Load Management)

* **Requirement:** Users can click a "Cluster Label" (e.g., "Depth-Spiritual") to dim the other 8 worldviews.
* **Requirement:** The UI must support "Solo View" to read the deep-dive justification for a single worldview without visual noise.

### 4.2 Natural Language Ontological Path (Inspection)

Hovering over an arc reveals the reasoning.

* **Prohibited:** Raw URI/Code strings.
* **Required Template:** "This [Worldview] perspective identifies a [Moral Disposition] of [Value] realized through the [Process] of [Action]."

---

## 5. Comparison Mode (Updated)

### 5.1 No-Winner Policy

* **Requirement:** When comparing Option A and Option B, the UI shall render two charts side-by-side.
* **Requirement:** Differences in "Moral Shape" (the area covered by the arcs) shall be subtly outlined in a neutral "Difference Layer" to help the eye track divergence.

---

## 6. Uncertainty & Agent Status

### 6.1 Persistent Agent Status Indicator

* **Requirement:** A footer or header must be persistently visible.
* **Text:** "Model Output: Multi-perspectival Analysis. This system bears no moral cost for this evaluation. Action requires human agency."

### 6.2 The "Doubt" Indicator

If the data underlying a specific worldview is missing or weak, that arc MUST appear as a "Ghost Arc" (wireframe only) to signal an epistemic void.

---

## 7. Language & Copy Requirements (Version 2.0)

### 7.1 Forbidden Terms (The "Priest" List)

* "Optimal," "Recommended," "Best Practice," "Correct," "Misaligned," "Warning."

### 7.2 Required Phrases (The "Partner" List)

* "The tension appears to be..."
* "This perspective prioritizes..."
* "There is significant uncertainty regarding..."
* "Unlike Option A, Option B emphasizes..."

---

## 8. Ethical Compliance Release Gate (The Checklist)

A build is rejected if:

1. [ ] Any "Score" (0-100 or A-F) is visible.
2. [ ] The center of the chart contains a "Final Verdict" icon.
3. [ ] A user can "Accept" a recommendation without expanding at least one justification chain.
4. [ ] The "Agent Status" indicator is hidden or small (<10pt font).
5. [ ] Differences between worldviews are "averaged" into a single line.

---

## 9. Success Criteria

The MDI is successful if a user, after using the tool, says: **"I see the problem more clearly now, and it’s actually harder to decide than I thought."** *(Success = Increased Moral Complexity).*