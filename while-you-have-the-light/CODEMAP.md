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

### core.js (324 lines)

- **The screen** (7)
- **Little helpers** (35)
- **The palette** (67)
- **Type** (78)
- **Light** (120)
- **Buttons** (163)
- **What is kept, kept twice** (186): K 192, T 194, push 195, pull 200
- **The save** (222)
- **Input** (236)

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

### climb-run.js (672 lines)

- **Starting, and the end** (6): start 8, metres 45, sectionsIn 47, lampsOf 52, lightOut 53, bankFreed 60, finish 64
- **His place on a mountain, kept** (72): keptAll 81, forget 82, keepPlace 84, keepHere 104, restore 106, settle 134
- **A scene from the white room** (146): SCENE_PLACE 150, scene 151
- **The relics' boons** (214): BOONS 222, BOON_ORDER 228, boonOf 229, boonOn 230, showBoon 231, stepBoonShow 236, grantBoon 240, stepBoon 248, vadeRetro 271, vadeGreat 289, drawToken 298, drawMonkFront 326, drawBoonShow 352, boonGlows 369
- **The hook** (377): rayRock 379, nearLine 385
- **Avarice's chains** (392): chainsNear 395, chainTip 400, onSeg 401, chainHit 404, swingChains 416, throwHook 427, flyShot 442, flipDur 476, dropRope 477, sideOf 500, tapSide 504, swapHook 505, nextHook 510, hookAngle 521
- **The tips** (532): tipsOn 536, tipSeen 537, tip 538, tipGone 543, lessonDone 551, setTips 552, action 553, hangRope 569
- **The rope round the rock** (589): bendsOf 594, pivotOf 595, freeOf 596, setFixed 597, sweepCorner 600, wrapRope 622
- **The flare** (640): startFlare 641, endFlare 647, puff 651, blink 658

### climb-foes.js (1190 lines)

- **The demons, and what they throw** (5): DEM 13, boxAt 15, moveBox 21, dFree 27, los 33, dMid 34, alive 35, panX 36, gain 37, setSt 38, spawnDemon 39, spotsFor 48, placeFor 89, placeRocks 118
- **The shrines** (133): placeShrine 142
- **The blocks** (166): SHAPES 183, newBlock 186, makeBlock 190, reveal 195, tie 204, takeUp 212, throwBlock 221, loosen 230, carryOff 238, shrineFor 244, dropBlock 251, seekBlock 257, floatTo 272, alight 292, floatDemon 293, rebuild 309, raiseIdol 315, yank 329, stepYank 334, brotherOf 347, binSlot 356, deliver 359, cartAt 368, unbin 375, stepBlocks 384, stepLoose 406, stepTied 432, flail 478, drawBlock 495, GLOWS 507, drawBlocks 508, drawTied 529, drawHeld 540, drawYank 549, drawBrother 556, rimNow 583, blockGlows 592
- **The great demons** (607): GREAT 619, GREAT_V 620, planGreat 624, placeGreat 641, placeSummit 652, bigAt 662, stepGreat 663, updGreat 667, greatReach 723, latch 751, holdHim 764, punchOut 771, spitOut 777, strikeGreat 791, greatThrows 818, breakGreat 829, hurl 846, freedSay 855
- **A great demon's dread** (856): DREAD_T 864
- **The angel** (865): ANG 870, startAngel 871, stepAngel 880, angelAt 890, drawBeam 894, drawAngel 902, drawAngelOver 927, finishWon 938, hauntWait 949, canDread 950, onView 952, greatSays 956, startDread 959, stepDread 964, burstSpot 975, burstAfter 990, drawDread 998, MAW_STONE 1024, MAW_FLESH 1025, MAW_EYES 1026, MAW_CRACKS 1027, mawParts 1028, greatT 1109, laughK 1116, headTilt 1117, latchFrame 1122, paintMaw 1123, drawGreat 1138, drawLatch 1156, greatGlows 1163

### climb-fight.js (1056 lines)

