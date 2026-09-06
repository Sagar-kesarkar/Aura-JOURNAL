import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trackWriting, weeklyActivity, entryActivity } from '../app/journal-activity.ts';
const entry = {id:'one', title:'A day', text:'My writing', date:'Today', mode:'reflect', tag:'', createdAt:'2026-09-07T10:00:00', updatedAt:'2026-09-07T10:00:00'};
test('records changed writing, preserves history, ignores unchanged saves and model replies', () => {
  const first = trackWriting([entry], [], '2026-09-07T10:00:00');
  assert.equal(first[0].activityAt.length, 1);
  const unchanged = trackWriting(first, first, '2026-09-08T10:00:00');
  assert.equal(unchanged[0].activityAt.length, 1);
  const edited = trackWriting([{...first[0], text:'New thought'}], first, '2026-09-08T10:00:00');
  assert.equal(edited[0].activityAt.length, 2);
  const model = trackWriting([{...edited[0], messages:[{id:'m', role:'model', text:'AI', createdAt:'2026-09-08T11:00:00'}]}], edited);
  assert.equal(model[0].activityAt.length, 2);
});
test('round-tripped history has local Monday/Sunday boundaries, excludes samples and future events', () => {
  const saved = JSON.parse(JSON.stringify({...entry, activityAt:['2026-09-06T23:59:00','2026-09-07T10:00:00','2026-09-08T10:00:00','2026-09-13T10:00:00','2026-09-14T10:00:00']}));
  const week = weeklyActivity([saved, {...saved,id:'sample',sample:true}],new Date(2026,8,13,12));
  assert.equal(week.total,3); assert.equal(week.activeDays,3);
  assert.deepEqual(week.days.map(day=>day.count),[1,1,0,0,0,0,1]);
  assert.equal(weeklyActivity([saved],new Date(2026,8,8,12)).total,2);
});
test('legacy dates are deduplicated and editing a sample does not import sample activity', () => {
  assert.equal(entryActivity(entry).length,1);
  const tracked = trackWriting([{...entry,sample:false}], [{...entry,sample:true}], '2026-09-09T10:00:00');
  assert.deepEqual(tracked[0].activityAt,['2026-09-09T10:00:00']);
});
