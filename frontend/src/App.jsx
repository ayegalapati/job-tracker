import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listApplications, getStats, createApplication, updateApplication, deleteApplication,
} from './api.js';

const COLUMNS = [
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'applied', label: 'Applied' },
  { key: 'interview', label: 'Interviewing' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejected', label: 'Rejected' },
];

const EMPTY_FORM = { company: '', role: '', status: 'applied', location: '', url: '', applied_date: '', notes: '' };

export default function App() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const [apps, counts] = await Promise.all([listApplications(), getStats()]);
      setItems(apps);
      setStats(counts);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) => `${a.company} ${a.role} ${a.location || ''}`.toLowerCase().includes(q));
  }, [items, query]);

  const setField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createApplication(form);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleMove(id, status) {
    try {
      await updateApplication(id, { status });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteApplication(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const active = stats ? stats.applied + stats.interview : 0;

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1>Job Tracker</h1>
          <p className="sub">
            {stats ? `${active} active applications, ${stats.interview} interviewing, ${stats.offer} offers` : 'Loading your pipeline'}
          </p>
        </div>
        <input
          className="search"
          type="search"
          placeholder="Search company, role, or location"
          aria-label="Search applications"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>

      {error && <div className="alert" role="alert">{error}</div>}

      <form className="add" onSubmit={handleAdd}>
        <label>Company<input name="company" value={form.company} onChange={setField} required maxLength={120} /></label>
        <label>Role<input name="role" value={form.role} onChange={setField} required maxLength={120} /></label>
        <label>Status
          <select name="status" value={form.status} onChange={setField}>
            {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>
        <label>Location<input name="location" value={form.location} onChange={setField} maxLength={120} /></label>
        <label>Applied on<input name="applied_date" type="date" value={form.applied_date} onChange={setField} /></label>
        <label>Posting link<input name="url" type="url" placeholder="https://" value={form.url} onChange={setField} /></label>
        <label className="wide">Notes<input name="notes" value={form.notes} onChange={setField} maxLength={2000} /></label>
        <button type="submit" disabled={saving}>{saving ? 'Saving' : 'Add application'}</button>
      </form>

      {loading ? (
        <p className="empty">Loading applications</p>
      ) : (
        <main className="board">
          {COLUMNS.map((col) => {
            const cards = visible.filter((a) => a.status === col.key);
            return (
              <section key={col.key} className={`col ${col.key}`} aria-label={col.label}>
                <h2>{col.label}<span className="count">{cards.length}</span></h2>
                {cards.length === 0 && <p className="empty">Nothing here yet</p>}
                {cards.map((a) => (
                  <article key={a.id} className="card">
                    <h3>{a.role}</h3>
                    <p className="company">{a.company}</p>
                    <p className="meta">
                      {[a.location, a.applied_date].filter(Boolean).join(', ')}
                    </p>
                    {a.notes && <p className="notes">{a.notes}</p>}
                    <div className="actions">
                      <select
                        aria-label={`Move ${a.role} at ${a.company}`}
                        value={a.status}
                        onChange={(e) => handleMove(a.id, e.target.value)}
                      >
                        {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                      {a.url && <a href={a.url} target="_blank" rel="noreferrer noopener">Posting</a>}
                      <button className="link danger" onClick={() => handleDelete(a.id)}>Delete</button>
                    </div>
                  </article>
                ))}
              </section>
            );
          })}
        </main>
      )}
    </div>
  );
}
