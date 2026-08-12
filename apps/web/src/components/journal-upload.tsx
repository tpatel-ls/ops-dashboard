'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import { createJournalEntry } from '@/lib/journal';
import { toggleRoutineCheck, todayISO } from '@/lib/routines';
import { cn } from '@ops-dashboard/ui';
import { fetchWithTimeout } from '@/lib/fetch-timeout';

type Mode = 'idle' | 'text' | 'photo';
type Stage = 'input' | 'processing' | 'confirm' | 'done' | 'manual-fallback';

interface ExtractResult {
  summary: string;
  body: string;
  mood: string;
  tags: string[];
  habitsDone: string[];
}

const MOOD_EMOJI: Record<string, string> = {
  great: '✦',
  good: '◆',
  neutral: '◇',
  low: '▽',
  rough: '△',
};

const MOOD_LABEL: Record<string, string> = {
  great: 'Great',
  good: 'Good',
  neutral: 'Neutral',
  low: 'Low',
  rough: 'Rough',
};

export function JournalUpload({ onSaved }: { onSaved?: () => void }) {
  const [mode, setMode] = useState<Mode>('idle');
  const [stage, setStage] = useState<Stage>('input');
  const [text, setText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState('image/jpeg');
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [manualBody, setManualBody] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  function clearImagePreview() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setImagePreviewUrl(null);
  }

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  function reset() {
    setMode('idle');
    setStage('input');
    setText('');
    setImageBase64(null);
    clearImagePreview();
    setResult(null);
    setError(null);
    setSaving(false);
    setManualBody('');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaType(file.type || 'image/jpeg');
    clearImagePreview();
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setImagePreviewUrl(previewUrl);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // strip "data:<mime>;base64," prefix
      const base64 = dataUrl.split(',')[1] ?? '';
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    setError(null);
    setStage('processing');

    try {
      const db = getDb();
      const allRoutines = await db.routines.toArray();
      const activeRoutines = allRoutines.filter((r) => !r.deletedAt && !r.archivedAt);
      const routineNames = activeRoutines.map((r) => r.name);

      const resp = await fetchWithTimeout('/api/journal/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim() || undefined,
          imageBase64: imageBase64 ?? undefined,
          mediaType,
          routineNames,
        }),
      });

      const data = (await resp.json()) as
        { ok: true; result: ExtractResult } | { ok: false; reason: string };

      if (!data.ok) {
        if ((data as { ok: false; reason: string }).reason === 'no-key') {
          // graceful fallback: show plain textarea
          setManualBody(text.trim());
          setStage('manual-fallback');
          return;
        }
        throw new Error((data as { ok: false; reason: string }).reason);
      }

      setResult(data.result);
      setStage('confirm');
    } catch (err) {
      console.error('[journal-upload] extract error:', err);
      setError('Something went wrong. You can still write your entry below.');
      setManualBody(text.trim());
      setStage('manual-fallback');
    }
  }

  async function handleConfirm() {
    if (!result) return;
    setSaving(true);
    try {
      const db = getDb();
      const allRoutines = await db.routines.toArray();
      const activeRoutines = allRoutines.filter((r) => !r.deletedAt && !r.archivedAt);

      await createJournalEntry({
        body: result.body,
        mood: result.mood,
        tags: result.tags,
        source: 'upload',
      });

      // mark each detected habit
      const today = todayISO();
      for (const name of result.habitsDone) {
        const routine = activeRoutines.find((r) => r.name.toLowerCase() === name.toLowerCase());
        if (routine) {
          await toggleRoutineCheck(routine.id, today, true, 'journal');
        }
      }

      setStage('done');
      onSaved?.();
    } catch (err) {
      console.error('[journal-upload] save error:', err);
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  }

  async function handleManualSave() {
    const body = manualBody.trim();
    if (!body) return;
    setSaving(true);
    try {
      await createJournalEntry({ body, source: 'upload' });
      setStage('done');
      onSaved?.();
    } catch (err) {
      console.error('[journal-upload] manual save error:', err);
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  }

  // --- DONE ---
  if (stage === 'done') {
    return (
      <div className="surface flex flex-col items-center gap-3 px-6 py-8 text-center">
        <CheckCircle2 className="text-success size-8" />
        <p className="text-sm font-medium">Entry saved.</p>
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-medium"
        >
          Add another
        </button>
      </div>
    );
  }

  // --- CONFIRM ---
  if (stage === 'confirm' && result) {
    return (
      <div className="surface flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary size-4" />
            <span className="text-sm font-medium">AI extracted - review before saving</span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-muted-foreground hover:text-foreground inline-flex size-7 items-center justify-center rounded-md"
            aria-label="Discard"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Summary */}
        <div className="bg-primary-soft text-foreground rounded-[10px] px-3 py-2 text-sm">
          {result.summary}
        </div>

        {/* Body */}
        <div>
          <div className="text-subtle-foreground mb-1 font-mono text-[10px] tracking-[0.18em] uppercase">
            Body
          </div>
          <textarea
            value={result.body}
            onChange={(e) => setResult((prev) => (prev ? { ...prev, body: e.target.value } : prev))}
            rows={5}
            className="input resize-none"
          />
        </div>

        {/* Mood + Tags */}
        <div className="flex flex-wrap gap-4">
          <div>
            <div className="text-subtle-foreground mb-1 font-mono text-[10px] tracking-[0.18em] uppercase">
              Mood
            </div>
            <div className="flex gap-1">
              {(['great', 'good', 'neutral', 'low', 'rough'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setResult((prev) => (prev ? { ...prev, mood: m } : prev))}
                  className={cn(
                    'rounded-md px-2 py-1 text-xs transition-colors',
                    result.mood === m
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-accent-foreground hover:bg-accent/80',
                  )}
                >
                  {MOOD_EMOJI[m]} {MOOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-subtle-foreground mb-1 font-mono text-[10px] tracking-[0.18em] uppercase">
              Tags
            </div>
            <div className="flex flex-wrap gap-1">
              {result.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[10px]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Habits detected */}
        {result.habitsDone.length > 0 && (
          <div>
            <div className="text-subtle-foreground mb-1 font-mono text-[10px] tracking-[0.18em] uppercase">
              Habits detected
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.habitsDone.map((h) => (
                <span
                  key={h}
                  className="bg-success/15 text-success inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px]"
                >
                  <Check className="size-3" strokeWidth={3} />
                  {h}
                </span>
              ))}
            </div>
            <p className="text-subtle-foreground mt-1 text-[11px]">
              These routines will be marked done for today.
            </p>
          </div>
        )}

        {error && <p className="text-destructive text-xs">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={reset}
            className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-xs"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60"
          >
            {saving && <Loader2 className="size-3 animate-spin" />}
            Save entry
          </button>
        </div>
      </div>
    );
  }

  // --- MANUAL FALLBACK ---
  if (stage === 'manual-fallback') {
    return (
      <div className="surface flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <FileText className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">Write your entry</span>
        </div>
        {error && (
          <p className="bg-warning/10 text-warning rounded-[10px] px-3 py-2 text-xs">{error}</p>
        )}
        <textarea
          value={manualBody}
          onChange={(e) => setManualBody(e.target.value)}
          placeholder="What happened today? Reflections, wins, struggles…"
          rows={6}
          className="input resize-none"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={reset}
            className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleManualSave}
            disabled={saving || !manualBody.trim()}
            className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60"
          >
            {saving && <Loader2 className="size-3 animate-spin" />}
            Save entry
          </button>
        </div>
      </div>
    );
  }

  // --- PROCESSING ---
  if (stage === 'processing') {
    return (
      <div className="surface flex flex-col items-center gap-3 px-6 py-8 text-center">
        <Loader2 className="text-primary size-6 animate-spin" />
        <p className="text-muted-foreground text-sm">Analysing your entry…</p>
      </div>
    );
  }

  // --- IDLE: mode picker ---
  if (mode === 'idle') {
    return (
      <div className="surface-flat flex gap-2 p-3">
        <button
          type="button"
          onClick={() => setMode('text')}
          className={cn(
            'border-border flex flex-1 items-center justify-center gap-2 rounded-[10px] border px-3 py-3 text-sm transition-colors',
            'hover:border-primary hover:bg-primary-soft hover:text-primary',
          )}
        >
          <FileText className="size-4" />
          Paste text
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('photo');
            setTimeout(() => fileRef.current?.click(), 50);
          }}
          className={cn(
            'border-border flex flex-1 items-center justify-center gap-2 rounded-[10px] border px-3 py-3 text-sm transition-colors',
            'hover:border-primary hover:bg-primary-soft hover:text-primary',
          )}
        >
          <Camera className="size-4" />
          Upload photo
        </button>
      </div>
    );
  }

  // --- TEXT / PHOTO INPUT ---
  return (
    <div className="surface flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {mode === 'text' ? (
            <>
              <FileText className="text-primary size-4" /> Paste journal text
            </>
          ) : (
            <>
              <Camera className="text-primary size-4" /> Upload a photo
            </>
          )}
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-muted-foreground hover:text-foreground inline-flex size-7 items-center justify-center rounded-md"
          aria-label="Cancel"
        >
          <X className="size-4" />
        </button>
      </div>

      {mode === 'text' && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type your journal entry here - raw notes, voice transcript, anything…"
          rows={7}
          className="input resize-none"
          autoFocus
        />
      )}

      {mode === 'photo' && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleFileChange}
          />
          {imagePreviewUrl ? (
            <div className="relative overflow-hidden rounded-[10px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Journal page preview"
                className="max-h-64 w-full object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setImageBase64(null);
                  clearImagePreview();
                  if (fileRef.current) fileRef.current.value = '';
                }}
                className="bg-background/80 absolute top-2 right-2 inline-flex size-6 items-center justify-center rounded-full backdrop-blur-sm"
                aria-label="Remove image"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="border-border text-muted-foreground hover:border-primary hover:text-primary flex w-full flex-col items-center gap-2 rounded-[10px] border border-dashed px-4 py-8 text-sm"
            >
              <Upload className="size-5" />
              Tap to choose a photo
            </button>
          )}
          {imagePreviewUrl && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Optional: add any context or notes to go along with the photo…"
              rows={3}
              className="input mt-3 resize-none"
            />
          )}
        </div>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={mode === 'text' ? !text.trim() : !imageBase64}
          className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <Sparkles className="size-3.5" />
          Analyse with AI
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
