'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IconAffiliate,
  IconCopy,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconUsers,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ListingPageContainer,
  ListingSectionHeader,
} from '@/components/shared/listing-page';
import { formatUk, RANGE_LABELS, rangeParams, type Range } from '@/lib/uk-month';
import {
  COLLABORATOR_CODE_PATTERN,
  createCollaborator,
  fetchCollaborators,
  updateCollaborator,
  type CollaboratorSummary,
} from '@/services/collaborators.service';
import { CollaboratorMembersDialog } from './collaborator-members';

const fmtInt = (n: number) => n.toLocaleString('en-GB');

const StatCard = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className="glass-card p-5 flex flex-col gap-2">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/90">
      {label}
    </p>
    <p className="text-3xl font-bold tracking-tight">{value}</p>
    <p className="text-xs text-muted-foreground">{sub}</p>
  </div>
);

type FormState = { id: string | null; name: string; code: string };

const EMPTY_FORM: FormState = { id: null, name: '', code: '' };

export default function CollaboratorsPage() {
  const [range, setRange] = useState<Range>('this-month');
  const [items, setItems] = useState<CollaboratorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [toggling, setToggling] = useState<CollaboratorSummary | null>(null);
  const [viewing, setViewing] = useState<CollaboratorSummary | null>(null);
  const [saving, setSaving] = useState(false);
  // Only the latest request may update the table (fast range clicks can overlap).
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCollaborators(rangeParams(range));
      if (request !== requestRef.current) return;
      setItems(res);
    } catch (err: unknown) {
      if (request !== requestRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load collaborators');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, c) => ({
          active: acc.active + (c.active ? 1 : 0),
          signups: acc.signups + c.signups,
          activeMembers: acc.activeMembers + c.activeMembers,
          payingMembers: acc.payingMembers + c.payingMembers,
        }),
        { active: 0, signups: 0, activeMembers: 0, payingMembers: 0 },
      ),
    [items],
  );

  const isEdit = !!form?.id;
  const codeValid = !!form && COLLABORATOR_CODE_PATTERN.test(form.code);
  const nameValid = !!form && form.name.trim().length > 0;

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!nameValid || (!isEdit && !codeValid)) {
      toast.warning('Enter a name and a code of 4-20 letters or digits');
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await updateCollaborator(form.id, { name: form.name.trim() });
        toast.success('Collaborator updated');
      } else {
        const created = await createCollaborator({ name: form.name.trim(), code: form.code });
        toast.success(`Code ${created.code} is live. New members can sign up with it now.`);
      }
      setForm(null);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save the collaborator');
    } finally {
      setSaving(false);
    }
  };

  const confirmToggle = async () => {
    if (!toggling) return;
    setSaving(true);
    try {
      await updateCollaborator(toggling.id, { active: !toggling.active });
      toast.success(
        toggling.active
          ? `Code ${toggling.code} paused. New sign-ups with it are refused.`
          : `Code ${toggling.code} is live again.`,
      );
      setToggling(null);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update the code');
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Copied ${code}`);
    } catch {
      toast.error('Could not copy the code');
    }
  };

  return (
    <ListingPageContainer>
      <ListingSectionHeader
        icon={IconAffiliate}
        title="Collaborators"
        subtitle="One signup code per partner or creator. See who signed up with each code and who pays, to work out partner bounties."
        trailing={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={load} disabled={loading}>
              <IconRefresh size={18} />
              Refresh
            </Button>
            <Button className="gap-2" onClick={() => setForm(EMPTY_FORM)}>
              <IconPlus size={18} />
              New code
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
          <Button
            key={r}
            size="sm"
            variant={range === r ? 'default' : 'outline'}
            onClick={() => setRange(r)}
          >
            {RANGE_LABELS[r]}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground">
          Counts people by the date they signed up (UK time). Paying is their plan today.
        </span>
      </div>

      {error ? (
        <div className="glass-card p-6 flex flex-col items-center gap-3">
          <p className="font-bold">Could not load collaborators</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={load}>Retry</Button>
        </div>
      ) : loading && items.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Live codes"
              value={fmtInt(totals.active)}
              sub={`${fmtInt(items.length)} codes in total`}
            />
            <StatCard
              label="Sign-ups"
              value={fmtInt(totals.signups)}
              sub="Accounts created with a collaborator code"
            />
            <StatCard
              label="In the app"
              value={fmtInt(totals.activeMembers)}
              sub="Of those, finished signup"
            />
            <StatCard
              label="Paying members"
              value={fmtInt(totals.payingMembers)}
              sub="Of those, on a paid plan now"
            />
          </div>

          {items.length === 0 ? (
            <div className="glass-card p-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
              <p>No collaborator codes yet.</p>
              <Button className="gap-2" onClick={() => setForm(EMPTY_FORM)}>
                <IconPlus size={18} />
                Create the first code
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#18181b] bg-[#0c0c0e]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#18181b] bg-zinc-900/50 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    <th className="py-3 px-4">Collaborator</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Sign-ups</th>
                    <th className="py-3 px-4 text-right">In the app</th>
                    <th className="py-3 px-4 text-right">Paying</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18181b] text-xs">
                  {items.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">{c.name}</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => copyCode(c.code)}
                          className="inline-flex items-center gap-1.5 font-mono font-bold text-purple-300 hover:text-purple-200"
                          title="Copy code"
                        >
                          {c.code}
                          <IconCopy size={14} />
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {c.active ? (
                          <span className="font-semibold text-emerald-400">Live</span>
                        ) : (
                          <span className="font-semibold text-amber-300">Paused</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-300">{fmtInt(c.signups)}</td>
                      <td className="py-3 px-4 text-right text-zinc-300">
                        {fmtInt(c.activeMembers)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                        {fmtInt(c.payingMembers)}
                      </td>
                      <td className="py-3 px-4 text-zinc-400">{formatUk(c.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setViewing(c)}
                          >
                            <IconUsers size={14} />
                            People
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Rename"
                            onClick={() => setForm({ id: c.id, name: c.name, code: c.code })}
                          >
                            <IconPencil size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title={c.active ? 'Pause code' : 'Resume code'}
                            onClick={() => setToggling(c)}
                          >
                            {c.active ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Luma ticket sales are not connected yet. For tickets bought with a code, check the
            coupon report for that event in Luma.
          </p>
        </>
      )}

      <Dialog open={!!form} onOpenChange={(open) => !open && !saving && setForm(null)}>
        <DialogContent>
          <form onSubmit={saveForm} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Rename collaborator' : 'New collaborator code'}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'The code cannot change: the partner has already shared it.'
                  : 'New members type this code when they sign up. Use the same code for the Luma coupon.'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="collaborator-name">Name</Label>
              <Input
                id="collaborator-name"
                value={form?.name ?? ''}
                maxLength={100}
                placeholder="e.g. Lowicks"
                onChange={(e) => form && setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="collaborator-code">Code</Label>
              <Input
                id="collaborator-code"
                value={form?.code ?? ''}
                maxLength={20}
                disabled={isEdit}
                placeholder="e.g. LOWICKS"
                className="font-mono uppercase"
                onChange={(e) =>
                  form &&
                  setForm({
                    ...form,
                    code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                  })
                }
              />
              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  4-20 letters or digits. It must not already be someone&apos;s code.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setForm(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !nameValid || (!isEdit && !codeValid)}>
                {saving ? 'Saving...' : isEdit ? 'Save' : 'Create code'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toggling} onOpenChange={(open) => !open && !saving && setToggling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toggling?.active ? `Pause ${toggling?.code}?` : `Resume ${toggling?.code}?`}
            </DialogTitle>
            <DialogDescription>
              {toggling?.active
                ? 'New sign-ups with this code will be refused as an unknown code. People who already joined with it stay counted.'
                : 'New members can sign up with this code again.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setToggling(null)}>
              Cancel
            </Button>
            <Button
              variant={toggling?.active ? 'destructive' : 'default'}
              disabled={saving}
              onClick={confirmToggle}
            >
              {saving ? 'Saving...' : toggling?.active ? 'Pause code' : 'Resume code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CollaboratorMembersDialog
        collaborator={viewing}
        range={range}
        onClose={() => setViewing(null)}
      />
    </ListingPageContainer>
  );
}