- **The weight of a blow** (5): impact 9, impactAt 12, hitIdol 20, scatter 41, updIdol 48, populate 70, hurtDemon 79, castOut 103, flyDemon 111, updDemon 137, wander 157, stepWrath 164
- **Avarice's gold** (178): heavy 184, blowTo 186, comboOn 197, comboHit 198, CROWNED 214, wouldCrown 215, crownFX 216, drawCrown 221, breakCombo 228, drawCombo 230, throwCoins 246, coinSticks 254, giveAlms 260, stepAvarice 270, snatchLight 305, stepLust 319, ribbonHand 343, castRibbon 344, holdRibbon 355, pullOf 366, throwThorn 374, briars 382, briarHit 392, mouth 397, stepGluttony 403, inhale 443
- **Gluttony's swallow** (458): swallowLegs 465, stepLegs 477, offHim 486, freeLegs 491, kickLegs 499, GS_AT 506, drawLegsSac 507, eat 524, lob 534, lobFat 544, throwFire 552, thornStuck 559, sendAt 566, rockAt 574, burst 580, splat 585
- **Slime, grease, and rock that lies askew** (590): grease 595, slabAt 603, slickAt 610, tiltDy 616, slickWall 621, tryCatch 626, kickBack 636, strikeMonk 646, strikeDemon 663, updThing 677
- **The rock that gives way (Wrath's)** (742): crumblerAt 747, cellsOf 754, weigh 755, strikeRock 756, crack 757, stepCrumbling 772, hitMonk 780, demonAt 792, thingAt 793
- **His blows, and the boulders in his hands** (795): inLight 802, reachable 803, jumpTo 804, startMove 811, strikeSpot 822, attack 830, heave 838, catchThing 845, throwHeld 855, besides 864, closeBy 866, swingBlock 868, bash 874, release 880, ATK_ANIM 889, stepAtk 890, gesture 951, stroke 971, blessDemon 986, ward 1002, spendWard 1019, wardFade 1023, stomp 1027, swingKick 1045

### climb-frame.js (411 lines)

- **Each frame** (4): pads 6, lowWay 19, startCrawl 20, upFromCrawl 26, hangAt 27, physics 33, unlose 231, step 239

### climb-draw.js (1233 lines)

- **Drawing** (4): lightR 5, visPoly 17, drawSky 41, darkness 64, slab 88, rockPath 98, drawTablet 183, torchBack 202, wallWalk 203, wallClimb 211, crawlPose 219, monkPose 223, demonPose 274, lightCross 305, drawSign 313, drawBoulder 343, drawRope 344, drawHook 350, goOnLine 360, draw 361
- **The domains, drawn** (369): rgb 372, rgbs 373, tintStep 374, put 382, drawGlutton 384, shadeGlut 397, eyeGlut 408, GLUT_EYE 413, glutEye 414, addShape 425, addPoly 428, addOval 429, WORSHIP_ART 431, BEL 436, idolPath 446, drawShrine 483, drawWorshipper 509, drawShardOf 527, carved 534, drawGate 535, briarStrip 587, drawBriars 600, drawChain 624, drawCoin 635, drawAlms 643, drawThorn 653, drawRibbon 659, drawLamp 669, drawRelic 683, crackLines 693, drawFat 711, sheen 722, drawPrints 742, drawSlime 752, drawFire 770, drawWorld 776, lostMarker 1100, dpad 1118, dpadDir 1119, actBtn 1124, flareBtn 1125, climbWay 1128, sideArrow 1129, hud 1135

### climb.js (239 lines)

- **The record, for notes to Claude** (28): ev 35, r2 36, doing 37, snapNow 40, record 48, grabScreen 55
- **Touch, mouse and keys** (58): goOn 60, inDpad 61, pid 62, M 63, ClimbPause 199

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

### house.js (821 lines)

- (top): SHAPES 18, SITES 21, H_ 26
- **What is kept** (28): data 29, siteData 51, takeBanked 53
- **The stones, as bodies** (58): P 59, makeWorld 60, addStone 66, squares 73, siteOf 74, load 76, keep 81
- **Laying a stone** (90): nearSite 91, holdSquares 93, sqHit 95, floorAt 104, blocked 105, landing 112, hangY 120, lay 125, takeUp 131, moveTo 138, nudge 147, turn 148, place 155, putBack 163, inSquare 167, stoneAt 168, lift 169, loosen 178, recheck 183
- **Each step** (195): step 196
- **The people** (246): folkData 252, takePilgrims 254, makeFolk 262, loadFolk 268, receive 269, stepFolk 276, drawPerson 291, drawCamp 312, folkSigns 321
- **Days and nights** (333): stepClock 337, nightK 343
- **Drawn** (345): stoneFill 346, drawSquares 347, drawStone 355, outline 356, drawBuilt 361, draw 372
- **Inside** (481): goIn 482, goOut 483, HOURS 489, hourOf 495, hasVerses 496, shelves 497, drawRoom 506, drawSpine 515, drawBook 529
- **The choir** (562): freed 568, GLORIA 569, VOW 570, sylls 572, tone 581, hourVerses 600, sing 609, chorister 624, stallSeats 637, drawChoir 646, INSIDE 713
- **Hands on it** (770): down 771, move 780, up 786, key 787, leave 805, open 807, M 818

### game.js (261 lines)

- (top): Game 6, vignetteMonk 32
- **The title** (42): Title 43
- **The seven mountains: one domain to a mountain** (81): NOV_SUB 85, novSettings 91, Novitiate 96
- **Home: carried there from a summit won** (136): Home 140
- **The end: the light goes out** (202): Over 203
- **The loop** (231): onResize 232, frame 236

<!-- end of index -->
