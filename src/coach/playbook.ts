/**
 * The coach's knowledge base: the Mark Sing dating material, structured.
 *
 * Every entry is transcribed from one of the six shared docs listed in
 * SOURCES. The coach never invents technique — it retrieves from here and
 * adapts the wording to the user's actual situation. That keeps advice
 * traceable: each suggestion can name the play and the doc it came from.
 *
 * To rebuild this file from an Obsidian vault instead, see
 * `scripts/import-vault.mjs` — it emits this same shape.
 */

export const SOURCES = {
  first: 'FIRST MESSAGES TEMPLATES',
  hangout: 'Asking For The Hang Out Template',
  texting: 'Texting 101 Cheat Sheet',
  intrigue: 'Texts that Build Intrigue Template',
  falloff: 'MESSAGE TO SEND WHEN A GIRL FALLS OFF',
  funnel: 'Top of Funnel Ideas',
} as const

export type SourceId = keyof typeof SOURCES

export type Stage =
  | 'top-of-funnel'
  | 'profile'
  | 'opener'
  | 'texting'
  | 'intrigue'
  | 'close'
  | 'revive'
  | 'ending'

export const STAGES: Array<{ id: Stage; label: string; hint: string }> = [
  { id: 'top-of-funnel', label: 'Meeting people', hint: 'Where to actually be, so there is someone to text' },
  { id: 'profile', label: 'My profile', hint: 'Bio lines and prompt answers' },
  { id: 'opener', label: 'First message', hint: 'She matched — what do I open with' },
  { id: 'texting', label: 'Texting her', hint: 'Pacing, length, how to not kill it' },
  { id: 'intrigue', label: 'Building intrigue', hint: 'Get her chasing and invested' },
  { id: 'close', label: 'Asking her out', hint: 'Turning texts into a real hangout' },
  { id: 'revive', label: 'She went quiet', hint: 'Reopening a conversation that died' },
  { id: 'ending', label: 'Ending it', hint: 'Calling it off cleanly' },
]

export interface Play {
  id: string
  title: string
  stage: Stage
  source: SourceId
  /** Lowercase keywords matched against what the user describes. */
  tags: string[]
  /** The technique, close to the source wording. */
  body: string
  /** When this one backfires. */
  caution?: string
}

/**
 * Principles that go into every system prompt regardless of situation —
 * the mechanics from the Texting 101 Cheat Sheet plus the calibration notes
 * scattered through the other docs.
 */
export const PRINCIPLES: string[] = [
  'Texting is 1-for-1. Never double-text. No "hey did you see my text?" — a non-reply is information, not a problem to solve.',
  'Early on, take slightly longer to reply than she does. Once the thread is sticky, vary it.',
  'Match her message length. Long paragraphs into short replies reads as over-investment.',
  'Make texts look tossed off — lowercase, loose punctuation, a little rushed. Effortless on the surface, deliberate underneath. Every text should move toward the hangout.',
  'Never interview her. "What do you do / what are your hobbies / favorite food" kills threads. Repackage any dull question as a guess, a tease, or a bet.',
  'The purpose of texting is not to be pen pals. It is to raise interest to the point where meeting is the obvious next step — usually 10-15 texts.',
  'Go for the hangout on a high note, right after a good exchange, not after a flat one.',
  'Calibrate investment to hers. If she is putting in effort, reward it with warmth and attention. If she has gone flat, pull back your effort to match rather than chasing harder.',
  'Compliment something no one else compliments. Attractive women are saturated with "you\'re pretty" — character observations land, appearance ones do not.',
  'Signals she is ready to meet: fast replies, long replies, she asks you questions, she compliments you, she hints at plans.',
]

/**
 * Some lines in the source docs are excluded from the playbook: the
 * weight-based openers and their "don't use on fat girls" notes, the
 * unsolicited-photo opener, the mental-illness tease, the Hitler bit, the
 * sexually explicit cold read, and the two top-of-funnel ideas that involve
 * recovery meetings and paying women for social proof. They are demeaning,
 * and they are the fastest way to get screenshotted and blocked. Everything
 * else from the docs is here.
 */
export const EXCLUDED_FROM_SOURCE = [
  'weight-based openers ("so fucking cute but so fucking fat", french fries + "don\'t use on fat girls")',
  'the "unsolicited dic pics" opt-in opener',
  'the "Michael Jordan of mental illness" tease',
  'the "fuck, marry, kill — me, Hitler, and me again" opener',
  'the "Colors" cold read (the scripted reply is explicit)',
  'top-of-funnel: AA/NA meetings, hiring women off Seeking.com for preselection',
] as const

