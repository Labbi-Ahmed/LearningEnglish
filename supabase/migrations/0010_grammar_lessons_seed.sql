-- 0010_grammar_lessons_seed.sql
-- Seeds 16 grammar lessons (12 tenses + 4 foundational topics).
-- Idempotent: ON CONFLICT (slug) DO NOTHING.
-- Depends on: 0006_grammar_lessons.sql
-- Verify after running: select count(*) from grammar_lessons; -- expect >= 16

-- ─────────────────────────────────────────────────────────────────────
-- A1 TENSES
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('present-simple', 'Present Simple', 'a1', 'tenses', $L01${
  "body": "## Present Simple\n\nThe present simple describes **habits**, **facts**, and **routines**.\n\n### Form\n\n| Subject | Verb |\n|---|---|\n| I / you / we / they | base verb |\n| he / she / it | base verb + **s** |\n\n**Positive:** She *works* in a hospital. They *play* football on Sundays.\n\n**Negative:** Use **do not (don't)** or **does not (doesn't)** before the base verb.\n> He *doesn't* like coffee.\n\n**Question:** Put **do / does** before the subject.\n> *Does* she live here?\n\n### Key time expressions\n*always, usually, often, sometimes, never, every day, on Mondays, twice a week*",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "She ___ to work by bus every morning. (go)",
      "answer": "goes"
    },
    {
      "type": "fill_in_blank",
      "prompt": "They ___ video games on weekdays. (not play)",
      "answer": ["do not play", "don't play"]
    },
    {
      "type": "multiple_choice",
      "prompt": "Which sentence is correct?",
      "options": ["He go to school.", "He goes to school.", "He going to school."],
      "correct_index": 1
    },
    {
      "type": "multiple_choice",
      "prompt": "Choose the correct question form.",
      "options": ["Does she likes coffee?", "Do she like coffee?", "Does she like coffee?"],
      "correct_index": 2
    },
    {
      "type": "reorder",
      "prompt": ["I", "usually", "have", "breakfast", "at", "seven"],
      "shuffled": ["at", "breakfast", "seven", "I", "have", "usually"]
    }
  ]
}$L01$::jsonb, 1)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('present-continuous', 'Present Continuous', 'a1', 'tenses', $L02${
  "body": "## Present Continuous\n\nUse the present continuous for actions **happening right now** or **temporary situations**.\n\n### Form\n\n**am / is / are + verb-ing**\n\n| Subject | Be | Verb-ing |\n|---|---|---|\n| I | am | working |\n| he / she / it | is | working |\n| you / we / they | are | working |\n\n**Positive:** She *is reading* a book right now.\n\n**Negative:** They *are not (aren't) playing* outside today.\n\n**Question:** *Are you listening?* *Is he coming?*\n\n### Spelling rules\n- Most verbs: add **-ing** → work → working\n- Silent **e**: remove e, add **-ing** → make → making\n- Short vowel + consonant: double consonant → run → running\n\n### Key time expressions\n*now, right now, at the moment, today, this week, currently*",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "Listen! The baby ___ (cry).",
      "answer": ["is crying", "is crying."]
    },
    {
      "type": "fill_in_blank",
      "prompt": "We ___ (not watch) TV right now. We are studying.",
      "answer": ["are not watching", "aren't watching"]
    },
    {
      "type": "multiple_choice",
      "prompt": "Which sentence uses the present continuous correctly?",
      "options": ["She is know the answer.", "She is knowing the answer.", "She knows the answer right now."],
      "correct_index": 2
    },
    {
      "type": "multiple_choice",
      "prompt": "What is the correct -ing form of 'sit'?",
      "options": ["siting", "sitting", "siiting"],
      "correct_index": 1
    },
    {
      "type": "reorder",
      "prompt": ["They", "are", "playing", "football", "in", "the", "park"],
      "shuffled": ["park", "the", "in", "are", "football", "playing", "They"]
    }
  ]
}$L02$::jsonb, 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('past-simple', 'Past Simple', 'a1', 'tenses', $L03${
  "body": "## Past Simple\n\nUse the past simple for **completed actions** at a specific time in the past.\n\n### Form\n\n**Regular verbs:** add **-ed** → work → *worked*, play → *played*\n\n**Common irregular verbs:**\n\n| Base | Past |\n|---|---|\n| go | went |\n| have | had |\n| see | saw |\n| come | came |\n| give | gave |\n| say | said |\n\n**Positive:** She *visited* her grandmother yesterday.\n\n**Negative:** Use **did not (didn't)** + base verb.\n> He *didn't go* to school last Monday.\n\n**Question:** Use **did** + subject + base verb.\n> *Did you see* the film?\n\n### Key time expressions\n*yesterday, last week, in 2010, ago, when I was young*",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "She ___ (visit) Paris last summer.",
      "answer": "visited"
    },
    {
      "type": "fill_in_blank",
      "prompt": "We ___ (not go) to the party last night.",
      "answer": ["did not go", "didn't go"]
    },
    {
      "type": "multiple_choice",
      "prompt": "What is the past simple of 'go'?",
      "options": ["goed", "gone", "went"],
      "correct_index": 2
    },
    {
      "type": "multiple_choice",
      "prompt": "Which question is correct?",
      "options": ["Did you went there?", "Did you go there?", "Did you gone there?"],
      "correct_index": 1
    },
    {
      "type": "reorder",
      "prompt": ["I", "saw", "an", "interesting", "film", "yesterday"],
      "shuffled": ["interesting", "yesterday", "film", "an", "I", "saw"]
    }
  ]
}$L03$::jsonb, 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('future-simple', 'Future Simple (will)', 'a1', 'tenses', $L04${
  "body": "## Future Simple (will)\n\nUse **will** for **predictions**, **spontaneous decisions**, **promises**, and **offers**.\n\n### Form\n\n**will + base verb** (same for all subjects)\n\n**Positive:** It *will rain* tomorrow. I *will help* you.\n\n**Negative:** Use **will not (won't)** + base verb.\n> She *won't be* at the meeting.\n\n**Question:** Put **will** before the subject.\n> *Will they come* to the party?\n\n### Uses\n| Use | Example |\n|---|---|\n| Prediction | It will be sunny tomorrow. |\n| Spontaneous decision | I'll have the soup, please. |\n| Promise | I will never forget you. |\n| Offer | I'll carry that for you. |\n\n### Key time expressions\n*tomorrow, next week, in the future, soon, in 2030*",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "Don't worry. I ___ (help) you with your homework.",
      "answer": ["will help", "'ll help"]
    },
    {
      "type": "fill_in_blank",
      "prompt": "She ___ (not come) to the party tomorrow.",
      "answer": ["will not come", "won't come"]
    },
    {
      "type": "multiple_choice",
      "prompt": "You drop your bag. A stranger says:",
      "options": ["I help you!", "I will help you!", "I am helping you!"],
      "correct_index": 1
    },
    {
      "type": "multiple_choice",
      "prompt": "Which sentence expresses a prediction?",
      "options": ["I am going to the shop.", "It will snow in the mountains.", "She is working late."],
      "correct_index": 1
    },
    {
      "type": "reorder",
      "prompt": ["Will", "you", "be", "at", "home", "tomorrow"],
      "shuffled": ["at", "tomorrow", "home", "be", "Will", "you"]
    }
  ]
}$L04$::jsonb, 4)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- A2 TENSES
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('present-perfect', 'Present Perfect', 'a2', 'tenses', $L05${
  "body": "## Present Perfect\n\nUse the present perfect to connect the **past with the present** — for experiences, recent events, or ongoing states.\n\n### Form\n\n**have / has + past participle**\n\n| Subject | Have/Has | Past Participle |\n|---|---|---|\n| I / you / we / they | have | worked / gone / seen |\n| he / she / it | has | worked / gone / seen |\n\n**Positive:** She *has visited* Japan three times.\n\n**Negative:** They *haven't finished* yet.\n\n**Question:** *Have you ever eaten sushi?*\n\n### Key time expressions\n| Word | Usage |\n|---|---|\n| *ever / never* | life experience |\n| *just / already / yet* | recent actions |\n| *since / for* | duration up to now |\n\n> I have lived here **for** five years. / I have lived here **since** 2019.",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "She ___ (already finish) her homework.",
      "answer": ["has already finished", "has finished"]
    },
    {
      "type": "fill_in_blank",
      "prompt": "I ___ (never see) that film.",
      "answer": ["have never seen"]
    },
    {
      "type": "multiple_choice",
      "prompt": "Which word goes with 'since'?",
      "options": ["I have worked here since five years.", "I have worked here since 2018.", "I have worked here since a long time."],
      "correct_index": 1
    },
    {
      "type": "multiple_choice",
      "prompt": "Choose the correct sentence.",
      "options": ["Have you ever been to Paris?", "Did you ever been to Paris?", "Have you ever went to Paris?"],
      "correct_index": 0
    },
    {
      "type": "reorder",
      "prompt": ["They", "have", "not", "arrived", "yet"],
      "shuffled": ["yet", "arrived", "not", "They", "have"]
    }
  ]
}$L05$::jsonb, 5)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('past-continuous', 'Past Continuous', 'a2', 'tenses', $L06${
  "body": "## Past Continuous\n\nUse the past continuous for an **action in progress at a specific moment in the past**, or as **background context** for a past event.\n\n### Form\n\n**was / were + verb-ing**\n\n| Subject | Was/Were | Verb-ing |\n|---|---|---|\n| I / he / she / it | was | working |\n| you / we / they | were | working |\n\n**Positive:** She *was reading* when I called.\n\n**Negative:** We *were not (weren't) sleeping* — we were studying.\n\n**Question:** *Were they waiting* long?\n\n### Common pattern\n*was/were + -ing* (background) + **when** + past simple (interruption)\n\n> I *was walking* home **when** it started to rain.\n\n### Key time expressions\n*at 8 o'clock yesterday, this time last year, while, when*",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "It ___ (rain) when I left the house.",
      "answer": "was raining"
    },
    {
      "type": "fill_in_blank",
      "prompt": "They ___ (not listen) to the teacher during the lesson.",
      "answer": ["were not listening", "weren't listening"]
    },
    {
      "type": "multiple_choice",
      "prompt": "I called her while she ___.",
      "options": ["was cooking", "cooked", "has cooked"],
      "correct_index": 0
    },
    {
      "type": "multiple_choice",
      "prompt": "Which sentence is correct?",
      "options": ["He were sleeping at midnight.", "He was sleeping at midnight.", "He is sleeping at midnight."],
      "correct_index": 1
    },
    {
      "type": "reorder",
      "prompt": ["What", "were", "you", "doing", "at", "ten", "last", "night"],
      "shuffled": ["ten", "doing", "last", "at", "What", "you", "were", "night"]
    }
  ]
}$L06$::jsonb, 6)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- B1 TENSES
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('present-perfect-continuous', 'Present Perfect Continuous', 'b1', 'tenses', $L07${
  "body": "## Present Perfect Continuous\n\nUse the present perfect continuous to emphasise the **duration** of an action that started in the past and **continues up to now**, or whose effects are visible now.\n\n### Form\n\n**have / has + been + verb-ing**\n\n**Positive:** I *have been studying* English for two years.\n\n**Negative:** She *hasn't been sleeping* well lately.\n\n**Question:** *How long have you been waiting?*\n\n### vs. Present Perfect Simple\n\n| Present Perfect Continuous | Present Perfect Simple |\n|---|---|\n| Emphasises *duration* | Emphasises *completion* |\n| I have been writing a report. | I have written the report. |\n\n### Key time expressions\n*for, since, all day, all morning, lately, recently, how long*",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "He ___ (work) in this company for ten years.",
      "answer": ["has been working"]
    },
    {
      "type": "fill_in_blank",
      "prompt": "They ___ (not talk) since the argument last week.",
      "answer": ["have not been talking", "haven't been talking"]
    },
    {
      "type": "multiple_choice",
      "prompt": "Which sentence emphasises duration?",
      "options": ["I have read three books.", "I have been reading all afternoon.", "I read a book yesterday."],
      "correct_index": 1
    },
    {
      "type": "multiple_choice",
      "prompt": "She looks tired. She ___.",
      "options": ["has been running", "has run", "ran"],
      "correct_index": 0
    },
    {
      "type": "reorder",
      "prompt": ["How", "long", "have", "you", "been", "learning", "English"],
      "shuffled": ["learning", "long", "you", "English", "How", "have", "been"]
    }
  ]
}$L07$::jsonb, 7)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('past-perfect', 'Past Perfect', 'b1', 'tenses', $L08${
  "body": "## Past Perfect\n\nUse the past perfect for an action that was **completed before another action** in the past.\n\n### Form\n\n**had + past participle** (same for all subjects)\n\n**Positive:** By the time she arrived, they *had already left*.\n\n**Negative:** He *hadn't eaten* anything when he got to the party.\n\n**Question:** *Had you ever flown before that trip?*\n\n### Timeline concept\n\n```\nPast Perfect     Past Simple      Now\n   |                 |             |\n   had eaten    arrived home     (speaking)\n```\n\n> When I *arrived* at the station, the train *had already left*.\n\n### Key signal words\n*before, after, by the time, when, already, just, because*",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "By the time we arrived, the film ___ (already start).",
      "answer": "had already started"
    },
    {
      "type": "fill_in_blank",
      "prompt": "She ___ (not read) the book before seeing the film.",
      "answer": ["had not read", "hadn't read"]
    },
    {
      "type": "multiple_choice",
      "prompt": "Which sentence is correct?",
      "options": [
        "When I came home, my sister has cooked dinner.",
        "When I came home, my sister had cooked dinner.",
        "When I came home, my sister cooked dinner."
      ],
      "correct_index": 1
    },
    {
      "type": "multiple_choice",
      "prompt": "He was nervous because he ___ a big crowd before.",
      "options": ["never saw", "has never seen", "had never seen"],
      "correct_index": 2
    },
    {
      "type": "reorder",
      "prompt": ["They", "had", "finished", "the", "project", "before", "the", "deadline"],
      "shuffled": ["deadline", "project", "the", "before", "had", "finished", "They", "the"]
    }
  ]
}$L08$::jsonb, 8)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('future-continuous', 'Future Continuous', 'b1', 'tenses', $L09${
  "body": "## Future Continuous\n\nUse the future continuous for an action that will be **in progress at a specific point in the future**.\n\n### Form\n\n**will be + verb-ing**\n\n**Positive:** This time tomorrow I *will be flying* over the ocean.\n\n**Negative:** She *won't be working* next Monday — it's a holiday.\n\n**Question:** *Will you be using the car tonight?*\n\n### Uses\n\n| Use | Example |\n|---|---|\n| Action in progress at a future moment | At 8 pm I will be having dinner. |\n| Polite enquiry | Will you be joining us for lunch? |\n\n### Key time expressions\n*at this time tomorrow, in three hours, at 9 o'clock tonight, this time next week*",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "At midnight tonight, they ___ (still drive) to the coast.",
      "answer": ["will still be driving", "will be driving"]
    },
    {
      "type": "fill_in_blank",
      "prompt": "She ___ (not work) this time next Friday — she will be on holiday.",
      "answer": ["will not be working", "won't be working"]
    },
    {
      "type": "multiple_choice",
      "prompt": "Which sentence uses the future continuous correctly?",
      "options": [
        "I will studying at 6 pm.",
        "I will be study at 6 pm.",
        "I will be studying at 6 pm."
      ],
      "correct_index": 2
    },
    {
      "type": "multiple_choice",
      "prompt": "A polite way to ask about someone's plans:",
      "options": [
        "Will you use the printer later?",
        "Will you be using the printer later?",
        "Are you using the printer later?"
      ],
      "correct_index": 1
    },
    {
      "type": "reorder",
      "prompt": ["This", "time", "next", "year", "I", "will", "be", "working", "abroad"],
      "shuffled": ["I", "abroad", "be", "next", "will", "working", "This", "year", "time"]
    }
  ]
}$L09$::jsonb, 9)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('future-perfect', 'Future Perfect', 'b1', 'tenses', $L10${
  "body": "## Future Perfect\n\nUse the future perfect for an action that will be **completed before a specific point in the future**.\n\n### Form\n\n**will have + past participle**\n\n**Positive:** By Friday, she *will have finished* the report.\n\n**Negative:** I *won't have saved* enough money by then.\n\n**Question:** *Will you have graduated by next June?*\n\n### Timeline concept\n\n```\nNow          Future Perfect      Future point\n |               |                   |\n(speaking)   completes          by Friday\n```\n\n> **By** the time the guests arrive, we **will have cooked** everything.\n\n### Key time expressions\n*by (date/time), by the time, before, in (two hours)*",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "By next month, we ___ (complete) the renovation.",
      "answer": ["will have completed", "will have finished"]
    },
    {
      "type": "fill_in_blank",
      "prompt": "She ___ (not leave) by the time you arrive.",
      "answer": ["will not have left", "won't have left"]
    },
    {
      "type": "multiple_choice",
      "prompt": "By 2030, scientists ___ a cure for the disease.",
      "options": ["will find", "will have found", "have found"],
      "correct_index": 1
    },
    {
      "type": "multiple_choice",
      "prompt": "Which sentence is correct?",
      "options": [
        "By tomorrow, I will finish the book.",
        "By tomorrow, I will have finished the book.",
        "By tomorrow, I have finished the book."
      ],
      "correct_index": 1
    },
    {
      "type": "reorder",
      "prompt": ["Will", "you", "have", "packed", "by", "eight", "o'clock"],
      "shuffled": ["o'clock", "by", "packed", "eight", "Will", "you", "have"]
    }
  ]
}$L10$::jsonb, 10)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- B2 TENSES
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('past-perfect-continuous', 'Past Perfect Continuous', 'b2', 'tenses', $L11${
  "body": "## Past Perfect Continuous\n\nUse the past perfect continuous to show the **duration of an activity** that was in progress **before another event** in the past. It emphasises process, not completion.\n\n### Form\n\n**had been + verb-ing**\n\n**Positive:** She *had been waiting* for two hours when the bus finally came.\n\n**Negative:** He *hadn't been sleeping* well, so he was exhausted.\n\n**Question:** *How long had they been arguing before you arrived?*\n\n### vs. Past Perfect Simple\n\n| Past Perfect Continuous | Past Perfect Simple |\n|---|---|\n| Emphasises *duration* | Emphasises *completion* |\n| She had been cooking. | She had cooked dinner. |\n\n### Key signal words\n*for, since, all day, how long, before, when*",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "He ___ (work) on the painting for months before he sold it.",
      "answer": "had been working"
    },
    {
      "type": "fill_in_blank",
      "prompt": "They ___ (not date) long before they got engaged.",
      "answer": ["had not been dating", "hadn't been dating"]
    },
    {
      "type": "multiple_choice",
      "prompt": "She was out of breath because she ___.",
      "options": ["had been running", "had run", "was running"],
      "correct_index": 0
    },
    {
      "type": "multiple_choice",
      "prompt": "Which sentence emphasises duration before a past event?",
      "options": [
        "I had read the book.",
        "I had been reading for three hours when the lights went out.",
        "I was reading the book."
      ],
      "correct_index": 1
    },
    {
      "type": "reorder",
      "prompt": ["How", "long", "had", "they", "been", "waiting", "before", "you", "arrived"],
      "shuffled": ["waiting", "had", "before", "long", "you", "they", "been", "arrived", "How"]
    }
  ]
}$L11$::jsonb, 11)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('future-perfect-continuous', 'Future Perfect Continuous', 'b2', 'tenses', $L12${
  "body": "## Future Perfect Continuous\n\nUse the future perfect continuous to emphasise the **duration of an action** that will still be in progress **up to a specific point in the future**.\n\n### Form\n\n**will have been + verb-ing**\n\n**Positive:** By July, she *will have been studying* medicine for six years.\n\n**Negative:** In three months, I *won't have been living* here for a year yet.\n\n**Question:** *By graduation, how long will you have been studying?*\n\n### vs. Future Perfect Simple\n\n| Future Perfect Continuous | Future Perfect Simple |\n|---|---|\n| Focuses on *duration* | Focuses on *completion* |\n| I will have been teaching for 10 years. | I will have taught 500 students. |\n\n### Key time expressions\n*by (date), for (duration), how long*",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "By next year, I ___ (live) in this city for a decade.",
      "answer": "will have been living"
    },
    {
      "type": "fill_in_blank",
      "prompt": "In six months, she ___ (not study) English for very long.",
      "answer": ["will not have been studying", "won't have been studying"]
    },
    {
      "type": "multiple_choice",
      "prompt": "Which sentence is in the future perfect continuous?",
      "options": [
        "She will work there for years.",
        "She will have been working there for ten years by December.",
        "She has been working there for years."
      ],
      "correct_index": 1
    },
    {
      "type": "multiple_choice",
      "prompt": "By the time he retires, he ___ for forty years.",
      "options": [
        "will teach",
        "will have been teaching",
        "has been teaching"
      ],
      "correct_index": 1
    },
    {
      "type": "reorder",
      "prompt": ["By", "March", "they", "will", "have", "been", "building", "the", "bridge", "for", "two", "years"],
      "shuffled": ["building", "for", "bridge", "two", "been", "March", "they", "By", "will", "years", "have", "the"]
    }
  ]
}$L12$::jsonb, 12)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- FOUNDATIONAL TOPICS
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('articles', 'Articles: a, an, the', 'a1', 'foundational', $L13${
  "body": "## Articles: a, an, the\n\nEnglish has three articles: **a**, **an**, and **the**. Choosing the right one depends on whether the noun is specific or general.\n\n### Indefinite: a / an\n\nUse **a** before consonant sounds, **an** before vowel sounds.\n\n> a *dog*, a *university* (sounds like 'you') \n> an *apple*, an *hour* (silent h)\n\nUse **a / an** when:\n- Mentioning something for the **first time**\n- It is **one of many** (not specific)\n\n> I saw *a* film last night. She is *a* teacher.\n\n### Definite: the\n\nUse **the** when:\n- Both speaker and listener know **which one** is meant\n- Something has been **mentioned before**\n- There is **only one** of something\n\n> Close *the* door. *The* sun is hot. I bought a book. *The* book is great.\n\n### Zero article\n\nNo article before **plural** or **uncountable** nouns used in a general sense.\n\n> *Dogs* are friendly. *Water* is essential. I love *music*.",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "She is ___ engineer.",
      "answer": "an"
    },
    {
      "type": "fill_in_blank",
      "prompt": "___ Earth is the third planet from the Sun.",
      "answer": "The"
    },
    {
      "type": "multiple_choice",
      "prompt": "I saw ___ interesting film. Later ___ film won an award.",
      "options": ["an / the", "the / a", "a / an"],
      "correct_index": 0
    },
    {
      "type": "multiple_choice",
      "prompt": "Which sentence uses articles correctly?",
      "options": [
        "He wants to be the doctor.",
        "He wants to be a doctor.",
        "He wants to be an doctor."
      ],
      "correct_index": 1
    },
    {
      "type": "reorder",
      "prompt": ["Can", "you", "open", "the", "window", "please"],
      "shuffled": ["please", "window", "open", "Can", "the", "you"]
    }
  ]
}$L13$::jsonb, 13)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('prepositions', 'Prepositions of Time and Place', 'a2', 'foundational', $L14${
  "body": "## Prepositions of Time and Place\n\nPrepositions show the **relationship** between a noun and another element. The most common are **in, on, at**.\n\n### Time\n\n| Preposition | Use | Examples |\n|---|---|---|\n| **at** | specific times, holidays | at 8 o'clock, at Christmas |\n| **on** | days and dates | on Monday, on 5 June |\n| **in** | months, years, seasons, periods | in July, in 2020, in the morning |\n\n### Place\n\n| Preposition | Use | Examples |\n|---|---|---|\n| **at** | a point or location | at the bus stop, at home |\n| **on** | a surface | on the table, on the wall |\n| **in** | enclosed space | in the box, in London |\n\n### Other common prepositions\n- **from … to** — I work from 9 to 5.\n- **by** — Come by 6 pm.\n- **until / till** — I stayed until midnight.",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "The meeting starts ___ 10 o'clock ___ Monday.",
      "answer": ["at, on", "at … on"]
    },
    {
      "type": "fill_in_blank",
      "prompt": "She was born ___ July 1995.",
      "answer": "in"
    },
    {
      "type": "multiple_choice",
      "prompt": "The keys are ___ the table.",
      "options": ["in", "at", "on"],
      "correct_index": 2
    },
    {
      "type": "multiple_choice",
      "prompt": "We arrived ___ Paris ___ the evening.",
      "options": ["at / in", "in / in", "on / at"],
      "correct_index": 0
    },
    {
      "type": "reorder",
      "prompt": ["The", "train", "leaves", "at", "half", "past", "eight"],
      "shuffled": ["half", "eight", "leaves", "at", "The", "past", "train"]
    }
  ]
}$L14$::jsonb, 14)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('conditionals', 'Conditionals (0, 1st, 2nd)', 'b1', 'foundational', $L15${
  "body": "## Conditionals\n\nConditional sentences describe **what happens if** something else is true. There are four main types; this lesson covers the first three.\n\n### Zero Conditional — general truths\n\n**If + present simple, present simple**\n\n> *If you heat water to 100°C, it boils.* (always true)\n\n### First Conditional — real future possibility\n\n**If + present simple, will + base verb**\n\n> *If it rains tomorrow, I will stay home.* (likely to happen)\n\n### Second Conditional — unreal / hypothetical\n\n**If + past simple, would + base verb**\n\n> *If I won the lottery, I would travel the world.* (unlikely or impossible)\n\n### Tips\n- Use **were** (not *was*) in formal second conditionals: *If I were you…*\n- The **if-clause** can come first or second: *I would call if I had time.*\n\n### Summary table\n\n| Type | Condition | Result |\n|---|---|---|\n| Zero | present simple | present simple |\n| First | present simple | will + base |\n| Second | past simple | would + base |",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "If you ___ (not study), you will fail the exam. (First conditional)",
      "answer": ["do not study", "don't study"]
    },
    {
      "type": "fill_in_blank",
      "prompt": "If I ___ (be) a bird, I would fly to warm countries. (Second conditional)",
      "answer": "were"
    },
    {
      "type": "multiple_choice",
      "prompt": "Which is a zero conditional?",
      "options": [
        "If it rains, I will take an umbrella.",
        "If you mix blue and yellow, you get green.",
        "If I were rich, I would buy a yacht."
      ],
      "correct_index": 1
    },
    {
      "type": "multiple_choice",
      "prompt": "If she ___ harder, she would pass the exam.",
      "options": ["studies", "studied", "will study"],
      "correct_index": 1
    },
    {
      "type": "reorder",
      "prompt": ["If", "I", "had", "more", "time", "I", "would", "learn", "to", "paint"],
      "shuffled": ["to", "paint", "more", "would", "If", "had", "learn", "I", "time", "I"]
    }
  ]
}$L15$::jsonb, 15)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO grammar_lessons (slug, title, level, category, content, order_index) VALUES
('modal-verbs', 'Modal Verbs', 'a2', 'foundational', $L16${
  "body": "## Modal Verbs\n\nModal verbs express **ability, obligation, advice, possibility**, and **permission**. They are always followed by a **base verb** (infinitive without *to*).\n\n### Key modals\n\n| Modal | Main use | Example |\n|---|---|---|\n| **can** | ability / permission | I can swim. Can I sit here? |\n| **could** | past ability / polite request | She could read at age four. Could you help me? |\n| **should** | advice / recommendation | You should see a doctor. |\n| **must** | strong obligation / deduction | You must wear a seatbelt. He must be tired. |\n| **might / may** | possibility | It might rain. You may leave. |\n| **will** | future / certainty | She will be here soon. |\n\n### Important rules\n\n- **No -s in third person:** He *can* speak (not ~~he cans~~).\n- **Followed by base verb:** You should *go* (not ~~should going~~).\n- **Negative:** add *not* → cannot (can't), should not (shouldn't).",
  "exercises": [
    {
      "type": "fill_in_blank",
      "prompt": "You ___ (obligation) wear a helmet when cycling.",
      "answer": ["must", "should"]
    },
    {
      "type": "fill_in_blank",
      "prompt": "She ___ speak three languages when she was twelve. (past ability)",
      "answer": "could"
    },
    {
      "type": "multiple_choice",
      "prompt": "Which sentence is grammatically correct?",
      "options": [
        "He musts leave now.",
        "He must to leave now.",
        "He must leave now."
      ],
      "correct_index": 2
    },
    {
      "type": "multiple_choice",
      "prompt": "I'm not sure, but it ___ be the right answer.",
      "options": ["must", "might", "should"],
      "correct_index": 1
    },
    {
      "type": "reorder",
      "prompt": ["You", "should", "not", "eat", "so", "much", "sugar"],
      "shuffled": ["sugar", "much", "not", "eat", "You", "so", "should"]
    }
  ]
}$L16$::jsonb, 16)
ON CONFLICT (slug) DO NOTHING;
