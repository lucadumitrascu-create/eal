import { useState } from 'react';
import type { ImageRef } from '../../data/templates';
import { imagePresets, presetById } from '../../data/imageLibrary';
import { useT } from '../../lib/builder/i18n';

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)]';

export function ImageSlotControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ImageRef;
  onChange: (v: ImageRef) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const p = presetById(value.presetId);
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[var(--color-text-muted)]">{t(label)}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={`${t('builder.image.style')}: ${value.presetId}`}
          aria-expanded={open}
          className="h-9 w-9 shrink-0 rounded-lg border border-[var(--color-border)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          style={{ background: p?.css }}
        />
        <input
          value={value.label}
          maxLength={60}
          onChange={(e) => onChange({ ...value, label: e.target.value, alt: e.target.value })}
          placeholder={t('builder.image.describe')}
          className={inputCls + ' flex-1'}
        />
      </div>
      {open && (
        <div className="grid grid-cols-6 gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2">
          {imagePresets.map((pr) => (
            <button
              key={pr.id}
              type="button"
              title={pr.id}
              aria-label={`${t('builder.image.style')}: ${pr.id}`}
              aria-pressed={value.presetId === pr.id}
              onClick={() => {
                onChange({ ...value, presetId: pr.id });
                setOpen(false);
              }}
              className={`h-8 rounded-md border outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                value.presetId === pr.id ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]' : 'border-black/10'
              }`}
              style={{ background: pr.css }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
