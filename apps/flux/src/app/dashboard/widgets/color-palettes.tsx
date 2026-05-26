'use client';

import type { WidgetDto } from '@triage/api-client';

export type WidgetPalette = {
  id: string;
  name: string;
  brandColor: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
};

export const WIDGET_PALETTES: WidgetPalette[] = [
  {
    id: 'moss-console',
    name: 'Moss console',
    brandColor: '#B8D66B',
    accentColor: '#151412',
    surfaceColor: '#11100E',
    textColor: '#F5EFE5',
  },
  {
    id: 'mineral',
    name: 'Mineral',
    brandColor: '#8FB3C8',
    accentColor: '#0E171B',
    surfaceColor: '#101719',
    textColor: '#F1F7F8',
  },
  {
    id: 'ember',
    name: 'Ember',
    brandColor: '#E66A5C',
    accentColor: '#170B08',
    surfaceColor: '#16100E',
    textColor: '#FFF0E9',
  },
  {
    id: 'mint',
    name: 'Mint',
    brandColor: '#7CBF8B',
    accentColor: '#07140A',
    surfaceColor: '#0D1510',
    textColor: '#F1FFF8',
  },
  {
    id: 'rose',
    name: 'Rose',
    brandColor: '#CC7D8B',
    accentColor: '#180B10',
    surfaceColor: '#171012',
    textColor: '#FFF1F3',
  },
  {
    id: 'mono-light',
    name: 'Mono light',
    brandColor: '#211F1C',
    accentColor: '#F8F1E7',
    surfaceColor: '#F5EEE2',
    textColor: '#17130E',
  },
];

export const COLOR_SWATCHES = Array.from(
  new Set(
    WIDGET_PALETTES.flatMap((palette) => [
      palette.brandColor,
      palette.accentColor,
      palette.surfaceColor,
      palette.textColor,
    ]),
  ),
);

export function paletteTheme(palette: WidgetPalette): NonNullable<WidgetDto['theme']> {
  return {
    logoUrl: null,
    surfaceColor: palette.surfaceColor,
    textColor: palette.textColor,
    fontFamily: 'system',
    borderRadius: '18px',
    shadow: 'soft',
    launcherIcon: 'message-circle',
    launcherLabel: 'Feedback',
    darkMode: palette.id === 'mono-light' ? 'light' : 'dark',
    poweredBy: true,
    successAnimation: 'check',
    customCss: null,
  };
}

export function ColorPaletteField({
  label,
  value,
  onChange,
  swatches = COLOR_SWATCHES,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  swatches?: string[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-paper-200">{label}</span>
      <div className="grid grid-cols-6 gap-2">
        {swatches.map((color) => {
          const selected = sameColor(value, color);
          return (
            <button
              key={color}
              type="button"
              className={`h-9 rounded-lg transition-all ${
                selected
                  ? 'ring-2 ring-lime ring-offset-2 ring-offset-ink-900'
                  : 'ring-1 ring-paper-100/10 hover:ring-paper-100/35'
              }`}
              style={{ background: color }}
              aria-label={`${label}: ${color}`}
              aria-pressed={selected}
              onClick={() => onChange(color)}
            />
          );
        })}
      </div>
      <label className="flex items-center gap-3 rounded-lg bg-paper-100/[0.04] px-3 py-2">
        <span
          className="h-6 w-6 rounded-md ring-1 ring-paper-100/20"
          style={{ background: value }}
          aria-hidden
        />
        <input
          className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
          type="color"
          value={normalizeHex(value)}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          aria-label={`${label} custom color`}
        />
        <span className="font-mono text-xs text-paper-400">{normalizeHex(value).toUpperCase()}</span>
      </label>
    </div>
  );
}

export function PalettePresetPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (palette: WidgetPalette) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-paper-200">Creation palette</span>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {WIDGET_PALETTES.map((palette) => {
          const selected = palette.id === value;
          return (
            <button
              key={palette.id}
              type="button"
              className={`rounded-lg px-3 py-2 text-left transition-all ${
                selected
                  ? 'bg-paper-100/[0.08] ring-1 ring-lime'
                  : 'bg-paper-100/[0.04] ring-1 ring-paper-100/10 hover:bg-paper-100/[0.07]'
              }`}
              onClick={() => onChange(palette)}
            >
              <span className="block text-sm text-paper-100">{palette.name}</span>
              <span className="mt-2 flex gap-1" aria-hidden>
                {[palette.brandColor, palette.accentColor, palette.surfaceColor, palette.textColor].map(
                  (color) => (
                    <span
                      key={color}
                      className="h-4 flex-1 rounded"
                      style={{ background: color }}
                    />
                  ),
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function sameColor(a: string, b: string) {
  return normalizeHex(a).toLowerCase() === normalizeHex(b).toLowerCase();
}

function normalizeHex(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
}