export const PLAYS: Play[] = [
  /* ---------------- Openers ---------------- */
  {
    id: 'pictures-cold-read',
    title: 'Something interesting about your pictures',
    stage: 'opener',
    source: 'first',
    tags: ['opener', 'match', 'photos', 'pictures', 'profile', 'first message', 'bumble', 'hinge', 'tinder'],
    body: `Open: "So NAME, I noticed something interesting about your pictures…" She asks what. Optionally stall once — "if I tell you, you have to pinky swear not to get so excited you jump up and crack your head on the ceiling" — then deliver a character read, not a looks compliment: "You always look genuinely happy in your pictures. Like you don't fake it. You seem like a legitimately happy person. True story?" Follow with a playful loyalty test: "But are you a loyal friend? If some guy broke your best friend's heart would you roundhouse kick him in the face?"`,
  },
  {
    id: 'guess-her-job',
    title: 'Guess what she does',
    stage: 'opener',
    source: 'first',
    tags: ['opener', 'job', 'work', 'career', 'question', 'boring', 'interview', 'what do you do'],
    body: `Instead of asking what she does, guess absurdly: "So what's your story? I'm gonna guess job-wise either an ice cream man or machine gun saleswoman." She corrects you and names her real job. Then ask one genuine follow-up — "what made you want to do that?" — and close the loop with a callback: "Good story. Though if you ever burn out, you'd have a very promising career in ice cream distribution."`,
  },
  {
    id: 'role-play',
    title: 'Role-play',
    stage: 'opener',
    source: 'first',
    tags: ['opener', 'roleplay', 'role play', 'funny', 'playful', 'humor', 'game'],
    body: `Hand her a role and let her play: "I'm robbing a bank tomorrow. Looking for an accomplice…" When she plays along, escalate with absurd specifics — she carries the gun, she drives, she brings you half the loot and a foot massage because your feet hurt from all the criminal activity. Works because it gives her something to do rather than something to answer.`,
    caution: 'Needs a sense of humor to land. If her first reply is flat or literal, drop it and switch to a warmer opener.',
  },
  {
    id: 'how-can-i-know',
    title: 'How can I know',
    stage: 'opener',
    source: 'first',
    tags: ['opener', 'food', 'pizza', 'playful', 'qualify'],
    body: `"How can I know for sure that you're the kind of girl who will share her pizza?" She defends herself, which flips the frame — she is now qualifying to you. Reward it: "I always said girls with a small appetite make the best girlfriends, they always ask you to finish their food."`,
  },
  {
    id: 'cold-read-not-to-be-messed-with',
    title: 'Friendly but not to be messed with',
    stage: 'opener',
    source: 'first',
    tags: ['opener', 'cold read', 'tease', 'photos'],
    body: `"You look ultra friendly in your pics, but I sense you're not to be messed with, huh?" She almost always answers "haha do I look like a hard ass?" — then: "You do. I bet if some guy broke your best friend's heart you'd do a flying karate kick to his head, wouldn't you?"`,
  },
  {
    id: 'agent-orange',
    title: 'Agent Orange',
    stage: 'opener',
    source: 'first',
    tags: ['opener', 'roleplay', 'spy', 'walkie talkie', 'number', 'first text', 'phone number'],
    body: `Radio-operator bit, best as the first text after pulling her number: "This is Agent [call sign]. I have received mission go from HQ. You are cleared to engage this year's all-time best [app] match. Speedy response is critical to mission success. Copy, Agent [call sign you invent for her]? **KSSH OVER**" Stay in character. If she forgets the "kssh over," correct her playfully. Use the mission framing to set the actual logistics: (1) Agent [her] determines the day, (2) you locate the target, (3) she tells no one.`,
    caution: 'Only after real attraction is built. Cold, it reads as random.',
  },
  {
    id: 'disagree-with-bio',
    title: 'Disagree with her bio',
    stage: 'opener',
    source: 'first',
    tags: ['opener', 'bio', 'disagree', 'tease', 'profile'],
    body: `Take the opposite of whatever her bio claims. Bio: "taco Tuesdays, good grammar, men with dogs." You: "I prefer margarita Mondays, speaking in slang, and women with cats. Does that mean we won't get along?" She says it could be dangerous. You: "But never boring. I get the feeling you like a little danger… if you had to pick X or Y, what are you going with?" If she says "we definitely won't get along" — "Ah damn, seems this relationship is doomed… unless… we can agree on [thing]."`,
  },
  {
    id: 'aspen-snowball',
    title: 'Aspen snowball (fast close)',
    stage: 'opener',
    source: 'first',
    tags: ['opener', 'fast close', 'false memory', 'ski', 'snow', 'ask out fast'],
    body: `Invent a shared history and ask her out inside four messages. "Wait… don't we know each other? I'm pretty sure you're the girl who hit me with a snowball in Aspen because I was better at snowboarding than you. Not cool, Nicole." Commit to the detail — neon pink jacket, bragging about her turns, WHAM. Then: "I'll give you a chance to redeem yourself over a drink. But no snowballs this time."`,
  },
  {
    id: 'sea-otters',
    title: 'Sea otters and peanut butter (fast close)',
    stage: 'opener',
    source: 'first',
    tags: ['opener', 'fast close', 'self deprecating', 'funny', 'ask out fast'],
    body: `Lead with a low-status admission delivered confidently: "Okay full disclosure: I'm currently watching a documentary on sea otters and eating peanut butter from the jar. This is peak masculinity." Then close on it: "I feel like we'd get along — assuming you don't judge my snacking habits. Wanna grab a drink this week?"`,
  },
  {
    id: 'better-hair',
    title: 'Better hair (fast close)',
    stage: 'opener',
    source: 'first',
    tags: ['opener', 'fast close', 'tease', 'hair', 'ask out fast'],
    body: `"You seem cool but I don't get along with girls who have better hair than me. This might not work." She asks how good your hair is. "Legendary. A guy in Whole Foods once asked me what conditioner I use. I cried a little." Then close: "Anyway, I like your energy. Let's grab a drink sometime before we both get bored of dating apps."`,
  },
  {
    id: 'the-hike',
    title: 'The hike (fast close)',
    stage: 'opener',
    source: 'first',
    tags: ['opener', 'fast close', 'hiking', 'outdoors', 'ask out fast'],
    body: `Use her stated hobby as the tease: "Okay wait… we've got a problem. You're cute and you're into hiking. That means you're gonna make me do cardio, huh?" Then: "What's your go-to hike? Or are you more of a 'post a photo at the trailhead and leave' kind of adventurer?" Close: "Let's settle this over a coffee or margarita. You bring your best trail story, I'll bring a granola bar to stay on theme."`,
  },
  {
    id: 'rocket',
    title: 'Someone is using your pictures',
    stage: 'opener',
    source: 'first',
    tags: ['opener', 'compliment', 'joke', 'short', 'high performer'],
    body: `"Hey NAME, someone's using your pictures on their profile. Seriously." — "OMG who?" — "NASA, cause you're an absolute rocket." Local variant: "The Denver Zoo. Cuz you're a total fox."`,
    caution: 'The strongest performer on the apps, which means it is also the most widely used. Rotate it — do not make it your only opener.',
  },
  {
    id: 'short-openers',
    title: 'Short one-line openers',
    stage: 'opener',
    source: 'first',
    tags: ['opener', 'one liner', 'short', 'quick', 'line'],
    body: `Rotate through these one-liners: "I don't know NAME, you look like you'd steal my favorite hoodie…" / "So NAME, there are so many good things about you and just 1 bad…" / "So NAME, I swiped right because of your personality..." / "Excuse me NAME, is there a reason you're not waking up next to me right now?" (morning-after-match) / "This isn't working for me. I want a divorce." / "So NAME… were you the girl my mom warned me about or the one she prayed for? Because I'm getting mixed signals." / "I know a secret about you that you don't." / "You're not the type to turn into a Stalker Texas Ranger, are you?" / "If we ever meet my mom we have to tell her you're mute, ok? Same if I meet yours." / "There's something I need to tell you…" / "If I were to buy us a baby miniature goat, what would we name it?" / "You swiped on me because you heard I'm a famous ass model, huh?" / "IDK how you did it without crayons and paper, NAME, but damn you drew my attention." / "You look adorable, fingers crossed you're not a lunatic." / "So NAME… do you make all your decisions based on vibes, or was swiping on me a calculated risk?" / "How many guys have proposed to you on this app so far? I need to know what competition I'm dealing with." / "Are you one of those girls who says she's 5'5\\" but is actually 5'3\\" with a big personality?" / "If we hang out and it goes horribly, let's just get into a food fight and blame each other, deal?" / "I get the vibe you give out your Netflix password way too soon. I respect that kind of trust." / "So NAME, what's your biggest red flag? Asking for a friend. (The friend is my therapist.)" If she has a dog photo: "You're cute and all, but I think your dog would be the one who steals my heart…"`,
  },
  {
    id: 'note-pass',
    title: 'The note pass',
    stage: 'close',
    source: 'hangout',
    tags: ['number', 'waitress', 'barista', 'in person', 'work', 'phone number', 'irl', 'real life'],
    body: `For getting the number of a woman who is working — waitress, barista, anyone whose boss or coworkers are watching. Hand her a written note at a moment she can respond privately (a waitress: just before she brings the check). Write: "So NAME, I don't know if you were just providing great customer service or if you agree with me that we have really good rapport. Assuming it's the latter, how would you feel about tossing me your number?" then "[ ] Yes   [ ] No ← Don't pick this one."`,
  },

  /* ---------------- Texting mechanics ---------------- */
  {
    id: 'first-text-after-number',
    title: 'The first text after you get her number',
    stage: 'texting',
    source: 'texting',
    tags: ['first text', 'number', 'next day', 'after meeting', 'phone number', 'when to text'],
    body: `Text the next day at 6pm. The text does three things at once: (1) references something from your first conversation, (2) makes her laugh, (3) hands her an easy playful reply. Examples: "I just saw your ice-cream truck going 120mph down the 405. Were you late for the ice cream man convention?" / "This is your phone. Because you didn't buy [your name] a drink last night, I'll self-destruct in 1 minute. Text back for diffuse instructions." / "[Your name] to [her name]. Come in [her name]. KSH. Over…" / "We received your payment for your machine gun. It'll be shipped out immediately." / "Wasn't that you I saw at the hippie circle playing the harp last night?"`,
  },
  {
    id: 'rushed-texting',
    title: 'Make it look rushed',
    stage: 'texting',
    source: 'texting',
    tags: ['tone', 'style', 'grammar', 'punctuation', 'effort', 'try hard', 'sound', 'voice'],
    body: `Lowercase, drop periods and commas, let predictive text make the odd mistake. You want it to read like you thought of something funny and fired it off without trying — while actually being deliberate about every message. Do not go so far that you look uneducated.`,
  },
  {
    id: 'pacing',
    title: 'Reply pacing',
    stage: 'texting',
    source: 'texting',
    tags: ['pacing', 'reply time', 'how long', 'wait', 'double text', 'response time', 'slow', 'fast'],
    body: `One text for one text — never double-text, never follow up on an unanswered message. Early on, take a bit longer to reply than she does; once the thread is sticky you can vary it. Keep your messages roughly the length of hers. If she goes flat, slow down rather than pushing harder — not replying almost never hurts you.`,
  },
  {
    id: 'when-to-close',
    title: 'When to go for the hangout',
    stage: 'texting',
    source: 'texting',
    tags: ['when', 'timing', 'ask out', 'hangout', 'ready', 'how many texts'],
    body: `Roughly 10-15 texts, and always on a high note. The tells she's ready: she participates rather than answering, replies fast, writes long, compliments you or brags to you, or hints at hanging out. Some women agree after two messages, some take twenty; seven exchanges is the average.`,
  },

  /* ---------------- Intrigue ---------------- */
  {
    id: 'just-one-bad',
    title: 'Just one bad',
    stage: 'intrigue',
    source: 'intrigue',
    tags: ['intrigue', 'chase', 'curiosity', 'tease', 'invested', 'boring', 'flat'],
    body: `"There are so many good things about you and just 1 bad." She asks what the bad is. Deflect: "Why do you only want to hear the bad? Stop being so negative, Captain Negatron. Besides, you don't want to know." String it: "OK, I'm going to tell you. Hold on… you know what, never mind." Right as she's about to actually get annoyed, land it warm: "The bad thing is this… too bad you're not here right now because I miss your adorable laugh."`,
    caution: 'Read the timing. Held too long it stops being fun and becomes irritating — pay off just before she hits that point.',
  },
  {
    id: 'i-just-realized',
    title: 'I just realized something about you',
    stage: 'intrigue',
    source: 'intrigue',
    tags: ['intrigue', 'chase', 'curiosity', 'compliment', 'in person', 'invested'],
    body: `"I want to tell you something I just realized about you." She asks. Ask where she is. Whatever she answers: "Because you're there, I can't tell you… you'd get so excited you'd [start a riot that kills 25 innocent people / jump through the wall like the Kool-Aid guy / hyperextend your ponytail / fart a little and be totally embarrassed]." Then say you'll have to tell her in person, and do not budge no matter how hard she pushes. When you see her, deliver a genuine non-appearance compliment: "You have such a pure, genuine heart. I really like that about you." The chase makes the compliment land three times harder.`,
  },
  {
    id: 'kissing-university',
    title: 'Kissing University',
    stage: 'intrigue',
    source: 'intrigue',
    tags: ['intrigue', 'flirty', 'kissing', 'escalate', 'playful', 'after date'],
    body: `"So NAME, I have an important question… if you were in kissing school, what grade would you get?" She says an A. "Well, you don't know this about me, but I was the president of kissing school back in the nineteen hundreds." — "Oh you were, huh?" — "Yup. Do you think you have what it takes to get into such a prestigious institution?" Stronger used *after* you've kissed her: tell her the grade has been calculated across style, technique, sensuality and sexiness, make her chase each category, land on a B+, and note that only lots of practice gets her to an A+.`,
  },
  {
    id: 'youll-stop-doing-it',
    title: "I don't want to tell you or you'll stop",
    stage: 'intrigue',
    source: 'intrigue',
    tags: ['intrigue', 'chase', 'compliment', 'cute', 'curiosity'],
    body: `"I noticed something about you the other day… you do this one thing that's sooooo cute. But…" — "But?" — "I don't want to tell you what it is, because then you'll stop doing it." Play with it, make her pinky swear she won't stop, then give her a specific non-obvious compliment about a small thing she actually does.`,
  },
  {
    id: 'gender-reveal',
    title: 'Gender reveal party',
    stage: 'intrigue',
    source: 'intrigue',
    tags: ['intrigue', 'joke', 'funny', 'one liner', 'absurd'],
    body: `"So I got invited to my first gender reveal party this weekend. I have a question I think you can help me with…" — "Of course, what is it?" — "Do I drop my pants right when I arrive, or is there some kind of announcement first?"`,
  },

  /* ---------------- Closing ---------------- */
  {
    id: 'hangout-template',
    title: 'The hangout template',
    stage: 'close',
    source: 'hangout',
    tags: ['ask out', 'hangout', 'date', 'drinks', 'coffee', 'meet up', 'close', 'plans'],
    body: `Use this close to verbatim. "You seem fun. I think we owe it to ourselves to hang out sometime. Do you agree with this brilliant conclusion?" — or — "I tell you what NAME, why don't we grab drinks or coffee this week? Being pen pals is fun, but I sense face to face would be much better, wouldn't you agree?" She agrees. "Cool. What's your schedule looking like this week?" She names days. "Perfect. I like to go to [place] on Thursdays. If you promise not to get drunk and burn the place down like you did that bar last week, you should come with me." Then logistics: "Would it be more convenient if I picked you up? Or would you rather meet there?" → "OK, I'll text you Thursday with the address. Sounds good?" → "It's a plan. Be sure to bring a jacket, passport, and proof of motor vehicle insurance."`,
    caution: 'This one is worth running word for word. The tease in the middle is the only part to adapt to her vibe.',
  },
  {
    id: 'between-close-and-date',
    title: 'Between the yes and the date',
    stage: 'close',
    source: 'hangout',
    tags: ['before date', 'confirm', 'day of', 'flake', 'address', 'plans'],
    body: `Text her once or twice a day, or every other day, between locking the plan and the actual hangout — enough to stay warm, not enough to burn the novelty. At noon on the day, send the address (or ask for hers if you're picking her up): "Hey, here's the address of [place]. See you there at 6pm. I'll be the guy dressed as a homeless man."`,
  },

  /* ---------------- Revival ---------------- */
  {
    id: 'she-fell-off',
    title: 'When she goes quiet',
    stage: 'revive',
    source: 'falloff',
    tags: ['ghosted', 'quiet', 'stopped replying', 'fell off', 'dead', 'revive', 'no response', 'left on read'],
    body: `Wait two full weeks — not two days — then send exactly one of these and nothing else: "So I was talking to this pretty cool girl but I think she got sucked into a black hole. I hope she's ok…" / "So NAME…" / "So hey, I just realized something about you…" / "So NAME, there's something about me you should probably know…" / "So NAME, I have to admit something to you…" Each one is an open loop she has to answer to close.`,
    caution: 'One message. If that gets nothing, it is done — a second one costs you more than the match was worth.',
  },
  {
    id: 'you-fell-off',
    title: 'When you went quiet',
    stage: 'revive',
    source: 'falloff',
    tags: ['ghosted', 'my fault', 'busy', 'disappeared', 'fell off', 'revive'],
    body: `Acknowledge it in half a sentence, do not over-explain, and immediately hand her something to answer: "Didn't mean to fall off the map like that, [brief reason]. So I have a question for you…"`,
  },

  /* ---------------- Ending ---------------- */
  {
    id: 'break-it-off',
    title: 'Ending it cleanly',
    stage: 'ending',
    source: 'falloff',
    tags: ['end it', 'break up', 'not interested', 'no chemistry', 'let her down', 'reject'],
    body: `Say it once, kindly, without leaving a door open you don't mean: "So NAME, I had a great time with you, but I don't feel we have the chemistry to warrant continuing this further. I don't want to waste your time, so I think it's best we part ways. I know there's a lucky guy out there who's going to snatch you up in no time. I genuinely wish you nothing but the best. Take care and be well."`,
  },

  /* ---------------- Profile ---------------- */
  {
    id: 'bio-ideas',
    title: 'Bio lines',
    stage: 'profile',
    source: 'first',
    tags: ['bio', 'profile', 'about me', 'setup', 'app'],
    body: `"Hit me up if you're not a Stalker Texas Ranger" / "I'm a famous ass model. No, you may not pinch my butt" / "When we introduce you to my mom we have to say you're a mute, ok?" / "I work at the freak show. I'm the world's tallest midget." / "I work at the zoo picking up penguins who fall over because they can't pick themselves up." / "My dream girl is Trailer Swift." / "My dream girl is an unfrozen cavewoman." / "It's always been my dream to jetski around the world." / "I'm great with kids. Why? Cuz I was actually a kid once." / "I like drinks with tiny umbrellas. Dealbreaker?" / "Don't introduce me to your dog or cat cuz they'll fall in love with me and beg me to adopt them." / "My therapist says I'm a catch. She also said I should stop quoting her on dating apps." / "Currently training for the Olympic nap team. Gold medal in cozy." / "Once got banned from Build-A-Bear for taking it too seriously." / "My hobbies include blinking, overthinking, and aggressively making guacamole." / "Let's lie to our waiter and say it's our anniversary on the first date." / "Let's make a pact to fake a British accent at brunch and never break character." / "My toxic trait? Thinking I'd crush it on Survivor but crying when my DoorDash is late." / "I ate 243 oreos once. Slowly, over 9 years." / "I run a support group for people who wave back when someone wasn't actually waving at them." / "My mom says I'm a catch. My ex says I'm too much. Let's find out who's right." / "Looking for someone to split fries with and fake a proposal in public to get free dessert."`,
  },
  {
    id: 'prompt-answers',
    title: 'Prompt answers, ranked by response rate',
    stage: 'profile',
    source: 'first',
    tags: ['prompt', 'hinge', 'profile', 'answer', 'bumble', 'bio'],
    body: `Ordered by positive interaction rate in the source's test group — but the top one is not automatically your best; different men tested best with the 4th or 5th. Pick the ones that sound like you.
• Dating me is like… — a Netflix series you didn't expect to love but can't stop watching / riding first class, you'll never go back to coach / having a personal trainer, chef, and stand-up comic in one / winning the emotional support lottery / owning a Tesla: fast, efficient, makes your ex jealous.
• I'm looking for… — a woman who laughs easily, communicates openly, and hates small talk as much as I do / a teammate for life, not just beer pong / someone as ambitious about life as I am about my morning coffee ritual / a plus-one for family weddings who can out-dance my cousins / someone who doesn't mind losing to me at Mario Kart, gracefully.
• Let's make sure to… — laugh until our abs count as a workout / stay up too late talking about dreams and conspiracy theories / do one thing that scares us (not skydiving, let's chill) / never run out of hot sauce or playlists / travel somewhere with more goats than people.
• A shower thought I recently had… — my dog thinks I'm the emotional support animal / every pizza is a personal pizza if you believe in yourself / if you clean a vacuum, aren't you the vacuum now? / why isn't there a Nobel Prize for parallel parking?
• I know the best spot for… — falling in love with both the vibe and the food / a walk so scenic you forget to check your phone / getting your mind blown by jazz, whiskey, or both / sunset views and conspiracy-level good tacos.
• The way to win me over is… — match my ambition and match my energy / have your life together but still make space for play / be kind to strangers and brutal at trivia night / laugh at my dad jokes and challenge me to a plank contest.
• My most controversial opinion is… — pineapple absolutely belongs on pizza and in arguments / being early is sexier than being fashionable / the Oxford comma is non-negotiable / we should normalize brunch on weekdays.
• We'll get along if… — you can roast me lovingly and take one back / you're emotionally intelligent and a little weird / you're driven but know when to hit pause / you think 'Type A' is a love language.
• The hallmark of a good relationship is… — banter, trust, and deciding what to eat in under 10 minutes / emotional safety and inside jokes / having each other's back and playlists / passion in both cuddles and calendar invites.
• Don't hate me if I… — get competitive during game night and overly affectionate after / wake you up early for a hike and make you breakfast after / talk to dogs like they're humans, because they are / fix things that aren't broken (it's a love language).
• Two truths and a lie… — I cook better than your mom / I cry at Pixar movies / I don't believe in ghosts.
• A green flag I look for is… — someone who's kind when no one's watching / knows how to recharge without ghosting / curious, not judgmental / can laugh at themselves without self-deprecating into oblivion.`,
  },

  /* ---------------- Top of funnel ---------------- */
  {
    id: 'funnel-jobs',
    title: 'Part-time jobs that put you around women',
    stage: 'top-of-funnel',
    source: 'funnel',
    tags: ['meet', 'where', 'job', 'work', 'no matches', 'nobody', 'options', 'more women'],
    body: `Bouncer, bartender, DJ, photographer, yoga studio, dance studio, promo model company, tanning salon, rock climbing instructor, part-time professor at a junior college, scuba instructor, coffee shop, spin studio, spa, ski resort, mall kiosk, modeling agency, any position at a college, nightclub promoter, Bath & Body Works, speed dating event organizer, a trendy clothing store, wine store, beauty salon, tea store, teaching whatever you're expert in, coaching a girls' sports team, swimwear store, gym, personal trainer, tutor, anything tourist-facing, waiting tables somewhere with a young staff, anything involving a clipboard, anything wedding-related (photographer, singer, organizer), anything airport-related — especially flight attendant.`,
  },
  {
    id: 'funnel-activities',
    title: 'Activities with a natural gender skew',
    stage: 'top-of-funnel',
    source: 'funnel',
    tags: ['meet', 'where', 'hobby', 'class', 'activity', 'social', 'no matches', 'more women'],
    body: `Dance classes (swing, salsa, hip hop), getting your hair cut at a beauty school, cooking classes, yoga classes and especially yoga events, spin, barre, pilates, horseback riding, shopping for your own grooming products at Ulta or Sephora, organizing a Meetup group (e.g. "Denver Singles"), hosting a potluck/BBQ/pregame at your place before going out, sushi-making and baking classes, running or joining a cornhole or kickball league, outdoor shopping areas, concerts, festivals, drum circles, retreats, hiking, climbing gyms, jet skiing and boating, electronic music events, country swing dancing, massage schools, makeup-artist schools as a volunteer model, cycling studios, pub crawls, book clubs.`,
  },
  {
    id: 'funnel-outside-box',
    title: 'Outside-the-box funnel ideas',
    stage: 'top-of-funnel',
    source: 'funnel',
    tags: ['meet', 'where', 'dog', 'creative', 'park', 'unusual'],
    body: `Get a puppy and walk it somewhere busy — or a miniature pig, which the source rates as a genuine magnet. Set up a booth at a college. Carry something conversation-starting in a park. Go to a high-traffic area with a clipboard and run a survey about what women find attractive.`,
  },
]

export function playById(id: string): Play | undefined {
  return PLAYS.find((p) => p.id === id)
}

export function playsForStage(stage: Stage): Play[] {
  return PLAYS.filter((p) => p.stage === stage)
}
