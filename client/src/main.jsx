
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrainCircuit,
  GitCompareArrows,
  Database,
  ShieldCheck,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ClipboardList,
  Info,
  Activity
} from 'lucide-react';

import { examples } from './examples.js';
import { conflicts } from './conflicts.js';
import './style.css';

// Backend API configuration
// Vercel: set VITE_API_URL to your Render backend URL.
// Local development: Vite proxy can handle relative /api requests.
const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://medrule-intelligence.onrender.com'
    : '')
).replace(/\/+$/, '');

const api = (path) => `${API_URL}${path}`;

const base = {
  condition: 'Fictional Condition X',
  expert1: {
    name: 'Expert A',
    conditions: ['Fever', 'Cough'],
    conclusion: 'Condition X supported',
    decision: 'support',
    evidence: ''
  },
  expert2: {
    name: 'Expert B',
    conditions: ['Fever', 'Cough'],
    conclusion: 'Condition X not supported',
    decision: 'oppose',
    evidence: ''
  },
  caseFacts: []
};

const clean = (x) => ({
  ...x,
  expert1: {
    decision: 'uncertain',
    evidence: '',
    ...x.expert1
  },
  expert2: {
    decision: 'uncertain',
    evidence: '',
    ...x.expert2
  },
  caseFacts: x.caseFacts || []
});

const labels = {
  'potential-conflict': 'Potential rule conflict',
  'compatible': 'Compatible conclusions',
  'requires-interpretation': 'Interpretation needed',
  'expert-review-required': 'Expert review required',
  'no-conclusion-conflict': 'No conclusion conflict',
  'applicability-not-established': 'Applicability not established',
  'clarification-required': 'Clarification required',
  'resolved-by-applicability': 'Resolved by rule applicability',
  'neither-rule-applicable': 'Neither rule applicable',
  'inconsistent-case-facts': 'Inconsistent case facts'
};

