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
