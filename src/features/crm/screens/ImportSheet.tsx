/**
 * CSV import: choose a file → match columns → say where it came from (and, for the Owner, the
 * consent evidence) → preview → import. Uses core/contacts/import.ts.
 */
import { CONTACT_TYPE_LABELS, CONTACT_TYPES, guessMapping, IMPORT_FIELD_LABELS, IMPORT_FIELDS, parseCsv, planImport, type ContactType, type ImportField, type ImportOptions, type ImportPlan } from '../core';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button, Field, Pill, Select, Sheet, Toggle, toast } from '../components/ui';
import { useBackend } from '../data/useBackend';

const SAMPLE = `First name,Last name,Email,Phone,Company,Job title,Tags,Agreed to emails
Jo,Whitlock,jo.whitlock@thecityledger.example,,The City Ledger,Features Writer,press,yes
Kit,Marsh,kit.marsh@northernsocial.example,07700 900901,Northern Social,Editor,press,yes
Rae,Lindqvist,rae@nightlifenotes.example,,Nightlife Notes,Contributing editor,press,no
Rae,Lindqvist,RAE@nightlifenotes.example,,Nightlife Notes,,press,
Theo,Brannigan,,07700 900902,,Freelance photographer,creator,
Max,Field,not-an-email,,,,press,
,,,,Somewhere Media,,,
`;

type Step = 'choose' | 'map' | 'preview';

