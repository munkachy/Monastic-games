# New Apologetics: balance notes

These notes are for the people building the game. They are kept off the
design page, which is written for the apologists themselves.

Each hero's kit is modelled on a hero from *Star Trek: Legends* (Tilting
Point, 2021), so the numbers start from a game that was already balanced:
the same targets, cooldowns and percentages, with starting stats scaled
from that hero's rank-one base stats (× 10).

| Hero | Role | Modelled on | Composure | Rhetoric | Learning | Charity | Readiness |
|---|---|---|---|---|---|---|---|
| Jimmy Akin | Scholar | Data | 225 | 70 | 90 | 25 | 58 |
| Ethan Muse | Defender | Worf | 288 | 76 | 45 | 18 | 88 |
| Fr. Mike Schmitz | Leader | Picard | 250 | 58 | 105 | 12 | 125 |
| Cameron Bertuzzi | Leader | Sisko | 238 | 79 | 60 | 14 | 118 |
| Trent Horn | Leader | Kirk | 250 | 82 | 15 | 15 | 140 |
| Matt Fradd | Encourager | McCoy | 225 | 61 | 105 | 14 | 125 |
| GodLogic | Builder | Geordi La Forge | 163 | 61 | 135 | 15 | 125 |
| Bishop Barron | Leader | Riker | 262 | 82 | 60 | 11 | 110 |
| Fr. Boniface Hicks | Scholar | Spock | 200 | 64 | 128 | 14 | 110 |
| Fr. Gregory Pine | Leader | Janeway (Attack and Tech swapped) | 213 | 53 | 88 | 14 | 118 |
| Sr. Mary Grace | Scholar | Uhura | 213 | 64 | 75 | 10 | 170 |
| Lila Rose | Scholar | Sela (cloak → Undercover, Surprise Attack → Live Action) | 138 | 58 | 128 | 6 | 200 |
| Brian Holdsworth | Encourager | Crusher | 200 | 58 | 135 | 12 | 125 |
| Alex Jurado | Leader | Khan | 288 | 100 | 30 | 15 | 88 |
| Fr. Robert Spitzer | Builder | Seven of Nine | 188 | 70 | 135 | 18 | 73 |
| Joe Heschmeyer | Leader | Sulu (Attack and Tech swapped) | 188 | 30 | 88 | 10 | 170 |
| Scott Hahn | Defender | The Gorn (Smash, Charge, Boulder Toss) | 350 | 94 | 0 | 18 | 50 |

The duo great move, Vindicatory Miracles (Ethan Muse and Fr. Spitzer), is
modelled on Legends' morale combos and team-up attacks.

Stat names: Health → Composure, Morale → Conviction, Attack → Rhetoric,
Tech → Learning, Defense → Charity, Speed → Readiness. Status effects:
Stun → Dumbfounded, Taunt → Called Out, Wound → Doubting, Scan →
Cross-Examined, Purge → Fact-Check, Cleanse → Examen, Cover → Citation,
Shield → Charity Shield, Skill lock → Muted, Counter → Rebuttal.

Sources for the kits: legends.datacore.app (Data, Worf, Picard, Kirk,
McCoy, Geordi, Riker, Spock, Sisko, Janeway, Uhura, Crusher, Sulu, Khan,
Seven of Nine); the Star Trek Legends Wiki (Morale System); Biggest in
Japan, "10 Tips & Tricks for Starting Star Trek: Legends".

Bosses have no Legends model. Their kits follow the same shape (a basic
move, two 3-turn skills, one 4-turn great move) with a counter built in
that a particular hero can answer: Fr. Pine's Distinguo cancels
O'Connor's Euthyphro; Hahn's Covenant Is Family passes through Ryan's
Faith Alone; Trent Horn's Is That in the Bible? passes through White's
Eternal
Security and Sola Scriptura.

## Update: Zeal, podiums and the finer stats

Stats are now Composure (Health), Attack, Defense and Speed, plus traits
taken straight from each hero's Legends model (LegendsDataCore,
data/characters.json): Care = the model's base Tech × 10 (it scales the
Shields of Faith and podiums a hero gives, as Tech scales shields in
Legends), glance [chance, share deflected], crit [chance, damage], and
resolve (chance to resist losing Zeal). Morale → Zeal (0, up to +3, floor
−4 heroes and Joe, −5 grunts, −6 bosses; at 0+ a friend may back you up).

