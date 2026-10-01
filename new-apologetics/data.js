// New Apologetics — the numbers behind the game.
//
// Every hero's moves are listed in the same order as their animations in
// moves.js (Theater.MOVES), so move i here plays animation i there.
//
// Targets: "foe" one opponent you choose, "foes" every opponent, "two" two
// opponents at random, "ally" one friend you choose, "allies" every friend,
// "self". Effects run in order on each target:
//   dmg: a hit on Composure, as a share of the fighter's Attack; hits: how many
//   vs: [status, multiplier] hits harder against a status (or "guarded")
//   zeal: change in Zeal (−1 knocks it down a step), chance: how likely
//   status: dumbfounded, doubting, muted, examined, called; turns
//   buff: atk, def, crit; amt (+0.5 is 50% up); turns
//   heal: share of full Composure (revives the Discouraged)
//   cleanse, purge (remove boosts: a number or "all")
//   shield: a Shield of Faith, its strength from the caster's Care
//   podium: set up a podium in front of the target (strength from Care)
//   command: the target ally answers at once with their basic move
//   taunt: the targets must answer the one who used it
//   counter: answer back when addressed; immune: "steadfast" (no Zeal
//   loss) or "testimony" (hits land at half strength)
//   selfZeal / allyZeal: Zeal for the user or its friends
//   onBreak: extra Zeal for the user if the move puts someone out
// An opponent with secretConvert converts when his Zeal bottoms out,
// instead of leaving; the player is never told which ones do.
// A move's pierce list names defenses it passes through ("cover" goes
// around a podium). vs "guarded" hits harder against a shield or podium.
// stats: [Composure, Attack, Defense, Speed]. traits: Care (how strong the
// shields and podiums this fighter gives), glance (chance to deflect a hit,
// share of it deflected), crit (chance, damage multiplier), resolve (chance
// to shrug off a loss of Zeal). Taken from each hero's model.

