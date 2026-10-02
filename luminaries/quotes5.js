"use strict";
// From St. John of Ávila to St. John Henry Newman: the Stanbrook Benedictines' John of Ávila
// (1904), Bellarmine's Art of Dying Well (1847), an old Introduction to the Devout Life, Grimm's
// Alphonsus (1887) and the Visits (1870), Newman's own words, and Latin newly translated for
// Luminaries from Canisius's Summa doctrinae christianae (1823) and Lawrence's Mariale.
Object.assign(QUOTES, {
  avila: [
    ["Lord, what am I to Thee, that Thou shouldst bid me love Thee?", ""],
    ["Oh, blessed mayst Thou be, Who being what Thou art, hast yet set Thy heart upon such a creature as me!", ""],
    ["Who can help being inflamed by love on thinking that he is about to receive the Infinite Goodness within his bosom?", ""],
    ["Retire into the secresy of your own heart, and open it to receive what is wont to come from so powerful a Light.", ""],
    ["What a joy for the soul to conceive the purpose of giving an alms to the poor or of performing some other good works, and to give it birth by practising it.", ""],
    ["It seemed to me that I could help you better by interceding on your behalf with the God of all consolation, than by anything I could say.", ""],
  ].map(([t]) => ({ t, s: "Letters, tr. the Benedictines of Stanbrook" })),
  canisius: [
    ["Who is to be called a Christian? The one who, begun in the sacrament of Baptism, professes the saving teaching of Jesus Christ, true God and man, in His Church.", "I"],
    ["Christian teaching turns upon two things: wisdom and justice.", "Index"],
    ["I send you a catechism, or, as I preferred to call it, a summary of Christian doctrine: a work for children, as some may think, but one to exercise grown men too.", "Preface"],
    ["Great indeed is faith, which can be enough to move mountains.", "III"],
    ["Hope is a kind of helmet and anchor of salvation.", "III"],
    ["But greatest is charity, the prince of all the virtues, which knows no measure and no end, and does not desert the dying, being stronger than death itself.", "III"],
    ["Good works are of three kinds: fasting, prayer, and almsgiving.", "Index"],
  ].map(([t, s]) => ({ t, s: "Summary of Christian Doctrine" + (s ? " " + s : "") + ", tr. for Luminaries" })),
  lawrence: [
    ["Christ is full of grace as the sun; Mary is full as the moon is, from the sun; the saints are full as the stars.", ""],
    ["Because Eve believed the devil, the world was lost; because Mary gave her faith to the angel, the world was saved.", ""],
    ["So God became man, to be man's physician.", ""],
    ["The Virgin Mary is Christ's mother, bride, sister, and most beloved daughter.", ""],
    ["God, the Creator of all, set every ornament of heaven in Mary.", ""],
    ["As a light burning inside a crystal clothes the whole crystal round about with its light, so the heavenly Virgin is clothed with the sun of justice and glory, Christ.", ""],
    ["Mary was a true paradise; for paradise is the place where God is seen.", ""],
  ].map(([t]) => ({ t, s: "Mariale, tr. for Luminaries" })),
  bellarmine: [
    ["He who lives well, will die well.", ""],
    ["Since death is nothing more than the end of life, it is certain that all who live well to the end, die well.", ""],
    ["By the grace of Christ who condescended to suffer death for us, it hath become in many ways salutary, lovely, and to be desired.", " (of death)"],
    ["We will, therefore, briefly explain the conditions of prayer, that so we may learn how to pray well, live well, and die well.", ""],
    ["For even the angels themselves honour that soul which they see is so often and so familiarly admitted, to speak with the divine Majesty.", ""],
    ["None but the friends of God obtain the gifts of God.", ""],
    ["He that commits sin, does what is not pleasing unto God; but he who repents of his sins, does what is most pleasing to Him.", ""],
    ["First, then, we must give our alms with the pure intention of pleasing God, and not of obtaining human praise.", ""],
  ].map(([t, s]) => ({ t, s: "The Art of Dying Well" + s + ", tr. 1847" })),
  francis: [
    ["True devotion goes still further, for it not only does no injury to any vocation or employment, but, on the contrary, adorns and beautifies it.", ""],
    ["Look at the bees: they find upon the thyme a very bitter juice, yet, in sucking it, they convert it into honey, because such is their property.", ""],
    ["If charity be milk, devotion is the cream; if charity be a plant, devotion is its flower; if charity be a precious stone, devotion is its lustre.", ""],
    ["As birds, wherever they fly, always meet with the air, so we, wherever we go, or wherever we are, shall always find God present.", ""],
    ["After your prayer, gather a little nosegay of devotion, to refresh you during the rest of the day.", ""],
    ["One of the best exercises of meekness we can perform is that of which the subject is within ourselves, in never fretting at our own imperfections.", ""],
    ["Devout souls ascend to Him by more frequent, prompt, and lofty flights.", ""],
    ["The Greek word Philothea signifies a soul loving, or in love with, God.", ""],
  ].map(([t]) => ({ t, s: "Introduction to the Devout Life" })),
  alphonsus: [
    ["I love Thee, O Incarnate Word; I love Thee, O my sovereign Good!", "The Incarnation, Birth and Infancy of Jesus Christ, ed. Grimm"],
    ["Our sins, then, do not prevent us from becoming saints; God offers us readily every assistance if we only desire it and ask it.", "The Incarnation, Birth and Infancy of Jesus Christ, ed. Grimm"],
    ["If we fail, we fail through ourselves, and not through God.", "The Incarnation, Birth and Infancy of Jesus Christ, ed. Grimm"],
    ["What fear can you have not to be pardoned, when the Son of God comes down from heaven to save you?", "The Incarnation, Birth and Infancy of Jesus Christ, ed. Grimm"],
    ["Let us, then, draw near to Jesus with great confidence and love; let us unite ourselves to him, and ask his graces.", "Visits to the Most Holy Sacrament, 1870"],
    ["O all ye souls that love God, whether you are in heaven or on earth, love him also for me.", "Visits to the Most Holy Sacrament, 1870"],
    ["Happy me, if I lose all things to gain thee my God, my treasure, my love, my all.", "Visits to the Most Holy Sacrament, 1870"],
    ["My God, my God, I desire to love thee, I desire to love thee, I desire to love thee.", "Visits to the Most Holy Sacrament, 1870"],
  ].map(([t, s]) => ({ t, s })),
  newman: [
    ["Lead, kindly Light, amid the encircling gloom, lead Thou me on!", "The Pillar of the Cloud"],
    ["The night is dark, and I am far from home: lead Thou me on!", "The Pillar of the Cloud"],
    ["Keep Thou my feet; I do not ask to see the distant scene; one step enough for me.", "The Pillar of the Cloud"],
    ["Ten thousand difficulties do not make one doubt, as I understand the subject; difficulty and doubt are incommensurate.", "Apologia pro Vita Sua"],
    ["Two and two only supreme and luminously self-evident beings, myself and my Creator.", "Apologia pro Vita Sua"],
    ["In a higher world it is otherwise, but here below to live is to change, and to be perfect is to have changed often.", "An Essay on the Development of Christian Doctrine"],
    ["Praise to the Holiest in the height, and in the depth be praise: in all His words most wonderful; most sure in all His ways!", "The Dream of Gerontius"],
    ["Knowledge is capable of being its own end.", "The Idea of a University"],
  ].map(([t, s]) => ({ t, s })),
});
