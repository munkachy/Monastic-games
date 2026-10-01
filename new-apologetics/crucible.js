// New Apologetics — the Crucible stories.
//
// On Crucible, the hardest setting, every chapter tells a new story with a
// harder question. (Gentle and Normal keep the stories in story.js.) The
// battles are the same; the scenes between them are new, and bosses from
// other chapters come back to take part.
//
// Each scene stands on its own: it opens with a narrator's line saying where
// we are and what the question is, and it ends on a settled beat, never on a
// question left hanging for the next scene. A player who skips around, or
// comes back after a week, can always pick up the thread.
//
// The words given to real people are drafts, written to reflect what each
// one has said in public, and in charity. Joe Schmid's coming home is the
// game's own story (see NOTES.md), not a claim about the man.

Story.addCrucible([
  {
    id: "atheists", title: "The Hidden God", group: "Atheists", boss: "oconnor", place: "studio",
    mystery: "If God wants to be known, why do sincere people look for him for years and find only silence?",
    scenes: [
      { when: "Before the first battle", place: "studio", left: ["horn","akin","bertuzzi"], right: ["oconnor"], lines: [
        ["","Crucible. Alex O'Connor is back with a harder question than the fawn."],
        ["oconnor","Here's what I keep coming back to. There are people who want to believe, who pray, who look honestly for years, and they find nothing. If God loved them, wouldn't he simply let them know he's there?"],
        ["akin","That's the argument from divine hiddenness. J. L. Schellenberg made it famous."],
        ["horn","And it deserves better than a slogan. We'll start with the people it describes: the ones who looked and didn't find."],
        ["","The team heads into the comment section, where those people write every day."],
      ] },
      { when: "After the first battle", place: "studio", left: ["muse","bertuzzi","akin"], right: [], lines: [
        ["","After the comment section. The question: why is God hidden from sincere seekers?"],
        ["muse","Half those comments said the same thing: “I prayed for years and heard nothing.” They weren't trolling. They meant it."],
        ["bertuzzi","Pascal saw this coming. “There is enough light for those who desire only to see, and enough darkness for those of a contrary disposition.”"],
        ["akin","So hiddenness isn't absence. It's a kind of light that doesn't force anyone. That's a start, not an answer.","idea"],
        ["","Tonight the team goes on a livestream to test the idea."],
      ] },
      { when: "After the second battle", place: "studio", left: ["muse","bertuzzi","akin"], right: ["+pine"], lines: [
        ["","After the livestream. The question is still God's hiddenness, and the team has called in help."],
        ["pine","St. Thomas says the act of faith is an assent of the mind, moved by the will, which is moved by grace. Summa, second part of the second part, question 2."],
        ["pine","If God made himself as obvious as the noonday sun, assent would be forced. There'd be nothing left to give him freely. Love can't be compelled, even by evidence."],
        ["bertuzzi","Next on the stream is Joe Schmid. He knows the hiddenness argument better than almost anyone alive."],
        ["muse","Then we won't try to corner him. We'll ask him what he's been looking for.","…"],
      ] },
      { when: "After the third battle", place: "studio", left: ["muse","akin","+schmid"], right: [], lines: [
        ["","After Majesty of Reason. Joe Schmid has come home, and he has joined the team."],
        ["schmid","I looked for years. The contingency argument kept pointing somewhere I wasn't ready to go."],
        ["schmid","Hiddenness didn't disprove God for me. Looking back, it was the time it took me to want him, and not just to want the argument to work."],
        ["akin","That's a testimony, not a syllogism. But it answers the question in a way a syllogism can't.","idea"],
        ["muse","Alex is next, at the dialogue. He's going to have questions. About you."],
        ["schmid","He has my number. He's used it before. I'm looking forward to it."],
      ] },
      { when: "The dialogue", place: "studio", left: ["schmid","akin","hicks"], right: ["oconnor","+pine"], lines: [
        ["","The dialogue is over. Alex O'Connor stays behind, and he has seen who is sitting on the team's side of the table."],
        ["oconnor","Joe. Of all people. I genuinely did not see that coming.","!"],
        ["schmid","Neither did I, for a long time. You were in a lot of my best arguments against it."],
        ["oconnor","I'm almost flattered. But my question stands. If God wanted me to know, I'd know."],
        ["hicks","Jeremiah says, “You will seek me and find me, when you seek me with all your heart.” That isn't an accusation. It's a promise about timing."],
        ["pine","And it isn't all on you. The Catechism says God calls first. Even the looking is already his gift."],
        ["oconnor","Then I'll keep looking. Honestly. I always have.","…"],
        ["","Two old sparring partners stay after the lights go down, talking about contingency and fawns until the studio closes."],
      ] },
    ],
  },
  {
    id: "evangelicals", title: "Just Me and Jesus", group: "Evangelicals", boss: "ryan", place: "square",
    mystery: "If all you need is a personal relationship with Jesus, why would anyone need a Church, a priest, or a sacrament?",
    scenes: [
      { when: "Before the first battle", place: "square", left: ["holdsworth","horn","fradd"], right: ["ryan"], lines: [
        ["","Crucible. Ryan is back in the square, and this time he isn't asking whether you're a good person."],
        ["ryan","You don't need religion. You need a relationship with Jesus. No priest, no ritual, nothing in between."],
        ["horn","We agree you need Jesus. Everything else we say is about how he chose to give himself to us."],
        ["holdsworth","Then that's what we'll look for today: how Jesus himself set up a relationship with his friends."],
      ] },
      { when: "After the first battle", place: "square", left: ["holdsworth","fradd"], right: [], lines: [
        ["","After the city square. The question: does a relationship with Jesus need a Church?"],
        ["fradd","The preachers kept saying it: Jesus plus nothing. I get why. Nobody wants a middleman."],
        ["holdsworth","But think about any real relationship. It has a body: words, meals, touch, a home. Jesus didn't leave his friends a feeling. He left them a meal, and said “Do this in memory of me.”","idea"],
        ["","The team carries that thought down to the tract corner."],
      ] },
      { when: "After the second battle", place: "pub", left: ["fradd","heschmeyer"], right: ["+hahn"], lines: [
        ["","After the tract corner. The team is asking whether Jesus meant to found a Church at all."],
        ["hahn","Covenant is family, and a family has a household. Paul calls it “the household of God, which is the church of the living God, the pillar and bulwark of the truth.” First Timothy 3:15."],
        ["heschmeyer","A pillar holds something up. Paul doesn't say the Church is in the way of the truth. He says it holds the truth up where people can see it."],
        ["","So the Church isn't a middleman. It's the house the relationship lives in."],
      ] },
      { when: "After the third battle", place: "pub", left: ["heschmeyer","bertuzzi"], right: ["+white"], lines: [
        ["","After the debate on faith alone. James White, of the Reformed chapter, has stopped by to listen."],
        ["white","For the record: Ryan is right about grace, and you are wrong about the Supper. I just wanted that said clearly."],
        ["heschmeyer","Clearly said, and clearly heard. Thank you for coming, James."],
        ["white","We'll do this properly on the Dividing Line some Tuesday."],
        ["bertuzzi","Agreed. Today it's Ryan's turn, and he deserves our best."],
      ] },
      { when: "The last conversation", place: "square", left: ["schmitz","heschmeyer","horn"], right: ["ryan"], lines: [
        ["","The last conversation in the square. Ryan has one question left: what could the Church give him that Jesus can't?"],
        ["ryan","If I already have Jesus, what more could a Church possibly give me?"],
        ["schmitz","More of Jesus. That's all the sacraments are, friend: Jesus, reaching out and touching you, the way he touched lepers and children."],
        ["heschmeyer","On Easter night he breathed on the apostles and said, “If you forgive the sins of any, they are forgiven.” John 20. He wanted forgiveness spoken out loud, by a human voice."],
        ["ryan","I've never once thought of confession as Jesus' idea.","!"],
        ["horn","Most people haven't. It's in red letters, though."],
        ["","Ryan keeps his tracts. But he asks for the verse again, so he can look it up himself."],
      ] },
    ],
  },
  {
    id: "lds", title: "An Exalted Man?", group: "Latter-day Saints", boss: "hansen", place: "doorstep",
    mystery: "Is God an exalted man with a body of flesh and bones, or the uncreated Creator of everything that exists? And does the difference matter?",
    scenes: [
      { when: "Before the first battle", place: "doorstep", left: ["akin","heschmeyer"], right: ["elder"], lines: [
        ["","Crucible. The missionaries are back at the door, and today they want to talk about who God is."],
        ["elder","We believe our Heavenly Father is literally our Father. He has a glorified body of flesh and bones, as tangible as ours."],
        ["akin","That's from Doctrine and Covenants 130. Then before we talk about anything else, we need to talk about what the word “God” means."],
        ["","The team takes the question with them to the next doors on the street."],
      ] },
      { when: "After the first battle", place: "library", left: ["heschmeyer","muse"], right: [], lines: [
        ["","After the knock at the door. The question: is God an exalted man?"],
        ["heschmeyer","Lorenzo Snow put it in a couplet: “As man now is, God once was; as God now is, man may be.”"],
        ["muse","Then if God was once a man, he was born into a world he didn't make. So he isn't the Creator of everything. Something bigger came first.","idea"],
        ["","That is the thread the team will pull at the visitors' center."],
      ] },
      { when: "After the second battle", place: "library", left: ["pine","hicks"], right: [], lines: [
        ["","After the visitors' center. The team is asking what Christians have always meant by “God.”"],
        ["pine","Not the biggest being in the universe. Being itself: the one who simply is, and gives existence to everything else. That's what “I AM” means."],
        ["hicks","Isaiah 43: “Before me no god was formed, nor shall there be any after me.” And Numbers 23: “God is not man.”"],
        ["","So the difference is not small. It is the difference between a very great someone, and the source of all there is."],
      ] },
      { when: "After the third battle", place: "library", left: ["akin","heschmeyer"], right: ["+speaker"], lines: [
        ["","After the reading of Ignatius of Antioch. The Speakers' Corner Champion, of the Islam chapter, has come to the library."],
        ["speaker","My friends, on this one point I stand with you. God is not a man, and he has no body. Say: he is God, the One."],
        ["akin","Thank you. And yes, we'll still disagree about the Son."],
        ["speaker","Another day. Today we agree, and that is rare enough to enjoy."],
        ["heschmeyer","Jacob Hansen is next. He'll be ready. He always is."],
      ] },
      { when: "The last conversation", place: "doorstep", left: ["hahn","heschmeyer","hicks"], right: ["hansen"], lines: [
        ["","The last conversation at the door. Jacob Hansen has one objection: a God without a body sounds cold."],
        ["hansen","A God without body, parts or passions sounds like the god of the philosophers. Not the Father who weeps over his children."],
        ["hahn","The Father doesn't need a body to love you! Jesus said, “God is spirit.” John 4. And when the Father wanted to weep with us, he gave his Son a body."],
        ["heschmeyer","A real one, flesh and bone, risen. He didn't climb up into godhood. God came down."],
        ["hansen","That's beautiful. I don't agree. But it's beautiful.","…"],
        ["","They shake hands at the door. Each promises to read the other's favorite chapter."],
      ] },
    ],
  },
  {
    id: "islam", title: "The Cross", group: "Islam", boss: "speaker", place: "corner",
    mystery: "The Qur'an says Jesus was not crucified. Why do historians, even skeptical ones, say that his crucifixion is one of the surest facts we have?",
    scenes: [
      { when: "Before the first battle", place: "corner", left: ["horn","bertuzzi"], right: ["speaker"], lines: [
        ["","Crucible. Speakers' Corner again, and the crowd has a new challenge."],
        ["speaker","“They killed him not, nor crucified him, but so it was made to appear to them.” Qur'an 4:157. Your whole religion rests on an illusion."],
        ["horn","That verse came about six hundred years after the event. Today we'll look at what the people closest to it wrote."],
        ["","The team sets up beside the crowd and begins."],
      ] },
      { when: "After the first battle", place: "corner", left: ["bertuzzi","muse"], right: [], lines: [
        ["","After the first round at Speakers' Corner. The question: was Jesus really crucified?"],
        ["bertuzzi","Start with someone who disliked Christians. Tacitus, a Roman historian, around the year 116: Christus “suffered the extreme penalty during the reign of Tiberius at the hands of Pontius Pilate.”"],
        ["muse","A hostile witness, with no reason to invent it. That's a good place to begin.","idea"],
      ] },
      { when: "After the second battle", place: "corner", left: ["godlogic","muse"], right: [], lines: [
        ["","After the crowd. GodLogic is with the team, and the question is still the Cross."],
        ["godlogic","Go earlier still. Paul's letters were written within about twenty-five years. First Corinthians 15: “Christ died for our sins in accordance with the scriptures.”"],
        ["godlogic","Paul calls that the message he himself received. That puts it a few years after the Cross, not centuries."],
        ["muse","And we know a scholar who isn't a Christian at all and says the same thing. I'll give him a call."],
      ] },
      { when: "After the third battle", place: "corner", left: ["godlogic","muse"], right: ["+ehrman"], lines: [
        ["","After the Islamic Dilemma. Bart Ehrman, of the scholars' chapter, has come down to the corner."],
        ["ehrman","I'm an agnostic, and I'll say it plainly: that Jesus was crucified on the orders of Pontius Pilate is one of the most certain facts of history."],
        ["godlogic","Appreciate you, Bart. Stay smooth."],
        ["ehrman","I'm only here for the history. The theology is your department."],
        ["","The champion has heard every word, and he is ready for the last conversation."],
      ] },
      { when: "The last conversation", place: "corner", left: ["pine","marygrace","godlogic"], right: ["speaker"], lines: [
        ["","The last conversation at Speakers' Corner. The champion grants the history; his question now is why."],
        ["speaker","Why would God let his prophet be shamed on a cross? It is unworthy of God."],
        ["pine","It would be unworthy of a god who only wanted to be honored. But the Cross shows a God who wanted to be with us, all the way down, even in death."],
        ["marygrace","The Cross isn't where God failed. It's how far he was willing to come for you."],
        ["speaker","You have given me history I cannot wave away. I must think about this.","…"],
        ["godlogic","Take your time, brother. We'll be here."],
        ["","The crowd breaks up. Two of the young men who were filming ask for a copy of the Gospel of Mark."],
      ] },
    ],
  },
  {
    id: "newage", title: "Manifest It", group: "New Age", boss: "witch", place: "shop",
    mystery: "If the universe gives you whatever you think about hard enough, what is prayer for? And is anyone listening?",
    scenes: [
      { when: "Before the first battle", place: "shop", left: ["barron","hicks"], right: ["witch"], lines: [
        ["","Crucible. The WitchTok influencer has a new video, and it has gone viral: manifesting."],
        ["witch","Write it down, visualize it, feel it as if it's already yours, and the universe will give it to you. It's the law of attraction, babe."],
        ["barron","Friends, the universe can't give you anything. It can't love you. Only a someone can."],
        ["","The team starts where her followers start: at the crystal shop."],
      ] },
      { when: "After the first battle", place: "shop", left: ["hicks","barron"], right: [], lines: [
        ["","After the crystal shop. The question: what is the difference between manifesting and prayer?"],
        ["hicks","Magic tries to control. Prayer surrenders. The Catechism says magic attempts to tame hidden powers and put them at our service."],
        ["barron","Manifesting is a kind of magic with better marketing. Prayer is asking a Father, who is free to say no.","idea"],
      ] },
      { when: "After the second battle", place: "shop", left: ["barron","martins"], right: ["+oconnor"], lines: [
        ["","After the full moon circle. Alex O'Connor, of the atheists' chapter, has wandered in, curious."],
        ["oconnor","I'm an atheist, and even I'm fairly sure the moon doesn't care about anyone's rent."],
        ["barron","Alex, we agree on more than you'd think."],
        ["oconnor","Please don't tell my audience."],
        ["martins","Your secret is safe. Mostly."],
      ] },
      { when: "After the third battle", place: "shop", left: ["martins","marygrace"], right: [], lines: [
        ["","After Mercury in retrograde. The team is asking why manifesting can be dangerous, not just silly."],
        ["martins","Because it puts the self on the throne. “My will be done” is the oldest temptation there is. The Lord's Prayer turns it around: “Thy will be done.”"],
        ["marygrace","Even Jesus prayed that way, in the garden, when it cost him everything. He wasn't manifesting. He was trusting."],
      ] },
      { when: "The last conversation", place: "shop", left: ["barron","martins","marygrace"], right: ["witch"], lines: [
        ["","The last conversation at the shop. The influencer wants to know what becomes of her hopes if she stops manifesting."],
        ["witch","So what am I supposed to do with my vision board?","?"],
        ["marygrace","Keep the hopes. Give them to Someone. Hopes are good. They just weren't made to be aimed at nothing."],
        ["barron","“Ask, and it will be given you.” But you ask a Father, not a mechanism. He may give you something far better than what you wrote down."],
        ["witch","That's scarier. And kind of nicer.","…"],
        ["","That night her video is different. She reads the Our Father aloud, slowly, and doesn't explain it."],
      ] },
    ],
  },
  {
    id: "body", title: "The Violinist", group: "Online Culture", boss: "destiny", place: "stream",
    mystery: "Even if the unborn child is a person, may a mother unplug herself, like the woman in Judith Jarvis Thomson's famous violinist case?",
    scenes: [
      { when: "Before the first battle", place: "stream", left: ["rose","fradd"], right: ["destiny"], lines: [
        ["","Crucible. Destiny is back on stream, and he has granted the team's last point."],
        ["destiny","Fine. Grant the fetus is a person. Nobody can be forced to keep another person alive with their body. That's Thomson's violinist, 1971."],
        ["rose","Then let's take the violinist seriously, because it's the strongest case there is. We'll start with the people who treat the body as theirs to use."],
      ] },
      { when: "After the first battle", place: "stream", left: ["fradd","holdsworth"], right: [], lines: [
        ["","After the link-in-bio creators. The question: may a mother unplug herself from her child?"],
        ["fradd","The creators and the violinist argument share something. Both talk about the body as property, a thing you own and rent out."],
        ["holdsworth","But you don't own your body like a car. You are your body. That changes what “unplugging” means.","idea"],
      ] },
      { when: "After the second battle", place: "square", left: ["pine","marygrace"], right: [], lines: [
        ["","After the campus rally. The team is testing the violinist case on its own terms."],
        ["pine","In Thomson's story, you wake up attached to a stranger. But a child isn't a stranger to his mother. Parents owe their children care that no one owes a stranger."],
        ["pine","A stranger may have no claim on your body. Your own child does: the ordinary care every child is owed, food, shelter, a home. Pregnancy is the first home anyone has."],
        ["marygrace","That's the heart of it. Hold on to it for the stream."],
      ] },
      { when: "After the third battle", place: "square", left: ["rose","pine"], right: ["+white"], lines: [
        ["","After the debate on bodily autonomy. James White, of the Reformed chapter, has come to stand with the team."],
        ["white","I disagree with you people about nearly everything. Not this. Every child is made in the image of God."],
        ["rose","Thank you, James. That means more than you know."],
        ["","Catholics and a Reformed Baptist, side by side. Destiny's stream is next."],
      ] },
      { when: "The last conversation", place: "stream", left: ["rose","pine","marygrace"], right: ["destiny"], lines: [
        ["","The last conversation on stream. Destiny's reply is that a parent's duties come only from consent."],
        ["destiny","Parental duties are chosen. If you didn't consent to the obligation, you don't have it."],
        ["rose","Then a father who never wanted the child owes him nothing? The courts say otherwise. They make him pay support."],
        ["pine","None of us chose our parents, and none of them chose exactly us. We still owe each other. That's what being a family means."],
        ["destiny","I'll grant that's a stronger reply than I usually get.","…"],
        ["marygrace","Thank you for hearing it. We're praying for you, and for everyone in your chat."],
        ["","The clip of that exchange is shared more than anything else on his channel that week."],
      ] },
    ],
  },
  {
    id: "identity", title: "Made Male and Female", group: "Identity", boss: "pastor", place: "square",
    mystery: "When someone feels they were born in the wrong body, what does the Church teach, and how do you say it with love?",
    scenes: [
      { when: "Before the first battle", place: "square", left: ["schmitz","marygrace"], right: ["pastor"], lines: [
        ["","Crucible. The affirming pastor is back, and he has brought a hard question from his own congregation."],
        ["pastor","A transgender student in my church was told that your Church says she doesn't exist."],
        ["schmitz","She exists, and God loves her. Let's be clear about that before anything else is said."],
        ["marygrace","Then today we listen first. We'll start at the campus panel, where students are telling their stories."],
      ] },
      { when: "After the first battle", place: "square", left: ["zember","marygrace"], right: [], lines: [
        ["","After the campus panel. The question: how does the Church speak to people who feel at war with their bodies?"],
        ["zember","Before anyone could tell me anything true, I needed someone to hear me. Really hear me."],
        ["marygrace","The distress is real. The suffering is real. The first thing the Church owes anyone is compassion, not a lecture."],
      ] },
      { when: "After the second battle", place: "studio", left: ["pine","hicks"], right: [], lines: [
        ["","After the deconstruction podcasters. The team is looking at what the Church actually teaches."],
        ["pine","The Catechism says the soul is the form of the body. Body and soul aren't two things stuck together. They are one person. So the body isn't a costume over the real you. It is you."],
        ["hicks","And the Catechism asks everyone, man and woman, to acknowledge and accept their sexual identity. That's asked of all of us, not of one group."],
        ["pine","Which is why no one is reduced to their struggle. Not them. Not us."],
      ] },
      { when: "After the third battle", place: "studio", left: ["pine","zember"], right: ["+hansen"], lines: [
        ["","After “Love Is Love.” Jacob Hansen, of the Latter-day Saints' chapter, has come to listen."],
        ["hansen","Our Proclamation on the Family says gender is part of who we are, before this life, in it, and after it. On this, we stand near you."],
        ["pine","Near, yes. We'd say it a little differently: the body itself is the gift. But thank you for standing near."],
        ["","The pastor's last conversation is next."],
      ] },
      { when: "The last conversation", place: "square", left: ["schmitz","zember","pine"], right: ["pastor"], lines: [
        ["","The last conversation in the square. The pastor wants to know what the team would say to his student."],
        ["pastor","So what would you say to her? Face to face."],
        ["schmitz","You're not a problem to be solved. You're a daughter of God. Your body is good, your soul is good, and so are you."],
        ["pine","The Church's 2024 declaration Dignitas Infinita asks two things at once: that every person be respected in their full dignity, and that we receive our bodies as a gift rather than try to remake ourselves."],
        ["zember","And I'd tell her I'll walk with her. As long as it takes."],
        ["pastor","I don't agree yet. But I didn't hear any hate. Not one word of it.","…"],
        ["","He asks whether Kim would come and meet the student. She says yes before he has finished asking."],
      ] },
    ],
  },
  {
    id: "scholars", title: "No Miracles Allowed", group: "Skeptical Scholars", boss: "ehrman", place: "library",
    mystery: "Bart Ehrman says a historian can never conclude that a miracle happened. Then how could anyone know that Jesus rose from the dead?",
    scenes: [
      { when: "Before the first battle", place: "library", left: ["akin","heschmeyer"], right: ["ehrman"], lines: [
        ["","Crucible. Bart Ehrman is back, and this time the subject is the Resurrection."],
        ["ehrman","Historians can only say what probably happened. A miracle is, by definition, the least probable thing that could happen. So history can never conclude one."],
        ["akin","Then let's separate two things: the facts, and what best explains them. We'll start with the facts."],
      ] },
      { when: "After the first battle", place: "library", left: ["pitre","akin"], right: [], lines: [
        ["","After Religion 101. The question: can history say anything about the Resurrection?"],
        ["pitre","Here are the facts most scholars grant, believers or not: Jesus died by crucifixion. His followers came to believe they had seen him alive. Paul, a persecutor, and James, a skeptic, changed completely."],
        ["akin","Bart grants the disciples believed they saw him. He's said so in print. So the debate isn't about the facts. It's about the explanation.","idea"],
      ] },
      { when: "After the second battle", place: "library", left: ["pitre","+schmid"], right: [], lines: [
        ["","After the mythicists. Joe Schmid has joined the team to talk about probability."],
        ["schmid","Here's the hinge. A resurrection is wildly improbable if there's no God. It isn't, if there is a God who wanted to vindicate his Son."],
        ["schmid","So you can't read the history without the philosophy. Bart's rule quietly assumes the answer to the bigger question."],
        ["pitre","Good. Then the question underneath is whether God exists, and that's a question history can't settle by itself."],
      ] },
      { when: "After the third battle", place: "library", left: ["akin","schmid"], right: ["+oconnor"], lines: [
        ["","After the game of telephone. Alex O'Connor, of the atheists' chapter, has come to hear the end of it."],
        ["oconnor","I'd say what Bart says. Though I'll grant the disciples believed it. People die for what they believe, after all."],
        ["akin","They died for what they said they had seen. That's harder to explain."],
        ["oconnor","That is a better version of the argument. Annoyingly."],
        ["schmid","He says that to me a lot."],
      ] },
      { when: "The last conversation", place: "library", left: ["pitre","akin","schmitz"], right: ["ehrman"], lines: [
        ["","The last conversation in the library. Bart grants the facts, and still prefers another explanation."],
        ["ehrman","Even granting all of it, I'd sooner believe in some strange set of visions than in a man rising from the dead."],
        ["pitre","That's a philosophical preference, Bart, not a historical result. And that's fine. But let's call it what it is."],
        ["ehrman","Fair. That's a fair distinction.","…"],
        ["schmitz","Then let's keep talking about the bigger question. Any time, Bart. We're praying for you."],
        ["","He leaves with Joe Schmid's number. He says he wants to hear the contingency argument from someone who used to argue against it."],
      ] },
    ],
  },
  {
    id: "reformed", title: "Eat My Flesh", group: "Reformed", boss: "white", place: "library",
    mystery: "When Jesus said “eat my flesh,” did he only mean “believe in me”? And if he did, why did so many disciples walk away?",
    scenes: [
      { when: "Before the first battle", place: "library", left: ["heschmeyer","akin"], right: ["white"], lines: [
        ["","Crucible. James White is back, and this time the subject is John chapter 6."],
        ["white","John 6:35. “He who comes to me shall not hunger, and he who believes in me shall never thirst.” Coming is eating. Believing is drinking. It's a picture of faith."],
        ["heschmeyer","Then let's read the whole chapter, slowly, and see where it goes. We'll start in the seminary library."],
      ] },
      { when: "After the first battle", place: "library", left: ["akin","bertuzzi"], right: [], lines: [
        ["","After the seminary library. The question: is “eat my flesh” only a picture of faith?"],
        ["akin","In verses 54 to 58, John switches verbs. He stops using the ordinary word for eating and uses trōgō: to gnaw, to munch. It gets more physical, not less."],
        ["bertuzzi","And when the crowd takes him literally and objects, he doesn't correct them. He says it again, more strongly.","idea"],
      ] },
      { when: "After the second battle", place: "studio", left: ["muse","+hahn"], right: [], lines: [
        ["","After the Reformed podcasters. Scott Hahn, once a Presbyterian minister, is with the team."],
        ["hahn","Verse 66! “After this many of his disciples drew back and no longer went about with him.” It's the only time people leave Jesus over a teaching, and he lets them go."],
        ["hahn","Then he turns to the Twelve: “Will you also go away?” If it was only a metaphor, why not call them back and explain?"],
        ["muse","That's the question we'll put to James."],
      ] },
      { when: "After the third battle", place: "studio", left: ["muse","heschmeyer"], right: ["+ryan"], lines: [
        ["","After the Upper Room. Ryan, of the evangelicals' chapter, has come by with a question of his own."],
        ["ryan","I always read John 6 as a picture. But I'll admit the part where they walk away bothers me."],
        ["muse","It bothered me too. That's where I started."],
        ["heschmeyer","And the early Church read it our way. Ignatius of Antioch, about the year 107, calls the Eucharist “the flesh of our Savior.” Justin Martyr, around 150: “not as common bread.”"],
        ["","Ryan writes both names down. James White's last conversation is next."],
      ] },
      { when: "The last conversation", place: "library", left: ["heschmeyer","akin","schmitz"], right: ["white"], lines: [
        ["","The last conversation in the library. James White's answer is that the crowd left because they wouldn't believe."],
        ["white","They walked away because they refused to believe. That's the point of the passage: faith."],
        ["akin","Then why didn't Jesus say, “I only meant believe”? He'd said exactly that a few verses before. Instead he let them go."],
        ["white","I'll be taking this apart on the Dividing Line on Tuesday.","…"],
        ["schmitz","We'll be watching. And we'll be praying for you, James."],
        ["","Afterward he and Joe Heschmeyer argue in the parking lot for an hour, and part as friends."],
      ] },
    ],
  },
  {
    id: "nones", title: "Not After What They Did", group: "The Nones", boss: "master", place: "cafe",
    mystery: "How do you speak for a Church whose own members did grave harm, to people who walked away because of it?",
    scenes: [
      { when: "Before the first battle", place: "cafe", left: ["barron","~wetta"], right: ["master"], lines: [
        ["","Crucible. The Master of None is back at the café, and this time he has a reason for not caring."],
        ["master","I don't hate God. I just don't trust the people who talk about him. Not after the abuse reports."],
        ["barron","You have reasons, and some of them are terrible ones, and they are ours. We won't pretend otherwise."],
        ["wetta","Then we start by listening. The group chat is first."],
      ] },
      { when: "After the first battle", place: "cafe", left: ["wetta","fradd"], right: [], lines: [
        ["","After the group chat. The question: what do you say to people who left because of scandal?"],
        ["fradd","Half the people in that chat had a friend who left over it. Not over an argument. Over what was done to children."],
        ["wetta","Then the first word is sorry, and it has to mean something. Nobody hears anything else until they've heard that."],
      ] },
      { when: "After the second battle", place: "cafe", left: ["barron","hicks"], right: [], lines: [
        ["","After Sunday brunch. The team is asking why anyone should stay."],
        ["barron","In 2019 I wrote a Letter to a Suffering Church. Its point: this is not a reason to leave. It's a reason to stay and fight for the Church's holiness."],
        ["hicks","Judas was one of the Twelve. Christ never founded a Church of the sinless. He founded a Church for sinners, and he made it holy in spite of us, not because of us."],
      ] },
      { when: "After the third battle", place: "cafe", left: ["fradd","wetta"], right: ["+ryan"], lines: [
        ["","After being left on read. Ryan, of the evangelicals' chapter, has stopped by the café."],
        ["ryan","My churches have had scandals too. People hardly ever leave Jesus over the Gospel. They leave over us."],
        ["fradd","Then let's be the reason somebody comes back, mate."],
        ["","The Master of None is waiting at the corner table."],
      ] },
      { when: "The last conversation", place: "cafe", left: ["barron","wetta","fradd"], right: ["master"], lines: [
        ["","The last conversation at the café. The Master of None has heard the apology. His question now is why anyone stays."],
        ["master","So why do you stay?"],
        ["barron","For the same reason Peter did. When the crowd walked away, Jesus asked if the Twelve would go too. Peter said, “Lord, to whom shall we go? You have the words of eternal life.”"],
        ["wetta","We don't stay for the sinners. We stay for the One who stays with the sinners. That includes me."],
        ["master","Okay. One Mass. If it's terrible, I'm leaving.","…"],
        ["wetta","Fair. Sit in the back with me. I'll explain the standing up and sitting down."],
        ["","He comes on Sunday. He leaves early. The next week, he stays to the end."],
      ] },
    ],
  },
  {
    id: "finale", title: "One Minute Each", group: "Everyone", boss: "master", place: "studio",
    mystery: "Every opponent comes back with one question, and the team has one minute to answer each. What is the one thing you'd want them to hear?",
    scenes: [
      { when: "Before the first battle", place: "studio", left: ["horn","akin","schmid"], right: ["oconnor","ryan","hansen"], lines: [
        ["","Crucible. The last debate night. Every opponent from the year is here, each with one question, and the team has one minute to answer each."],
        ["horn","One question each. One minute each. No speeches."],
        ["oconnor","Then my question is for Joe, actually. I'm still not over it."],
        ["schmid","Then I'll answer it on stage, Alex. That's where we always did our best work."],
      ] },
      { when: "After the first battle", place: "studio", left: ["schmid","akin"], right: ["oconnor","ryan","hansen"], lines: [
        ["","After the first table. Joe Schmid has given Alex his one-minute answer."],
        ["schmid","I didn't find a knock-down argument, Alex. I found I'd been running from the one I already had."],
        ["oconnor","That is annoyingly honest. I'll be thinking about it on the train.","…"],
        ["ryan","I'd like that verse from John 20 again, by the way. I lost the napkin."],
        ["hansen","And I read your chapter. Isaiah 43. We'll talk."],
      ] },
      { when: "After the second battle", place: "studio", left: ["bertuzzi","marygrace"], right: ["speaker","witch","destiny"], lines: [
        ["","After the second table: the champion of Speakers' Corner, the influencer, and Destiny."],
        ["speaker","I have been reading the Gospel of Mark. The ending troubles me, in a good way."],
        ["witch","I kept the hopes. I'm still figuring out who to give them to.","?"],
        ["destiny","Still not convinced. Good debate, though. Genuinely."],
        ["marygrace","That's three honest answers. We'll take all three."],
      ] },
      { when: "The last conversation", place: "studio", left: ["heschmeyer","schmitz","~wetta"], right: ["white","ehrman","master"], lines: [
        ["","The last table is done: James White, Bart Ehrman, and the Master of None. The studio lights are going down."],
        ["white","For the record, I'll still be taking all of this apart on Tuesday.","…"],
        ["ehrman","And I'm still an agnostic. But I've enjoyed every minute."],
        ["master","I came to Mass, by the way. Twice. I stayed to the end the second time.","!"],
        ["wetta","That's how it starts."],
        ["schmitz","Thank you, every one of you, for taking us seriously. You're welcome at our table any time."],
        ["","“Speaking the truth in love, we are to grow up in every way into him who is the head, into Christ” (Ephesians 4:15). One minute each was never enough. It was only ever the beginning."],
      ] },
    ],
  },
]);
