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
| `isMassive` | boolean | more than 5000 lines changed |
| `isHotfix` | boolean | the title or a label contains hotfix, urgent, asap, critical, emergency, outage or incident |
| `isSecurity` | boolean | the title or a label mentions security, CVE, vulnerability, XSS, CSRF, injection or exploit |
| `isWeekend` | boolean | opened on a Saturday or Sunday |
| `isMondayMorning` | boolean | opened on a Monday between 05:00 and 10:59 |
| `isWipTitle` | boolean | the title starts with WIP, [WIP], draft, "do not merge" or DNM |
| `hasMergeCommits` | boolean | at least two commits are merge commits, such as "Merge branch 'main'" |
| `isMassRename` | boolean | 10 or more files, with at most 4 changed lines per file on average |
| `isDependencyBump` | boolean | the title or a label contains bump, dependabot, renovate, dependency or deps |
| `isRelease` | boolean | the title or a label contains release, changelog or a version like v1.2 |
| `isCi` | boolean | the title or a label contains CI, CD, pipeline, workflow or GitHub Actions |
| `titleShouting` | boolean | the title has `!!` or is more than 80% capital letters (at least 8 letters) |
| `vagueTitle` | boolean | the whole title is a vague word such as "update", "fix", "changes", "stuff" or "misc" |
| `longDescription` | boolean | the body is over 2000 characters |
| `isPerformance` | boolean | the title or a label mentions perf, performance, faster, speed up, optimize or caching |
| `isRename` | boolean | the title or a label contains rename or move |
| `isCleanup` | boolean | the title or a label contains cleanup, remove, delete, unused, dead code or drop |
| `isTests` | boolean | the title or a label contains test, spec, coverage or flaky |
| `isDocs` | boolean | the title or a label contains docs, documentation, README, comment or guide |
| `singleCommit` | boolean | exactly one commit |
| `isBugFix` | boolean | the title starts with fix, fixes, fixed, bugfix, bug or `fix:` |
| `isFeature` | boolean | the title starts with feat:, feature:, add, introduce, implement, support or new |

Only the first 50 commits are fetched, so the commit counts are capped at 50.

## Templates

The rules picker finds every signal that is true and takes the one with the highest priority. All templates on that signal share its priority, and the picker chooses between them using a hash of the PR number, so the same PR always gets the same meme. When no signal is true, it chooses one of the generic templates the same way.

Jev and Von read each template's `description` instead and may choose differently.

