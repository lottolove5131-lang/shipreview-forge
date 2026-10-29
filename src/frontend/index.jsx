import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Text, Strong, Lozenge, Inline, Stack, DynamicTable, Link, SectionMessage, Spinner, EmptyState,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const plural = (n) => `${n} day${n === 1 ? '' : 's'}`;
const fmtShift = (d) => (d === null || d === undefined ? '-' : d > 0 ? `+${plural(d)} later` : d < 0 ? `${plural(-d)} earlier` : 'no change');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (ymd) => {
  if (!ymd) return 'empty';
  const [, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
};
const fmtTime = (iso) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '-' : fmtDay(new Date(t).toISOString());
};
const fmtShort = (d) => (d === null || d === undefined ? '-' : d > 0 ? `+${d}d` : `${d}d`);

const App = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    invoke('getSchedule').then(setData).catch((e) => setError(String(e.message || e)));
  }, []);

  if (error) return <SectionMessage appearance="error"><Text>{error}</Text></SectionMessage>;
  if (!data) return <Spinner label="Loading schedule history" />;
  if (!data.changeCount) {
    return (
      <EmptyState
        header="No schedule changes yet"
        description={`Due date (ETD): ${data.current || 'not set'}. Every change to the Due date will be listed here with who changed it and why.`}
      />
    );
  }

  const rows = data.changes.map((c, i) => ({
    key: `row-${i}`,
    cells: [
      { key: 'when', content: <Text>{fmtTime(c.changedAt)}</Text> },
      { key: 'who', content: <Text>{c.changedBy}</Text> },
      { key: 'move', content: <Text>{`${fmtDay(c.from)} → ${fmtDay(c.to)}`}</Text> },
      { key: 'shift', content: <Lozenge appearance={c.shiftDays > 0 ? 'removed' : 'success'}>{fmtShort(c.shiftDays)}</Lozenge> },
      {
        key: 'why',
        content: c.reasonLink
          ? <Link href={c.reasonLink}>{c.reason.length > 80 ? `${c.reason.slice(0, 80)}…` : c.reason}</Link>
          : <Lozenge appearance="moved">{c.reason}</Lozenge>,
      },
    ],
  }));

  return (
    <Stack space="space.200">
      <Inline space="space.200" alignBlock="center">
        <Text>Baseline ETD <Strong>{data.baseline ? fmtDay(data.baseline) : '-'}</Strong></Text>
        <Text>Current ETD <Strong>{data.current ? fmtDay(data.current) : '-'}</Strong></Text>
        <Lozenge appearance={data.totalShiftDays > 0 ? 'removed' : 'success'} isBold>{fmtShift(data.totalShiftDays)}</Lozenge>
        <Text>{`${data.changeCount} change(s)`}</Text>
        {data.unexplainedCount > 0 && <Lozenge appearance="moved" isBold>{`${data.unexplainedCount} without reason`}</Lozenge>}
      </Inline>
      <DynamicTable
        head={{
          cells: [
            { key: 'when', content: 'Changed' },
            { key: 'who', content: 'By' },
            { key: 'move', content: 'ETD' },
            { key: 'shift', content: 'Shift' },
            { key: 'why', content: 'Reason (from comment)' },
          ],
        }}
        rows={rows}
      />
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
