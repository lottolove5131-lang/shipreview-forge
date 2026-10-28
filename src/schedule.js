const DAY_MS = 24 * 60 * 60 * 1000;
const REASON_WINDOW_BEFORE_MS = 60 * 60 * 1000;
const REASON_WINDOW_AFTER_MS = 24 * 60 * 60 * 1000;
export const NO_REASON = 'Reason not recorded';

export function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const a = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / DAY_MS);
}

export function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  const parts = (node.content || []).map(adfToText);
  return node.type === 'paragraph' ? `${parts.join('')}\n` : parts.join('');
}

export function extractDateChanges(histories, fieldId) {
  const changes = [];
  for (const h of histories || []) {
    for (const item of h.items || []) {
      if (item.fieldId !== fieldId && item.field !== fieldId) continue;
      changes.push({
        changedAt: h.created,
        authorId: h.author ? h.author.accountId : null,
        authorName: h.author ? h.author.displayName : 'Unknown',
        from: item.from || null,
        to: item.to || null,
      });
    }
  }
  changes.sort((x, y) => Date.parse(x.changedAt) - Date.parse(y.changedAt));
  return changes;
}

export function findReason(change, comments, { prevAt = null, nextAt = null, used = new Set() } = {}) {
  const t = Date.parse(change.changedAt);
  const lo = Math.max(t - REASON_WINDOW_BEFORE_MS, prevAt === null ? -Infinity : Date.parse(prevAt) + 1);
  const hi = Math.min(t + REASON_WINDOW_AFTER_MS, nextAt === null ? Infinity : Date.parse(nextAt) - 1);
  let best = null;
  for (const c of comments || []) {
    if (used.has(c.id)) continue;
    if (!c.author || c.author.accountId !== change.authorId) continue;
    const ct = Date.parse(c.created);
    if (ct < lo || ct > hi) continue;
    if (!adfToText(c.body).trim()) continue;
    if (!best || Math.abs(ct - t) < Math.abs(Date.parse(best.created) - t)) best = c;
  }
  if (!best) return { reason: NO_REASON, commentId: null };
  used.add(best.id);
  return { reason: adfToText(best.body).trim().replace(/\s+/g, ' '), commentId: best.id };
}

export function summarizeSchedule({ histories, comments, currentValue, fieldId, issueKey, siteUrl }) {
  const raw = extractDateChanges(histories, fieldId);
  const baseline = raw.length ? (raw[0].from || raw[0].to) : currentValue || null;
  const used = new Set();
  const changes = raw.map((ch, i) => {
    const r = findReason(ch, comments, {
      prevAt: i > 0 ? raw[i - 1].changedAt : null,
      nextAt: i < raw.length - 1 ? raw[i + 1].changedAt : null,
      used,
    });
    return {
      changedAt: ch.changedAt,
      changedBy: ch.authorName,
      from: ch.from,
      to: ch.to,
      shiftDays: daysBetween(ch.from, ch.to),
      reason: r.reason,
      reasonLink: r.commentId && siteUrl
        ? `${siteUrl}/browse/${issueKey}?focusedCommentId=${r.commentId}`
        : null,
    };
  });
  return {
    issueKey,
    baseline,
    current: currentValue || null,
    totalShiftDays: daysBetween(baseline, currentValue),
    changeCount: changes.length,
    unexplainedCount: changes.filter((c) => c.reason === NO_REASON).length,
    changes,
  };
}