const GameData = (() => {
  const H = (name, target, cd, start, effects, extra) => Object.assign({ name, target, cd, start: start || 0, effects }, extra || {});

  const HEROES = {
    akin: { name: "Jimmy Akin", about: "Careful and thorough: he takes his time and gets it right. Senior Apologist is the move for breaking down a podium or a shield, and it can leave the speaker dumbfounded. Logical Paradox and Mysterious World wear down the whole other side's Zeal and leave the strongest opponents exposed. Bring him when the other side hides behind podiums, and pair him with a quick friend who can move before him.", stats: [225, 78, 25, 58], traits: { care: 90, glance: [0.04, 0.22], crit: [0.05, 1.3], resolve: 0.08 }, skills: [
      H("Precise Distinction", "foe", 0, 0, [{ dmg: 0.5, hits: 2 }]),
      H("Senior Apologist", "foe", 3, 0, [{ dmg: 1.5, vs: ["guarded", 1.5] }, { status: "dumbfounded", turns: 2, chance: 0.5 }]),
      H("Logical Paradox", "foes", 3, 0, [{ buff: "atk", amt: -0.2, turns: 3 }, { zeal: -1, chance: 0.5 }]),
      H("Mysterious World", "two", 4, 2, [{ status: "examined", turns: 3 }, { purge: 1, chance: 0.5 }, { zeal: -1 }]),
    ] },
    muse: { name: "Ethan Muse", about: "The one who stands in front. Open Challenge makes every opponent answer him instead of his friends, and Steelman Stance lets him answer back when they do. Close Reading is the hardest single blow on the roster: save it for an opponent who is already doubting. Good for protecting teammates who shine from the back row, and for finishing a boss.", stats: [288, 76, 18, 88], traits: { care: 45, glance: [0.03, 0.2], crit: [0.06, 1.3], resolve: 0.09 }, skills: [
      H("Pointed Question", "foe", 0, 0, [{ dmg: 1.25 }, { status: "doubting", turns: 3, chance: 0.5 }]),
      H("Open Challenge", "foes", 3, 0, [{ taunt: 4 }, { zeal: -1 }]),
      H("Steelman Stance", "self", 3, 1, [{ counter: 4 }, { buff: "atk", amt: 0.5, turns: 3 }]),
      H("Close Reading", "foe", 4, 2, [{ dmg: 4.0, vs: ["doubting", 1.5] }, { zeal: -1 }, { onBreak: 1 }]),
      H("Vindicatory Miracles", "foes", 5, 3, [{ purge: 1 }, { zeal: -1 }, { status: "dumbfounded", turns: 2, chance: 0.5 }], { duo: "spitzer" }),
    ] },
    schmitz: { name: "Fr. Mike Schmitz", about: "A quick, gentle leader who makes everyone else better. His best trick is I'm Praying for You, which sends a friend in to answer at once, out of turn: perfect for a heavy hitter like Scott Hahn, who likes to take his time. The Bible in a Year steadies the team, and the Catechism in a Year clears every setback and shields them. He fits almost any team.", stats: [250, 58, 12, 125], traits: { care: 105, glance: [0.09, 0.1], crit: [0.05, 1.22], resolve: 0.12 }, skills: [
      H("Two-Minute Homily", "foe", 0, 0, [{ dmg: 1.5 }]),
      H("I'm Praying for You", "ally", 3, 0, [{ command: true }, { buff: "atk", amt: 0.5, turns: 3 }, { buff: "crit", amt: 0.25, turns: 3 }]),
      H("The Bible in a Year", "allies", 3, 1, [{ zeal: 1 }, { buff: "def", amt: 0.5, turns: 3 }]),
      H("The Catechism in a Year", "allies", 4, 2, [{ cleanse: true }, { shield: 0.25, turns: 3 }, { buff: "atk", amt: 0.3, turns: 3 }]),
    ] },
    bertuzzi: { name: "Cameron Bertuzzi", about: "The moderator. Clarifying Questions comes in several quick hits, which is good against opponents who deflect. Time's Up is a heavy blow that also blunts the most dangerous opponent. Point of Order takes Zeal and boosts away from the whole other side, and Bayesian Update puts his own team back on its feet.", stats: [238, 79, 14, 118], traits: { care: 60, glance: [0.06, 0.14], crit: [0.05, 1.24], resolve: 0.12 }, passive: { allies: { def: 0.05 } }, skills: [
      H("Clarifying Questions", "foe", 0, 0, [{ dmg: 0.45, hits: 3 }]),
      H("Time's Up", "foe", 3, 0, [{ dmg: 2.5 }, { buff: "atk", amt: -0.5, turns: 3 }]),
      H("Point of Order", "foes", 3, 1, [{ zeal: -1 }, { purge: 1 }]),
      H("Bayesian Update", "allies", 4, 2, [{ heal: 0.3 }, { cleanse: true }, { buff: "def", amt: 0.5, turns: 3 }]),
    ] },
    horn: { name: "Trent Horn", about: "Quick-witted and first to the microphone, he does his best work before the other side gets going. Free-for-All Friday lifts the whole team's Zeal, so friends back each other up more often. Is That in the Bible? gets through Faith Alone and Eternal Security, which makes him the answer to James White. The Case for Catholicism hits every opponent at once, and hits shields and podiums even harder.", stats: [250, 82, 15, 140], traits: { care: 15, glance: [0.09, 0.11], crit: [0.06, 1.25], resolve: 0.09 }, passive: { group: ["akin", "horn", "heschmeyer"], atk: 0.05 }, skills: [
      H("Deadpan", "foe", 0, 0, [{ dmg: 0.75, hits: 2 }, { buff: "atk", amt: -0.2, turns: 2, chance: 0.5 }]),
      H("Free-for-All Friday", "allies", 3, 0, [{ zeal: 1 }, { randomLift: true }]),
      H("Is That in the Bible?", "foes", 3, 1, [{ purge: 1 }, { zeal: -1 }], { pierce: ["security", "faith"] }),
      H("The Case for Catholicism", "foes", 4, 2, [{ dmg: 3.0, vs: ["guarded", 1.5] }]),
    ] },
    fradd: { name: "Matt Fradd", about: "The friend who gets people back on their feet. Cheeky Question asks three quick questions in a row. Pints with Aquinas brings back a Discouraged teammate, and Australian Charm fires one friend up for the next few turns. Summa Session clears every setback from the team. Bring him to long fights and to opponents who fluster.", stats: [225, 61, 14, 125], traits: { care: 105, glance: [0.1, 0.22], crit: [0.12, 1.25], resolve: 0.09 }, skills: [
      H("Cheeky Question", "foe", 0, 0, [{ dmg: 0.5, hits: 3 }]),
      H("Pints with Aquinas", "ally", 3, 0, [{ heal: 0.5 }, { zeal: 2, chance: 0.5 }]),
      H("Australian Charm", "ally", 3, 0, [{ buff: "atk", amt: 0.5, turns: 3 }, { zeal: 2 }]),
      H("Summa Session", "allies", 4, 2, [{ cleanse: true }, { buff: "def", amt: 0.5, turns: 3 }]),
    ] },
    godlogic: { name: "GodLogic", about: "A guest in the Islam chapter, and the best builder there is: quick on his feet, and his shields are among the strongest. Keep a Defender near him and he will keep the whole team covered. Smooth Pivot puts a podium in front of a friend, and Stay Smooth shields the whole team. Common Ground strips every boost from the other side and hits the Islam chapter's opponents where they stand.", guest: true, stats: [163, 135, 15, 125], traits: { care: 135, glance: [0.06, 0.21], crit: [0.04, 1.34], resolve: 0.08 }, skills: [
      H("Smooth Question", "foe", 0, 0, [{ dmg: 0.5, hits: 2 }, { buff: "atk", amt: -0.2, turns: 2, chance: 0.1 }]),
      H("Smooth Pivot", "ally", 3, 0, [{ podium: 0.6 }, { buff: "atk", amt: 0.3, turns: 3 }]),
      H("Stay Smooth", "allies", 3, 0, [{ shield: 0.3, turns: 3 }, { zeal: 1 }]),
      H("Common Ground", "foes", 4, 0, [{ purge: "all" }, { buff: "atk", amt: -0.5, turns: 3 }, { zeal: -1, faction: "islam" }]),
    ] },
    barron: { name: "Bishop Barron", about: "Made for crowds. Word on Fire hits every opponent at once. The Way of Beauty makes them all answer him while he stands behind his own podium, which keeps the others safe. No Beige Catholicism silences one opponent's best moves.", stats: [262, 82, 11, 110], traits: { care: 60, glance: [0.1, 0.23], crit: [0.04, 1.18], resolve: 0.08 }, skills: [
      H("Sunday Sermon", "foe", 0, 0, [{ dmg: 1.25 }, { buff: "atk", amt: -0.2, turns: 2, chance: 0.5 }]),
      H("Word on Fire", "foes", 3, 0, [{ dmg: 2.5 }]),
      H("The Way of Beauty", "self", 3, 1, [{ tauntAll: 4 }, { podium: 0.6 }, { buff: "atk", amt: 0.3, turns: 3 }]),
      H("No Beige Catholicism", "foe", 4, 2, [{ status: "muted", turns: 3 }, { buff: "atk", amt: -0.3, turns: 3 }, { zeal: -1 }]),
    ] },
    hicks: { name: "Fr. Boniface Hicks", about: "Quiet and piercing. Discernment of Spirits exposes every opponent: they can't deflect and they take harder hits. Obsculta goes straight past any podium to leave one opponent dumbfounded and shaken. Spiritual Direction drains an opponent's Zeal and strengthens his own. He is best at making opponents leave the debate rather than concede it.", stats: [200, 128, 14, 110], traits: { care: 128, glance: [0.1, 0.11], crit: [0.06, 1.18], resolve: 0.1 }, skills: [
      H("Gentle Correction", "foe", 0, 0, [{ dmg: 1.25 }, { buff: "atk", amt: -0.2, turns: 2, chance: 0.25 }]),
      H("Discernment of Spirits", "foes", 3, 0, [{ status: "examined", turns: 3 }]),
      H("Obsculta", "foe", 3, 1, [{ status: "dumbfounded", turns: 2 }, { zeal: -2 }], { pierce: ["cover"] }),
      H("Spiritual Direction", "foe", 4, 2, [{ zeal: -2 }, { selfZeal: 2 }]),
    ] },
    pine: { name: "Fr. Gregory Pine", about: "Steady all-round force. Distinguo answers two opponents at once and snaps friends out of being dumbfounded. Sed Contra sharpens the team and keeps their Zeal from falling. The Five Ways hits everyone and lowers their guard, and Respondeo lands three strong blows and lifts the whole team's Zeal.", stats: [213, 88, 14, 118], traits: { care: 88, glance: [0.07, 0.16], crit: [0.05, 1.38], resolve: 0.07 }, skills: [
      H("Distinguo", "two", 0, 0, [{ dmg: 0.75 }, { friendsCleanse: "dumbfounded" }]),
      H("Sed Contra", "allies", 3, 0, [{ buff: "crit", amt: 0.5, turns: 3 }, { immune: "steadfast", turns: 3 }]),
      H("The Five Ways", "foes", 3, 1, [{ dmg: 2.5 }, { buff: "def", amt: -0.3, turns: 3 }]),
      H("Respondeo", "foe", 4, 2, [{ dmg: 1.5, hits: 3 }, { allyZeal: 2 }]),
    ] },
    marygrace: { name: "Sr. Mary Grace", about: "One of the quickest on the roster, so she sets the tone before most others move. A Word of Truth goes straight past any podium. Let Love steadies the team, and Every Life Is Good weakens every opponent's arguments at once.", stats: [213, 75, 10, 170], traits: { care: 75, glance: [0.06, 0.16], crit: [0.04, 1.28], resolve: 0.11 }, skills: [
      H("A Word of Truth", "foe", 0, 0, [{ dmg: 1.5 }], { pierce: ["cover"] }),
      H("Let Love", "allies", 3, 0, [{ buff: "def", amt: 0.5, turns: 3 }, { zeal: 1 }]),
      H("Every Life Is Good", "foes", 3, 1, [{ buff: "atk", amt: -0.3, turns: 3 }, { zeal: -1, chance: 0.5 }]),
    ] },
    // The quickest, working from cover.
    rose: { name: "Lila Rose", about: "The quickest debater on the roster, and she works best unseen. She goes Undercover: hard to single out, and hits barely reach her. From there, Live Action strikes all over the room. Anyone who Fact-Checks or Exposes blows her cover, so be careful with her against James White.", stats: [138, 128, 6, 200], traits: { care: 128, glance: [0.07, 0.18], crit: [0.06, 1.34], resolve: 0.06 }, passive: { allies: { def: 0.05 } }, skills: [
      H("Every Life", "foe", 0, 0, [{ dmg: 0.63, hits: 2 }, { onBreakCloak: 2 }]),
      H("Live Action", "random4", 3, 0, [{ dmg: 1.5 }, { zeal: -1, chance: 0.5 }]),
      H("Undercover", "self", 3, 0, [{ status: "cloaked", turns: 3 }, { buff: "crit", amt: 0.5, turns: 3 }, { heal: 0.15 }]),
    ] },
    holdsworth: { name: "Brian Holdsworth", about: "An encourager and a builder in one. Beauty Will Save the World restores the whole team. Cultural Diagnosis exposes an opponent and lowers his guard for the others. Authentic Catholic Culture clears every setback, shields the team, and keeps their Zeal from falling. Good for long, grinding debates.", stats: [200, 135, 12, 125], traits: { care: 135, glance: [0.07, 0.18], crit: [0.12, 1.25], resolve: 0.12 }, skills: [
      H("Ten-Minute Essay", "foe", 0, 0, [{ dmg: 0.5, hits: 3 }]),
      H("Beauty Will Save the World", "allies", 3, 0, [{ heal: 0.25 }]),
      H("Cultural Diagnosis", "foe", 3, 1, [{ status: "examined", turns: 3 }, { buff: "def", amt: -0.5, turns: 3 }]),
      H("Authentic Catholic Culture", "allies", 4, 2, [{ cleanse: true }, { shield: 0.35, turns: 3 }, { zeal: 1 }, { immune: "steadfast", turns: 3 }]),
    ] },
    jurado: { name: "Alex Jurado", about: "Deliberate, unshakable and direct: he gets straight to the point. Deep Cut leaves an opponent doubting, off guard and shaken. Stallone Voice is a heavy blow that smashes podiums and can leave someone dumbfounded. Voice of Reason strips every boost from the other side and knocks their Zeal down hard. Good for breaking up a crowd.", stats: [288, 100, 15, 88], traits: { care: 30, glance: [0.03, 0.17], crit: [0.04, 1.38], resolve: 0.11 }, skills: [
      H("One-Two", "foe", 0, 0, [{ dmg: 0.5, hits: 2 }]),
      H("Deep Cut", "foe", 3, 0, [{ status: "doubting", turns: 3 }, { buff: "def", amt: -0.5, turns: 3 }, { zeal: -1 }]),
      H("Stallone Voice", "foe", 3, 1, [{ dmg: 2.5, vs: ["guarded", 1.5] }, { status: "dumbfounded", turns: 2, chance: 0.5 }]),
      H("Voice of Reason", "foes", 4, 2, [{ purge: "all" }, { zeal: -2 }]),
    ] },
    spitzer: { name: "Fr. Robert Spitzer", about: "A patient scholar who builds his case carefully, and his shields are among the strongest on the roster. The Four Levels of Happiness clears every setback and shields the whole team. Borde–Guth–Vilenkin takes a long time to come around, and then it lands a heavy blow, silences the opponent and splashes the rest. Let the Defenders draw the fire while it charges. With Ethan Muse on the team, he shares a duo move.", stats: [188, 135, 18, 73], traits: { care: 135, glance: [0.05, 0.21], crit: [0.04, 1.42], resolve: 0.07 }, skills: [
      H("Fine-Tuning", "foe", 0, 0, [{ dmg: 0.6, hits: 2 }, { purge: 1, chance: 0.25 }]),
      H("The Four Levels of Happiness", "allies", 3, 0, [{ cleanse: true }, { shield: 0.25, turns: 3 }]),
      H("Borde–Guth–Vilenkin", "foe", 4, 2, [{ dmg: 2.5, splash: 1.0 }, { status: "muted", turns: 3 }, { zeal: -1 }]),
      H("Vindicatory Miracles", "foes", 5, 3, [{ purge: 1 }, { zeal: -1 }, { status: "dumbfounded", turns: 2, chance: 0.5 }], { duo: "muse" }),
    ] },
    // Unhurried and unshakable, with the heaviest blows.
    hahn: { name: "Scott Hahn", about: "Unhurried, and the hardest to shake on the roster, with the heaviest blows. Covenant Is Family can leave an opponent doubting, Wide-Eyed Wonder hits hard and shakes his Zeal, and Rome Sweet Home crushes one opponent and leaves him dumbfounded. He passes straight through Faith Alone. Pair him with Fr. Mike, who can send him in out of turn.", stats: [350, 94, 18, 50], traits: { care: 0, glance: [0.05, 0.21], crit: [0.06, 1.44], resolve: 0.04 }, passive: { converts: ["hahn", "akin", "bertuzzi", "holdsworth", "schmid", "zember"] }, skills: [
      H("Covenant Is Family", "foe", 0, 0, [{ dmg: 0.75, hits: 2 }, { status: "doubting", turns: 2, chance: 0.5 }], { pierce: ["faith"] }),
      H("Wide-Eyed Wonder", "foe", 3, 0, [{ dmg: 3.0 }, { zeal: -1 }]),
      H("Rome Sweet Home", "foe", 4, 2, [{ dmg: 5.0 }, { status: "dumbfounded", turns: 3 }, { purge: "all", faction: "protestant" }], { pierce: ["faith"] }),
    ] },
    // Joe Schmid, once he has come home: a hit, a Rebuttal stance, a scan, and
    // cover and Zeal for the team (more for a fellow convert).
    schmid: { name: "Joe Schmid", about: "Back home and arguing for the Church now. A builder who reasons from first principles: Steelman lets him answer back every objection while he braces himself, and the Contingency Argument exposes an opponent and blunts his arguments. Welcome Home puts a podium in front of a friend and fires him up, and fires up a fellow convert even more.", stats: [213, 73, 17, 110], traits: { care: 83, glance: [0.07, 0.21], crit: [0.04, 1.38], resolve: 0.07 }, skills: [
      H("Majesty of Reason", "foe", 0, 0, [{ dmg: 0.75, hits: 2 }]),
      H("Steelman", "self", 3, 0, [{ counter: 4 }, { buff: "def", amt: 0.5, turns: 3 }]),
      H("Contingency Argument", "foe", 3, 1, [{ status: "examined", turns: 3 }, { buff: "atk", amt: -0.5, turns: 3 }]),
      H("Welcome Home", "ally", 4, 2, [{ podium: 0.6 }, { zeal: 2 }, { zeal: 1, onlyFor: ["hahn", "akin", "bertuzzi", "holdsworth", "schmid", "zember"] }]),
    ] },
    // Joe Heschmeyer, once a litigator: sharp questions and courtroom tactics.
    // Charitable, but blunt. He hands the burden of proof back, strikes a
    // fallacy from the record, and brings the Fathers as his witnesses.
    heschmeyer: { name: "Joe Heschmeyer", about: "Once a litigator, and it shows: very quick, blunt but charitable, with a question that goes straight to the weak spot. Ignatius of Antioch calls the early Fathers as witnesses in two quick hits. Objection! strikes a fallacy from the record: the opponent is left Muted and can use only his basic move. Burden of Proof hands the burden back to every opponent at once: they are Exposed, and Joe answers back whenever they come at him. Shameless Popery ends in a flurry of strong blows.", stats: [188, 88, 10, 170], traits: { care: 88, glance: [0.11, 0.13], crit: [0.05, 1.42], resolve: 0.05 }, passive: { group: ["akin", "horn", "heschmeyer"], atk: 0.05 }, skills: [
      H("Ignatius of Antioch", "foe", 0, 0, [{ dmg: 0.65, hits: 2 }, { status: "doubting", turns: 3, chance: 0.5 }]),
      H("Objection!", "foe", 3, 0, [{ dmg: 1.2 }, { status: "muted", turns: 2 }]),
      H("Burden of Proof", "foes", 3, 1, [{ status: "examined", turns: 3 }, { zeal: -1, chance: 0.35 }, { selfCounter: 4 }]),
      H("Shameless Popery", "foe", 4, 2, [{ dmg: 1.2, hits: 3 }, { zeal: -1 }]),
    ] },
    // Fr. Carlos Martins, exorcist: a hit, a call-out that lifts the team's
    // Zeal, a team heal and cleanse, and Attack, Crit and Zeal for everyone.
    martins: { name: "Fr. Carlos Martins", about: "An exorcist, and a steadying presence: nothing on the other side rattles him. Stand Behind Me draws every opponent's attention onto himself while it lifts the team's Zeal. Prayer of Deliverance brings back a Discouraged friend, clears every setback and restores the whole team. Treasures of the Church, from his relic ministry, fires up everyone at once. He joins after the New Age chapter, Apollo Loves You; bring him to any long, hard debate.", stats: [250, 52, 21, 95], traits: { care: 105, glance: [0.07, 0.16], crit: [0.12, 1.28], resolve: 0.11 }, passive: { allies: { def: 0.05 } }, skills: [
      H("Holy Water", "foe", 0, 0, [{ dmg: 0.34, hits: 3 }]),
      H("Stand Behind Me", "self", 3, 0, [{ tauntAll: 4 }, { allyZeal: 1 }]),
      H("Prayer of Deliverance", "allies", 4, 1, [{ heal: 0.3 }, { cleanse: true }, { zeal: 1, chance: 0.5 }]),
      H("Treasures of the Church", "allies", 4, 2, [{ buff: "atk", amt: 0.5, turns: 3 }, { buff: "crit", amt: 0.5, turns: 3 }, { zeal: 2 }]),
    ] },
    // Kim Zember: Catholic speaker and author (Restless Heart), host of EWTN's
    // Here I AM Stories: a hit, a shield for all, a call-out with Defense Up,
    // and a team heal and cleanse with Zeal up.
    zember: { name: "Kim Zember", about: "Warm, steady and hard to shake: she has heard every question and answers from her own story. Boldly Beloved shields the whole team. Here I Am steps forward so every opponent answers her, and she braces for it. Child of God brings back a Discouraged friend, clears every setback and fires up the team. She joins after the chapter Who Do You Say You Are?", stats: [350, 48, 15, 69], traits: { care: 113, glance: [0.07, 0.2], crit: [0.05, 1.3], resolve: 0.07 }, passive: { converts: ["zember"] }, skills: [
      H("Restless Heart", "foe", 0, 0, [{ dmg: 1.0 }]),
      H("Boldly Beloved", "allies", 3, 0, [{ shield: 0.3, turns: 3 }]),
      H("Here I Am", "self", 3, 1, [{ tauntAll: 4 }, { buff: "def", amt: 0.5, turns: 3 }]),
      H("Child of God", "allies", 4, 2, [{ heal: 0.25 }, { cleanse: true }, { zeal: 1 }]),
    ] },
    // Brant Pitre: Scripture scholar (The Case for Jesus; Jesus and the Jewish
    // Roots of the Eucharist): a hit with Attack Down, Exposed on every
    // opponent, a stun that never fails, and a crushing blow.
    pitre: { name: "Brant Pitre", about: "A scholar who reads Jesus in his own world, the Judaism of the first century, and so sees the big picture where others get lost in details. Very quick. The Big Picture exposes every opponent at once. The Son of Man never fails to leave an opponent dumbfounded, straight past any podium. The Case for Jesus lands a crushing blow and drains the opponent's Zeal. He joins after the chapter Misquoting Jesus?", stats: [200, 76, 9, 170], traits: { care: 60, glance: [0.12, 0.27], crit: [0.01, 1.14], resolve: 0.09 }, passive: { allies: { atk: 0.05 } }, skills: [
      H("Jewish Roots", "foe", 0, 0, [{ dmg: 0.5, hits: 2 }, { buff: "atk", amt: -0.2, turns: 2, chance: 0.25 }]),
      H("The Big Picture", "foes", 3, 0, [{ status: "examined", turns: 3 }]),
      H("The Son of Man", "foe", 3, 1, [{ status: "dumbfounded", turns: 2 }, { zeal: -2 }], { pierce: ["cover"] }),
      H("The Case for Jesus", "foe", 4, 2, [{ dmg: 3.0 }, { zeal: -2 }, { status: "doubting", turns: 3 }]),
    ] },
    // Fr. Augustine Wetta, OSB: monk of Saint Louis Abbey, the surfing monk,
    // once a Galveston lifeguard (with, he says, an enormous ego) and a
    // professional juggler; author of Humility Rules. An Encourager.
    wetta: { name: "Fr. Augustine Wetta", about: "The surfing monk, and an Encourager: nothing lifts a flagging team like him. Flying Fettuccine juggles three quick hits, and like every Encourager he lands critical hits often. Lifeguard on Duty pulls a friend out of the water: it brings back the Discouraged and fires them up. Humility Rules keeps the whole team's Zeal from falling: it is hard to deflate someone who doesn't take himself too seriously. Surf's Up rides in on a wave, clears every setback and lifts everyone's Zeal. Bring him against anyone who wins by wearing a team down.", stats: [213, 70, 12, 115], traits: { care: 100, glance: [0.08, 0.18], crit: [0.12, 1.28], resolve: 0.12 }, skills: [
      H("Flying Fettuccine", "foe", 0, 0, [{ dmg: 0.4, hits: 3 }]),
      H("Lifeguard on Duty", "ally", 3, 0, [{ heal: 0.45 }, { zeal: 1 }]),
      H("Humility Rules", "allies", 3, 1, [{ zeal: 1 }, { immune: "steadfast", turns: 2 }]),
      H("Surf's Up", "allies", 4, 2, [{ heal: 0.2 }, { cleanse: true }, { zeal: 2 }]),
    ] },
  };

  // ---- Books ---------------------------------------------------------------------------
  // A hero can carry one book into a debate, and books pass freely between
  // heroes. Each chapter won adds one to the shelf. (They follow the five
  // kinds of Nexus Particle: regenerate, self-shield, resist Scan, resist
  // Wound, first-round Attack, each with a small stat bonus.)
  const BOOKS = {
    catechism: { name: "The Catechism", by: "Catechism of the Catholic Church", text: "Starts the debate behind a Shield of Faith. +10% Defense.", fx: { shield: 0.3, def: 0.1 } },
    confessions: { name: "Confessions", by: "St. Augustine", text: "“Our heart is restless until it rests in you.” Recovers 8% Composure in each of the first two turns. +5% Composure.", fx: { regen: [0.08, 2], hp: 0.05 } },
    summa: { name: "The Summa", by: "St. Thomas Aquinas", text: "An answer ready for every objection: 25% chance to shrug off being Exposed. +3% crit chance.", fx: { resist: { examined: 0.25 }, crit: 0.03 } },
    apologia: { name: "Apologia Pro Vita Sua", by: "St. John Henry Newman", text: "A strong opening: Attack Up for the first round. +5% Attack.", fx: { opening: 0.25, atk: 0.05 } },
    rule: { name: "The Rule of St. Benedict", by: "St. Benedict", text: "Stability: 25% chance to shrug off being Flustered. +5% Composure.", fx: { resist: { doubting: 0.25 }, hp: 0.05 } },
  };

  // ---- Opponents ---------------------------------------------------------------------
  // `anim` says how each move looks on stage, using the shared animations.

  const V = (glyphs, color) => ({ kind: "volley", glyphs, color: color || "#de5e55" });
  const X = (say, mark) => ({ kind: "hex", say, mark: mark || [] });
  const A = (say, mark, item) => ({ kind: "approach", say, mark, item });
  const U = (say, mark) => ({ kind: "aura", say, mark: mark || [] });

  const FOES = {
    skeptic: { name: "Skeptic Streamer", grunt: true, faction: "atheist", stats: [110, 62, 10, 95], traits: { care: 55, glance: [0.05, 0.15], crit: [0.05, 1.3], resolve: 0.06 }, skills: [
      H("Hot Take", "foe", 0, 0, [{ dmg: 1.1 }], { anim: V(["?!"]) }),
      H("Where's the Evidence?", "foes", 3, 1, [{ buff: "atk", amt: -0.2, turns: 2 }], { anim: X("Where's the evidence?", "down") }),
    ] },
    preacher: { name: "Street Preacher", grunt: true, faction: "protestant", stats: [115, 64, 10, 90], traits: { care: 50, glance: [0.05, 0.15], crit: [0.05, 1.3], resolve: 0.06 }, skills: [
      H("Turn or Burn", "foe", 0, 0, [{ dmg: 1.1 }], { anim: V(["Repent!"]) }),
      H("Street Sermon", "foe", 3, 1, [{ status: "doubting", turns: 2 }], { anim: A("Have you read your Bible?", "doubting", "book") }),
    ] },
    elder: { name: "Elder Missionary", grunt: true, faction: "lds", stats: [115, 58, 16, 88], traits: { care: 58, glance: [0.05, 0.15], crit: [0.05, 1.3], resolve: 0.06 }, skills: [
      H("Testimony", "foe", 0, 0, [{ dmg: 1.0 }], { anim: V(["I know it's true."], "#7ea4e6") }),
      H("Pamphlet", "foe", 3, 1, [{ buff: "def", amt: -0.3, turns: 2 }], { anim: A("Would you like a pamphlet?", "down", "scroll") }),
    ] },
    dai: { name: "Street Debater", grunt: true, faction: "islam", stats: [115, 64, 12, 92], traits: { care: 55, glance: [0.05, 0.15], crit: [0.05, 1.3], resolve: 0.06 }, skills: [
      H("Show Me the Verse", "foe", 0, 0, [{ dmg: 1.1 }], { anim: V(["Show me!"]) }),
      H("Tahrif", "foes", 3, 1, [{ purge: 1 }], { anim: X("Your Bible was changed.", "factcheck") }),
    ] },
    seminarian: { name: "Seminarian", grunt: true, faction: "protestant", stats: [110, 66, 12, 86], traits: { care: 66, glance: [0.05, 0.15], crit: [0.05, 1.3], resolve: 0.06 }, skills: [
      H("In the Greek…", "foe", 0, 0, [{ dmg: 1.1 }], { anim: V(["In the Greek…"], "#7ea4e6") }),
      H("TULIP", "foe", 3, 1, [{ status: "muted", turns: 1 }], { anim: X("Total depravity.", "muted") }),
    ] },
    tarot: { name: "Tarot Reader", grunt: true, faction: "newage", stats: [108, 62, 10, 102], traits: { care: 55, glance: [0.05, 0.15], crit: [0.05, 1.3], resolve: 0.06 }, skills: [
      H("Card Pull", "foe", 0, 0, [{ dmg: 1.1 }], { anim: V(["The cards say…"], "#c69ae8") }),
      H("The Tower", "foe", 3, 1, [{ dmg: 0.5 }, { status: "dumbfounded", turns: 1, chance: 0.35 }], { anim: X("The Tower. Upheaval!", "dumbfounded") }),
    ] },
    crystal: { name: "Crystal Healer", grunt: true, faction: "newage", stats: [118, 58, 12, 92], traits: { care: 60, glance: [0.05, 0.15], crit: [0.05, 1.3], resolve: 0.06 }, skills: [
      H("Good Vibes", "foe", 0, 0, [{ dmg: 1.05 }], { anim: V(["Good vibes!"], "#9fe0c0") }),
      H("Crystal Grid", "self", 3, 1, [{ shield: 0.3, turns: 2 }], { anim: U("Amethyst protects me.", ["shield"]) }),
    ] },
    creator: { name: "Content Creator", grunt: true, faction: "secular", stats: [105, 64, 10, 106], traits: { care: 50, glance: [0.05, 0.15], crit: [0.05, 1.3], resolve: 0.06 }, skills: [
      H("Link in Bio", "foe", 0, 0, [{ dmg: 1.1 }], { anim: V(["Link in bio!"], "#ff8ac0") }),
      H("It's Empowering", "self", 3, 1, [{ buff: "atk", amt: 0.3, turns: 2 }], { anim: U("It's empowering!", ["up"]) }),
    ] },
    activist: { name: "Campus Activist", grunt: true, faction: "secular", stats: [120, 60, 12, 90], traits: { care: 55, glance: [0.05, 0.15], crit: [0.05, 1.3], resolve: 0.06 }, skills: [
      H("Chant", "foe", 0, 0, [{ dmg: 1.05 }], { anim: V(["My body!"], "#de5e55") }),
      H("Clump of Cells", "foe", 3, 1, [{ zeal: -1, chance: 0.5 }], { anim: X("It's just a clump of cells!", "pipDown") }),
    ] },
    ally: { name: "Campus Ally", grunt: true, faction: "secular", stats: [115, 60, 11, 96], traits: { care: 55, glance: [0.05, 0.15], crit: [0.05, 1.3], resolve: 0.06 }, skills: [
      H("Hashtag", "foe", 0, 0, [{ dmg: 1.05 }], { anim: V(["#LoveWins"], "#ff8ac0") }),
      H("Call-Out Post", "foe", 3, 1, [{ status: "muted", turns: 1 }], { anim: X("You can't say that!", "muted") }),
    ] },
    podcaster: { name: "Deconstruction Podcaster", grunt: true, faction: "secular", stats: [110, 62, 10, 100], traits: { care: 55, glance: [0.05, 0.15], crit: [0.05, 1.3], resolve: 0.06 }, skills: [
      H("Deconstructing", "foe", 0, 0, [{ dmg: 1.1 }], { anim: V(["Deconstructing…"], "#9fd0ff") }),
      H("Purity Culture", "foe", 3, 1, [{ status: "doubting", turns: 2 }], { anim: X("That's just purity culture.", "doubting") }),
    ] },
    student: { name: "Religion 101 Student", grunt: true, faction: "secular", stats: [112, 60, 10, 98], traits: { care: 55, glance: [0.05, 0.15], crit: [0.05, 1.3], resolve: 0.06 }, skills: [
      H("Contradiction!", "foe", 0, 0, [{ dmg: 1.05 }], { anim: V(["Contradiction!"], "#de5e55") }),
      H("Telephone Game", "foe", 3, 1, [{ status: "doubting", turns: 2 }], { anim: X("It's a game of telephone!", "doubting") }),
    ] },
    mythicist: { name: "Mythicist YouTuber", grunt: true, faction: "secular", stats: [108, 64, 10, 102], traits: { care: 50, glance: [0.05, 0.15], crit: [0.05, 1.3], resolve: 0.06 }, skills: [
      H("Never Existed", "foe", 0, 0, [{ dmg: 1.1 }], { anim: V(["Jesus never existed!"], "#c69ae8") }),
      H("Copycat Savior", "foe", 3, 1, [{ status: "muted", turns: 1 }], { anim: X("Horus did it first!", "muted") }),
    ] },

    // The Nones: people of no religion in particular. Not hostile, just not
    // interested, and hard to reach. They seldom argue back; they wear the
    // team's Zeal down instead. Invented for the game: no real people.
    scroller: { name: "Doomscroller", grunt: true, faction: "none", stats: [115, 52, 10, 104], traits: { care: 50, glance: [0.14, 0.25], crit: [0.05, 1.3], resolve: 0.1 }, skills: [
      H("Scroll Past", "foe", 0, 0, [{ dmg: 0.75 }, { zeal: -1, chance: 0.4 }], { anim: V(["*scroll*"], "#9fd0ff") }),
      H("Phone Out", "foe", 3, 1, [{ zeal: -1 }, { status: "muted", turns: 1, chance: 0.5 }], { anim: X("Sorry, what? I was on my phone.", ["pipDown", "muted"]) }),
    ] },
    shrugger: { name: "Nothing in Particular", grunt: true, faction: "none", stats: [120, 50, 12, 96], traits: { care: 55, glance: [0.14, 0.25], crit: [0.05, 1.3], resolve: 0.1 }, skills: [
      H("Meh", "foe", 0, 0, [{ dmg: 0.75 }, { zeal: -1, chance: 0.4 }], { anim: V(["Meh."], "#a9a6bd") }),
      H("Flippant Response", "foes", 3, 1, [{ zeal: -1, chance: 0.65 }], { anim: X("Cool story.", "pipDown") }),
    ] },
    // The Master of None: invented, the Nones' champion of shrugging.
    master: { name: "Master of None", boss: true, faction: "none", stats: [330, 62, 20, 106], traits: { care: 70, glance: [0.16, 0.3], crit: [0.06, 1.35], resolve: 0.14 }, skills: [
      H("k.", "foe", 0, 0, [{ dmg: 0.9 }, { zeal: -1, chance: 0.5 }], { anim: V(["k."], "#a9a6bd") }),
      H("Seen, No Reply", "foes", 3, 0, [{ zeal: -1 }, { status: "muted", turns: 1, chance: 0.35 }], { anim: X("Seen 11:42 PM.", ["pipDown", "muted"]) }),
      H("Flippant Response", "foe", 3, 1, [{ zeal: -2 }], { anim: X("lol. anyway.", "pipDown") }),
      H("Good Vibes, No Doctrine", "self", 4, 2, [{ heal: 0.25 }, { immune: "steadfast", turns: 2 }], { anim: U("I'm good, thanks.", ["heal", "shield"]) }),
    ] },

    // Joe Schmid, philosopher of religion (Majesty of Reason). Evolutionary
    // animal suffering first led him away from the Church; in August 2026 he
    // announced his return. Wear down his Zeal and he comes home.
    schmid: { name: "Joe Schmid", faction: "atheist", secretConvert: true, podium: "gunner", sign: ["CONFESSION", "WELCOME HOME"], stats: [120, 82, 16, 104], traits: { care: 82, glance: [0.06, 0.18], crit: [0.05, 1.3], resolve: 0.05 }, skills: [
      H("Majesty of Reason", "foe", 0, 0, [{ dmg: 0.6, hits: 2 }], { anim: V(["Consider…", "…a dilemma."], "#9fd0ff") }),
      H("Evolutionary Suffering", "foes", 3, 0, [{ status: "doubting", turns: 2 }, { zeal: -1, chance: 0.5 }], { anim: X("Millions of years of it?", ["doubting", "pipDown"]) }),
      H("Modal Collapse", "foe", 3, 1, [{ status: "dumbfounded", turns: 2 }], { anim: X("Then everything is necessary.", "dumbfounded") }),
      H("Steelman", "self", 3, 1, [{ heal: 0.2 }, { selfZeal: 1 }], { anim: U("Let me steelman that.", ["heal", "pipUp"]) }),
      // His Slavoj Žižek impression, sniffs and all. Nobody can argue through it.
      H("Žižek Impression", "foes", 4, 1, [{ status: "dumbfounded", turns: 1, chance: 0.5 }, { buff: "atk", amt: -0.2, turns: 2 }], { anim: X("…and so on, and so on. *sniff*", "dumbfounded") }),
    ] },

    oconnor: { name: "Alex O'Connor", boss: true, faction: "atheist", stats: [340, 85, 20, 105], traits: { care: 85, glance: [0.07, 0.18], crit: [0.06, 1.35], resolve: 0.1 }, skills: [
      H("Within Reason", "foe", 0, 0, [{ dmg: 1.25 }], { anim: V(["Hm, but…"], "#9fd0ff") }),
      H("The Fawn in the Forest", "foes", 3, 0, [{ status: "doubting", turns: 3 }, { zeal: -1 }], { anim: X("What about the fawn?", ["doubting", "pipDown"]) }),
      H("Euthyphro", "foe", 3, 1, [{ status: "dumbfounded", turns: 2 }], { anim: X("Good because God wills it, or…?", "dumbfounded") }),
      H("Charitable Skeptic", "self", 4, 2, [{ heal: 0.3 }, { buff: "def", amt: 0.5, turns: 3 }], { anim: U("That's a fair point.", ["heal", "up"]) }),
    ] },
    ryan: { name: "Ryan Hemelaar", boss: true, faction: "protestant", stats: [330, 72, 18, 110], traits: { care: 60, glance: [0.07, 0.18], crit: [0.06, 1.35], resolve: 0.1 }, skills: [
      H("Gospel Tract", "foe", 0, 0, [{ dmg: 1.25 }], { anim: A("Here, take one!", "down", "scroll") }),
      H("Are You a Good Person?", "foes", 3, 0, [{ status: "examined", turns: 3 }], { anim: X("Are you a good person?", "examined") }),
      H("If You Died Tonight", "foes", 3, 1, [{ zeal: -1 }], { anim: X("If you died tonight…?", "pipDown") }),
      H("Faith Alone", "self", 4, 2, [{ immune: "faith", turns: 2 }], { anim: U("It's by faith alone!", ["shield"]) }),
    ] },
    hansen: { name: "Jacob Hansen", boss: true, faction: "lds", stats: [340, 80, 24, 100], traits: { care: 80, glance: [0.07, 0.18], crit: [0.06, 1.35], resolve: 0.1 }, skills: [
      H("Scholarly Citation", "foe", 0, 0, [{ dmg: 1.25 }], { anim: V(["Footnote 14."], "#7ea4e6") }),
      H("Great Apostasy", "foes", 3, 0, [{ zeal: -1 }, { buff: "atk", amt: -0.3, turns: 3 }], { anim: X("The authority was lost.", ["pipDown", "down"]) }),
      H("Burning in the Bosom", "self", 3, 1, [{ heal: 0.25 }, { immune: "testimony", turns: 2 }], { anim: U("I've felt it.", ["heal", "shield"]) }),
      H("Eternal Progression", "self", 4, 2, [{ buff: "atk", amt: 0.6, turns: 3 }], { anim: U("As man is, God once was.", ["up"]) }),
    ] },
    speaker: { name: "Speakers' Corner Champion", boss: true, faction: "islam", stats: [340, 74, 18, 102], traits: { care: 70, glance: [0.07, 0.18], crit: [0.06, 1.35], resolve: 0.1 }, skills: [
      H("Crowd Question", "foe", 0, 0, [{ dmg: 1.25 }], { anim: V(["Answer me!"]) }),
      H("Tahrif", "foes", 3, 0, [{ purge: "all" }], { anim: X("Your Bible was corrupted.", "factcheck") }),
      H("Tawhid", "self", 4, 1, [{ immune: "steadfast", turns: 2 }], { anim: U("God is one!", ["shield"]) }),
      H("The Crowd Gathers", "self", 4, 2, [{ summon: "dai" }], { anim: U("Brothers, come!", ["up"]) }),
    ] },
    // An invented WitchTok influencer: no real person.
    witch: { name: "WitchTok Influencer", boss: true, faction: "newage", stats: [330, 80, 20, 108], traits: { care: 80, glance: [0.07, 0.18], crit: [0.06, 1.35], resolve: 0.1 }, skills: [
      H("Manifest It", "foe", 0, 0, [{ dmg: 1.25 }], { anim: V(["Manifest it!"], "#c69ae8") }),
      H("Apollo Loves You", "foes", 3, 0, [{ status: "doubting", turns: 2 }, { zeal: -1 }], { anim: X("Apollo loves you, babe.", ["doubting", "pipDown"]) }),
      H("Mercury in Retrograde", "foes", 3, 1, [{ buff: "atk", amt: -0.3, turns: 3 }], { anim: X("Mercury's in retrograde!", "down") }),
      H("Protection Circle", "self", 4, 2, [{ heal: 0.3 }, { buff: "def", amt: 0.5, turns: 3 }], { anim: U("Salt circle. Protected.", ["heal", "up"]) }),
    ] },
    // Destiny (Steven Bonnell): his public case, fairly put. Personhood begins
    // with conscious experience; the sleeping person and life support are his
    // own analogies. He talks fast.
    destiny: { name: "Destiny", boss: true, faction: "secular", stats: [330, 78, 18, 112], traits: { care: 70, glance: [0.07, 0.18], crit: [0.06, 1.35], resolve: 0.1 }, skills: [
      H("Rapid Fire", "foe", 0, 0, [{ dmg: 0.45, hits: 3 }], { anim: V(["No.", "Wrong.", "Next."], "#4a8af0") }),
      H("Define 'Person'", "foes", 3, 0, [{ status: "examined", turns: 3 }], { anim: X("Define “person.”", "examined") }),
      H("Life Support", "foe", 3, 1, [{ dmg: 1.0 }, { status: "dumbfounded", turns: 2, chance: 0.5 }], { anim: X("Would you unplug him or not?", "dumbfounded") }),
      H("No Experiences, No Harm", "foes", 4, 2, [{ zeal: -1 }, { status: "doubting", turns: 2, chance: 0.5 }], { anim: X("No conscious experience, no one harmed.", ["pipDown", "doubting"]) }),
    ] },
    // An invented character: no real person.
    pastor: { name: "Affirming Pastor", boss: true, faction: "protestant", stats: [335, 78, 20, 105], traits: { care: 85, glance: [0.07, 0.18], crit: [0.06, 1.35], resolve: 0.1 }, skills: [
      H("Love Is Love", "foe", 0, 0, [{ dmg: 1.25 }], { anim: V(["Love is love."], "#ff8ac0") }),
      H("Jesus Never Mentioned It", "foes", 3, 0, [{ zeal: -1 }, { buff: "atk", amt: -0.2, turns: 2 }], { anim: X("Jesus never mentioned it!", ["pipDown", "down"]) }),
      H("Born This Way", "foe", 3, 1, [{ dmg: 0.8 }, { status: "dumbfounded", turns: 2, chance: 0.5 }], { anim: X("God made them this way!", "dumbfounded") }),
      H("Radical Welcome", "self", 4, 2, [{ heal: 0.3 }, { buff: "def", amt: 0.5, turns: 3 }], { anim: U("All are welcome here.", ["heal", "up"]) }),
    ] },
    // Bart Ehrman: his own public case, fairly put. Textual variants, anonymous
    // Gospels, a divinity that developed; raised evangelical (Moody, Wheaton),
    // he lost his faith over suffering.
    ehrman: { name: "Bart Ehrman", boss: true, faction: "secular", stats: [335, 80, 20, 104], traits: { care: 85, glance: [0.07, 0.18], crit: [0.06, 1.35], resolve: 0.1 }, skills: [
      H("Misquoting Jesus", "foe", 0, 0, [{ dmg: 0.45, hits: 3 }], { anim: V(["A variant…", "…another…", "…and another."], "#9fd0ff") }),
      H("More Variants Than Words", "foes", 3, 0, [{ status: "doubting", turns: 2 }, { zeal: -1 }], { anim: X("More variants than words!", ["doubting", "pipDown"]) }),
      H("Anonymous Gospels", "foes", 3, 1, [{ purge: 1 }, { buff: "atk", amt: -0.2, turns: 2 }], { anim: X("Who really wrote them?", ["factcheck", "down"]) }),
      H("How Jesus Became God", "foe", 4, 2, [{ dmg: 1.2 }, { status: "dumbfounded", turns: 2, chance: 0.5 }], { anim: X("A divinity that developed.", "dumbfounded") }),
    ] },
    white: { name: "James White", boss: true, faction: "protestant", stats: [320, 80, 22, 108], traits: { care: 88, glance: [0.07, 0.18], crit: [0.06, 1.35], resolve: 0.1 }, skills: [
      H("Greek Exegesis", "foe", 0, 0, [{ dmg: 0.75, hits: 2 }, { status: "doubting", turns: 2, chance: 0.25 }], { anim: V(["In the Greek…", "…aorist."], "#7ea4e6") }),
      H("Sola Scriptura", "foes", 3, 0, [{ purge: "all" }, { buff: "atk", amt: -0.3, turns: 2 }], { anim: X("Scripture alone!", ["factcheck", "down"]) }),
      H("Eternal Security", "self", 5, 2, [{ immune: "security", turns: 2 }, { heal: 0.15 }], { anim: U("Perseverance of the saints.", ["shield", "heal"]) }),
      H("Debate Challenge", "foes", 4, 2, [{ dmg: 1.4 }, { selfZeal: 1 }], { anim: X("Let's debate. Right now.", ["down"]) }),
    ] },
  };

  // ---- The campaign ------------------------------------------------------------------

  // power: [regular debates, boss] — how far each chapter's opponents have
  // come, found by simulation (see BALANCE.md); the tutorial has none.
  // Every boss has a closing argument. He spends one turn winding up (everyone
  // can see it coming), then lands it on the whole team on his next turn. A
  // Shield of Faith soaks it up; leaving him Dumbfounded or Muted while he
  // winds up stops it altogether. [name, what he says winding up, the blow,
  // the share of each hero's Composure it takes: gentlest from O'Connor,
  // when the team has few shields and stuns, and hardest from James White]
  const CLOSERS = {
    oconnor: ["The Problem of Evil", "Let me put it as plainly as I can…", "Then why the fawn? Why any of it?", 0.55],
    ryan: ["Judgment Day", "Let me ask you all something…", "Liars, thieves. Guilty. Judgment Day!", 0.6],
    hansen: ["The First Vision", "In the spring of 1820…", "A pillar of light. A new dispensation.", 0.6],
    speaker: ["Three Is Not One", "Everyone, gather round. Watch this.", "One plus one plus one is three!", 0.7],
    witch: ["Full Moon Ritual", "Wait. The moon is almost full…", "Feel that? The goddess is here.", 0.7],
    destiny: ["Speed Round", "Okay. I'm going to go fast now.", "Twelve points. Sixty seconds. Answer all of them.", 0.65],
    pastor: ["The Open Letter", "We've prepared a statement.", "Four hundred pastors signed it.", 0.65],
    ehrman: ["Four Hundred Thousand Variants", "Let me show you the manuscripts.", "More variants than words in the New Testament!", 0.75],
    white: ["Cross-Examination", "I have a few questions for you.", "Yes or no. Yes or no!", 0.85],
    // The Master of None hardly dents Composure: he drains Zeal instead.
    master: ["Whatever", "Hold on, I'm just going to check this real quick…", "Sorry, what? Anyway. Whatever works for you.", 0.3, -2],
  };
  for (const [id, [name, wind, blow, share, zeal]] of Object.entries(CLOSERS)) {
    FOES[id].closer = [
      H("Winding up: " + name, "self", 0, 0, [{ windup: true }], { closer: "wind", anim: U(wind, []) }),
      H(name, "foes", 0, 0, [{ share }, { zeal: zeal || -1 }], { closer: "strike", anim: X(blow, ["down"]) }),
    ];
  }

  const CAMPAIGN = [
    { id: "prologue", title: "The Comment Section", group: "Tutorial", missions: [
      { name: "Tutorial", foes: ["skeptic", "preacher"], team: ["horn", "akin"], level: -3, movesAt: 2, cover: { foe: [1], hero: [], size: 0.2 } },
    ], scenes: { before: 0 }, unlocks: ["muse", "bertuzzi", "fradd", "schmitz"], book: "catechism" },
    // par: the team level a chapter was built for, so a player who jumps
    // ahead can be told that Gentle will make it winnable.
    { id: "atheists", par: 2.5, power: [2.0, 1.45], title: "The Fawn in the Forest", group: "Atheists", missions: [
      { name: "Comment Section Skeptics", foes: ["skeptic", "skeptic2"] },
      { name: "The Livestream", foes: ["skeptic", "skeptic2", "skeptic"] },
      { name: "Majesty of Reason", foes: ["skeptic2", "schmid", "skeptic"] },
      { name: "The Dialogue", foes: ["skeptic", "oconnor", "skeptic2"], boss: "oconnor" },
    ], scenes: { before: 0, after: [1, 2, 3, 4] }, unlocks: ["pine", "spitzer"], book: "confessions" },
    { id: "evangelicals", par: 4.3, power: [2.8, 2.5], title: "Are You a Good Person?", group: "Evangelicals", missions: [
      { name: "The City Square", foes: ["preacher", "preacher2"] },
      { name: "Tracts at the Corner", foes: ["preacher2", "preacher", "preacher2"] },
      { name: "Faith Alone?", foes: ["preacher", "preacher2", "preacher"] },
      { name: "If You Died Tonight", foes: ["preacher", "ryan", "preacher2"], boss: "ryan" },
    ], scenes: { before: 0, after: [1, 2, 3, 4] }, unlocks: ["hahn", "wetta"], book: "summa" },
    { id: "lds", par: 5.3, power: [3.6, 4.0], title: "The Restoration", group: "Latter-day Saints", missions: [
      { name: "A Knock at the Door", foes: ["elder", "elder2"] },
      { name: "The Visitors' Center", foes: ["elder2", "elder", "elder2"] },
      { name: "Ignatius of Antioch", foes: ["elder", "elder2", "elder"] },
      { name: "The Great Apostasy", foes: ["elder", "hansen", "elder2"], boss: "hansen" },
    ], scenes: { before: 0, after: [1, 2, 3, 4] }, unlocks: ["heschmeyer"], book: "apologia" },
    { id: "islam", par: 6.3, power: [3.9, 3.8], title: "People of the Book", group: "Islam", guest: "godlogic", missions: [
      { name: "Speakers' Corner", foes: ["dai", "dai2"] },
      { name: "The Crowd", foes: ["dai2", "dai", "dai2"] },
      { name: "The Islamic Dilemma", foes: ["dai", "dai2", "dai"] },
      { name: "God Is One", foes: ["dai", "speaker", "dai2"], boss: "speaker" },
    ], scenes: { before: 0, after: [1, 2, 3, 4] }, unlocks: ["jurado"], book: "rule" },
    { id: "newage", par: 7, power: [3.0, 2.6], title: "Apollo Loves You", group: "New Age", missions: [
      { name: "The Crystal Shop", foes: ["tarot", "crystal"] },
      { name: "The Full Moon Circle", foes: ["crystal", "tarot", "crystal2"] },
      { name: "Mercury in Retrograde", foes: ["tarot", "crystal", "tarot2"] },
      { name: "Apollo Loves You", foes: ["tarot", "witch", "crystal"], boss: "witch" },
    ], scenes: { before: 0, after: [1, 2, 3, 4] }, unlocks: ["martins", "hicks"] },
    { id: "body", par: 8, power: [3.1, 2.0], title: "My Body, My Brand", group: "Online Culture", missions: [
      { name: "Link in Bio", foes: ["creator", "activist"] },
      { name: "The Campus Rally", foes: ["activist", "creator", "activist2"] },
      { name: "Bodily Autonomy", foes: ["creator", "activist", "creator2"] },
      { name: "The Debate Stream", foes: ["activist", "destiny", "creator"], boss: "destiny" },
    ], scenes: { before: 0, after: [1, 2, 3, 4] }, unlocks: ["rose", "marygrace"] },
    { id: "identity", par: 8.3, power: [3.0, 2.3], title: "Who Do You Say You Are?", group: "Identity", missions: [
      { name: "The Campus Panel", foes: ["ally", "podcaster"] },
      { name: "Deconstruction", foes: ["podcaster", "ally", "podcaster2"] },
      { name: "Love Is Love", foes: ["ally", "podcaster", "ally2"] },
      { name: "Who Do You Say You Are?", foes: ["ally", "pastor", "podcaster"], boss: "pastor" },
    ], scenes: { before: 0, after: [1, 2, 3, 4] }, unlocks: ["zember", "holdsworth"] },
    { id: "scholars", par: 8.5, power: [2.8, 1.9], title: "Misquoting Jesus?", group: "Skeptical Scholars", missions: [
      { name: "Religion 101", foes: ["student", "mythicist"] },
      { name: "The Mythicists", foes: ["mythicist", "student", "mythicist2"] },
      { name: "A Game of Telephone", foes: ["student", "mythicist", "student2"] },
      { name: "Misquoting Jesus?", foes: ["student", "ehrman", "mythicist"], boss: "ehrman" },
    ], scenes: { before: 0, after: [1, 2, 3, 4] }, unlocks: ["pitre"] },
    { id: "reformed", par: 8.7, power: [3.0, 1.5], title: "Scripture Alone?", group: "Reformed", missions: [
      { name: "The Seminary Library", foes: ["seminarian", "seminarian2"] },
      { name: "Reformed Podcasters", foes: ["seminarian2", "seminarian", "seminarian2"] },
      { name: "The Upper Room", foes: ["seminarian", "seminarian2", "seminarian"] },
      { name: "The Dividing Line", foes: ["seminarian", "white", "seminarian2"], boss: "white" },
    ], scenes: { before: 0, after: [1, 2, 3, 4] }, unlocks: ["barron"] },
    // The Nones: no religion in particular. Harder than the chapters around
    // it, and it asks for a different team: these opponents hardly touch
    // Composure, and wear down Zeal instead.
    { id: "nones", par: 9, power: [3.4, 2.9], title: "Nothing in Particular", group: "The Nones", missions: [
      { name: "The Group Chat", foes: ["scroller", "shrugger"] },
      { name: "Sunday Brunch", foes: ["shrugger", "scroller", "shrugger2"] },
      { name: "Left on Read", foes: ["scroller", "shrugger", "scroller2"] },
      { name: "Master of None", foes: ["scroller", "master", "shrugger"], boss: "master" },
    ], scenes: { before: 0, after: [1, 2, 3, 4] }, unlocks: [] },
    // The final chapter: open once every story is done, and the hardest in
    // the game. Every boss comes back to the table.
    { id: "finale", power: [1.25, 0.7], title: "The Great Debate", group: "Everyone", final: true, missions: [
      { name: "Old Opponents", foes: ["oconnor", "ryan", "hansen"] },
      { name: "New Rivals", foes: ["speaker", "witch", "destiny"] },
      { name: "The Last Table", foes: ["white", "master", "ehrman"], boss: "master" },
    ], scenes: { before: 0, after: [1, 2, 3] }, unlocks: [] },
    { id: "epilogue", title: "One Fold", group: "Epilogue", missions: [], scenes: { before: 0 }, unlocks: [] },
  ];

  // What each chapter is about, shown on its card on the map: the problem the
  // team faces, never the answer. The player finds that by playing.
  const SETUP = {
    prologue: "A viral clip, three hundred angry comments, and the top one says Catholics can't answer a single one of them. Trent Horn and Jimmy Akin decide to try.",
    atheists: "Alex O'Connor finds one argument stronger than all the rest: a fawn burns to death in a forest fire, alone, and no one ever knows. Why would a good God allow suffering that seems to serve no purpose at all?",
    evangelicals: "Ryan stops strangers on the street with two questions: “Are you a good person?” and “If you died tonight, would you go to heaven?” How should a Catholic answer?",
    lds: "Two missionaries at the door say the Church fell away soon after the apostles died, and was restored only in 1830. If that is true, when did it happen, and why did no one notice?",
    islam: "At Speakers' Corner the crowd says the Bible was corrupted, and asks, cameras rolling, where Jesus ever said “I am God.” The team has to answer in front of everyone.",
    newage: "A WitchTok influencer tells her followers that Apollo loves them and Hecate protects them. It sounds kind. But is that what the old gods were ever like?",
    body: "“My body, my choice,” say the activists; “my body, my brand,” say the content creators. Whose body is the child's, and what happens to a person who becomes a product?",
    identity: "A kind pastor and a campus full of allies say the Church's teaching on sexuality is hateful. Is it? And who gets to say who you really are?",
    scholars: "Bart Ehrman says the manuscripts disagree in hundreds of thousands of places, and that the Gospels were written anonymously, long after the events. Then how can anyone trust what they say about Jesus?",
    reformed: "James White holds that Scripture alone is the Church's only infallible rule of faith, and he has heard every Catholic reply a thousand times. The team needs an argument he hasn't.",
    nones: "Nearly three in ten Americans now say they have no religion in particular. They aren't against God, just not interested. How do you reach someone who won't look up from the phone?",
    finale: "Every opponent from the year comes back to the table on a single night, and last of all the Master of None. What do you say when you can't win them all?",
    epilogue: "Every debate is won, and the world still doesn't seem to be listening. Why keep going?",
  };
  for (const ch of CAMPAIGN) ch.setup = SETUP[ch.id] || "";

  // The rules, shown on the design page and behind the Rules button in the game.
  // Each is [name, explanation]; the explanation may use <b>.
  const RULES_INTRO = "Teams of four take turns, fastest first: a strip of faces over the stage shows who goes next. Every evangelist has a basic move that can be used every turn, two skills that need three turns to recharge, and one great move that needs four and starts partly charged. A great move lands half again as hard as the rest, so reaching it is a real upgrade. Every debater has just two things to lose: Composure and Zeal. Moves either hit Composure, knock Zeal down, or do something else: stun, mute, call out, shield.";
  const RULES = [
    ["Marks under each debater", "Short words under each Composure bar say what is on that debater right now, and the game lists them all in full under the stage: <b>STUN</b> Dumbfounded · <b>DOUBTING</b> or <b>FLUSTERED</b> · <b>MUTED</b> · <b>EXPOSED</b> · <b>HIDDEN</b> Undercover · <b>CALLED OUT</b> · <b>REBUTTAL</b> ready · <b>STEADY</b> can’t lose Zeal · <b>SECURE</b> Eternal Security · <b>FAITH ALONE</b> · <b>HALF DMG</b> a testimony · <b>RENEW</b> regains Composure each turn · <b>ATK▲</b>, <b>DEF▼</b>, <b>CRIT▲</b> boosts and setbacks: a boost and a setback on the same stat cancel out, and a number shows how many are left over (<b>ATK▼2</b>). The list under the stage also says how many more turns each one lasts: they wear off one at a time. <b>SHIELD 40%</b> shows how much a Shield of Faith can still take, as a share of full Composure; a second shield stacks on and the number climbs. Your evangelists are listed on the left under the stage, the opponents on the right. A red warning over a boss means he is winding up his closing argument."],
    ["Composure", "How long a debater keeps his cool. At zero, an evangelist is <b>Discouraged</b> and sits out until a friend encourages him back. Only a move that restores Composure can reach him: Matt Fradd’s Pints with Aquinas, Brian Holdsworth’s Beauty Will Save the World, Cameron Bertuzzi’s Bayesian Update, Fr. Carlos Martins’ Prayer of Deliverance, Kim Zember’s Child of God, or Fr. Augustine Wetta’s Lifeguard on Duty and Surf’s Up. He comes back with three quarters of his Composure, and the whole team is <b>Heartened</b>: everyone, him included, gains 1 Zeal. It is the mirror of being Shaken when he went down, so bringing a friend back undoes the blow to the team's spirit (and if he goes straight down again, it's taken again). Shields, boosts and Zeal pass him by while he is out."],
    ["Zeal", "Everyone starts at 0. Blue arrows up (to +3) when it rises, red arrows down when it falls. Every red arrow takes a tenth off the strength of his arguments, so a flagging debater hits softer. At the bottom, an opponent leaves the debate and an evangelist is <b>Discouraged</b>."],
    ["Backing up", "When someone argues, every teammate with Zeal at 0 or higher may jump in with their basic move, each on his own chance: a quarter at Zeal 0, up to seven in ten at +3. A fired-up team often piles in two or three strong, and the other side does the same. But when an evangelist is Discouraged, his friends are <b>Shaken</b> and each loses 1 Zeal, so one loss can stall the whole team, until someone brings him back and the team is Heartened: +1 Zeal each."],
    ["Players", "Several people can play on one device: each enters a name and an email and gets a separate saved game, with a lifetime record of debates won, conversions, arguments won, opponents who left, and evangelists Discouraged. Names and emails stay on the device."],
    ["Stars", "Each debate remembers the hardest difficulty you have won it on: one star for Gentle, two for Normal, three for Crucible."],
    ["Level", "Only evangelists who win a debate gain experience: a lost debate earns nothing, and the bench gains nothing. When a chapter is too hard, go back and win earlier debates to level up. Each level adds 7% to an evangelist’s Composure and to the strength of his arguments, and opens new moves. A new evangelist joins the roster at level 1. Bring them along, even on Gentle, and they catch up fast: an evangelist debating beside higher-level teammates learns half as much again for each level behind the strongest, up to three times as much."],
    ["💡 Move tips", "In a debate, tap the lightbulb on any move to see what it does, how often it can be used, and when it is worth using. It works on locked and waiting moves too, so you can plan ahead."],
    ["Speed", "Everyone acts once a round, fastest first, and speed never changes. Evangelists who act early tend to carry less Composure; those who carry the most take longer to act. Going first lets you shield the team or finish off an opponent before he answers."],
    ["Difficulty", "Three steps, chosen just before each debate, beside the best you have won that debate on: Gentle (for the story), Normal (the game as designed) and Crucible (“tested like gold in the fire,” 1 Peter 1:7). Crucible brings tougher, sharper opponents, more podiums, a reinforcement, and a little more experience. Gentle is much softer and earns a quarter less: the way to play a chapter above your level. The tutorial is always gentle."],
    ["Closing argument", "Every boss has one. On his second turn, and every third turn after, he spends his turn winding up: a red warning flashes over his head. On his next turn it takes a large share of every evangelist’s Composure at once (from 55% for O’Connor to 85% for James White), and 1 Zeal from each. The Master of None is the exception: his takes only 30% of Composure, but 2 Zeal from each. Three ways to answer it: put up a Shield of Faith in time, and it soaks up the blow; leave him Dumbfounded or Muted while he winds up; or pile on and knock a fifth of his Composure off before he speaks, and he loses his thread. The first bosses’ closing arguments are gentle, James White’s is the hardest, and on Gentle every one lands at half strength and costs no Zeal."],
    ["Reinforcements", "On Crucible, a fresh opponent waits in reserve. When one goes out, he walks in to take his place. The round counter shows when someone is still waiting."],
    ["Podiums", "Some debaters start behind something: a podium, a soapbox, a stepladder at Speakers' Corner, a pulpit, a streamer's desk. It changes every battle. It takes the hits meant for the debater until it falls. A few moves go straight past it, a few hit it extra hard, and lowering Zeal gets past it every time."],
    ["Sent in", "A few moves send a teammate in to answer at once with their basic move, out of turn. Best used on a friend who hits hard but acts late."],
    ["Deflect · Crit · Resilience", "Every debater has a small chance to deflect part of a hit, to land a critical hit (which also knocks the other's Zeal down), and to shrug off a loss of Zeal. Exposed debaters can't deflect."],
    ["Hidden strengths", "Some evangelists hit harder, some take a hit better, some build stronger shields and podiums for their friends. The game never shows these numbers. You learn each evangelist's gifts by playing them."],
    ["Dumbfounded", "Stunned: loses turns while he thinks it over. Stars circle his head, one for each turn he still has to lose, and he sways on his feet. Some moves only stun some of the time: the stars show when it has really happened."],
    ["Called Out", "Must answer one particular apologist and no one else."],
    ["Doubting · Flustered", "Loses a little Composure each turn. An opponent is left Doubting his position, and some skills hit him harder for it. An apologist never doubts his faith: the same hard question leaves him Flustered."],
    ["Exposed", "Takes harder hits."],
    ["Fact-Check", "Comes in two strengths. A <b>Fact-Check</b> removes one boost: an Attack, Defense or Crit Up first, and the Shield of Faith only when there is no other boost left. A <b>Full Fact-Check</b> (Sola Scriptura, Voice of Reason, the Speakers’ Corner Champion’s Tahrif) removes everything at once: every boost, the shield, Undercover and any protection. The words over the debater say what went: “Fact-Checked: Attack Up,” “Fact-Checked: Shield,” or “Fact-Checked: everything.”"],
    ["Examen", "Removes every debuff."],
    ["Shield of Faith", "Absorbs hits for 3 turns, and while it holds, the debater behind it argues more boldly: his arguments land harder. How strong it is depends on the evangelist who gives it. You can see it as a shimmering bubble around the debater, and as a white bar just above the Composure bar, on the same scale: the longer the white, the more it can take (white all the way across means a shield as big as his full Composure). Shields stack: a second one adds to the first and lasts as long as the longer, up to the debater’s full Composure."],
    ["Boosts and setbacks", "Attack, Defense and Crit Chance Up and Down stack: two Attack Downs count twice, and an Attack Up and an Attack Down cancel out, though no one falls below a fifth of his strength. The mark under the debater shows what is left over: <b>ATK▼2</b>, or nothing at all when they cancel."],
    ["Muted", "Can use only his basic move, for as many of his own turns as the move says: a one-turn Mute holds through his next turn, and the mark stays up until that turn is over."],
    ["Rebuttal", "For a few turns, whenever an opponent's move does anything to this evangelist (a hit, even one his podium takes, a setback like Attack Down, a stun, a call-out, a loss of Zeal), he answers the attacker at once with his basic move, even against a move aimed at the whole team (but not while Dumbfounded). Pair it with a move that makes everyone answer him, as Ethan Muse does."],
  ];

  const START = ["horn", "akin"];

  // Variants share a kit with the original, with a different look.
  for (const [copy, of] of [["skeptic2", "skeptic"], ["preacher2", "preacher"], ["elder2", "elder"], ["dai2", "dai"], ["seminarian2", "seminarian"], ["tarot2", "tarot"], ["crystal2", "crystal"], ["creator2", "creator"], ["activist2", "activist"], ["ally2", "ally"], ["podcaster2", "podcaster"], ["student2", "student"], ["mythicist2", "mythicist"], ["scroller2", "scroller"], ["shrugger2", "shrugger"]]) FOES[copy] = FOES[of];

  return { HEROES, FOES, CAMPAIGN, START, BOOKS, RULES, RULES_INTRO };
})();