Cover → podiums. Legends places cover in 0–2 slots per battle (none on
Easy); ours: each foe 35% (max 2), each hero 15% (max 1), strength 40% of
the average Composure. Chapter looks: desk (atheists), soapbox
(evangelicals, tutorial), display (LDS), stepladder (Speakers' Corner),
pulpit (Reformed). Cover-piercing moves: Obsculta (Spock's Nerve Pinch
ignores cover), A Word of Truth. Extra against cover: Senior Apologist
(Android Backhand), The Case for Catholicism (Orbital Strike), Stallone
Voice (Khan's Cover Smash). Podium makers: Smooth Pivot (Geordi's
Replicated Barrier), The Way of Beauty (Riker Maneuver). Command attack:
I'm Praying for You (Picard's Make it So).

## Update: Hahn as the Gorn, Lila as Sela, books

Scott Hahn now follows the Gorn exactly (base ×10: Health 35, Attack 9.4,
Speed 5; Smash 150% + 50% Wound, Charge 300% −1 Morale, Boulder Toss 500% +
Stun 3). Lila Rose follows Sela (Health 13.75, Tech 12.75, Speed 20;
Disruptor Blast 125% + Cloak on kill, Surprise Attack 4 × 150% random with
50% −1 Morale, Cloaking Heal). Deviations, found by simulation: Undercover
(Cloak) cuts hits to 25% and makes her a low-priority target; her Cloaking
Heal starts ready (Legends: starting cooldown 1). James White's Sola
Scriptura strips Undercover, so he is her counter (125/200 with her vs
162/200 without); against O'Connor and Hansen she is at or above par.

Books follow the five Nexus Particle types: Undo Damage → Confessions,
Nexus Field → The Catechism, Temporal Flux (resist Scan) → The Summa,
Accelerated Coagulation (resist Wound) → The Rule of St. Benedict, Amplify
Force → Apologia Pro Vita Sua. One per chapter won.

## Update: Rebuttal as Legends' Counter

Legends: "Counter: trigger an attack when damaged by an enemy attack" (Worf's
Bat'leth Poise, Sulu's Riposte, Soji's Fighting Posture; 3 turns). Rebuttal
now triggers on any enemy move that reaches the hero (single, multi or
whole-team; not when a podium takes it), once per move, answering the
attacker with the hero's basic move on stage. Rebuttals never trigger
rebuttals. White fight, 200 runs: with Ethan 148 wins (137 before), without
146; Heschmeyer 127 (124 before; his weakness there predates this).

## Difficulty and the balance harness (September 2026)

Method, after simulation-based balance testing (bots of different skill
bracket the result; about 30 runs per case keeps sampling error near ±5
points) and Csikszentmihalyi's flow channel (challenge a little above
skill, rising with it):

- Two bots play every mission on every difficulty with realistic levels
  (experience as a player would earn it), random podiums and books as
  earned: "simple" (the old random Auto: a careless player, the floor) and
  "smart" (the new Auto, which heals the hurt, revives the Discouraged,
  shields, clears setbacks, and presses the opponent nearest to giving way:
  the reference player).
- Targets (smart bot, regular / boss): Gentle ~95-100 / 90+; Normal 85-95 /
  65-85; Hard 70-85 / 45-65; Very Hard 55-75 / 30-50; Crucible 40-60 /
  20-40, and every mission winnable.

What the harness found in the old game: Normal was won ~100% everywhere;
chapters 2-4 could not be lost even at triple strength, because (1) the
heroes out-act the opponents about 17 to 6 per battle and (2) Zeal attacks
ignore Composure, so tougher opponents simply left by Zeal instead.

Fixes: each chapter has a power k (Composure ×k, Attack ×√k, Zeal depth
+2(k−1)), found by bisection for Normal to hit ~90% regular / ~75% boss:
atheists 2.0/1.8, evangelicals 2.8/2.5, LDS 3.6/4.0, Islam 3.9/2.8,
Reformed 3.0/1.3. Difficulty adds toughness, Zeal depth, resilience,
sharper opponent tactics, more podiums, and reinforcements (Legends-style
waves: a fresh rank-and-file steps into an empty place). The experience
bonus is small (≤ +30%) because a large one cancelled the difficulty.
Chapter 1 gets half the difficulty and at most one reinforcement; the
tutorial is always Normal or easier.

