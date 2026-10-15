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
| brothers.js | The brothers as lives: their names, the necrology (`brotherFell`), and the game over (`gameOver`), which resets everything but the necrology. |
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

### climb-run.js (783 lines)

- **Starting, and the end** (6): start 8, metres 45, sectionsIn 47, lampsOf 52, lightOut 55, drained 62, die 65, heal 73, bankFreed 81, finish 86
- **His place on a mountain, kept** (99): keptAll 108, forget 109, keepPlace 111, keepHere 131, restore 133, settle 161
- **A scene from the white room** (173): SCENE_PLACE 177, scene 178
- **The relics' boons** (241): BOONS 249, BOON_ORDER 255, boonOf 256, boonOn 257, showBoon 258, stepBoonShow 263, boonShare 269, grantBoon 273, stepBoon 282, vadeRetro 305, vadeGreat 323, drawToken 332, drawMonkFront 360, drawBoonShow 386, boonGlows 403
- **The hook** (411): rayRock 413, nearLine 419
- **Avarice's chains** (426): chainsNear 429, chainTip 434, onSeg 435, chainHit 438, swingChains 450, throwHook 461, flyShot 476, flipDur 510, dropRope 511, sideOf 534, tapSide 538, swapHook 539, nextHook 544, hookAngle 555
- **The herbs, and the soups** (566): HERBS 573, SOUPS 575, soupOn 583, pairKey 584, recipes 586, placeHerbs 595, stepHerbs 606, canMix 617, openPouch 618, pickHerb 619, stepMix 626, drink 635
- **The tips** (643): tipsOn 647, tipSeen 648, tip 649, tipGone 654, lessonDone 662, setTips 663, action 664, hangRope 680
- **The rope round the rock** (700): bendsOf 705, pivotOf 706, freeOf 707, setFixed 708, sweepCorner 711, wrapRope 733
- **The flare** (751): startFlare 752, endFlare 758, puff 762, blink 769

### climb-foes.js (1194 lines)

- **The demons, and what they throw** (5): DEM 13, boxAt 15, moveBox 21, dFree 27, los 33, dMid 34, alive 35, panX 36, gain 37, setSt 38, spawnDemon 39, spotsFor 48, placeFor 89, placeRocks 119
- **The shrines** (134): placeShrine 143
- **The blocks** (167): SHAPES 184, newBlock 187, makeBlock 191, reveal 196, tie 205, takeUp 213, throwBlock 222, loosen 231, carryOff 239, shrineFor 245, dropBlock 252, seekBlock 258, floatTo 273, alight 293, floatDemon 294, rebuild 310, raiseIdol 316, yank 330, stepYank 335, brotherOf 348, binSlot 357, deliver 360, cartAt 369, unbin 376, stepBlocks 385, stepLoose 407, stepTied 433, flail 479, drawBlock 496, GLOWS 508, drawBlocks 509, drawTied 530, drawHeld 541, drawYank 550, drawBrother 557, rimNow 584, blockGlows 593
- **The great demons** (608): GREAT 620, GREAT_V 621, planGreat 625, placeGreat 642, placeSummit 653, bigAt 663, stepGreat 664, updGreat 668, greatReach 724, latch 753, holdHim 766, punchOut 773, spitOut 779, strikeGreat 793, greatThrows 820, breakGreat 832, hurl 849, freedSay 858
- **A great demon's dread** (859): DREAD_T 867
- **The angel** (868): ANG 873, startAngel 874, stepAngel 883, angelAt 893, drawBeam 897, drawAngel 905, drawAngelOver 930, finishWon 941, hauntWait 953, canDread 954, onView 956, greatSays 960, startDread 963, stepDread 968, burstSpot 979, burstAfter 994, drawDread 1002, MAW_STONE 1028, MAW_FLESH 1029, MAW_EYES 1030, MAW_CRACKS 1031, mawParts 1032, greatT 1113, laughK 1120, headTilt 1121, latchFrame 1126, paintMaw 1127, drawGreat 1142, drawLatch 1160, greatGlows 1167

### climb-fight.js (1061 lines)

