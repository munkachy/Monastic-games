# New Apologetics: working notes

These notes are for the people building the game. They used to appear on the
public page as "Work in progress"; they were moved here so that the page the
apologists are sent for evaluation shows only the game itself.

## Open items

- **The whole game is still under review.** The dialogue, the moves and the
  balance are drafts. The words given to real people are written to reflect
  what each has said in public.
- **The Islam storyline needs a boss.** Until one is chosen and agrees, an
  invented character, the Speakers' Corner Champion, fills the place.
- **GodLogic is a mere-Christian apologist, not a Catholic one.** He fits best
  as a guest ally in the Islam storyline, where Catholics and Protestants make
  common cause, and that is a good lesson in itself.
- **The likenesses are mostly drawn from photographs.** A few are still best
  guesses and will be redrawn as better photographs come in.

- **Destiny's lines state his own public case** (personhood begins with
  conscious experience; his sleeping-person and life-support analogies), not
  a caricature. The chapter ends without his conversion. The WitchTok
  influencer is an invented character.

## Writing about real people

The people in this game may read it. Every description of a hero (the `about`
text in `data.js` and the `flavor` text on the page) should say how to play
him or her in terms of strengths and good pairings, never as a weakness of the
person. For example, not "fast, sharp and not very sturdy" but "quick-witted
and first to the microphone, he does his best work before the other side gets
going." Speed and toughness are game numbers; say what a hero does well, and
whom to pair him with.

## Conversions

- Rank-and-file opponents: when one goes out of the debate, by conceding or by
  leaving, there is an even chance (`GRUNT_CONVERT = 0.5` in `battle.js`) that
  he converts instead. His sign fits where he started: OCIA and the Easter
  Vigil for the unbaptized, full communion for a baptized Protestant, baptism
  for a Latter-day Saint (the CDF, 2001, does not recognize LDS baptism).
- Bosses never convert in battle. Joe Schmid is the one exception: he always
  converts when he goes out, however it happens, and joins the roster. His path
  is hinted at in the story but never stated.
- The reason for the coin toss: apologetics clears the ground, and conversion
  is the Holy Spirit's work, so the game keeps it out of the player's hands.

## Music (2026-09-29)

Three choices on the music button: Illuminated, Vigil, Chant (and Silence).
The old Techno, Dubstep and Electro beats, and chant sung over them, are gone.

- Chant stands alone: one legato voice per phrase (a filtered sawtooth, the
  sound the Techno bass had), with oblique organum below (a fourth, or a fifth
  where the fourth leaves the mode; never below the step under the final;
  unison at each cadence), a swept-pulse drone on the final, and a shimmer of
  open fifths at each breath. Free rhythm, 0.42 s a note; rests of 0.5 / 0.75
  / 1.5 / 2.5 notes at quarter, half, full and double bars.
- Illuminated (138 bpm) and Vigil (92 bpm) are chip music in Tim Follin's
  manner, built from the mode of the screen's chant as it is actually sung
  (Ave maris stella's B flat included): chords as 50 Hz arpeggios, swept-pulse
  lead with bends, trills and late vibrato, echo, filter or triangle bass,
  noise drums. A round is four 8-bar sections (groove, lead, breakdown, and a
  lift up a tone in Illuminated or a modal shift in Vigil). Map: no drums;
  debate: drums; boss: more. A boss's wind-up muffles the music; the blow
  opens it with a crash.
- The final is taken from the mode (D, E, F, G), not the excerpt's last note.
- Ave maris stella is now the Antiphonale Monasticum's (GregoBase 9733) rather
  than the Dominican processional's; `node tools/gabc2js.js new-apologetics`
  regenerates chants.js from new-apologetics/music/gabc/. Benedictine Bricks
  keeps its own chants.

## Fixes, Joe Heschmeyer, Fr. Augustine Wetta and the Nones (2026-09-29)

- Muted now holds through the muted debater's next turn (it used to count down just before he chose, so a one-turn Mute did nothing). The MUTED mark stays up until that turn is over.
- Shields: a thin white bar above Composure on the same scale, and a SHIELD n% tag, so stacking is visible. One-turn Attack Downs now last two turns; the list under the stage shows how many turns each boost or setback has left.
- Every flying phrase or sign is a hit: basic moves that showed two or three strikes now deal two or three hits (same total). Line alternatives keep the same count. Encouragers (Fradd, Holdsworth, Martins, Wetta) crit about 12% of the time, with multi-hit basic moves.
- Joe Heschmeyer: Objection! (gavel, Muted), Burden of Proof (all Exposed, Rebuttal), Shameless Popery as a courtroom with the Fathers as exhibits and his line on the Papacy.
- Fr. Augustine Wetta, OSB joins after Are You a Good Person? He surfs into cut scenes (cast entries starting with "~"), including the theology-of-the-body lesson in My Body, My Brand.
- New chapter, Nothing in Particular (the Nones): opponents who drain Zeal rather than Composure; boss the Master of None, whose closing argument takes 30% Composure and 2 Zeal. He also takes Pastor's seat at the final table and is the finale's last boss.
- Balance (Normal, 40 runs a mission, campaign order): smart bot 84 / 78, simple 70 / 58. Nones at level 10 with random teams, smart bot: boss 41% with no Encourager, 67% with one, 86% with two.

## Voices, and louder battle effects (2026-09-29)

- Voices: little synthesized shouts (a pulse wave through three formant filters, with a breath for "h" and a hum for "m"). Each named character has a voice of their own (pitch, throat size, buzz, rasp, wobble, pace); the rank and file get one from their name. Shouts: attack, great, backup, hurt (a crit), down, cheer; the Nones say "meh". At most three voices in half a second.
- The effects were buried under the rebuilt music. The effect channel is now twice as loud (about half that in Chant mode), the effects built from the music's own notes play louder again, a little of every effect goes into the music's reverb, and the music dips for a moment under each effect. A limiter at the end catches peaks.

## Heartened (2026-09-29)

- Bringing back a Discouraged evangelist heartens the team: everyone in play, the one brought back included, gains 1 Zeal (RALLY, the mirror of SHAKEN). Campaign on Normal, 40 runs: smart 84 / 80, simple 71 / 59 (barely moved). The Nones chapter lost its edge (Heartened answers its Zeal drain), so its power went from [3.2, 2.5] to [3.4, 2.9]: smart bot about 62–69%.
