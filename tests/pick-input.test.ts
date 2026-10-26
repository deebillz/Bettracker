import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestTeams, suggestPicks, applySuggestion } from "../client/src/components/pick-input";
import { TEAMS_BY_SPORT } from "../client/src/data/teams";

const nfl = TEAMS_BY_SPORT.NFL;

test("suggests teams from any word typed", () => {
  assert.equal(suggestTeams(nfl, "jets")[0], "New York Jets");
  assert.deepEqual(suggestTeams(nfl, "new york"), ["New York Giants", "New York Jets"]);
  assert.equal(suggestTeams(nfl, "ny j")[0], undefined); // "ny" isn't a word in the name
  assert.equal(suggestTeams(nfl, "jets +3.5")[0], "New York Jets"); // the line is ignored for matching
  assert.deepEqual(suggestTeams(nfl, "j"), []); // too short to guess
  assert.deepEqual(suggestTeams(nfl, "New York Jets +3"), []); // already a full name
});

test("picking a suggestion keeps the line you typed", () => {
  assert.equal(applySuggestion("jets +3.5", "New York Jets"), "New York Jets +3.5 ");
  assert.equal(applySuggestion("jets", "New York Jets"), "New York Jets ");
  assert.equal(applySuggestion("jets ml", "New York Jets"), "New York Jets ML ");
  assert.equal(applySuggestion("New York Jets vs bil", "Buffalo Bills"), "New York Jets vs Buffalo Bills ");
});

test("finds teams in other sports and says which sport", () => {
  assert.deepEqual(suggestPicks("NFL", "knicks")[0], { team: "New York Knicks", sport: "NBA" });
  assert.deepEqual(suggestPicks("NBA", "knicks")[0], { team: "New York Knicks", sport: "NBA" });
  const giants = suggestPicks("NBA", "giants").map((s) => `${s.team} (${s.sport})`);
  assert.deepEqual(giants.slice(0, 2), ["New York Giants (NFL)", "San Francisco Giants (MLB)"]);
  // the chosen sport comes first when a name exists in two sports
  assert.equal(suggestPicks("College Basketball", "gonzaga")[0].sport, "College Basketball");
});