- **The weight of a blow** (5): impact 9, impactAt 12, hitIdol 20, scatter 41, updIdol 48, populate 70, hurtDemon 79, castOut 103, flyDemon 111, updDemon 137, wander 157, stepWrath 164
- **Avarice's gold** (178): heavy 184, blowTo 186, comboOn 197, comboHit 198, CROWNED 214, wouldCrown 215, crownFX 216, drawCrown 221, breakCombo 228, drawCombo 230, throwCoins 246, coinSticks 254, giveAlms 260, stepAvarice 270, snatchLight 305, stepLust 319, ribbonHand 343, castRibbon 344, holdRibbon 355, pullOf 366, throwThorn 374, briars 382, briarHit 392, mouth 397, stepGluttony 403, inhale 443
- **Gluttony's swallow** (458): swallowLegs 465, stepLegs 477, offHim 486, freeLegs 491, kickLegs 499, GS_AT 506, drawLegsSac 507, eat 524, lob 534, lobFat 544, throwFire 552, thornStuck 559, sendAt 566, rockAt 574, burst 580, splat 585
- **Slime, grease, and rock that lies askew** (590): grease 595, slabAt 603, slickAt 610, tiltDy 616, slickWall 621, tryCatch 626, kickBack 636, strikeMonk 646, strikeDemon 663, updThing 677
- **The rock that gives way (Wrath's)** (742): crumblerAt 747, cellsOf 754, weigh 755, strikeRock 756, crack 757, stepCrumbling 772, hitMonk 780, demonAt 797, thingAt 798
- **His blows, and the boulders in his hands** (800): inLight 807, reachable 808, jumpTo 809, startMove 816, strikeSpot 827, attack 835, heave 843, catchThing 850, throwHeld 860, besides 869, closeBy 871, swingBlock 873, bash 879, release 885, ATK_ANIM 894, stepAtk 895, gesture 956, stroke 976, blessDemon 991, ward 1007, spendWard 1024, wardFade 1028, stomp 1032, swingKick 1050

### climb-frame.js (418 lines)

- **Each frame** (4): pads 6, lowWay 19, startCrawl 20, upFromCrawl 26, hangAt 27, physics 33, unlose 235, step 243

### climb-draw.js (1301 lines)

- **Drawing** (4): lightR 5, visPoly 19, drawSky 43, darkness 66, slab 90, rockPath 100, drawTablet 185, torchBack 210, wallWalk 211, wallClimb 219, crawlPose 227, monkPose 231, demonPose 282, lightCross 313, drawSign 321, drawBoulder 351, drawRope 352, drawHook 358, goOnLine 368, drawHerb 372, pouchBtn 385, drawSoups 386, drawHeart 421, draw 425
- **The domains, drawn** (433): rgb 436, rgbs 437, tintStep 438, put 446, drawGlutton 448, shadeGlut 461, eyeGlut 472, GLUT_EYE 477, glutEye 478, addShape 489, addPoly 492, addOval 493, WORSHIP_ART 495, BEL 500, idolPath 510, drawShrine 547, drawWorshipper 573, drawShardOf 591, carved 598, drawGate 599, briarStrip 651, drawBriars 664, drawChain 688, drawCoin 699, drawAlms 707, drawThorn 717, drawRibbon 723, drawLamp 733, drawRelic 747, crackLines 757, drawFat 775, sheen 786, drawPrints 806, drawSlime 816, drawFire 834, drawWorld 840, lostMarker 1166, dpad 1184, dpadDir 1185, actBtn 1190, flareBtn 1191, climbWay 1194, sideArrow 1195, hud 1201

### climb.js (251 lines)

- **The record, for notes to Claude** (28): ev 35, r2 36, doing 37, snapNow 40, record 48, grabScreen 55
- **Touch, mouse and keys** (58): goOn 60, inDpad 61, pid 62, M 63, ClimbPause 211

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

### house.js (901 lines)

- (top): SHAPES 18, SITES 21, placed 28, H_ 30
- **What is kept** (32): data 33, siteData 55, takeBanked 57
- **The stones, as bodies** (62): P 63, makeWorld 64, addStone 70, squares 77, siteOf 78, load 80, keep 86
- **Laying a stone** (95): nearSite 96, holdSquares 98, sqHit 100, floorAt 109, blocked 110, landing 117, hangY 125, lay 130, takeUp 136, moveTo 143, nudge 152, turn 153, place 160, otherStone 170, putBack 180, inSquare 184, stoneAt 185, lift 186, loosen 195, recheck 200
- **Each step** (212): step 213
- **The people** (264): folkData 270, takePilgrims 272, makeFolk 279, loadFolk 285, receive 287, stepFolk 293, drawPerson 308, drawCamp 329, folkSigns 338
- **Days and nights** (350): stepClock 354, nightK 360
- **Drawn** (362): stoneFill 363, drawSquares 364, drawStone 372, outline 373, drawBuilt 378, draw 389
- **Inside** (507): goIn 508, goOut 509, HOURS 515, hourOf 521, hasVerses 522, shelves 523, drawRoom 532, drawSpine 541, drawBook 555
- **The choir** (588): freed 594, GLORIA 595, VOW 596, sylls 598, tone 607, hourVerses 626, sing 635, chorister 650, stallSeats 663, drawChoir 672, INSIDE 739
- **Choosing where to build** (798): span 803, fits 804, emptyAt 811, openMenu 812, setPlace 818, unplace 823, drawMenu 824, drawNecrology 836
- **Hands on it** (845): down 846, move 858, up 865, key 866, leave 885, open 887, M 898

### brothers.js (63 lines)

- (top): NAMES 9, brotherData 19, newName 38, gameNo 43, climberName 44, brotherFell 47, gameOver 57

### game.js (263 lines)

- (top): Game 6, vignetteMonk 32
- **The title** (42): Title 43
- **The seven mountains: one domain to a mountain** (81): NOV_SUB 85, novSettings 91, Novitiate 96
- **Home: carried there from a summit won** (136): Home 140
- **The end: the light goes out** (202): Over 203
- **The loop** (233): onResize 234, frame 238

<!-- end of index -->
