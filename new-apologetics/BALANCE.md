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
