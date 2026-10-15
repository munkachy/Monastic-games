# Code map

How the game's code is laid out: what each file is for, then an index of every file's sections
and main functions with line numbers. **The index is generated**: after changing code, run
`node tools/codemap.js` to bring it up to date (the text above the index is kept as it is).

## How it fits together

- Plain scripts, no build step. `index.html` loads them in order; they all share one global scope,
  so a top-level name in one file can be used in any file loaded after it (and in any function,
  whenever it runs, once everything has loaded).
- `mode` (core.js) is the screen now showing: an object with `step(dt)`, `draw()`, `key()` and
  sometimes `down/move/up` for touch. The loop in game.js calls them each frame. The screens are
  `Title`, `Novitiate`, `Home`, `Over` (game.js), `Climb` and `ClimbPause` (climb.js), `House`
  (house.js).
- **The climb is seven files** sharing one set of names (`S`, the climb's state; `secs`, the
  mountain's sections; `NOV`, the mountain being climbed, or null on the endless climb; `seed`).
  They load in order: climb-world, climb-run, climb-foes, climb-fight, climb-frame, climb-draw,
  climb. Only `climb.js` ends by making `Climb` (`const Climb = M`); the rest only define things.
  Because they load one after another, code that runs *while loading* (a `const` set from a
  function call) can only use what earlier files define; code inside functions can use anything.
- Run `node tools/lint.js` after changes: it finds names used but defined nowhere, and names
  defined but never used. `node tools/smoke2.js` visits every screen and reports errors;
  `node tools/replay.js URL` plays a fixed run and prints fingerprints of the climb's state, to
  prove a change left play exactly as it was (compare two versions' output).

## The files

| File | What it is |
|---|---|
| audio.js | `Sound`: the synth engine (organ, voices, harpsichord), the mixing desk, and every sound effect (`Sound.fx`). |
| music.js | `SONGS`: the scores, built on the Compline hymn *Christe, qui lux es et dies*. |
| core.js | The canvas and its size, drawing helpers (`text`, `rect`, `button`, `glow`...), maths helpers, the save (`save`, `store`), `Kept` (saving on claude.ai), sound settings, touch and keys passed to `mode`. |
| art.js | Everything drawn in code: the jointed monk (`pose`, `MONK_ANIM`, `drawMonk`), the sins and their demons (`SINS`, `drawDemon`), the flame, the backdrop. Also used by art.html (the pose viewer). |
| shapes.js | `TRACED`: outlines traced from the drawings in art-src/ (worshippers, lay brother and cart, ...). |
| climb-world.js | The climb's constants, the domains, the mountain made by rules (shafts, crossings, Lust's briars, Gluttony's caverns, Avarice's needle's eye, the low ways), his body against the rock, ledges. |
| climb-run.js | Starting and the end, his place on a mountain kept, white-room scenes, the relics' boons, the hook, Avarice's chains, the rope round the rock, the flare. |
| climb-foes.js | The demons and what they throw, the shrines, the blocks and the lay brothers' carts, the great demons, a great demon's dread, the angel. |
| climb-fight.js | The weight of a blow, Avarice's gold, Gluttony's swallow, slime and grease, Wrath's rock that gives way, his blows and the boulders in his hands. |
| climb-frame.js | Each frame: his moves, the physics, the rope, the world going on (`step`). |
| climb-draw.js | Drawing the climb (`draw`) and each domain's look. |
| climb.js | The record for notes to Claude, touch/mouse/keys, the `Climb` object, `ClimbPause`. |
| notes.js | Notes for Claude from the pause screen (on claude.ai only); the version number. |
| room.js | The white room: describe a scene, Claude builds it (claude.ai only). |
| psalm.js | Psalm 118 (Douay-Rheims), all 176 verses. |
| verses.js | The verses on the rock: the default ones, or the player's own translation. |
| lib/planck.min.js | The planck.js physics library (the monastery's stones). |
| house.js | `House`: the monastery at the foot of the mountains (building with the stones brought down). |
| game.js | `Game` (starting each kind of play), the title, the seven mountains' menu, the end screen, the frame loop. |

Pages besides the game: `art.html` (the pose viewer), `design.html` (design notes). `tools/` has
the build and test scripts (see tools/README.md).

<!-- index: made by tools/codemap.js -->

### audio.js (1341 lines)

- (top): A 17, mtof 18, dv 19
- **The desk** (24): softClip 25, impulse 30, watch 63, build 81, pump 162
- **Building blocks** (168): osc 172, gainAt 173, noise 174, filt 175, route 178, env 190, STOPS 197, wave 208
- **The instruments** (217): I 218, PARTIALS 346, VOWELS 360
- **The conductor** (434): M 442, barLen 443, tick 459, schedule 469
- **The muffle, and the flare** (503): FL 506, openTo 508, setFilter 511, flareStart 531, flareEnd 536, held 546, heart 562
- **The wind** (571)
- **The sounds of the fight: short, restrained, made for a phone's small speaker** (597): fx 600, T0 601, ok 602, rnd 603, tone 605, hiss 618, breath 628, pebbles 635, crackle 639, SINV 740, sinv 749, cry 751, MARKS 916, LOUD 1320

### music.js (177 lines)

- (top): S 40, on 41, HYMN 44, DIA 52, pitch 53, CH 65, HARM 76, lower 79, FIG 82, OST 84
- **The fight: "Christe, qui lux es"** (86)
- **The title: the hymn alone** (154)

### core.js (325 lines)

- **The screen** (7)
- **Little helpers** (35)
- **The palette** (68)
- **Type** (79)
- **Light** (121)
- **Buttons** (164)
- **What is kept, kept twice** (187): K 193, T 195, push 196, pull 201
- **The save** (223)
- **Input** (237)

### art.js (1065 lines)

- **The figures** (8): POSE0 17, pose 18, blendPose 20, EASE 24, keyPose 25, loop 31, solve 40, figToWorld 57, reach 63
- **Flat shapes** (70): P2 73, PA 74, addPts 75, seg 83, gem 88, HL 90, HLs 91, clothWind 94
- **The monk** (102): MONK_BODY 107, torchTip 110, sleeve 113, footShape 125, monkGeo 131, drawMonk 175, monkJoint 215
- **The monk's moves** (220): STAND_O 222, S_ 223, WALK_H 236, RUN_H 237, climbRootUp 241, climbRootDown 248, gripEdge 255, groundRoll 261, MONK_ANIM 268, MONK_HIT 412, MONK_CYCLIC 413, monkClimb 420
- **The torch flame** (438): FLAME_LAYERS 442, drawFlame 443, drawEmber 461
- **The seven sins** (469): SIN_ORDER 472, SINS 473, DEMON_SIZE 486, DEMON_BODY 487, DP 499, dp 500, dl 501, claws 503, ribbon 512, spike 522, prideWing 525, paintPride 539, paintAvarice 567, paintLust 594, paintEnvy 617, paintGluttony 637, paintWrath 670, paintSloth 695, DEMON_PAINT 714, fillDemon 718, demonFlash 732, brokenCracks 734, drawDemon 745, EYES 767, demonEyes 768, demonJoint 785
- **The demons' moves** (792): DS 795, DD 804, GAIT_H 805, WING_A 806, gait 807, DSTRIKE 813, DEMON_ANIM 822, DEMON_HIT 895, DEMON_CYCLIC 896
- **Things lying about, and thrown** (898): OBJECTS 899, OBJ_PAINT 900, drawObject 936, drawShard 945
- **The backdrop** (958): BACK_LAYERS 964, BACK 971, buildBackdrop 972, drawBackdrop 1026, paintBackdrop 1044

### shapes.js (43 lines)

- (top): TRACED 5

### climb-world.js (638 lines)

- (top): CLIMB_VERSES 8, blowCost 45, hangReach 51
- **The domains** (61): DOMAINS 67, BUILT 68, WIDE 70, SLOPE 73, MINE 77, summitAbove 85, summitK 86, domIdx 87, domOf 88, isGate 89, demonsFor 91
- **The mountain, made by rules** (93): secs 104, ensureSecs 105, sectionAt 132, shaftRow 141, edges 157, island 166, trav 186, travSolid 228
- **Lust's briars** (239): slope 246, slopeSolid 274, thornAt 284
- **Gluttony's caverns** (290): cave 303
- **Avarice's needle's eye** (367): eyeOf 371, eyeShut 380, almsOf 382, solid 390, solidAt 406, summitG 412, summitInfo 413, summitSolid 418, summitSec 428
- **The low ways** (429): crawlOf 435, NO_RELICS 458, relicsOf 459, wallAt 461, wallPos 469
- **The monk's body against the rock** (475): bodyH 477, boxHit 478, moveX 484, moveY 492, freeSpot 500, near 509, wallBeside 517, faceLine 524, plant 535, unclip 541, grip 545, middle 546
- **Ledges: stepping up, climbing up** (548): ledge 551, lipInReach 565, openBelow 574, ledgeAround 583, startAct 601, actRoot 608, actPoseU 626, stepAct 627

### climb-run.js (648 lines)

- **Starting, and the end** (6): start 8, metres 44, sectionsIn 46, lampsOf 51, lightOut 52, bankFreed 61, finish 65
- **His place on a mountain, kept** (73): keptAll 82, forget 83, keepPlace 85, keepHere 105, restore 107, settle 135
- **A scene from the white room** (144): SCENE_PLACE 148, scene 149
- **The relics' boons** (212): BOONS 220, BOON_ORDER 226, boonOf 227, boonOn 228, showBoon 229, stepBoonShow 234, grantBoon 238, stepBoon 246, vadeRetro 269, vadeGreat 287, drawToken 296, drawMonkFront 324, drawBoonShow 350, boonGlows 367
- **The hook** (375): rayRock 377, nearLine 383
- **Avarice's chains** (390): chainsNear 393, chainTip 398, onSeg 399, chainHit 402, swingChains 414, throwHook 425, flyShot 440, flipDur 474, dropRope 475, sideOf 498, tapSide 502, swapHook 503, nextHook 508, hookAngle 519, action 530, hangRope 545
- **The rope round the rock** (565): bendsOf 570, pivotOf 571, freeOf 572, setFixed 573, sweepCorner 576, wrapRope 598
- **The flare** (616): startFlare 617, endFlare 623, puff 627, blink 634

### climb-foes.js (1148 lines)

- **The demons, and what they throw** (5): DEM 13, boxAt 15, moveBox 21, dFree 27, los 33, dMid 34, alive 35, panX 36, gain 37, setSt 38, spawnDemon 39, spotsFor 48, placeFor 89, placeRocks 118
- **The shrines** (133): placeShrine 142
- **The blocks** (166): SHAPES 183, newBlock 186, makeBlock 190, reveal 195, tie 204, takeUp 211, throwBlock 220, loosen 229, carryOff 237, shrineFor 243, dropBlock 250, seekBlock 256, floatTo 271, alight 291, floatDemon 292, rebuild 308, raiseIdol 314, yank 328, stepYank 333, brotherOf 346, binSlot 355, deliver 358, stepBlocks 366, stepLoose 387, stepTied 413, flail 459, drawBlock 476, GLOWS 488, drawBlocks 489, drawTied 510, drawHeld 521, drawYank 530, drawBrother 537, rimNow 564, blockGlows 573
- **The great demons** (588): GREAT 600, GREAT_V 601, planGreat 605, placeGreat 620, placeSummit 631, bigAt 641, stepGreat 642, updGreat 646, greatReach 701, latch 729, holdHim 742, punchOut 749, spitOut 755, strikeGreat 769, breakGreat 788, hurl 805, freedSay 814
- **A great demon's dread** (815): DREAD_T 823
- **The angel** (824): ANG 829, startAngel 830, stepAngel 839, angelAt 849, drawBeam 853, drawAngel 861, drawAngelOver 886, finishWon 897, hauntWait 908, canDread 909, onView 911, greatSays 915, startDread 918, stepDread 923, burstSpot 933, burstAfter 948, drawDread 956, MAW_STONE 982, MAW_FLESH 983, MAW_EYES 984, MAW_CRACKS 985, mawParts 986, greatT 1067, laughK 1074, headTilt 1075, latchFrame 1080, paintMaw 1081, drawGreat 1096, drawLatch 1114, greatGlows 1121

### climb-fight.js (1056 lines)

- **The weight of a blow** (5): impact 9, impactAt 12, hitIdol 20, scatter 41, updIdol 48, populate 70, hurtDemon 79, castOut 103, flyDemon 111, updDemon 137, wander 157, stepWrath 164
- **Avarice's gold** (178): heavy 184, blowTo 186, comboOn 197, comboHit 198, CROWNED 214, wouldCrown 215, crownFX 216, drawCrown 221, breakCombo 228, drawCombo 230, throwCoins 246, coinSticks 254, giveAlms 260, stepAvarice 270, snatchLight 305, stepLust 319, ribbonHand 343, castRibbon 344, holdRibbon 355, pullOf 366, throwThorn 374, briars 382, briarHit 392, mouth 397, stepGluttony 403, inhale 443
- **Gluttony's swallow** (458): swallowLegs 465, stepLegs 477, offHim 486, freeLegs 491, kickLegs 499, GS_AT 506, drawLegsSac 507, eat 524, lob 534, lobFat 544, throwFire 552, thornStuck 559, sendAt 566, rockAt 574, burst 580, splat 585
- **Slime, grease, and rock that lies askew** (590): grease 595, slabAt 603, slickAt 610, tiltDy 616, slickWall 621, tryCatch 626, kickBack 636, strikeMonk 646, strikeDemon 663, updThing 677
- **The rock that gives way (Wrath's)** (742): crumblerAt 747, cellsOf 754, weigh 755, strikeRock 756, crack 757, stepCrumbling 772, hitMonk 780, demonAt 792, thingAt 793
- **His blows, and the boulders in his hands** (795): inLight 802, reachable 803, jumpTo 804, startMove 811, strikeSpot 822, attack 830, heave 838, catchThing 845, throwHeld 855, besides 864, closeBy 866, swingBlock 868, bash 874, release 880, ATK_ANIM 889, stepAtk 890, gesture 951, stroke 971, blessDemon 986, ward 1002, spendWard 1019, wardFade 1023, stomp 1027, swingKick 1045

### climb-frame.js (405 lines)

- **Each frame** (4): pads 6, lowWay 19, startCrawl 20, upFromCrawl 26, hangAt 27, physics 33, unlose 231, step 239

### climb-draw.js (1229 lines)

- **Drawing** (4): lightR 5, visPoly 17, drawSky 41, darkness 64, slab 88, rockPath 98, drawTablet 183, torchBack 202, wallWalk 203, wallClimb 211, crawlPose 219, monkPose 223, demonPose 274, lightCross 305, drawSign 313, drawBoulder 343, drawRope 344, drawHook 350, draw 359
- **The domains, drawn** (367): rgb 370, rgbs 371, tintStep 372, put 380, drawGlutton 382, shadeGlut 395, eyeGlut 406, GLUT_EYE 411, glutEye 412, addShape 423, addPoly 426, addOval 427, WORSHIP_ART 429, BEL 434, idolPath 444, drawShrine 481, drawWorshipper 507, drawShardOf 525, carved 532, drawGate 533, briarStrip 585, drawBriars 598, drawChain 622, drawCoin 633, drawAlms 641, drawThorn 651, drawRibbon 657, drawLamp 667, drawRelic 681, crackLines 691, drawFat 709, sheen 720, drawPrints 740, drawSlime 750, drawFire 768, drawWorld 774, lostMarker 1098, dpad 1116, dpadDir 1117, actBtn 1122, flareBtn 1123, climbWay 1126, sideArrow 1127, hud 1133

### climb.js (235 lines)

- **The record, for notes to Claude** (28): ev 35, r2 36, doing 37, snapNow 40, record 48, grabScreen 55
- **Touch, mouse and keys** (58): goOn 60, inDpad 61, pid 62, M 63, ClimbPause 196

### notes.js (106 lines)

- (top): N 10, build 20, close 69, send 72

### room.js (209 lines)

- (top): R 9
- **What Claude is told: the game as it is, and the shape of the answer** (15): prompt 34, MOUNTAINS 43, num 44, clean 45
- **Asking** (63): ask 64, enter 89, Fade 95
- **The room, drawn** (102): back 137
- **The box to write in, beside him** (139): panelW 142, build 143, say 191, setBusy 196, hide 197

### psalm.js (184 lines)

- (top): PS118 6

### verses.js (238 lines)

- (top): STANZAS 12, which 20, V 21
- **The whole psalm, and what of it has been read** (27): split 41, keep 137
- **The box for it, over the pause screen** (158): build 160, take 226, show 232, close 234

### house.js (1132 lines)

- (top): SHAPES 22, SITES 25, H_ 32
- **What is kept** (34): data 35, siteData 48, takeBanked 50
- **The stones, as bodies** (55): P 56, makeWorld 57, addStone 63, squares 70, siteOf 71, load 73, keep 78
- **Laying a stone** (87): nearSite 88, holdSquares 90, sqHit 92, floorAt 101, blocked 102, landing 109, hangY 117, lay 122, takeUp 128, moveTo 135, nudge 144, turn 145, place 152, putBack 160, inSquare 164, stoneAt 165, lift 166, loosen 175, recheck 180
- **Each step** (192): step 193
- **The people** (247): folkData 256, takePilgrims 258, postOf 268, makeFolk 275, loadFolk 283, receive 284, setOut 291, stepFolk 296, drawPerson 355, drawCampAndShed 381, folkSigns 400
- **Days and nights** (421): hasStones 432, wallMax 434, isNight 435, awake 436, stepClock 437, startNight 441, dawn 457, targetOf 469, preyOf 475, stepRaid 480, struck 560, blow 577, strike 607, drawRaid 614
- **Drawn** (630): stoneFill 631, drawSquares 632, drawStone 640, outline 641, drawCracks 647, drawBuilt 656, draw 674
- **Inside** (789): goIn 790, goOut 791, HOURS 797, hourOf 803, hasVerses 804, shelves 805, drawRoom 814, drawSpine 823, drawBook 837
- **The choir** (870): freed 876, GLORIA 877, VOW 878, sylls 880, tone 889, hourVerses 908, sing 917, chorister 932, stallSeats 945, drawChoir 954, INSIDE 1021
- **Hands on it** (1078): down 1079, move 1089, up 1095, key 1096, leave 1115, open 1117, M 1129

### game.js (265 lines)

- (top): Game 6, vignetteMonk 32
- **The title** (42): Title 43
- **The seven mountains: one domain to a mountain** (81): NOV_SUB 85, novSettings 91, Novitiate 96
- **Home: carried there from a summit won** (136): Home 140
- **The end: the light goes out** (202): Over 203
- **The loop** (235): onResize 236, frame 240

<!-- end of index -->
