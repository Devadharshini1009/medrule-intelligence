# MedRule Intelligence — Knowledge Engineering

**Course:** 22ITE61 — Knowledge Engineering  
**Activity:** Knowledge to Intelligence  
**Problem:** Two medical experts provide different rules for diagnosing the same condition. How should a knowledge engineering system represent and resolve the conflicting knowledge?

## What this project actually does

1. **Knowledge acquisition:** Enter two experts' IF conditions, THEN conclusions, decision categories, and optional evidence/source notes.
2. **Knowledge representation:** Preserve two attributed IF–THEN production rules.
3. **Rule comparison:** Find shared and exclusive conditions, compare normalized conclusions, and check explicit opposing decision categories.
4. **Applicability reasoning:** Optionally enter hypothetical case facts; the deterministic engine checks whether *all* conditions of each rule are present. Missing facts mean a rule's applicability is **not established**, not false. Enter `NOT: finding` to explicitly refute a rule condition.
5. **Explainable resolution:** Return a case-specific explanation, identify evidence/clarification gaps, and escalate opposing applicable conclusions for independent qualified review. The system **never chooses a medical diagnosis**.
6. **MongoDB:** Save analysis inputs/results and allow a human reviewer to record a status and notes. History requires a database connection.
7. **Demonstrations:** 25 comparison examples and 25 potential conflict examples. These are fictional, not medically validated.

**Not implemented / not claimed:** clinical guideline retrieval, medical fact verification, Bayesian probabilities, trained AI, ontology inference, semantic equivalence of different text, autonomous diagnosis. This is a deterministic academic prototype. Conclusions with different wording are not automatically declared logically contradictory unless explicitly categorized as opposing. Evidence text is recorded but never independently verified.

## Requirements
- Node.js 20+ and npm
- Optional: MongoDB Community Server or MongoDB Atlas

## Run in VS Code (Windows PowerShell)

1. Extract ZIP and **open the inner `medrule-intelligence` folder** in VS Code. Check `dir` displays `package.json`, `client`, `server`.
2. In terminal:

```powershell
npm install
npm run install:all
npm run dev
```

3. Visit **http://localhost:5173**. Backend API listens on **http://localhost:5000**. Test backend at **http://localhost:5000/api/health** (the backend root `/` need not show a page).
4. Without MongoDB, analysis works, but results are not saved.

## MongoDB setup

Copy `server/.env.example` to `server/.env`. For local MongoDB use:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/medrule_intelligence
```

Or use an Atlas connection URI. In Atlas, create a database user, permit your current IP under Network Access, and copy the connection URI. **Never commit real passwords or `.env`.** Restart `npm run dev` after editing `.env`. `http://localhost:5000/api/health` should show `"database":"connected"`. Run an analysis and open Saved Analyses to confirm persistence. Atlas must be reachable for history to work.

## API

- `GET /api/health` — API and DB status
- `POST /api/analyze` — compare two expert rules; save if DB connected
- `GET /api/history` — 50 most recent saved analyses
- `PATCH /api/history/:id/review` — record reviewer status and notes (requires DB)

Example POST body:

```json
{
  "condition":"Fictional Condition X",
  "expert1":{"name":"Expert A","conditions":["Fever","Cough"],"conclusion":"Condition X supported","decision":"support","evidence":"Fictional source note"},
  "expert2":{"name":"Expert B","conditions":["Fever","Cough"],"conclusion":"Condition X not supported","decision":"oppose","evidence":"Fictional source note"},
  "caseFacts":["Fever","Cough"]
}
```

## Test

```powershell
npm test --prefix server
npm run build --prefix client
```

## GitHub

```powershell
git init
git add .
git commit -m "Build MedRule knowledge engineering prototype"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Create the empty repository on GitHub first. `.gitignore` excludes credentials and node_modules.

## Research / design references

- HL7 Clinical Practice Guidelines — Knowledge Engineering Overview: https://hl7.org/fhir/uv/cpg/documentation-approach-05-knowledge-engineering-overview.html
- Clinical guideline knowledge engineering and implementation: https://pmc.ncbi.nlm.nih.gov/articles/PMC5333329/
- Systematic review of rule-based clinical decision support: https://doi.org/10.1007/s12553-022-00672-9
- Mongoose connection documentation: https://mongoosejs.com/docs/connections.html

The references inform the design, but this prototype does not implement or validate those clinical standards.

## Conflict resolution logic (implemented)

- **Both opposing rules meet all known positive IF conditions:** unresolved logical contradiction; expert review required, not an automatic diagnosis.
- **One opposing rule fully met and the other explicitly refuted:** resolves the *case-specific applicability conflict*; does not establish which diagnosis is medically true.
- **Both rules explicitly refuted:** neither applies to this hypothetical case.
- **Missing IF condition without explicit negation:** unknown, not false; request missing facts.
- **Same fact supplied as both present and `NOT:` absent:** inconsistent input; correct facts first.
- **Same conclusion:** no conclusion conflict, though scope/applicability may differ.
- **Different wording without explicit opposing categories:** clarification required.

The result includes an auditable **Logical reasoning trace** showing the comparison, applicability, refuted conditions, and resolution. User-supplied evidence notes are *not verified*. This is a logical knowledge-conflict resolution demonstration, not autonomous medical conflict adjudication.

### Test the new resolution case

Expert 1: IF `Fever`, `Cough` THEN `Condition X supported` (Supports).
Expert 2: IF `Fever`, `Test B` THEN `Condition X not supported` (Opposes).
Hypothetical case facts (each on its own line): `Fever`, `Cough`, `NOT: Test B`.
Expected: **Resolved by rule applicability** (Expert 1 conditions met; Expert 2 conditions refuted). Compare with facts `Fever`, `Cough`, `Test B`, which requires expert review because both opposing rules apply.