Final (smart bot, 30 runs per mission; regular / boss): Gentle 100 / 99,
Normal 93 / 81, Hard 73 / 63, Very Hard 56 / 37, Crucible 39 / 31, every
Crucible mission ≥ 20% with the smart bot; Crucible bosses 23-60% with two
extra levels. Joe Schmid comes home in about half of Normal runs (the smart
bot hunts Zeal); as a hero (Soji's kit) his team wins 88/120 against 99 for
a random team, like Fr. Spitzer (91): a support, a little below average.

## Update: the whole team backs up

Backing up used to stop at the first friend whose roll succeeded, so a move
drew at most one backer. Now every friend with Zeal 0 or higher rolls for
himself (25% at Zeal 0, 40%, 55%, 70% at +3), for heroes and opponents alike,
and when a hero is Discouraged each friend still standing is Shaken and loses
1 Zeal (Resilience and Steadfast can hold it; it doesn't chain).

Backers per hero attack (random teams, Normal): before 0: 59%, 1: 31%,
2: 8%, 3: 1%; now 0: 37%, 1: 34%, 2: 22%, 3: 7%.

Tuning (smart bot, regular / boss win %): letting opponents pile on down to
Zeal −2 made Normal 77 / 58, too hard; down to −1, 88 / 71; the same rule as
the heroes (from 0) with the higher hero chances kept the old curve. Final,
30 runs per mission: Gentle 100 / 99, Normal 92 / 77, Very Hard 58 / 38,
Crucible 46 / 31 (before: 100 / 99, 93 / 81, 56 / 37, 39 / 31).

## Update: two new chapters and Fr. Carlos Martins

Chapter 5, Apollo Loves You (New Age; an invented WitchTok influencer; tarot
readers and crystal healers), and Chapter 6, My Body, My Brand (Online
Culture; Destiny; content creators and campus activists), come before James
White, who stays the final boss. Fr. Carlos Martins joins after the Islam
chapter, modelled on Captain Pike (base × 10: Health 25, Attack 5.2,
Defense 2.09, Tech 10.5, Speed 9.5): Holy Water (Phaser), Stand Behind Me
(Protect: taunt, Morale up for the team), Prayer of Deliverance (Stand Up:
major heal that brings back the Discouraged, cleanse, 50% Morale up),
Treasures of the Church (Call to Action). He makes a fourth reviver.

Tuning, smart bot, Normal: the first cut was too hard (the new rank and file
had team-wide second moves; the old ones are single-target), so Crystal
Grid, It's Empowering and Clump of Cells became single-target, The Tower
hits lighter, Destiny's Attack 84 → 78 and Speed 118 → 112, and the powers
settled at New Age [3.0, 2.6], Body [3.1, 2.2], Reformed boss 1.3 → 1.15.
Final, 30 runs: New Age 97 / 90 / 73 / boss 93; Body 97 / 83 / 80 / boss 70;
Reformed 100 / 87 / 87 / boss 77; whole campaign grunt 92, boss 79 (Normal),
grunt 41 (Crucible).

## Update: any order, players, and the final chapter

Stories can be played in any order after the tutorial. There is no scaling:
the difficulty setting is the lever. A level-2 team with no scaling wins
almost nothing past Chapter 1 on Normal (0–17%), so Gentle was made softer
(Composure ×0.5, Attack ×0.55, was 0.6 / 0.65) and earns less (×0.75, was
0.9). A level-2 team on Gentle, 16 runs: atheists 100 throughout,
evangelicals 100/100/100/94, LDS 100/100/100/63, Islam 100/75/94/88,
New Age 100/94/88/100, Body 100/94/69/75, Reformed 100/75/88/88. Each chapter
keeps a par (the team level it was built for) only to tell a player who has
jumped ahead that Gentle will make it winnable.

The final chapter, The Great Debate (O'Connor, Ryan, Hansen; the Speakers'
Corner Champion, the WitchTok influencer, Destiny; Destiny, White,
O'Connor), opens when all seven stories are done and has no par, so it never
scales down. Power [1.35, 0.85]; Normal 60 / 63 / 67, Very Hard 77 / 53 / 33
(30 runs): the hardest chapter in the game.

## Update: shorter, harder-hitting debates

An impact factor divides every debater's Composure and every Care-based
shield and podium (heals, Doubting and Free-for-All Friday's shield are
fractions of Composure, so they follow). Impact alone favoured the
opponents, since the heroes' heals, shields and great moves take turns to
charge: Normal fell to 75 / 69 at 1.5 and 69 / 56 at 2. Softening the
opponents' punch restored it (20 runs, Normal, regular / boss): impact 2 with
punch 2.0 77 / 71, 1.8 82 / 75, 1.6 88 / 84, 1.5 89 / 88. Chosen: impact 2,
punch 1.6 (was 1 and 2.4). Rounds per debate on Normal 7.0 → 5.3. Other
difficulties: Gentle 99 / 100, Hard 77 / 64, Very Hard 60 / 46, Crucible
48 / 29.

## Update: Who Do You Say You Are? and Kim Zember

Chapter 7 (Identity; an invented Affirming Pastor; campus allies and
deconstruction podcasters), par 8.3, power [3.0, 2.3]. Kim Zember joins at
its end, modelled on Sylvia Tilly (base × 10: Health 35, Attack 4.75,
Defense 1.5, Tech 11.25, Speed 6.87): Restless Heart (Phaser), Boldly
Beloved (Antimatter Shield), Here I Am (Nervous Ramble: taunt, Defense Up),
Child of God (Group Hug: heal, cleanse, Morale up). With the shorter
debates the final chapter's last debate fell to 25%, so its boss power went
0.85 → 0.7. Normal, 30 runs: Identity 100 / 70 / 77 / boss 73; final chapter
73 / 53 / 57; whole campaign grunt 87, boss 81.

## Update: Misquoting Jesus? and Brant Pitre; nine bosses in the final chapter

Chapter 8 (Skeptical Scholars; Bart Ehrman; Religion 101 students and
mythicist YouTubers), par 8.5. Brant Pitre joins at its end, modelled on Saru
(base × 10: Health 25, Attack 6.4, Defense 0.44, Tech 9, Speed 16.25):
Jewish Roots (Phaser), The Big Picture (Tricorder Scan: Exposed, Defense
Down Major), The New Passover (We Are Starfleet: Attack Up Major, Morale
up), The Case for Jesus (Vahar'ai Quills: heavy hit, Wound → Doubting).
First cut [3.0, 2.3] gave 100 / 60 / 85 / boss 50; eased to [2.8, 1.9]:
100 / 97 / 77 / boss 73 (Normal, 30 runs). The final chapter now fields all
nine bosses (O'Connor, Ryan, Hansen; the Speakers' Corner Champion, the
WitchTok influencer, Destiny; the Affirming Pastor, White, Ehrman): 40–65 /
45–60 / 50–53 across runs, so its regular power went 1.35 → 1.25. Whole
campaign on Normal: grunt 85, boss 76.

## Update: great moves hit half again as hard

Each hero's great move (the last skill in the kit) and any duo move now hits,
heals and shields ×1.5 (GREAT_KICK), so unlocking it feels like a real
upgrade. Jimmy Akin's Senior Apologist stun went 25% → 50% (Data's number);
Brant Pitre moved onto Spock's kit with T'Pol's stats. On their own these
made Normal easier (grunt 90, boss 82), so opponent punch went 1.6 → 1.8:
grunt 85, boss 74, 5.4 rounds a debate (Normal, 30 runs; 1.7 gave 89 / 79).

## Update: low Zeal weakens arguments; bots compared; team makeup

As in Legends, a debater with Zeal below zero now hits softer: each point
below 0 takes 10% off his hits (ZEAL_SAP; heals and shields unchanged). The
heroes lower Zeal far more than the opponents do, so this made Normal easier
(86 / 77 → 92 / 86); opponent punch went 1.8 → 2.15 to restore 86 / 76.

New harness (scratchpad strat.js): teams are drawn only from the roster the
player really has at each point in the campaign, and every battle's team is
logged for team analysis (teams.js). Normal, 30 runs per debate, three bots:

| Hero bot | Regular debates | Boss debates |
|---|---|---|
| Random: any ready move, any target | 49% | 34% |
| Simple: usually its strongest ready move, weakest target | 76% | 65% |
| Smart: weighs what the team needs | 86% | 76% |

Move choice matters a great deal. Team makeup matters much less (heroes range
about ±9 points from their mission's average, within noise for most), and
what does show favours stacking attackers: Builders and Encouragers come out
slightly below average, because debates of about five rounds leave little
time for shields and healing to pay off.
