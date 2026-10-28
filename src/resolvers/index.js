import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { summarizeSchedule } from '../schedule';

const FIELD_ID = 'duedate';

async function getJson(path) {
  const res = await api.asUser().requestJira(path, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Jira API ${res.status}`);
  return res.json();
}

async function collectAll(pathFor, listKey) {
  const all = [];
  let startAt = 0;
  for (;;) {
    const page = await getJson(pathFor(startAt));
    const items = page[listKey] || [];
    all.push(...items);
    startAt += items.length;
    if (!items.length || startAt >= (page.total || 0)) break;
  }
  return all;
}

export async function loadSchedule(issueKey, siteUrl) {
  const issue = await getJson(route`/rest/api/3/issue/${issueKey}?fields=${FIELD_ID},summary`);
  const histories = await collectAll((s) => route`/rest/api/3/issue/${issueKey}/changelog?startAt=${s}&maxResults=100`, 'values');
  const comments = await collectAll((s) => route`/rest/api/3/issue/${issueKey}/comment?startAt=${s}&maxResults=100`, 'comments');
  const summary = summarizeSchedule({
    histories,
    comments,
    currentValue: issue.fields[FIELD_ID],
    fieldId: FIELD_ID,
    issueKey,
    siteUrl,
  });
  summary.title = issue.fields.summary;
  return summary;
}

const resolver = new Resolver();

resolver.define('getSchedule', async ({ context }) => {
  return loadSchedule(context.extension.issue.key, context.siteUrl);
});

export const handler = resolver.getDefinitions();

export async function getScheduleChanges(payload) {
  const issueKey = String(payload.issueKey || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]+-\d+$/.test(issueKey)) {
    return { error: 'Please give a Jira issue key such as SHIP-12.' };
  }
  return loadSchedule(issueKey, payload.context && payload.context.siteUrl);
}