function App() {
  const [tab, setTab] = useState('analyze');
  const [data, setData] = useState(base);
  const [result, setResult] = useState(null);
  const [health, setHealth] = useState('checking');
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [exampleIndex, setExampleIndex] = useState(-1);
  const [conflictIndex, setConflictIndex] = useState(-1);
  const [reviewDrafts, setReviewDrafts] = useState({});

  // Fetch backend health and MongoDB history
  const refresh = async () => {
    try {
      const [a, b] = await Promise.all([
        fetch(api('/api/health')),
        fetch(api('/api/history'))
      ]);

      if (!a.ok || !b.ok) {
        throw new Error('Unable to reach backend API');
      }

      const healthData = await a.json();
      const historyData = await b.json();

      setHealth(healthData.database);
      setHistory(historyData.items || []);
    } catch (err) {
      console.error('API connection error:', err);
      setHealth('offline');
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const load = (list, index, setIndex) => {
    const x = clean(list[index]);

    setIndex(index);
    setData(x);
    setResult(null);
    setError('');
    setTab('analyze');
  };

  const setRule = (key, field, value) => {
    setData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  // Analyze expert rules using Render backend
  const analyze = async (e) => {
    e.preventDefault();

    setBusy(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(api('/api/analyze'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || 'Analysis failed');
      }

      setResult(body);
      await refresh();

      setTimeout(() => {
        document
          .getElementById('results')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
      }, 80);
    } catch (err) {
      setError(err.message || 'Unable to analyze rules');
    } finally {
      setBusy(false);
    }
  };

  // Save expert review in MongoDB
  const saveReview = async (item) => {
    const draft =
      reviewDrafts[item._id] ||
      item.review || {
        status: 'pending',
        notes: ''
      };

    try {
      const r = await fetch(
        api(`/api/history/${item._id}/review`),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(draft)
        }
      );

      const body = await r.json();

      if (!r.ok) {
        throw new Error(body.error || 'Unable to save review');
      }

      await refresh();
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to save review');
    }
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brandmark">
            <BrainCircuit size={24} />
          </span>

          <div>
            <strong>
              MedRule <i>Intelligence</i>
            </strong>
            <small>KNOWLEDGE ENGINEERING</small>
          </div>
        </div>

        <p className="nav-caption">WORKSPACE</p>

        <button
          className={'nav ' + (tab === 'analyze' ? 'active' : '')}
          onClick={() => setTab('analyze')}
        >
          <GitCompareArrows size={19} />
          Rule Analyzer
        </button>

        <button
          className={'nav ' + (tab === 'history' ? 'active' : '')}
          onClick={() => {
            setTab('history');
            refresh();
          }}
        >
          <Database size={19} />
          Saved Analyses
        </button>

        <div className="sidebar-note">
          <ShieldCheck size={20} />
          <div>
            <b>Educational prototype</b>
            <p>
              Fictional scenarios only. No clinical diagnosis
              or treatment recommendations.
            </p>
          </div>
        </div>
      </aside>

      <main>
        <header className="top">
          <span>22ITE61 / Knowledge to Intelligence</span>

          <span className="dbstatus">
            <span
              className={
                'dot ' + (health === 'connected' ? 'on' : '')
              }
            />

            {health === 'connected'
              ? 'MongoDB connected'
              : health === 'disconnected'
              ? 'MongoDB not connected'
              : 'API ' + health}
          </span>
        </header>

        <div className="content">
          <div className="eyebrow">
            <Activity size={16} />
            INTELLIGENT KNOWLEDGE SYSTEM
          </div>

          <h1>
            {tab === 'analyze'
              ? 'Expert Rule Conflict Analyzer'
              : 'Saved Analyses'}
          </h1>

          <p className="subtitle">
            Represent two experts’ IF–THEN rules, evaluate
            differences and applicability, and explain how
            unresolved knowledge should be reviewed.
          </p>

          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}

          {tab === 'analyze' ? (
            <>
              <div className="stats">
                <div>
                  <BookOpen />
                  <span>
                    <small>REPRESENT</small>
                    <b>IF–THEN knowledge</b>
                  </span>
                </div>

                <div>
                  <GitCompareArrows />
                  <span>
                    <small>COMPARE</small>
                    <b>Conditions & conclusions</b>
                  </span>
                </div>

                <div>
                  <ShieldCheck />
                  <span>
                    <small>REVIEW</small>
                    <b>Explainable resolution</b>
                  </span>
                </div>
              </div>

              <form onSubmit={analyze}>
                <section className="panel">
                  <div className="section-head">
                    <div>
                      <h2>
                        <em>01</em> Knowledge acquisition
                      </h2>
                      <p>
                        Choose a fictional demonstration or
                        enter your own two expert rules.
                      </p>
                    </div>
                  </div>

                  <div className="picker-grid">
                    <div className="picker">
                      <div className="picker-top">
                        <b>Compatible / comparison examples</b>

                        <button
                          type="button"
                          className="outline"
                          onClick={() =>
                            load(
                              examples,
                              (exampleIndex + 1) % examples.length,
                              setExampleIndex
                            )
                          }
                        >
                          Load example (
                          {(exampleIndex + 1) % 25 + 1}/25)
                        </button>
                      </div>

                      <select
                        aria-label="Choose comparison example"
                        value={exampleIndex}
                        onChange={(e) => {
                          const i = Number(e.target.value);
                          if (i >= 0) {
                            load(examples, i, setExampleIndex);
                          }
                        }}
                      >
                        <option value={-1}>
                          Choose from 25 examples
                        </option>

                        {examples.map((x, i) => (
                          <option value={i} key={i}>
                            {String(i + 1).padStart(2, '0')}
                            {' — '}
                            {x.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="picker">
                      <div className="picker-top">
                        <b>Potential conflict examples</b>

                        <button
                          type="button"
                          className="outline"
                          onClick={() =>
                            load(
                              conflicts,
                              (conflictIndex + 1) % conflicts.length,
                              setConflictIndex
                            )
                          }
                        >
                          Load conflict (
                          {(conflictIndex + 1) % 25 + 1}/25)
                        </button>
                      </div>

                      <select
                        aria-label="Choose conflict example"
                        value={conflictIndex}
                        onChange={(e) => {
                          const i = Number(e.target.value);
                          if (i >= 0) {
                            load(conflicts, i, setConflictIndex);
                          }
                        }}
                      >
                        <option value={-1}>
                          Choose from 25 conflicts
                        </option>

                        {conflicts.map((x, i) => (
                          <option value={i} key={i}>
                            {String(i + 1).padStart(2, '0')}
                            {' — '}
                            {x.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="notice">
                    <Info size={17} />
                    The examples are fictional teaching cases.
                    Explicit decision categories improve comparison;
                    they do not establish medical truth.
                  </div>

                  <label className="field-label">
                    Condition / domain
                  </label>

                  <input
                    required
                    maxLength={140}
                    value={data.condition}
                    onChange={(e) =>
                      setData({
                        ...data,
                        condition: e.target.value
                      })
                    }
                  />

                  <div className="expert-grid">
                    {['expert1', 'expert2'].map((key, i) => (
                      <div className="expert" key={key}>
                        <div className="expert-title">
                          <span className="avatar">{i + 1}</span>

                          <div>
                            <h3>Medical Expert {i + 1}</h3>
                            <small>
                              Rule {i + 1} · IF conditions → THEN conclusion
                            </small>
                          </div>
                        </div>

                        <label className="field-label">
                          Expert name
                        </label>

                        <input
                          required
                          maxLength={100}
                          value={data[key].name}
                          onChange={(e) =>
                            setRule(key, 'name', e.target.value)
                          }
                        />

                        <label className="field-label">
                          IF — Conditions (one per line)
                        </label>

                        <textarea
                          required
                          rows={4}
                          value={data[key].conditions.join('\n')}
                          onChange={(e) =>
                            setRule(
                              key,
                              'conditions',
                              e.target.value.split('\n')
                            )
                          }
                        />

                        <label className="field-label">
                          THEN — Conclusion
                        </label>

                        <input
                          required
                          maxLength={240}
                          value={data[key].conclusion}
                          onChange={(e) =>
                            setRule(
                              key,
                              'conclusion',
                              e.target.value
                            )
                          }
                        />

                        <label className="field-label">
                          Conclusion category (for logical comparison)
                        </label>

                        <select
                          value={data[key].decision || 'uncertain'}
                          onChange={(e) =>
                            setRule(
                              key,
                              'decision',
                              e.target.value
                            )
                          }
                        >
                          <option value="uncertain">
                            Unspecified / uncertain
                          </option>
                          <option value="support">
                            Supports the condition
                          </option>
                          <option value="oppose">
                            Opposes the condition
                          </option>
                        </select>

                        <label className="field-label">
                          Evidence or source (optional, not automatically verified)
                        </label>

                        <textarea
                          rows={2}
                          maxLength={500}
                          placeholder="E.g., fictional guideline reference or evidence note"
                          value={data[key].evidence || ''}
                          onChange={(e) =>
                            setRule(
                              key,
                              'evidence',
                              e.target.value
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="facts">
                    <h3>
                      Hypothetical case facts <span>(optional)</span>
                    </h3>

                    <p>
                      Enter known present facts, one per line.
                      For an explicitly absent fact, write NOT:
                      followed by the condition (example: NOT: cough).
                      Missing facts remain unknown. Blank means not assessed.
                    </p>

                    <textarea
                      rows={3}
                      value={(data.caseFacts || []).join('\n')}
                      placeholder={'Fever\nCough'}
                      onChange={(e) =>
                        setData({
                          ...data,
                          caseFacts: e.target.value
                            ? e.target.value.split('\n')
                            : []
                        })
                      }
                    />
                  </div>

                  <div className="form-footer">
                    <span>
                      <ShieldCheck size={16} />
                      Rules and evidence are not clinically validated.
                    </span>

                    <button
                      className="primary"
                      disabled={busy}
                      type="submit"
                    >
                      {busy ? 'Analyzing…' : 'Analyze Expert Rules'}
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </section>
              </form>

              {result && (
                <section
                  className="panel result-panel"
                  id="results"
                >
                  <div className="section-head">
                    <div>
                      <h2>
                        <em>02</em> Conflict analysis & reasoning
                      </h2>
                      <p>
                        Deterministic, auditable knowledge comparison.
                      </p>
                    </div>

                    <span
                      className={
                        'pill ' +
                        (result.result.classification === 'compatible'
                          ? 'good'
                          : 'warn')
                      }
                    >
                      {result.result.classification === 'compatible'
                        ? <CheckCircle2 size={16} />
                        : <AlertTriangle size={16} />}

                      {labels[result.result.classification]}
                    </span>
                  </div>

                  <div className="finding">
                    <h3>
                      {labels[result.result.resolutionStatus]}
                    </h3>

                    <p>{result.result.summary}</p>

                    <p className="muted">
                      {result.result.reason}
                    </p>
                  </div>

                  <div className="comparison">
                    {[
                      ['Shared conditions', result.result.shared],
                      ['Only Expert 1', result.result.onlyA],
                      ['Only Expert 2', result.result.onlyB]
                    ].map(([name, items]) => (
                      <div key={name}>
                        <h4>{name}</h4>

                        {items.length
                          ? items.map((x) => (
                              <span className="tag" key={x}>
                                {x}
                              </span>
                            ))
                          : <i>None</i>}
                      </div>
                    ))}
                  </div>

                  <div className="applicability">
                    <h3>IF–THEN rule applicability</h3>

                    <div className="two">
                      <div>
                        <b>Expert 1</b>

                        <span>
                          {result.result.applicability.expert1.replaceAll('-', ' ')}
                        </span>

                        {result.result.applicability.refutedA?.length > 0 && (
                          <small>
                            Refuted: {result.result.applicability.refutedA.join(', ')}
                          </small>
                        )}

                        {result.result.applicability.missingA.length > 0 && (
                          <small>
                            Missing: {result.result.applicability.missingA.join(', ')}
                          </small>
                        )}
                      </div>

                      <div>
                        <b>Expert 2</b>

                        <span>
                          {result.result.applicability.expert2.replaceAll('-', ' ')}
                        </span>

                        {result.result.applicability.refutedB?.length > 0 && (
                          <small>
                            Refuted: {result.result.applicability.refutedB.join(', ')}
                          </small>
                        )}

                        {result.result.applicability.missingB.length > 0 && (
                          <small>
                            Missing: {result.result.applicability.missingB.join(', ')}
                          </small>
                        )}
                      </div>
                    </div>
                  </div>

                  <h3 className="steps-title">
                    Logical reasoning trace
                  </h3>

                  <ol className="steps">
                    {result.result.reasoningTrace?.map((step, i) => (
                      <li key={i}>
                        <span>{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>

                  <h3 className="steps-title">
                    Explainable resolution / next steps
                  </h3>

                  <ol className="steps">
                    {result.result.nextSteps.map((step, i) => (
                      <li key={i}>
                        <span>{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>

                  <div className="save-note">
                    <Database size={16} />

                    {result.saved
                      ? 'Analysis saved to MongoDB.'
                      : result.saveError
                      ? 'Analysis complete; MongoDB save failed.'
                      : 'Analysis complete; connect MongoDB to save history.'}
                  </div>

                  <p className="disclaimer">
                    {result.result.method}
                  </p>
                </section>
              )}
            </>
          ) : (
            <section className="panel">
              <div className="section-head">
                <div>
                  <h2>
                    <em>03</em> Analysis history & expert review
                  </h2>
                  <p>
                    Stored analyses and human review notes.
                    Requires MongoDB.
                  </p>
                </div>

                <button
                  className="outline"
                  onClick={refresh}
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>

              {health !== 'connected' && (
                <div className="notice">
                  MongoDB is not connected. Check the backend
                  connection and MONGODB_URI configuration.
                </div>
              )}

              {history.length === 0 ? (
                <div className="empty">
                  <ClipboardList size={38} />
                  <h3>No saved analyses yet</h3>
                  <p>
                    Connect MongoDB, analyze a rule pair,
                    then return here.
                  </p>
                </div>
              ) : (
                history.map((item) => {
                  const draft =
                    reviewDrafts[item._id] ||
                    item.review || {
                      status: 'pending',
                      notes: ''
                    };

                  return (
                    <div className="history" key={item._id}>
                      <div className="history-top">
                        <div>
                          <h3>{item.condition}</h3>
                          <small>
                            {new Date(item.createdAt).toLocaleString()}
                          </small>
                          <p>
                            {item.expert1?.name} vs {item.expert2?.name}
                          </p>
                        </div>

                        <span className="pill">
                          {labels[item.result?.classification] || 'Analyzed'}
                        </span>
                      </div>

                      <p>{item.result?.summary}</p>

                      <div className="review-grid">
                        <label>
                          Review status

                          <select
                            value={draft.status}
                            onChange={(e) =>
                              setReviewDrafts((s) => ({
                                ...s,
                                [item._id]: {
                                  ...draft,
                                  status: e.target.value
                                }
                              }))
                            }
                          >
                            <option value="pending">
                              Pending
                            </option>
                            <option value="needs-more-evidence">
                              Needs more evidence
                            </option>
                            <option value="reviewed">
                              Reviewed
                            </option>
                          </select>
                        </label>

                        <label>
                          Reviewer notes

                          <textarea
                            rows={2}
                            value={draft.notes || ''}
                            onChange={(e) =>
                              setReviewDrafts((s) => ({
                                ...s,
                                [item._id]: {
                                  ...draft,
                                  notes: e.target.value
                                }
                              }))
                            }
                          />
                        </label>

                        <button
                          className="outline"
                          onClick={() => saveReview(item)}
                        >
                          Save review
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          )}

          <footer>
            22ITE61 · Knowledge Engineering · Knowledge to Intelligence
            <span>Academic demonstration only</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