export function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const b = useBackend();
  const owner = b.can('consent.declareImportEvidence');
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('choose');
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState<{ headers: string[]; rows: string[][] }>({ headers: [], rows: [] });
  // The file as chosen: the server parses and plans it again before importing.
  const [csvText, setCsvText] = useState('');
  const [mapping, setMapping] = useState<ImportField[]>([]);
  const [source, setSource] = useState('');
  const [type, setType] = useState<ContactType>('Other');
  const [tag, setTag] = useState('');
  const [evidenceOn, setEvidenceOn] = useState(false);
  const [wording, setWording] = useState('');
  const [agreedOn, setAgreedOn] = useState('');
  const [busy, setBusy] = useState(false);

  const load = (name: string, text: string) => {
    const parsed = parseCsv(text);
    if (parsed.headers.length === 0) {
      toast('That file looks empty', 'warn');
      return;
    }
    setFileName(name);
    setCsv(parsed);
    setCsvText(text);
    setMapping(guessMapping(parsed.headers));
    setSource((s) => s || name.replace(/\.csv$/i, ''));
    setStep('map');
  };

  const options: ImportOptions = {
    fileName,
    sourceDetail: source.trim() || fileName,
    defaultType: type,
    tags: tag.trim() ? [tag.trim().toLowerCase()] : [],
    ...(evidenceOn && owner && wording.trim() && agreedOn ? { consentEvidence: { wordingVersion: wording.trim(), capturedAt: new Date(`${agreedOn}T12:00:00Z`).toISOString(), description: source.trim() || fileName } } : {}),
  };
  const plan: ImportPlan | undefined = useMemo(
    () => (step === 'preview' ? planImport(csv.rows, mapping, b.state.world.contacts, options) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, csv, mapping, source, type, tag, evidenceOn, wording, agreedOn, b.version],
  );
  const reset = () => {
    setStep('choose');
    setCsv({ headers: [], rows: [] });
    setCsvText('');
    setFileName('');
    setSource('');
    setEvidenceOn(false);
  };
  const close = () => {
    reset();
    onClose();
  };
  const hasContactColumn = mapping.includes('email') || mapping.includes('phone');

  return (
    <Sheet
      open={open}
      onClose={close}
      wide
      title="Import contacts from a spreadsheet"
      footer={
        step === 'map' ? (
          <>
            <Button variant="ghost" onClick={reset}>
              Back
            </Button>
            <Button variant="primary" disabled={!hasContactColumn || (evidenceOn && (!wording.trim() || !agreedOn))} onClick={() => setStep('preview')}>
              Preview
            </Button>
          </>
        ) : step === 'preview' && plan ? (
          <>
            <Button variant="ghost" onClick={() => setStep('map')}>
              Back
            </Button>
            <Button
              variant="primary"
              disabled={busy || plan.create.length + plan.update.length === 0}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await b.applyImport(csvText, mapping, options);
                  toast(`Imported: ${r.created} new, ${r.updated} updated${r.consentGranted ? `, ${r.consentGranted} with consent` : ''}.`);
                  close();
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'Import failed', 'warn');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Import {plan.create.length + plan.update.length} people
            </Button>
          </>
        ) : undefined
      }
    >
      {step === 'choose' && (
        <div className="space-y-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-crm-line-strong p-8 text-crm-ink-2 hover:border-crm-accent hover:text-crm-ink">
            <Upload size={24} />
            <span className="text-sm">Choose a CSV file</span>
            <span className="text-xs text-crm-ink-3">Excel or Google Sheets: File → Download → CSV</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) load(f.name, await f.text());
              e.target.value = '';
            }}
          />
          <Button icon={<FileSpreadsheet size={15} />} onClick={() => load('sample-press-list.csv', SAMPLE)}>
            Try it with a sample file
          </Button>
          <ul className="space-y-1 text-[13px] text-crm-ink-3">
            <li>• People already in the CRM are matched by email, then phone, and only blanks are filled in. Nothing is overwritten.</li>
            <li>• Duplicates inside the file are caught.</li>
            <li>• Nobody gets marketing emails from an import unless you declare when and how they agreed.</li>
          </ul>
        </div>
      )}

      {step === 'map' && (
        <div className="space-y-5">
          <div>
            <div className="label-caps mb-2">Match the columns</div>
            <div className="space-y-2">
              {csv.headers.map((h, i) => (
                <div key={i} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_1fr_1.2fr]">
                  <span className="truncate text-sm font-medium">{h || `Column ${i + 1}`}</span>
                  <span className="truncate text-xs text-crm-ink-3">e.g. {csv.rows.find((r) => r[i])?.[i] ?? '—'}</span>
                  <Select<ImportField> ariaLabel={`Column ${h}`} value={mapping[i] ?? 'ignore'} onChange={(v) => setMapping((m) => m.map((x, j) => (j === i ? v : x)))} options={IMPORT_FIELDS.map((f) => ({ value: f, label: IMPORT_FIELD_LABELS[f] }))} />
                </div>
              ))}
            </div>
            {!hasContactColumn && <div className="mt-2 text-sm text-crm-warn">Match at least one column to Email or Phone.</div>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Where did this list come from?">
              <input className="input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Press list from the launch" />
            </Field>
            <Field label="Type, if the file doesn’t say">
              <Select<ContactType> value={type} onChange={setType} options={CONTACT_TYPES.filter((t) => t !== 'Investor' || owner).map((t) => ({ value: t, label: CONTACT_TYPE_LABELS[t] }))} />
            </Field>
            <Field label="Tag everyone with (optional)">
              <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. press list" />
            </Field>
          </div>
          <div className="rounded-2xl border border-crm-line p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">These people agreed to hear from us</div>
                <div className="text-xs text-crm-ink-3">{owner ? 'Only switch this on if you can show when and how they agreed. Only rows saying “yes” in the agreed column get consent.' : 'Only Gus can declare consent for an import. Everyone will be imported with no marketing.'}</div>
              </div>
              <Toggle checked={evidenceOn} disabled={!owner} onChange={setEvidenceOn} label="Declare consent evidence" />
            </div>
            {evidenceOn && owner && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Wording they agreed to (version)" hint="e.g. paper-v1 for printed sign-in sheets">
                  <input className="input" value={wording} onChange={(e) => setWording(e.target.value)} />
                </Field>
                <Field label="When they agreed">
                  <input type="date" className="input" value={agreedOn} onChange={(e) => setAgreedOn(e.target.value)} />
                </Field>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'preview' && plan && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['New people', plan.create.length, 'good'],
              ['Already in the CRM', plan.update.length, 'info'],
              ['Duplicates in the file', plan.duplicatesInFile.length, 'warn'],
              ['Skipped', plan.skipped.length, 'bad'],
            ].map(([label, n, tone]) => (
              <div key={String(label)} className="card p-3">
                <div className="text-2xl font-semibold tabular-nums">{n}</div>
                <div className="text-xs text-crm-ink-3">{label}</div>
                <span className={`mt-1 block h-1 w-8 rounded-full ${tone === 'good' ? 'bg-crm-good' : tone === 'info' ? 'bg-crm-info' : tone === 'warn' ? 'bg-crm-warn' : 'bg-crm-bad'}`} />
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-crm-raised px-3 py-2 text-sm">
            {options.consentEvidence ? (
              <span className="text-crm-good">
                <CheckCircle2 size={14} className="mr-1 inline" />
                {plan.consentGrants} people will be recorded as agreeing to emails ({options.consentEvidence.wordingVersion}).
              </span>
            ) : (
              <span className="text-crm-ink-2">Nobody will get marketing emails from this import. Business outreach to company addresses is still fine.</span>
            )}
          </div>
          {plan.create.length > 0 && (
            <div>
              <div className="label-caps mb-1">New</div>
              {plan.create.slice(0, 8).map((r) => (
                <div key={r.rowNumber} className="text-sm text-crm-ink-2">
                  {r.first} {r.last} · {r.email ?? r.phone} {r.organisation && `· ${r.organisation}`}
                </div>
              ))}
            </div>
          )}
          {plan.update.length > 0 && (
            <div>
              <div className="label-caps mb-1">Already in the CRM</div>
              {plan.update.map((u) => {
                const c = b.contact(u.contactId);
                return (
                  <div key={u.row.rowNumber} className="text-sm text-crm-ink-2">
                    {c ? `${c.name.first} ${c.name.last ?? ''}` : u.contactId}: {u.fills.length ? `will add ${u.fills.join(', ')}` : 'nothing new'}
                  </div>
                );
              })}
            </div>
          )}
          {(plan.duplicatesInFile.length > 0 || plan.skipped.length > 0) && (
            <div>
              <div className="label-caps mb-1">Left out</div>
              {plan.duplicatesInFile.map((d) => (
                <div key={d.row.rowNumber} className="text-sm text-crm-ink-3">
                  <Pill tone="warn">Row {d.row.rowNumber}</Pill> same person as row {d.sameAsRow}
                </div>
              ))}
              {plan.skipped.map((sk) => (
                <div key={sk.rowNumber} className="text-sm text-crm-ink-3">
                  <AlertTriangle size={13} className="mr-1 inline text-crm-bad" />
                  Row {sk.rowNumber}: {sk.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
