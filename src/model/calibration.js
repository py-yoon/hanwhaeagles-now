const CLASSES = ['HOME_WIN','DRAW','AWAY_WIN'];

export function calibrationReport(rows, { bins = 10 } = {}) {
  if (!rows.length) return { n: 0, ece: 0, mce: 0, bins: [], classwise: {} };
  const safeBins = Math.max(2, Math.floor(bins));
  const buckets = Array.from({length:safeBins}, (_, i) => ({ bin:i, count:0, confidence_sum:0, accuracy_sum:0 }));
  const classwise = Object.fromEntries(CLASSES.map(c => [c, { brier:0, ece:0, n:0 }]));
  let ece = 0, mce = 0;
  for (const row of rows) {
    const probs = row.probabilities;
    const actual = row.actual;
    const [pred, confidence] = Object.entries(probs).sort((a,b)=>b[1]-a[1])[0];
    const idx = Math.min(safeBins-1, Math.floor(confidence * safeBins));
    const b = buckets[idx]; b.count++; b.confidence_sum += confidence; b.accuracy_sum += pred === actual ? 1 : 0;
    for (const c of CLASSES) {
      const p = Number(probs[c] ?? 0), y = actual === c ? 1 : 0;
      classwise[c].brier += (p-y)**2; classwise[c].n++;
    }
  }
  const outBins = buckets.map(b => {
    if (!b.count) return {...b, confidence:0, accuracy:0, gap:0};
    const confidence=b.confidence_sum/b.count, accuracy=b.accuracy_sum/b.count, gap=Math.abs(confidence-accuracy);
    ece += gap*b.count/rows.length; mce=Math.max(mce,gap);
    return {...b, confidence, accuracy, gap};
  });
  for (const c of CLASSES) classwise[c].brier /= Math.max(1,classwise[c].n);
  return { n: rows.length, ece, mce, bins: outBins, classwise };
}
