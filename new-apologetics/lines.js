// New Apologetics — more things to say. Each move that speaks has its usual
// line (in moves.js for the heroes, data.js for the opponents) and these
// alternatives; every time a move is used, one is picked at random, never
// the same one twice in a row. A move whose words fly across the stage takes
// a list of phrases; a move that is said aloud takes a single line.
// Keep lines short: a phrase of up to about 18 letters, a line up to about 32.

const Lines = (() => {
  const EXTRA = {
    // Jimmy Akin
    "Senior Apologist": ["Well, actually…", "There are three views on that.", "Let's make a distinction.", "That's a common misconception.", "Short answer: no."],
    "Logical Paradox": ["Doubt everything? Even that?", "That refutes itself.", "So that claim is… unprovable?", "A rule with no exceptions? Hm."],
    // Ethan Muse
    "Open Challenge": ["Any of you. Right now.", "Livestream. Tonight. Let's go.", "Bring your best argument.", "Who's first?"],
    "Steelman Stance": ["Your best argument is this…", "I'll grant that. Now…", "Steelman first. Then answer.", "Let me say it better for you."],
    // Fr. Mike Schmitz
    "Two-Minute Homily": [["Real quick…"], ["Hey, friends…"], ["Okay, so…", "…this matters."], ["God loves you.", "Really."], ["Here's the deal."]],
    "I'm Praying for You": ["Please pray for me.", "You've got this. He's got you.", "Go get 'em. I'll pray.", "My name is Fr. Mike, and…"],
    "The Bible in a Year": ["Day 47. Keep going!", "Leviticus. You can do it.", "Day 212. Still here!", "Day 365. We made it!"],
    // Cameron Bertuzzi
    "Time's Up": ["We're at time.", "Let's wrap it up there.", "Thirty seconds… and done.", "I have to stop you there."],
    "Point of Order": ["Let's define our terms.", "That's not the question.", "Back to the topic, please.", "Let's update our priors."],
    // Trent Horn
    "Deadpan": [["Fascinating.", "Anyway."], ["Great point.", "…said no one."], ["Cool.", "Cool cool cool."], ["That's…", "…a choice."], ["I'm thrilled.", "Can you tell?"], ["Well.", "That happened."], ["Oh good.", "More of this."]],
    // Topics from real Free-for-All Friday episodes of The Counsel of Trent.
    "Free-for-All Friday": ["So… I finally got glasses.", "I once filmed a zombie movie.", "My favorite last meals…", "The weirdest phobias. Mine too.", "Let's talk YouTube algorithms.", "Why do millennials look so young?", "Someone tried to steal $4,000!", "So I've looked into dieting.", "Remote-work hacks, anyone?", "Good things from the pandemic?", "My all-time favorite movies…", "Crew Resource Management!", "What happened to bowling alleys?"],
    "Is That in the Bible?": ["Where does it say that?", "Show me that verse.", "Is that in the Bible, though?", "Book, chapter, verse?"],
    // Matt Fradd
    "Cheeky Question": [["Hang on, mate."], ["Crikey…"], ["Good question…", "…but why?"], ["Righto…", "…but why?"], ["Mate.", "Mate."]],
    "Pints with Aquinas": ["Pull up a stool.", "This one's on me.", "Aquinas would've loved this.", "Get this man a pint!"],
    // "My name is obviously Matt Fradd" is how he opens Pints with Aquinas;
    // "That's beautiful" is his usual response to a guest's good point.
    "Australian Charm": ["No worries, mate!", "That's beautiful.", "My name is obviously Matt Fradd.", "Good on ya!", "You're a legend, mate."],
    // GodLogic
    "Smooth Pivot": ["Stand here. I've got you.", "Take the podium.", "Smooth. Real smooth.", "Cover's up. You're good."],
    "Stay Smooth": ["Keep it smooth, fam.", "Calm and smooth.", "No stress. Stay smooth.", "Smooth is fast."],
    // Bishop Barron
    "Sunday Sermon": [["Peace."], ["Now, friends…"], ["Here's the point:"], ["As Aquinas said…"], ["Beauty first."]],
    "Word on Fire": ["Beauty. Goodness. Truth.", "God is not a being among beings!", "Christ is risen, friends!", "Set the world on fire!"],
    // Fr. Boniface Hicks
    "Gentle Correction": ["Gently, brother.", "Let's slow down.", "May I offer something?", "In charity, no."],
    "Discernment of Spirits": ["Consolation or desolation?", "Where is this coming from?", "Test the spirits.", "Is this peace, or noise?"],
    "Obsculta": ["Listen, my son.", "Incline the ear of your heart.", "Obsculta.", "Be still, and listen."],
    // Fr. Gregory Pine
    "Distinguo": [["Concedo…", "…nego."], ["Yeah…", "…it depends."], ["Well,", "two senses."], ["Transeat…", "…but distinguo."], ["In one sense,", "yes."]],
    "Sed Contra": ["On the contrary…", "But against this…", "Augustine says otherwise.", "Yeah, no. Sed contra."],
    "The Five Ways": ["Second, from causation…", "Third, from contingency…", "Fourth, from gradation…", "Fifth, from governance…"],
    // Sr. Mary Grace
    "Let Love": ["Be not afraid.", "Every life is a gift.", "He is with you.", "Love wins. Really."],
    // Lila Rose
    "Undercover": ["Camera's rolling.", "Just a few questions…", "Act natural.", "They'll never know."],
    // Brian Holdsworth
    "Ten-Minute Essay": [["Consider this."], ["Let me explain."], ["Beauty matters."], ["Culture follows", "cult."], ["Here's the thing:"]],
    "Beauty Will Save the World": ["Look at a cathedral.", "Beauty points beyond itself.", "Dostoevsky was right.", "Chant, incense, gold."],
    "Cultural Diagnosis": ["Here's what's really going on.", "Notice the pattern?", "That's modernity talking.", "Let's zoom out."],
    // Alex Jurado
    "One-Two": [["Hey.", "Hey!"], ["One.", "Two."], ["Bro.", "Think."], ["Come on.", "Really?"]],
    "Deep Cut": ["But why, though?", "Follow that through.", "And then what?", "Let's go all the way down."],
    "Stallone Voice": ["Yo. Listen here.", "Nobody hits harder than truth.", "It ain't over till it's over.", "Keep movin' forward!"],
    // Fr. Robert Spitzer
    "The Four Levels of Happiness": ["Level one: pleasure.", "Level two: achievement.", "Level three: love.", "Aim higher. Level four."],
    // Scott Hahn
    "Covenant Is Family": [["Covenant!", "Family!"], ["Kinship", "by oath!"], ["Father!", "Son!"], ["Amazing!"], ["It's a family!"]],
    "Wide-Eyed Wonder": ["Wow. Just… wow!", "Look at this passage!", "It's all right there!", "That blew my mind!", "The Lamb! The Supper!"],
    // Joe Heschmeyer
    "Ignatius of Antioch": [["“The Eucharist…", "…is the flesh”"], ["“Follow", "the bishop”"], ["Irenaeus,", "c. 180"], ["Clement,", "c. 96"]],
    "Former Litigator": ["Leading the witness!", "Asked and answered.", "No further questions.", "Sustained!"],

    // Joe Schmid, once he has come home
    "Contingency Argument": ["What explains the whole chain?", "Contingent things need a ground.", "Why this, and not nothing?", "Pruss would like a word."],
    "Welcome Home": ["It's good to be back.", "The door was always open.", "Pull up a chair, brother.", "Home at last."],

    // Fr. Carlos Martins
    "Stand Behind Me": ["Stand behind me. I've seen worse.", "Look at me, not them.", "Keep your eyes on me.", "Christ has already won."],
    "Prayer of Deliverance": ["Deliver us from evil.", "Saint Michael, defend us.", "Lord, set them free.", "Be healed, in Jesus' name."],

    // Kim Zember
    "Boldly Beloved": ["You are loved. Boldly.", "He wants all of you.", "You're not a label.", "You were made for more."],
    "Here I Am": ["Here I am. Ask me anything.", "I lived it. Ask away.", "I've been where you are.", "I'm not afraid of the question."],

    // Opponents
    "Where's the Evidence?": ["Source?", "Extraordinary claims…", "That's just, like, faith.", "Peer-reviewed?"],
    "Turn or Burn": [["Turn or burn!"], ["Sinner!"], ["Not too late!"], ["Hellfire!"]],
    "Street Sermon": ["Are you saved?", "Jesus is coming soon!", "Where will you spend eternity?", "Get right with God!"],
    "Testimony": [["I bear testimony…"], ["Pray about it."], ["Moroni 10:4."], ["I feel it's true."]],
    "Pamphlet": ["Can we come back Tuesday?", "Heard of the Restoration?", "Read the Book of Mormon!", "Free copy, just for you!"],
    "Show Me the Verse": [["Show me the verse!"], ["Where did he say?"], ["Answer me!"], ["One verse!"]],
    "Tahrif": ["Which Bible? There are many!", "The Gospel was corrupted.", "Paul changed everything.", "Where's the original?"],
    "In the Greek…": [["Actually, the Greek…"], ["Sola gratia!"], ["Read Romans 9."], ["Exegete it!"]],
    "TULIP": ["Unconditional election.", "Limited atonement.", "Irresistible grace.", "Perseverance of the saints!"],
    "Majesty of Reason": [["Premise one…", "…premise two."], ["Grant me this…", "…and then?"], ["Suppose…", "…for reductio."], ["Here's a", "dilemma…"]],
    "Evolutionary Suffering": ["Why all the predation?", "Pain long before any sin?", "What about the trilobites?", "Eons of it. Why?"],
    "Modal Collapse": ["Your God collapses modality.", "No contingency? Then…", "Could God have done otherwise?", "Necessary. All of it."],
    "Steelman": ["Charitably construed…", "Your best version is…", "Fair. Very fair.", "Let me grant that."],
    // Joe Schmid does Slavoj Žižek.
    "Žižek Impression": ["Pure ideology! *sniff*", "This is, eh, ideology!", "Even your coffee is ideology!", "German toilets! Ideology!", "I am, eh, a Christian atheist!", "*sniff* And so on. Beautiful!", "Like, eh… nothing is simple!"],
    // The New Age
    "Card Pull": [["The cards say…"], ["Three of Swords."], ["The Moon…", "…reversed."], ["Pull again."]],
    "The Tower": ["The Tower. Upheaval!", "The Devil card. Hm.", "Ten of Swords. Yikes.", "Death card! It's fine."],
    "Good Vibes": [["Good vibes!"], ["High vibration!"], ["Namaste."], ["Raise your frequency."]],
    "Crystal Grid": ["Amethyst protects me.", "Rose quartz, for love.", "Charged in moonlight.", "The grid is set."],
    "Manifest It": [["Manifest it!"], ["Speak it into being."], ["Ask the universe."], ["Big Leo energy."]],
    "Apollo Loves You": ["Apollo loves you, babe.", "Aphrodite wants you happy.", "Hecate is so protective.", "The gods adore you, bestie."],
    "Mercury in Retrograde": ["Mercury's in retrograde!", "Blame the full moon.", "It's your Saturn return.", "Bad astrology week."],
    "Protection Circle": ["Salt circle. Protected.", "Sage it out.", "My spirit guides got me.", "White light around me."],
    // My Body, My Brand
    "Link in Bio": [["Link in bio!"], ["Subscribe!"], ["It's my brand."], ["Smash that like."]],
    "It's Empowering": ["It's empowering!", "My body, my business.", "I'm my own boss.", "It's just content!"],
    "Chant": [["My body!"], ["My choice!"], ["Not your body!"], ["Hands off!"]],
    "Clump of Cells": ["It's just a clump of cells!", "It's not a baby yet!", "It's healthcare!", "It's a medical decision!"],
    // Destiny: his own case, fairly put.
    "Rapid Fire": [["Okay,", "so,", "no."], ["Hold on.", "That's", "incoherent."], ["Wrong.", "Next.", "Next."]],
    "Define 'Person'": ["Define “person.”", "Define your terms.", "What's a person, exactly?", "Personhood needs a mind."],
    "Life Support": ["Would you unplug him or not?", "Life support. Same thing.", "No one owes their body.", "Sleep is different. Why?"],
    "No Experiences, No Harm": ["No conscious experience, no one harmed.", "Consciousness first.", "No mind, no victim.", "Who's harmed? Nobody."],
    // Who Do You Say You Are?
    "Hashtag": [["#LoveWins"], ["#Pride"], ["#BeYourself"], ["#Valid"]],
    "Call-Out Post": ["You can't say that!", "That's so harmful.", "Screenshotted.", "I'm posting this."],
    "Deconstructing": [["Deconstructing…"], ["I used to believe…"], ["Religious trauma."], ["Unpack that."]],
    "Purity Culture": ["That's just purity culture.", "Shame-based theology.", "That's so toxic.", "I grew out of that."],
    "Love Is Love": [["Love is love."], ["Love wins."], ["Who are we to judge?"], ["God is love!"]],
    "Jesus Never Mentioned It": ["Jesus never mentioned it!", "Red letters only, please.", "That's Paul, not Jesus.", "Wrong translation!"],
    "Born This Way": ["God made them this way!", "Born this way!", "You can't choose who you love.", "It's who they are!"],
    "Radical Welcome": ["All are welcome here.", "Radical inclusion!", "No one is turned away.", "Come as you are."],
    "Within Reason": [["Right, but…"], ["Fair, but…"], ["I'm not sure…", "…that follows."], ["Mm. Okay."]],
    "The Fawn in the Forest": ["Why the burning fawn?", "Whom does its pain serve?", "Alone. In the forest.", "No one sees. No one learns."],
    "Euthyphro": ["Good because commanded?", "Arbitrary, or above God?", "Plato's old question…", "Which horn will you take?"],
    "Charitable Skeptic": ["I take that seriously.", "Genuinely interesting.", "I'll have to think about that.", "Good point. Truly."],
    "Gospel Tract": ["Million-dollar bill?", "It's free!", "Read it tonight!", "Take one for a friend!"],
    "Are You a Good Person?": ["Ever told a lie?", "What does that make you?", "Ever stolen anything?", "Kept all ten?"],
    "If You Died Tonight": ["Heaven or hell?", "Would you be innocent?", "Are you a hundred percent sure?", "Tonight. Think about it."],
    "Faith Alone": ["Not by works!", "Grace, not works!", "Just trust Jesus!", "Sola fide!"],
    "Scholarly Citation": [["Per the scholars…"], ["Primary sources!"], ["Footnote 22."], ["See appendix B."]],
    "Great Apostasy": ["The keys were taken away.", "It was restored in 1830.", "Where were the prophets?", "A long night of apostasy."],
    "Burning in the Bosom": ["I know it's true.", "The Spirit witnessed to me.", "Pray and you'll know.", "I can't deny what I felt."],
    "Eternal Progression": ["We can progress forever.", "Exaltation awaits!", "Families are forever.", "Line upon line!"],
    "Crowd Question": [["Yes or no!"], ["Who is Jesus?"], ["Simple question!"], ["Answer the crowd!"]],
    "Tawhid": ["He begets not!", "Three can't be one!", "Say: He is God, One!", "No partners!"],
    "The Crowd Gathers": ["Everyone, listen!", "Gather round!", "Come see this!", "Brothers, record this!"],
    "Greek Exegesis": [["The text says…", "…plainly."], ["Exegesis,", "not eisegesis."], ["Monogenes…", "…means unique."], ["Look at", "the aorist!"]],
    "Sola Scriptura": ["Sola Scriptura!", "Theopneustos!", "Show it from the text!", "The Word is sufficient!"],
    "Eternal Security": ["None can snatch them!", "The golden chain! Romans 8!", "He will finish the work!", "Kept by the power of God!"],
    "Debate Challenge": ["The Dividing Line. Tuesday.", "I'll take on anyone.", "Cross-examination time.", "Bring your best scholar."],
  };

  const last = {};

  // A move's words for this use: { glyphs } for words that fly, { say } for
  // a line said aloud, or null when the move says nothing.
  function pick(move) {
    if (!move) return null;
    const words = (move.glyphs || []).some((g) => g.length > 2);
    const extra = EXTRA[move.name];
    if (!extra || (!words && !move.say)) return null;
    const own = words ? move.glyphs : move.say;
    const all = [own].concat(extra.filter((x) => Array.isArray(x) === words));
    let i = Math.floor(Math.random() * all.length);
    if (all.length > 1 && i === last[move.name]) i = (i + 1) % all.length;
    last[move.name] = i;
    return words ? { glyphs: all[i] } : { say: all[i] };
  }

  return { pick, EXTRA };
})();