| Priority | Signal | Templates | Memes (memegen ID) |
|---|---|---|---|
| 100 | `titleUndersells` | 4 | One Does Not Simply (`mordor`), Inigo Montoya (`inigo`), Expectation vs. Reality (`dbg`), It's A Trap! (`ackbar`) |
| 95 | `isHotfix` | 5 | Do It Live! (`live`), Sweet Brown (`aint-got-time`), Panik Kalm Panik (`panik-kalm-panik`), We Don't Do That Here (`wddth`), Types of Headaches (`headaches`) |
| 90 | `isFridayEvening` | 5 | This Is Fine (`fine`), Super Cool Ski Instructor (`ski`), I Immediately Regret This Decision (`regret`), Winter Is Coming (`winter`), Probably Not a Good Idea (`jw`) |
| 80 | `isLateNight` | 3 | Roll Safe (`rollsafe`), What Year Is It? (`whatyear`), Hide the Pain Harold (`harold`) |
| 78 | `isWeekend` | 3 | That Would Be Great (`officespace`), But That's None of My Business (`kermit`), First World Problems (`fwp`) |
| 77 | `isSecurity` | 3 | Matrix Morpheus (`morpheus`), Skeptical Snake (`snek`), Do You Want Ants? (`ants`) |
| 75 | `deletesMoreThanAdds` | 3 | Success Kid (`success`), Feels Good (`feelsgood`), And It's Gone (`gone`) |
| 72 | `isRevert` | 3 | They're The Same Picture (`same`), I Should Not Have Said That (`hagrid`), Captain Hindsight (`ch`) |
| 70 | `hasWipCommits` | 4 | I Have No Idea What I'm Doing (`noidea`), First Try! (`firsttry`), Kombucha Girl (`kombucha`), At Least You Tried (`tried`) |
| 69 | `isWipTitle` | 3 | What's in the Box!? (`box`), Office Space Milton (`cake`), Stop Trying to Make Fetch Happen (`fetch`) |
| 68 | `isMassive` | 2 | The Rent Is Too Damn High (`toohigh`), Michael Scott No God No (`michael-scott`) |
| 65 | `isHuge` | 4 | X, X Everywhere (`buzz`), X All the Y (`xy`), Stonks (`stonks`), Push It Somewhere Else Patrick (`patrick`) |
| 63 | `hasMergeCommits` | 3 | Xzibit Yo Dawg (`yodawg`), Spider-Man Pointing at Spider-Man (`spiderman`), Feels Bad Man (`sadfrog`) |
| 60 | `isRefactor` | 5 | Galaxy Brain (`gb`), Midwit (`midwit`), What the Hell Is This? (`noah`), Jony Ive Redesigns Things (`ive`), Confused Gandalf (`gandalf`) |
| 58 | `isMassRename` | 2 | Epic Handshake (`handshake`), Daily Struggle (`ds`) |
| 55 | `manyCommits` | 3 | Y'all Got Any More of Them (`yallgot`), Oprah You Get a Car (`oprah`), Stop It, Get Some Help (`stop-it`) |
| 54 | `isDependencyBump` | 3 | An Older Code Sir (`older`), Running Away Balloon (`balloon`), Laundry Room Viking (`lrv`) |
| 53 | `isRelease` | 3 | It's Happening (`happening`), Shut Up and Take My Money! (`money`), So Hot Right Now (`sohot`) |
| 52 | `isCi` | 3 | Soccer Celebration in a Bar (`crowd`), Crying on Floor (`cryingfloor`), Bad Luck Brian (`blb`) |
| 51 | `titleShouting` | 2 | This Is Sparta! (`sparta`), Inhaling Seagull (`seagull`) |
| 50 | `noDescription` | 3 | Change My Mind (`cmm`), Afraid to Ask Andy (`afraid`), Philosoraptor (`philosoraptor`) |
| 49 | `vagueTitle` | 4 | Is This a Pigeon? (`pigeon`), Condescending Wonka (`wonka`), You Should Feel Bad (`bad`), Comic Book Guy (`cbg`) |
| 48 | `longDescription` | 2 | The Most Interesting Man in the World (`interesting`), See? Nobody Cares (`dodgson`) |
| 47 | `isPerformance` | 2 | Vince McMahon Reaction (`vince`), Salt Bae (`saltbae`) |
| 46 | `isRename` | 2 | Tuxedo Winnie the Pooh (`pooh`), Too Confusing, Too Extreme (`prop3`) |
| 45 | `isCleanup` | 2 | Khaby Lame Shrug (`khaby-lame`), Why Shouldn't I Keep It (`bilbo`) |
| 44 | `isTests` | 4 | I Feel Like I'm Taking Crazy Pills (`crazypills`), Seal of Approval (`soa`), I Would Be So Happy (`sohappy`), It's Simple, Kill the Batman (`joker`) |
| 43 | `isDocs` | 2 | Agnes Harkness Winking (`agnes`), Pepperidge Farm Remembers (`remembers`) |
| 42 | `isMondayMorning` | 2 | Grumpy Cat (`grumpycat`), Will Smith Slapping Chris Rock (`slap`) |
| 40 | `isTiny` | 4 | But It's Honest Work (`bihw`), What Is This, a Center for Ants?! (`center`), So I Got That Goin' for Me (`nice`), Nothing To Do Here (`jetpack`) |
| 35 | `singleCommit` | 2 | Forever Alone (`fa`), You Were the Chosen One! (`chosen`) |
| 30 | `isBugFix` | 7 | Scooby Doo Reveal (`reveal`), Always Has Been (`astronaut`), Left Exit 12 Off Ramp (`exit`), Schrute Facts (`dwight`), Gru's Plan (`gru`), Sudden Clarity Clarence (`scc`), Facepalm (`facepalm`) |
| 25 | `isFeature` | 5 | Drakeposting (`drake`), Distracted Boyfriend (`db`), Anakin and Padme (`right`), I'm Going to Build My Own Theme Park (`bender`), Fake Spirit Halloween Costume (`spirit`) |
| 0 | none (generic) | 23 | Futurama Fry (`fry`), Conspiracy Keanu (`keanu`), Why Not Both? (`both`), What Are Ya Gonna Do? (`waygd`), Member Berries (`mb`), Baby, You've Got a Stew Going (`stew`), We Have Food at Home (`home`), Drowning High Five (`drowning`), Principal Skinner (`touch`), Confession Bear (`cb`), Scumbag Steve (`ss`), Scumbag Brain (`sb`), Say the Line, Bart! (`say`), Unpopular Opinion Puffin (`puffin`), Is That What We're Going to Do Today? (`red`), Genie Rules (`wishes`), Overly Attached Girlfriend (`oag`), I Guarantee It (`mw`), I Should Buy a Boat Cat (`boat`), Good Guy Greg (`ggg`), I Am the Captain Now (`captain`), Socially Awesome Penguin (`awesome`), Socially Awkward Penguin (`awkward`) |

The captions and descriptions are in `src/templates.ts`. Memes whose joke is deliberately broken English, such as Doge or Y U NO, are left out because they read like a bug.

## Caption slots

Captions can contain these placeholders:

| Slot | Value |
|---|---|
| `{files}` | changed file count, such as `1,204` |
| `{lines}` | additions plus deletions |
| `{additions}` | added lines |
| `{deletions}` | deleted lines |
| `{commits}` | number of commits fetched, up to 50 |
| `{lineCount}` | `{lines}` with its noun: `1 line`, `1,205 lines` |
| `{fileCount}` | `{files}` with its noun: `1 file`, `47 files` |
| `{commitCount}` | `{commits}` with its noun |
| `{wipCommitCount}` | `wipCommits` with its noun |
| `{title}` | PR title |
| `{author}` | PR author's login |

Numbers use thousands separators. Write `{lineCount}` rather than `{lines} lines`, so a one-line PR doesn't read "1 lines". A catalog test enforces this.

Slot values longer than 60 characters are cut and end with `…`. An unknown slot is left as literal text.

When a template has several captions, one is chosen with a hash of the template ID and the PR number. A redelivered webhook gets the same caption, and the caption doesn't move in step with the rules picker's choice of template.

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
