import assert from 'node:assert/strict';
import { summarizeSchedule, NO_REASON, daysBetween } from '../src/schedule.js';
const A = { accountId: 'a1', displayName: 'Mina (Export)' };
const B = { accountId: 'b2', displayName: 'Jun (Ops)' };
const histories = [
  { created: '2026-10-02T09:00:00.000+0000', author: A, items: [{ fieldId: 'duedate', field: 'duedate', from: '2026-10-10', to: '2026-10-14' }] },
  { created: '2026-10-05T03:00:00.000+0000', author: B, items: [{ fieldId: 'summary', from: 'x', to: 'y' }] },
  { created: '2026-10-08T11:00:00.000+0000', author: B, items: [{ fieldId: 'duedate', field: 'duedate', from: '2026-10-14', to: '2026-10-21' }] },
];
const comments = [
  { id: '100', created: '2026-10-02T09:20:00.000+0000', author: A, body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Carrier rolled the booking to next vessel.' }] }] } },
  { id: '101', created: '2026-10-08T12:00:00.000+0000', author: A, body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'unrelated note by someone else' }] }] } },
];
const s = summarizeSchedule({ histories, comments, currentValue: '2026-10-21', fieldId: 'duedate', issueKey: 'SHIP-1', siteUrl: 'https://x.atlassian.net' });
assert.equal(s.baseline, '2026-10-10');
assert.equal(s.current, '2026-10-21');
assert.equal(s.totalShiftDays, 11);
assert.equal(s.changeCount, 2);
assert.equal(s.changes[0].shiftDays, 4);
assert.equal(s.changes[0].reason, 'Carrier rolled the booking to next vessel.');
assert.equal(s.changes[0].reasonLink, 'https://x.atlassian.net/browse/SHIP-1?focusedCommentId=100');
assert.equal(s.changes[1].reason, NO_REASON);
assert.equal(s.changes[1].reasonLink, null);
assert.equal(s.unexplainedCount, 1);
const e = summarizeSchedule({ histories: [], comments: [], currentValue: '2026-11-01', fieldId: 'duedate', issueKey: 'SHIP-2' });
assert.equal(e.changeCount, 0); assert.equal(e.baseline, '2026-11-01'); assert.equal(e.totalShiftDays, 0);
assert.equal(daysBetween(null, '2026-01-01'), null);
const f = summarizeSchedule({ histories: [{ created: '2026-10-01T00:00:00.000+0000', author: A, items: [{ fieldId: 'duedate', from: null, to: '2026-10-09' }] }], comments: [], currentValue: '2026-10-09', fieldId: 'duedate', issueKey: 'SHIP-3' });
assert.equal(f.baseline, '2026-10-09'); assert.equal(f.changes[0].shiftDays, null);
console.log('tick: schedule tests passed');
const quick = summarizeSchedule({
  histories: [
    { created: '2026-10-29T01:00:00.000+0000', author: A, items: [{ fieldId: 'duedate', from: '2026-11-03', to: '2026-11-07' }] },
    { created: '2026-10-29T01:02:00.000+0000', author: A, items: [{ fieldId: 'duedate', from: '2026-11-07', to: '2026-11-12' }] },
    { created: '2026-10-29T01:04:00.000+0000', author: A, items: [{ fieldId: 'duedate', from: '2026-11-12', to: '2026-11-10' }] },
  ],
  comments: [
    { id: 'c1', created: '2026-10-29T01:00:30.000+0000', author: A, body: 'Booking rolled by carrier.' },
    { id: 'c2', created: '2026-10-29T01:02:30.000+0000', author: A, body: 'Port congestion at transshipment.' },
  ],
  currentValue: '2026-11-10', fieldId: 'duedate', issueKey: 'SHIP-4',
});
assert.deepEqual(quick.changes.map((c) => c.reason), ['Booking rolled by carrier.', 'Port congestion at transshipment.', NO_REASON]);
assert.equal(quick.totalShiftDays, 7);
assert.equal(quick.changes[2].shiftDays, -2);
console.log('tick: rapid-sequence test passed');
