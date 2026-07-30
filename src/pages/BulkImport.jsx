import { useMemo, useRef, useState } from "react";
import {
  PFN_FIELDS,
  convertRows,
  downloadCsvTemplate,
  findDuplicates,
  insertContactsInBatches,
  mergeContact,
  parseSpreadsheet,
  suggestMapping,
  supabase,
  validateContacts,
} from "../lib";
import "../bulk-import.css";

const STEPS = ["Upload", "Map columns", "Review", "Import"];

export default function BulkImport({ userId = null, workspaceId = null, onComplete }) {
  const inputRef = useRef(null);
  const [step, setStep] = useState(0);
  const [fileInfo, setFileInfo] = useState(null);
  const [sourceRows, setSourceRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [contacts, setContacts] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    const valid = contacts.filter((contact) => !contact._errors?.length);
    return {
      total: contacts.length,
      ready: valid.filter((contact) => !contact._duplicate).length,
      duplicates: valid.filter((contact) => contact._duplicate).length,
      errors: contacts.filter((contact) => contact._errors?.length).length,
      create: valid.filter((contact) => contact._decision === "create").length,
      merge: valid.filter((contact) => contact._decision === "merge").length,
      skip: valid.filter((contact) => contact._decision === "skip").length,
    };
  }, [contacts]);

  async function acceptFile(file) {
    if (!file) return;
    setError("");
    setResult(null);
    setBusy(true);
    try {
      const parsed = await parseSpreadsheet(file);
      setFileInfo({ name: file.name, size: file.size, sheetName: parsed.sheetName });
      setSourceRows(parsed.rows);
      setHeaders(parsed.headers);
      setMapping(suggestMapping(parsed.headers));
      setStep(1);
    } catch (err) {
      setError(err.message || "The file could not be read.");
    } finally {
      setBusy(false);
    }
  }

  async function prepareReview() {
    setError("");
    const mapped = Object.values(mapping);
    if (!mapped.includes("name") && !(mapped.includes("first_name") && mapped.includes("last_name"))) {
      setError("Map a Full Name column, or both First Name and Last Name.");
      return;
    }
    setBusy(true);
    try {
      const converted = validateContacts(convertRows(sourceRows, mapping));
      const { data, error: loadError } = await supabase
        .from("contacts")
        .select("id,name,company,email,phone,title,linkedin_url,event,relationship_type,notes,personal_details,interests,ways_to_help,priority,follow_up_date,tags");
      if (loadError) throw loadError;
      setContacts(findDuplicates(converted, data || []));
      setStep(2);
    } catch (err) {
      setError(err.message || "PFN could not prepare the import.");
    } finally {
      setBusy(false);
    }
  }

  function setDecision(rowNumber, decision) {
    setContacts((current) =>
      current.map((contact) =>
        contact._row === rowNumber ? { ...contact, _decision: decision } : contact
      )
    );
  }

  function setAllDuplicates(decision) {
    setContacts((current) =>
      current.map((contact) =>
        contact._duplicate ? { ...contact, _decision: decision } : contact
      )
    );
  }

  async function runImport() {
    setBusy(true);
    setError("");
    setProgress(0);
    try {
      const valid = contacts.filter((contact) => !contact._errors?.length);
      const toCreate = valid.filter((contact) => contact._decision === "create");
      const toMerge = valid.filter((contact) => contact._decision === "merge");
      const skipped = valid.filter((contact) => contact._decision === "skip").length;

      const createResult = toCreate.length
        ? await insertContactsInBatches({
            supabase,
            contacts: toCreate,
            userId,
            workspaceId,
            onProgress: (value) => setProgress(Math.round(value * 0.8)),
          })
        : { created: [], failures: [] };

      let merged = 0;
      const mergeFailures = [];
      for (let index = 0; index < toMerge.length; index += 1) {
        const contact = toMerge[index];
        try {
          await mergeContact({
            supabase,
            existing: contact._duplicate,
            incoming: contact,
          });
          merged += 1;
        } catch (err) {
          mergeFailures.push({ row: contact._row, name: contact.name, error: err.message });
        }
        setProgress(80 + Math.round(((index + 1) / Math.max(toMerge.length, 1)) * 20));
      }

      const finalResult = {
        imported: createResult.created.length,
        merged,
        skipped,
        invalid: summary.errors,
        failures: [...createResult.failures, ...mergeFailures],
      };
      setResult(finalResult);
      setProgress(100);
      setStep(3);
      onComplete?.(finalResult);
    } catch (err) {
      setError(err.message || "The import failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep(0);
    setFileInfo(null);
    setSourceRows([]);
    setHeaders([]);
    setMapping({});
    setContacts([]);
    setProgress(0);
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main className="pfn-import-page">
      <section className="pfn-import-header">
        <div>
          <div className="pfn-eyebrow">PEOPLE FIRST NETWORK · V5</div>
          <h1>Bulk import contacts</h1>
          <p>Upload an Excel or CSV file, match its columns, review duplicates, and add multiple relationships at once.</p>
        </div>
        <button className="pfn-button secondary" type="button" onClick={downloadCsvTemplate}>
          Download template
        </button>
      </section>

      <ol className="pfn-stepper" aria-label="Import progress">
        {STEPS.map((label, index) => (
          <li key={label} className={index <= step ? "active" : ""}>
            <span>{index + 1}</span>
            <b>{label}</b>
          </li>
        ))}
      </ol>

      {error && <div className="pfn-alert error">{error}</div>}

      {step === 0 && (
        <section
          className={`pfn-dropzone ${dragging ? "dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            acceptFile(event.dataTransfer.files?.[0]);
          }}
        >
          <div className="pfn-upload-icon">⇧</div>
          <h2>Drop your spreadsheet here</h2>
          <p>Excel (.xlsx or .xls) and CSV files are supported.</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={(event) => acceptFile(event.target.files?.[0])}
          />
          <button
            className="pfn-button primary"
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Reading file…" : "Choose spreadsheet"}
          </button>
          <small>PFN reads the first worksheet in the file.</small>
        </section>
      )}

      {step === 1 && (
        <section className="pfn-panel">
          <div className="pfn-panel-title">
            <div>
              <div className="pfn-eyebrow">COLUMN MAPPING</div>
              <h2>{fileInfo?.name}</h2>
              <p>{sourceRows.length.toLocaleString()} rows found in “{fileInfo?.sheetName}”.</p>
            </div>
            <button className="pfn-link-button" type="button" onClick={reset}>
              Choose another file
            </button>
          </div>

          <div className="pfn-mapping-list">
            {headers.map((header) => (
              <label className="pfn-map-row" key={header}>
                <div>
                  <b>{header}</b>
                  <small>Example: {String(sourceRows[0]?.[header] ?? "").slice(0, 90) || "Blank"}</small>
                </div>
                <span>→</span>
                <select
                  value={mapping[header] || ""}
                  onChange={(event) =>
                    setMapping((current) => ({ ...current, [header]: event.target.value }))
                  }
                >
                  <option value="">Do not import</option>
                  {PFN_FIELDS.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="pfn-actions">
            <button className="pfn-button secondary" type="button" onClick={reset}>Cancel</button>
            <button className="pfn-button primary" type="button" disabled={busy} onClick={prepareReview}>
              {busy ? "Checking contacts…" : "Review import"}
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <>
          <section className="pfn-summary-grid">
            <article><strong>{summary.total}</strong><span>Rows found</span></article>
            <article><strong>{summary.ready}</strong><span>New contacts</span></article>
            <article><strong>{summary.duplicates}</strong><span>Duplicates</span></article>
            <article><strong>{summary.errors}</strong><span>Need attention</span></article>
          </section>

          <section className="pfn-panel">
            <div className="pfn-panel-title">
              <div>
                <div className="pfn-eyebrow">REVIEW</div>
                <h2>Confirm what PFN should do</h2>
                <p>New contacts will be created. Possible duplicates can be skipped, merged into the existing contact, or created separately.</p>
              </div>
            </div>

            {summary.duplicates > 0 && (
              <div className="pfn-bulk-decisions">
                <span>For all duplicates:</span>
                <button type="button" onClick={() => setAllDuplicates("skip")}>Skip all</button>
                <button type="button" onClick={() => setAllDuplicates("merge")}>Merge all</button>
                <button type="button" onClick={() => setAllDuplicates("create")}>Create all</button>
              </div>
            )}

            <div className="pfn-contact-table-wrap">
              <table className="pfn-contact-table">
                <thead>
                  <tr><th>Row</th><th>Contact</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact._row} className={contact._errors?.length ? "invalid" : ""}>
                      <td>{contact._row}</td>
                      <td>
                        <b>{contact.name || "Unnamed contact"}</b>
                        <small>
                          {[contact.title, contact.company].filter(Boolean).join(" · ")}
                          {contact.email ? ` · ${contact.email}` : ""}
                        </small>
                      </td>
                      <td>
                        {contact._errors?.length ? (
                          <span className="pfn-status error">{contact._errors.join(", ")}</span>
                        ) : contact._duplicate ? (
                          <span className="pfn-status warning">
                            {contact._duplicateReason}: {contact._duplicate.name}
                          </span>
                        ) : (
                          <span className="pfn-status success">Ready</span>
                        )}
                      </td>
                      <td>
                        {contact._errors?.length ? (
                          <span>Skipped</span>
                        ) : contact._duplicate ? (
                          <select
                            value={contact._decision}
                            onChange={(event) => setDecision(contact._row, event.target.value)}
                          >
                            <option value="skip">Skip</option>
                            <option value="merge">Merge missing fields</option>
                            <option value="create">Create new</option>
                          </select>
                        ) : (
                          <span>Create</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pfn-import-totals">
              <span><b>{summary.create}</b> create</span>
              <span><b>{summary.merge}</b> merge</span>
              <span><b>{summary.skip + summary.errors}</b> skip</span>
            </div>

            <div className="pfn-actions">
              <button className="pfn-button secondary" type="button" onClick={() => setStep(1)}>Back</button>
              <button
                className="pfn-button primary"
                type="button"
                disabled={busy || summary.create + summary.merge === 0}
                onClick={runImport}
              >
                {busy ? "Importing…" : `Import ${summary.create + summary.merge} contacts`}
              </button>
            </div>

            {busy && (
              <div className="pfn-progress">
                <div style={{ width: `${progress}%` }} />
                <span>{progress}%</span>
              </div>
            )}
          </section>
        </>
      )}

      {step === 3 && result && (
        <section className="pfn-panel pfn-complete">
          <div className="pfn-success-mark">✓</div>
          <div className="pfn-eyebrow">IMPORT COMPLETE</div>
          <h2>Your PFN contacts are updated</h2>

          <div className="pfn-summary-grid">
            <article><strong>{result.imported}</strong><span>Created</span></article>
            <article><strong>{result.merged}</strong><span>Merged</span></article>
            <article><strong>{result.skipped}</strong><span>Skipped</span></article>
            <article><strong>{result.failures.length + result.invalid}</strong><span>Not imported</span></article>
          </div>

          {result.failures.length > 0 && (
            <div className="pfn-alert error">
              <b>Some rows could not be imported.</b>
              {result.failures.slice(0, 10).map((failure) => (
                <div key={`${failure.row}-${failure.name}`}>
                  Row {failure.row}: {failure.name || "Unnamed"} — {failure.error}
                </div>
              ))}
            </div>
          )}

          <div className="pfn-actions centered">
            <button className="pfn-button secondary" type="button" onClick={reset}>
              Import another file
            </button>
            <button
              className="pfn-button primary"
              type="button"
              onClick={() => window.location.assign("/people")}
            >
              View people
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
