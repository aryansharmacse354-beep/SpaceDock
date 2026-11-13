import type { PartRecord } from './types';

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      out.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  out.push(current);
  return out;
}

export function parseTelemetry(csv: string): PartRecord[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((cell) => cell.trim());
  const col = (name: string) => header.indexOf(name);

  const c = {
    lot: col('Lot_ID'),
    part: col('Part_ID'),
    v0: col('Value_0h_uA'),
    v24: col('Value_24h_uA'),
    v96: col('Value_96h_uA'),
    v168: col('Value_168h_uA'),
    mean: col('Lot_Mean_uA'),
    sigma: col('Lot_Sigma_uA'),
    z24: col('Dynamic_Z_24h'),
    slope: col('Slope_0_24_uA_per_h'),
    defect: col('Latent_Defect_Label'),
  };

  if (Object.values(c).some((index) => index < 0)) {
    throw new Error('Telemetry feed is missing required columns.');
  }

  const parts: PartRecord[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    if (cells.length < header.length) continue;

    const v0 = Number(cells[c.v0]);
    const v24 = Number(cells[c.v24]);
    if (!Number.isFinite(v0) || !Number.isFinite(v24)) continue;

    parts.push({
      lotId: cells[c.lot].trim(),
      partId: cells[c.part].trim(),
      v0,
      v24,
      v96: Number(cells[c.v96]),
      v168: Number(cells[c.v168]),
      lotMean: Number(cells[c.mean]),
      lotSigma: Number(cells[c.sigma]),
      z24: Number(cells[c.z24]),
      slope0_24: Number(cells[c.slope]),
      defect: Number(cells[c.defect]) === 1,
    });
  }

  return parts;
}
