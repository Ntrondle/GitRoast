# Signals and meme catalog

## Signals

`src/signals.ts` computes these from PR metadata. Times use the configured `TIMEZONE`.

| Signal | Type | True when |
|---|---|---|
| `linesChanged` | number | additions plus deletions |
| `wipCommits` | number | count of commit messages containing wip, fix, oops, again or typo |
| `isHuge` | boolean | more than 1000 lines changed, or more than 30 files |
| `isTiny` | boolean | fewer than 10 lines changed |
| `titleUndersells` | boolean | `isHuge`, and the title contains typo, small, minor, quick, tweak or nit |
| `isRevert` | boolean | the title starts with "Revert", or a label contains "revert" |
| `isRefactor` | boolean | the title or a label contains "refactor" |
| `isFridayEvening` | boolean | opened on a Friday at 16:00 or later |
| `isLateNight` | boolean | opened between 00:00 and 04:59 |
| `hasWipCommits` | boolean | `wipCommits` is 3 or more |
| `deletesMoreThanAdds` | boolean | deletions are more than twice the additions and more than 100 |
| `noDescription` | boolean | the body is empty or under 20 characters |
| `manyCommits` | boolean | more than 20 commits |

Only the first 50 commits are fetched, so the commit counts are capped at 50.

## Templates

The rules picker uses the highest-priority template whose signal is true. Jev and Von read the description instead and may choose differently.

| Priority | memegen ID | Meme | Rule | Description given to Jev and Von |
|---|---|---|---|---|
| 100 | `mordor` | One Does Not Simply | `titleUndersells` | The title calls the change small, minor or a typo fix, but the PR is actually huge |
| 90 | `fine` | This Is Fine | `isFridayEvening` | A risky change opened late on a Friday while the author acts calm |
| 80 | `rollsafe` | Roll Safe | `isLateNight` | Opened in the middle of the night, as if nobody will be awake to review it |
| 75 | `success` | Success Kid | `deletesMoreThanAdds` | Deletes far more code than it adds; a satisfying cleanup |
| 72 | `same` | They're The Same Picture | `isRevert` | A revert that undoes an earlier change |
| 70 | `noidea` | I Have No Idea What I'm Doing | `hasWipCommits` | Many commits named wip, fix, oops or again |
| 65 | `buzz` | X, X Everywhere | `isHuge` | A huge change spread across a very large number of files |
| 60 | `gb` | Galaxy Brain | `isRefactor` | A refactor or rewrite, possibly escalating into over-engineering |
| 55 | `yallgot` | Y'all Got Any More of Them | `manyCommits` | An unusually long list of commits |
| 50 | `cmm` | Change My Mind | `noDescription` | The PR has no description or almost none |
| 40 | `bihw` | But It's Honest Work | `isTiny` | A tiny change of only a few lines |
| 0 | `fry` | Futurama Fry | none (generic) | An ordinary pull request with nothing unusual |

The captions themselves are in `src/templates.ts`.

## Caption slots

Captions can contain these placeholders:

| Slot | Value |
|---|---|
| `{files}` | changed file count |
| `{lines}` | additions plus deletions |
| `{additions}` | added lines |
| `{deletions}` | deleted lines |
| `{commits}` | number of commits fetched, up to 50 |
| `{title}` | PR title |
| `{author}` | PR author's login |

Slot values longer than 60 characters are cut and end with `…`. An unknown slot is left as literal text.

When a template has several captions, the one at index `PR number % caption count` is used.

## memegen escaping

memegen.link uses the URL path as meme text, so special characters are encoded before the URL is built:

| Character | Encoded as |
|---|---|
| space | `_` |
| `_` | `__` |
| `-` | `--` |
| `?` | `~q` |
| `&` | `~a` |
| `%` | `~p` |
| `#` | `~h` |
| `/` | `~s` |
| `\` | `~b` |
| `<` | `~l` |
| `>` | `~g` |
| `"` | `''` |
| newline | `~n` |

The result is then percent-encoded, so accents and emoji work. An empty line becomes `_`, memegen's blank line.
