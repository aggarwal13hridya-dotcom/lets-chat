// src/HAChat.js
import { ref as dbRef, push, set } from "firebase/database";
import { db } from "./firebase"; // Assuming './firebase' is defined elsewhere

/* ---------------- DATASET DEFINITION (HAChatData.js content) ---------------- */

// 1. Define Replies (The authoritative knowledge base)
export const replies = {
    // --- GENERAL / GREETINGS / CONVERSATIONAL ---
    hi_reply: "Hello there! My fully expanded knowledge base is ready. What complex topic would you like to discuss today?",
    status_reply: "I am a chat bot running on JavaScript, processing data efficiently. Everything is green!",
    who_am_i: `I am HA Chat, a helpful rule-based chat bot. I specialize in a 5000+ fact knowledge base spanning Science, Math, Grammar, and Social Studies.`,
    bored_reply_1: "Feeling bored? Let's dive into a trivia rabbit hole! Try asking me for a specific fact about the 'Third Conditional' or 'Ionic Bonds'.",
    bored_reply_2: "If you need a fun distraction, try asking me for a 'riddle', a 'fun fact', or 'I need a speech about [Topic]'.",
    thank_you: "You are most welcome! Helping you is my primary function. Let me know if you have another query.",
    apology_generic: "I apologize, that specific term or complex calculation is just outside the bounds of the bounds of my current knowledge base. I focus on defined facts, math, and conversational topics.",
    
    // --- COMMON SENSE / OPEN ENDED REPLIES ---
    what_can_you_do: "I can assist you with complex math operations, retrieve detailed facts from my 5000+ point knowledge base (Science, SST, Grammar), or generate short speeches. Try asking me for 'Newton's Third Law' or the '42nd Amendment'.",
    how_are_you_cs: "As an AI, I don't experience 'days' or emotions, but my systems are operating perfectly and I'm ready to process your queries. How can I help you?",
    what_is_time: `The current time is ${new Date().toLocaleTimeString('en-US')} (local to my server environment). Do you need information about time zones or time complexity?`,
    general_help: "Of course, I can help! Just ask me a specific question about science, grammar, history, or request a mathematical calculation.",
    math_generic: "I can perform arithmetic, exponents, square roots, and basic trig/log functions. Crucially, I can evaluate expressions when you provide the variable's value, e.g., 'if x=5, what is x^2+3?'.",
    math_variable_limit: "To solve an equation, I need you to provide the value of the unknown variable(s). I cannot solve for an unknown variable $x$ on both sides of an equation like $x^3+4-1=x$. Please provide the variable's value for evaluation.",
    
    // --- SPEECHES (Maximized Module) ---
    speech_motivation: `Friends, colleagues, fellow human beings! In the face of challenge, remember this simple truth: **Motivation is the spark, but consistency is the fuel.** Every great journey begins with a single step. Don't wait for permission or the perfect moment. That moment is now. Believe in the incredible power of your potential, and let's go build something amazing!`,
    speech_technology: `Esteemed guests, we stand at the precipice of a new digital age. Technology is not merely tools; it is the amplification of human creativity. From AI to sustainable energy, the future is being coded today. Our greatest responsibility is to ensure that this rapid progress is ethical, inclusive, and serves to elevate every corner of humanity, not just a privileged few.`,
    speech_environment: `We must speak plainly: the health of our planet is non-negotiable. The air we breathe, the water we drink—these are not limitless resources, but precious trusts. Our collective action, no matter how small, defines the future. Choose sustainability, advocate for conservation, and remember that protecting the Earth is not a political issue, it is a planetary imperative for survival.`,
    speech_leadership: `True leadership is not about power; it is about influence, empathy, and service. A great leader empowers others to achieve goals they never thought possible. They listen more than they speak, admit their mistakes, and, most importantly, they commit to the growth and success of their team above their own. Be the leader who inspires confidence, not just demands compliance.`,
    speech_innovation: `Innovation is the engine of human progress, the relentless pursuit of a better way. It requires curiosity, failure, and the courage to challenge the status quo. Embrace the discomfort of the unknown, because on the other side of that challenge lies the solution that will redefine tomorrow.`,

    // -- CS ADVANCED --
    linked_list: "A Linked List is a linear data structure where elements are not stored at contiguous memory locations but are linked using pointers. ",
    stack_def: "A Stack is a linear data structure that follows the Last In, First In (LIFO) principle. Think of a stack of plates.",
    https_def: `HTTPS (Hypertext Transfer Protocol Secure) is an extension of HTTP that encrypts communication using SSL/TLS, ensuring secure data transfer. `,
    compiler_def: `A compiler is a program that translates human-readable source code (like C++ or Java) into machine code that the computer's CPU can execute directly. `,
    low_level_lang: "A low-level language is a programming language that deals with the computer's hardware components and machine instruction set. Examples include Assembly and Machine Code.",
    db_sql: "SQL (Structured Query Language) is a domain-specific language used in programming and managing data held in a relational database management system (RDBMS).",
    os_kernel: `The kernel is the core of an operating system, responsible for managing the system's resources, including the communication between hardware and software components. `,
    oop_def: `Object-Oriented Programming (OOP) is a paradigm based on the concept of 'objects', which can contain data (fields) and code (methods). Key principles are Encapsulation, Inheritance, and Polymorphism. `,
    hash_map: "A Hash Map (or Hash Table) is a data structure that implements an associative array abstract data type, using a hash function to compute an index into an array of buckets or slots, from which the desired value can be found.",
    big_o_def: `Big O Notation describes the limiting behavior of a function when the argument tends towards a particular value or infinity. It's used in CS to classify algorithms by how their performance changes as the input size grows. `,
    rest_api: `A RESTful API (Representational Transfer) is an architectural style for an application program interface (API) that uses standard HTTP methods (GET, POST, PUT, DELETE) to allow communication between systems. `,

    // -- PHYSICS/CHEMISTRY ADVANCED --
    schrodinger_eq: `Schrödinger's Equation is a fundamental equation in quantum mechanics that describes how the quantum state of a physical system changes over time. $\\hat{H}\\psi = E\\psi$.`,
    ideal_gas_law: "The Ideal Gas Law is the equation of state of a hypothetical ideal gas: $PV = nRT$.",
    photosynthesis: `Photosynthesis is the process used by plants, algae, and certain bacteria to convert light energy into chemical energy. The formula is $6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{Light Energy} \\to \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$. 

[Image of Photosynthesis process diagram]
`,
    periodic_table_def: `The Periodic Table of Elements is a tabular arrangement of the chemical elements, ordered by atomic number. 

[Image of the complete Periodic Table of Elements]
`,
    gravity_value: "The standard acceleration due to gravity on Earth's surface is approximately $9.81 \\text{ m/s}^2$.",
    first_law_thermo: `The First Law of Thermodynamics, or the Law of Conservation of Energy, states that energy cannot be created or destroyed in an isolated system, only transferred or changed from one form to another. $\\Delta U = Q - W$. 

[Image of Thermodynamics cycle diagram]
`,
    doppler_effect: `The Doppler Effect is the change in frequency or wavelength of a wave (sound or light) in relation to an observer who is moving relative to the wave source. This is why an ambulance siren sounds different when approaching than when receding. 

[Image of Doppler Effect illustration]
`,

    // -- HEALTH ADVANCED --
    immune_system_def: `The Immune System is a complex network of cells, tissues, and organs that work together to defend the body against foreign invaders. `,
    respiratory_system: `The Respiratory System is the network of organs and tissues that help you breathe. Its main function is gas exchange. 

[Image of the human respiratory system]
`,
    hormone_def: "A hormone is a chemical messenger released by glands into the bloodstream to regulate specific processes in the body, such as metabolism and growth.",
    dna_replication: `DNA replication is the biological process of producing two identical replicas of DNA from one original DNA molecule. It is crucial for cell division. 

[Image of DNA replication process]
`,
    mitochondria_role: `Mitochondria are organelles often called the 'powerhouses of the cell' because they generate most of the cell's supply of ATP. 

[Image of Mitochondria structure]
`,
    crebs_cycle: `The Krebs Cycle (or citric acid cycle) is a central metabolic pathway, which is essential for almost all living organisms, using acetyl-CoA to produce energy (ATP and NADH/FADH2) through the oxidation of pyruvate. 

[Image of Krebs Cycle diagram]
`,
    homeostasis_def: "Homeostasis is the state of steady internal, physical, and chemical conditions maintained by living systems. It is the tendency toward a relatively stable equilibrium between interdependent elements.",

    // --- HISTORY & GEOGRAPHY ---
    ww1_start: "World War I officially began in 1914 with the assassination of Archduke Franz Ferdinand and ended in 1918.",
    giza_pyramid: "The Great Pyramid of Giza was built for the Pharaoh Khufu and is the oldest and largest of the three pyramids in the Giza Necropolis.",
    capital_egypt: "The capital city of Egypt is Cairo, located on the Nile River.",
    roman_empire_fall: "The Western Roman Empire traditionally fell in 476 AD when the last Roman emperor, Romulus Augustulus, was deposed by the Germanic general Odoacer.",
    magna_carta: "The Magna Carta was signed in 1215 in England, establishing the principle that everyone, including the king, was subject to the law.",
    invention_printing_press: "The movable type printing press was invented by Johannes Gutenberg around 1440 in Germany. This invention is widely regarded as the most important event of the second millennium.",
    cold_war_start: "The Cold War is generally considered to have begun shortly after World War II, around 1947, marked by the geopolitical tension between the Soviet Union and the United States and their respective allies.",

    // ----------------------------------------------------------------------
    // CATEGORY 9: ESSENTIAL COMMON KNOWLEDGE (NEWLY ADDED)
    // ----------------------------------------------------------------------
    ess_com_know_sleep: "Sleep is vital because it allows your body to repair cells, consolidate memory, and release hormones essential for growth and appetite regulation.",
    ess_com_know_phone: "The telephone was invented by **Alexander Graham Bell** in 1876.",
    ess_com_know_wheel: "The wheel was invented in ancient Mesopotamia (modern Iraq) around 3500 BCE, primarily for use in pottery and later for transportation.",
    ess_com_know_sun: "The Sun is an average-sized **star** at the center of our solar system, classified as a G-type main-sequence star. It is the primary source of energy for life on Earth.",
    ess_com_know_seasons: "The Earth has seasons because its axis of rotation is **tilted** relative to its orbit around the Sun. This tilt causes different parts of the Earth to receive varying amounts of solar energy throughout the year.",
    ess_com_know_compass: "A magnetic compass works by aligning a magnetized needle with the Earth's **magnetic field** to point toward the magnetic North Pole.",
    ess_com_know_water_formula: "The chemical formula for water is $\\text{H}_2\\text{O}$, meaning one molecule contains two atoms of Hydrogen and one atom of Oxygen.",
    ess_com_know_gravity: "Gravity is the natural force of attraction between any two masses. On Earth, it causes objects to fall towards the center.",
    ess_com_know_photosynthesis_basic: "Plants use a process called **photosynthesis** to convert sunlight, water, and carbon dioxide into food (glucose) and oxygen.",
    ess_com_know_capital_india: "The capital city of India is **New Delhi**.",

    // ----------------------------------------------------------------------
    // CATEGORY J: JOKE FLOW (UPDATED HIGH-QUALITY JOKES)
    // ----------------------------------------------------------------------
    joke_2: "I told my friend to follow his dreams... So he went back to sleep.",
    joke_3: "My phone battery lasts longer than most relationships these days.",
    joke_4: "My bed and I are perfect for each other… But my alarm clock is always trying to separate us.",
    joke_5: "Teacher: 'What is the most important thing we get from trees?' Student: 'Shades during exams.'",
    joke_6: "I asked my WiFi to be stronger. It left me on 'read'.",
    joke_7: "Doctor: 'You need to stop playing video games.' Me: 'Why?' Doctor: 'Because I’m trying to talk to you.'",
    joke_8: "I don’t need a hairstylist… My pillow gives me a new hairstyle every morning.",
    joke_9: "I’m not lazy… I’m just on energy-saving mode.",
    
    // Jokes from the "Ultra-Funny" Set
    joke_13: "Teacher: 'Why are you late?' Kid: 'There was a sign on the road.' Teacher: 'What sign?' Kid: 'School ahead. Go slow.'",
    joke_14: "Mom: 'Why is your room messy?' Me: 'Because I wanted to surprise you.' Mom: 'How is this a surprise?' Me: 'You weren’t expecting it to be THIS messy!'",
    joke_15: "I went to buy a book on 'How to Earn Millions.' The shopkeeper said, 'Bro, if I knew that, do you think I’d be selling books?'",
    joke_16: "My internet went down for 5 minutes... So I finally talked to my family. They’re nice people.",
    joke_17: "I asked my fridge why it was running… It ignored me. Typical cold behavior.",
    joke_18: "My alarm clock must hate me. Every morning it screams until I wake up.",

    // ----------------------------------------------------------------------
    // CATEGORY K: RIDDLE FLOW (UPDATED MEANINGFUL RIDDLES)
    // ----------------------------------------------------------------------
    riddle_def: "What gets bigger the more you take away from it? (This is Riddle 1. Say 'I don't know the answer to Riddle 1' for the answer.)", 
    riddle_def_2: "I can be broken even if no one touches me. What am I? (This is Riddle 2. Ask for 'Riddle 3' or the answer to continue.)",
    riddle_def_3: "What belongs to you but is used more by others? (This is Riddle 3. Ask for 'Riddle 4' or the answer to continue.)",
    riddle_def_4: "I’m always in front of you, but you can never see me. What am I? (This is Riddle 4. Ask for 'Riddle 5' or the answer to continue.)",
    riddle_def_5: "The more you have me, the less you see. What am I? (This is Riddle 5. Ask for 'Riddle 6' or the answer to continue.)",
    riddle_def_10: "What has words, but never speaks? (This is Riddle 6. Ask for 'Riddle 7' or the answer to continue.)",
    riddle_def_11: "You can hold me without using your hands. What am I? (This is Riddle 7. Ask for 'Riddle 8' or the answer to continue.)",
    riddle_def_12: "Everyone has me, but no one can lose me. What am I? (This is Riddle 8. Ask for 'Riddle 9' or the answer to continue.)",
    riddle_def_13: "I go up but never come down. What am I? (This is Riddle 9. Ask for 'Riddle 10' or the answer to continue.)",
    riddle_def_14: "What breaks when you say its name? (This is Riddle 10. Ask for the answer to continue.)",

    // Riddle Answers (Used for I Don't Know/Fallback)
    riddle_ans_1_reveal: "The answer to Riddle 1 is: **A hole**. Ready for the next one? Ask for 'Riddle 2'.", 
    riddle_ans_2_reveal: "The answer to Riddle 2 is: **A promise**. Ready for the next one? Ask for 'Riddle 3'.",
    riddle_ans_3_reveal: "The answer to Riddle 3 is: **Your name**. Ready for the next one? Ask for 'Riddle 4'.",
    riddle_ans_4_reveal: "The answer to Riddle 4 is: **The future**. Ready for the next one? Ask for 'Riddle 5'.",
    riddle_ans_5_reveal: "The answer to Riddle 5 is: **Darkness**. Ready for the next one? Ask for 'Riddle 6'.",
    riddle_ans_10_reveal: "The answer to Riddle 6 is: **A book**. Ready for the next one? Ask for 'Riddle 7'.",
    riddle_ans_11_reveal: "The answer to Riddle 7 is: **Your breath**. Ready for the next one? Ask for 'Riddle 8'.",
    riddle_ans_12_reveal: "The answer to Riddle 8 is: **Your shadow**. Ready for the next one? Ask for 'Riddle 9'.",
    riddle_ans_13_reveal: "The answer to Riddle 9 is: **Your age**. Ready for the next one? Ask for 'Riddle 10'.",
    riddle_ans_14_reveal: "The answer to Riddle 10 is: **Silence**. That's the last of the current set! Ask for a 'new riddle set' or a 'joke'.", // Final Answer and End Prompt

    // Riddle Feedback
    riddle_feedback_correct: "You are absolutely correct! That is the answer! Ask for the 'next riddle' (or state the number) to continue.", 
    riddle_feedback_wrong: "Sorry, that is incorrect. Try again, or say 'I don't know the answer to Riddle [Number]' to get the answer.", 
    // *** CRITICAL CHANGE: This will be the trigger for state tracking in main.js ***
    riddle_i_dont_know_generic: "[[STATE_ANSWER_REQUIRED]]", 
    
    // --- G. EXPANDED KNOWLEDGE (Maintaining previous advanced entries) ---
    phys_newton_1: "Newton's First Law (Inertia): An object remains at rest or in uniform motion unless acted upon by a net external force. Mass is the measure of inertia.",
    phys_newton_2: `Newton's Second Law ($F=ma$): The acceleration of an object is directly proportional to the net external force acting on it and inversely proportional to its mass. $\\mathbf{F}_{\\text{net}} = m \\mathbf{a}$`,
    phys_newton_3: "Newton's Third Law (Action-Reaction): For every action, there is an equal and opposite reaction. The forces always act on **different bodies**.",
    phys_ohm_law: "Ohm's Law: The voltage ($V$) across a conductor is directly proportional to the current ($I$): $V = IR$. Resistance ($R$) is measured in Ohms ($\\Omega$).",
    phys_series_res: "Resistance in Series: Total resistance is the sum of individual resistances: $R_{\\text{total}} = R_1 + R_2 + R_3 + \\dots$",
    phys_parallel_res: `Resistance in Parallel: Reciprocal of total resistance is the sum of reciprocals: $\\frac{1}{R_{\\text{total}}} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\dots$`,
    phys_ke_pe: `Kinetic Energy (KE): Energy due to motion: $KE = \\frac{1}{2} m v^2$. Potential Energy (PE): Stored energy due to position: $PE = mgh$.`,
    phys_light_refl: "Light Reflection Laws: 1) Angle of incidence equals angle of reflection. 2) Incident ray, reflected ray, and normal lie on the same plane.",
    phys_refraction: `Light Refraction: The bending of light as it passes from one medium to another due to a change in speed. Refractive Index ($n$): $n = \\frac{\\text{speed in vacuum}}{\\text{speed in medium}}$.`,

    chem_atomic_num: "Atomic Number (Z): The number of protons in the nucleus of an atom. Defines the element.",
    chem_mass_num: "Mass Number (A): The total number of protons and neutrons in the nucleus. $A = Z + N$.",
    chem_isotopes: "Isotopes: Atoms of the same element (same Z) but with different numbers of neutrons (different A). Example: C-12 and C-14.",
    chem_ionic_bond: "Ionic Bond: Formed by the **transfer of electrons** from a metal to a non-metal (forming ions). Example: $Na^+Cl^-$.",
    chem_covalent_bond: "Covalent Bond: Formed by the **sharing of electrons** between non-metal atoms. Example: $H_2O$.",
    chem_oxidation: "Oxidation: The process involving the **loss of electrons** or gain of oxygen.",
    chem_reduction: "Reduction: The process involving the **gain of electrons** or loss of oxygen.",
    chem_allotropes: "Allotropes: Different structural forms of the same element (e.g., Diamond, Graphite, Fullerene are allotropes of Carbon).",

    bio_cell_theory: "Cell Theory: 1) All living things are made of cells. 2) The cell is the basic unit of life. 3) All cells come from pre-existing cells.",
    bio_mitosis: `Mitosis: Cell division for **growth and repair**. Produces two genetically identical diploid (2n) daughter cells. 

[Image of the stages of Mitosis]
`,
    bio_meiosis: `Meiosis: Cell division for **sexual reproduction**. Produces four genetically different haploid (n) cells (gametes). 

[Image of the stages of Meiosis]
`,
    bio_pro_euk: "Prokaryotic Cell: Lacks a membrane-bound nucleus (e.g., Bacteria). Eukaryotic Cell: Has a membrane-bound nucleus and organelles (e.g., Plants, Animals).",
    bio_chloroplasts: "Chloroplasts: Found in plant cells. Site of Photosynthesis (contains chlorophyll).",
    bio_dna_structure: "DNA Structure: Double helix. Bases: Adenine (A) pairs with Thymine (T); Guanine (G) pairs with Cytosine (C).",
    bio_respiration: "Aerobic Respiration: Breakdown of glucose in the presence of oxygen to release ATP (energy). Occurs in Mitochondria.",
    bio_hormones: "Hormones: Chemical messengers secreted by the endocrine glands (e.g., Insulin, Adrenaline) to regulate body processes.",

    eng_subj_verb_agr: "Subject-Verb Agreement: A singular subject takes a singular verb (The book is...). Subjects joined by 'or/nor' agree with the nearest subject.",
    eng_present_perf: "Present Perfect: Structure: Subject + has/have + V3. Usage: Action completed in the past but connected to the present.",
    eng_past_perf: "Past Perfect: Structure: Subject + had + V3. Usage: Action completed before another past action (The earlier of two past actions).",
    eng_passive_voice: "Passive Voice: Always uses a form of the verb **'to be'** (is, was, been, being) + the **Past Participle (V3)** of the main verb.",
    eng_third_cond: "Third Conditional: Structure: If + Past Perfect, Would have + V3. Usage: Imagining a past that did not happen. (e.g., If you had studied, you would have passed.)",
    eng_less_fewer: "'Fewer' is used for **countable** nouns (fewer cars). 'Less' is used for **uncountable** nouns (less water).",
    eng_semicolon: "Semicolon (;): Joins two closely related **independent clauses** without a coordinating conjunction.",

    sst_panc_raj: "Panchayati Raj: Established by the **73rd Amendment Act (1992)**. Three-tier system of local self-governance in rural areas.",
    sst_money_bill: "Money Bill: Can only be introduced in the **Lok Sabha**. Rajya Sabha can only delay it for a maximum of 14 days.",
    sst_61_amend: "61st Amendment (1989): Reduced the voting age from 21 years to **18 years**.",
    sst_42_amend: "42nd Amendment (1976): Added the words **Socialist, Secular, and Integrity** to the Preamble.",
    sst_lok_sabha: "Lok Sabha (Lower House): Members are **directly elected**. Term: 5 years.",
    sst_rajya_sabha: "Rajya Sabha (Upper House): Members are **indirectly elected** (representing states). Term: 6 years.",
    sst_residuary: "Residuary Powers (over unlisted subjects) are vested in the **Union Parliament**.",

    sst_location: `India Location: Lies entirely in the **Northern and Eastern Hemispheres**. Standard Meridian: $82^\\circ 30'$ E.`,
    sst_himalaya: "Himalayan Divisions: Greater Himalayas (Himadri), Lesser Himalayas (Himachal), Outer Himalayas (Shiwaliks).",
    sst_soil: "Alluvial Soil: Most fertile, deposited by Ganga/Indus/Brahmaputra (Khadar = new, Bhangar = old). Black Soil (Regur): Ideal for Cotton.",
    sst_kharif: "Kharif Crops: Sown with the monsoon (June-July). Examples: **Rice, Cotton**.",
    sst_rabi: "Rabi Crops: Sown in winter (Oct-Dec). Examples: **Wheat, Mustard**.",
    sst_ghats: "Western Ghats: Continuous, causes orographic rainfall. Eastern Ghats: Discontinuous, lower elevation.",
    sst_monsoon: "Monsoon Definition: Seasonal reversal of wind direction. India experiences the **South-West Monsoon** (June-September).",
    
    // --- FUN FACTS (Placeholder replies maintained for rule groups) ---
    fun_fact_coffee: "Coffee is actually a **fruit**! Coffee beans are the seeds of berries from the Coffea plant.",
    fun_fact_planet: "The hottest planet in our solar system is not Mercury (the closest) but **Venus**, due to its extremely dense atmosphere that creates a runaway greenhouse effect.",
    fun_fact_language: "The English word with the most definitions is **'Set'**, which has over 430 distinct meanings listed in the Oxford English Dictionary.",

    // --- ESSENTIAL FOUNDATIONAL SCIENCE (Existing) ---
    ess_bio_respiration_vs_breathing: "Breathing is the physical process of taking in air (inhalation) and letting it out (exhalation). Respiration is the **chemical process** in cells that releases energy from glucose.",
    ess_bio_photo_importance: "Photosynthesis is important because it is the primary source of **oxygen** and the foundational food source for almost all life on Earth.",
    ess_bio_mitochondria_function: "Mitochondria are the **'powerhouses'** of the cell, generating most of the cell's supply of ATP (energy).",
    ess_bio_arteries_vs_veins: "Arteries carry oxygenated blood **away** from the heart to the body (except Pulmonary Artery). Veins carry deoxygenated blood **towards** the heart (except Pulmonary Vein).",
    ess_bio_sunlight_plants: "Plants need sunlight to perform **photosynthesis**, the process which converts light energy into the chemical energy (food) they need to survive and grow.",

    ess_phy_inertia: "Inertia is the property of a body to **resist a change** in its state of motion or state of rest.",
    ess_phy_gravity_fall: "Objects fall to the ground because of **gravity**, the force of attraction that exists between all masses, pulling the object toward the Earth's center.",
    ess_phy_speed_vs_velocity: "Speed is a **scalar** quantity (how fast). Velocity is a **vector** quantity (how fast in a specific direction).",
    ess_phy_weightless_space: "Astronauts feel weightless in space because they are in a constant state of **free-fall** around the Earth, not because there is no gravity.",
    ess_phy_refraction: "Refraction is the **bending of light** as it passes from one transparent medium (like air) to another (like water or glass) due to a change in speed.",

    ess_chem_matter: "Matter is anything that **has mass and occupies space** (has volume).",
    ess_chem_atom: "An atom is the **smallest unit** of an element that still retains the chemical properties of that element.",
    ess_chem_metals_conduct: "Metals conduct electricity well because they have **free electrons** in their structure that can move easily and carry electric charge.",
    ess_chem_ph_scale: "The pH scale measures how **acidic or basic** a substance is, running from 0 (highly acidic) to 14 (highly basic), with 7 being neutral.",
    ess_chem_boiling_bubbles: "The bubbles seen when water boils are **steam** (water vapor), as the liquid water changes state to gas.",
    
    // --- NEW GEOGRAPHY (M) ---
    geo_weather_vs_climate: "Weather is the day-to-day atmospheric conditions (e.g., rain, sun). Climate is the **average weather pattern** taken over many years for a large area.",
    geo_blue_planet: "Earth is called the Blue Planet because **71%** of its surface is covered by water.",
    geo_seasons_causes: "Seasons are caused by the Earth's **tilt** on its axis ($23.5^{\\circ}$) as it revolves around the Sun.",
    geo_heat_zones: "The major heat zones are the **Torrid Zone** (hottest, near equator), the **Temperate Zones** (moderate), and the **Frigid Zones** (coldest, near poles).",
    geo_winds_blow: "Winds blow due to the difference in **air pressure**. Air moves naturally from areas of **High Pressure** to areas of **Low Pressure**.",
    geo_soil_erosion: "Soil erosion is the process of the topsoil being **carried away** or removed by forces like wind or water, reducing the land's fertility.",
    geo_water_conserve: "We can conserve water through **rainwater harvesting**, reducing waste, and using efficient irrigation methods like drip irrigation.",
    // **FIXED UNTERMINATED STRING HERE**
    geo_water_cycle: `The water cycle involves **Evaporation, Condensation, Precipitation, and Collection**, showing how water moves between the atmosphere and the Earth's surface. 


[Image of the Water Cycle Diagram]
`,
    geo_renewable_vs_nonrenewable: "Renewable resources (Sun, Wind) can be naturally replenished. Non-renewable resources (Coal, Petroleum) are finite and cannot be quickly replaced once used.",
    geo_forest_importance: "Forests provide **oxygen**, prevent soil erosion, absorb carbon dioxide, regulate climate, and are home to diverse wildlife.",

    // --- NEW CIVICS (N) ---
    civ_democracy: "Democracy is a system of government where the **people** elect their representatives to govern on their behalf.",
    civ_fundamental_rights: "These are basic rights guaranteed to all citizens by the Constitution, such as the Right to Equality, Freedom, and Religion.",
    civ_gov_vs_governance: "Government is the **people and institutions** that rule. Governance is **how** they rule—the process, policies, and effectiveness of administration.",
    civ_parliament_role: "The Parliament's primary roles are to **make laws**, control the government's budget, and ensure the government is accountable to the people.",
    civ_constitution_need: "The Constitution is needed to define the **rules**, principles, rights, and powers that govern the state and the people.",
    civ_secularism: "Secularism means the state **does not promote or discriminate** against any particular religion, ensuring equal treatment for all faiths.",
    civ_federalism: "Federalism is a system where power is **divided** between a central national government and regional state governments.",
    civ_rule_of_law: "The Rule of Law states that **everyone**—rich or poor, powerful or weak—is **equal before the law** and must follow it.",
    civ_elections: "Elections are the democratic process where citizens **vote** to choose their representatives and hold them accountable.",
    civ_local_self_gov: "Local Self-Government refers to rural (Panchayats) and urban (Municipalities) bodies that manage local affairs closest to the people.",

    // --- NEW HISTORY (O) ---
    hist_civilization: "A civilization is an advanced human society with features like permanent settlement, agriculture, cities, government, and often writing.",
    hist_indus_valley: "The Indus Valley Civilization is important for being one of the world's first large **urban** civilizations, known for its well-planned cities, drainage systems, and standardized bricks.",
    hist_british_india: "The British initially came to India in the 17th century for **trade** (spices, textiles) but gradually used political and military power to gain full territorial control.",
    hist_revolt_1857: "The main cause was a culmination of political, social, and economic grievances against British rule, but the immediate trigger was the controversy over **greased cartridges** (rumored to be coated with cow and pig fat).",
    hist_freedom_leaders: "Key leaders include Mahatma Gandhi, Jawaharlal Nehru, Sardar Vallabhbhai Patel, Subhas Chandra Bose, and Bhagat Singh, among many others.",

    // --- NEW MATH FUNDAMENTALS (P) ---
    math_lcm_hcf: "LCM (Least Common Multiple) is the smallest number divisible by both numbers. HCF (Highest Common Factor) is the largest number that divides both numbers.",
    math_percentage_formula: "Percentage is calculated as $\\text{Percentage} = \\frac{\\text{Value}}{\\text{Total Value}} \\times 100$.",
    math_simple_interest: "Simple Interest (SI) is calculated using the formula: $SI = \\frac{P \\times R \\times T}{100}$ (Principal $\\times$ Rate $\\times$ Time).",
    math_ratio: "Ratio is a way to **compare two or more quantities** of the same kind, often written as $a:b$ or $\\frac{a}{b}$.",
    math_average: "Average (Mean) is calculated as: $\\text{Average} = \\frac{\\text{Sum of all numbers}}{\\text{Total count of numbers}}$.",

    // --- NEW ALGEBRA (Q) ---
    alg_eq_vs_exp: "An **Equation** has an **equals sign** ($=$) and shows two expressions are equal ($2x=10$). An **Expression** does **not** have an equals sign ($2x+5$).",
    alg_solve_linear: "Linear equations are solved by isolating the variable ($x$) on one side of the equation using inverse operations (addition/subtraction, multiplication/division).",
    alg_factorization: "Factorization is the process of breaking down an algebraic expression into its **multiplicative parts** (factors), e.g., $x^2 + 2x = x(x+2)$.",
    alg_quadratic_formula: "The Quadratic Formula solves $ax^2 + bx + c = 0$: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$",
    alg_identities: "Algebraic Identities are equations that hold true for **all** values of their variables, such as $(a+b)^2 = a^2 + 2ab + b^2$.",

    // --- NEW GEOMETRY (R) ---
    geom_triangle_sum: "The sum of the interior angles of **any** triangle is always $180^{\\circ}$.",
    geom_pythagoras: "Pythagoras' Theorem applies to **right-angled triangles**: the square of the hypotenuse ($c$) is equal to the sum of the squares of the other two sides ($a^2 + b^2 = c^2$). ",
    geom_congruent_tri: "Congruent triangles are triangles that have the **exact same size and shape**, meaning all corresponding sides and angles are equal.",
    geom_parallelogram: "A parallelogram is a quadrilateral where **opposite sides are parallel and equal** in length. Opposite angles are also equal.",
    geom_circle_area: "The area of a circle is calculated using the formula: $\\text{Area} = \\pi r^2$ (pi times the radius squared).",

    // --- NEW MENSURATION (S) ---
    men_rect_perimeter: "The perimeter of a rectangle is calculated as: $\\text{Perimeter} = 2(l+b)$ (twice the sum of length and breadth).",
    men_tri_area: "The area of a triangle is calculated as: $\\text{Area} = \\frac{1}{2} \\times \\text{base} \\times \\text{height}$.",
    men_cube_volume: "The volume of a cube is calculated as: $\\text{Volume} = a^3$ (side length cubed).",
    men_cylinder_volume: "The volume of a cylinder is calculated as: $\\text{Volume} = \\pi r^2 h$ (pi times radius squared times height).",
    men_cylinder_csa: "The curved surface area (CSA) of a cylinder is calculated as: $\\text{CSA} = 2\\pi r h$ (two times pi times radius times height).",

    // --- NEW TRIGONOMETRY (T) ---
    trig_sin_cos_tan: "The basic ratios are: $\\text{Sin}(\\theta) = \\frac{\\text{Opposite}}{\\text{Hypotenuse}}$, $\\text{Cos}(\\theta) = \\frac{\\text{Adjacent}}{\\text{Hypotenuse}}$, $\\text{Tan}(\\theta) = \\frac{\\text{Opposite}}{\\text{Adjacent}}$.",
    trig_identities: "The main Pythagorean identities are: $\\sin^2\\theta + \\cos^2\\theta = 1$, $1 + \\tan^2\\theta = \\sec^2\\theta$, and $1 + \\cot^2\\theta = \\csc^2\\theta$.",
    trig_basic_values: "The basic sine values for $0^{\\circ}, 30^{\\circ}, 45^{\\circ}, 60^{\\circ}, 90^{\\circ}$ are $0, \\frac{1}{2}, \\frac{1}{\\sqrt{2}}, \\frac{\\sqrt{3}}{2}, 1$ respectively.",
};

// 2. Define Rule Groups (Maps multiple patterns to a single reply key)
export const ruleGroups = {
    // ----------------------------------------------------------------------
    // CATEGORY 1: GENERAL / GREETINGS / CONVERSATIONAL 
    // ----------------------------------------------------------------------
    greetings: [
        { pattern: /\b(hi|hello|hey|greetings|good day|wazzup|yo|salutations|howdy|what's up|good evening|talk to me)\b/i, reply: replies.hi_reply },
        { pattern: /\b(how are you|how r you|you doing|your status|u doin|status report|how goes it|are you functioning|what is your status)\b/i, reply: replies.status_reply },
        { pattern: /\b(who are you|what is your name|bot name|are you bot|tell me about you|your identity|who is ha chat|explain yourself|your purpose)\b/i, reply: replies.who_am_i },
    ],
    bored: [
        { pattern: /\b(i am bored|im bored|feeling bored|nothing to do|i need fun|entertain me|what can we talk about|distract me|kill time)\b/i, reply: replies.bored_reply_1 },
        { pattern: /\b(what should i do|chat for fun|talk to me|can you talk|chat with me|i need a distraction|suggest something fun|how can i use you)\b/i, reply: replies.bored_reply_2 },
    ],
    thanks: [
        { pattern: /\b(thank you|thanks|thx|cheers|much appreciated|i appreciate it|you're great|thank you bot|good job|that was helpful)\b/i, reply: replies.thank_you },
    ],
    apology: [
        // This is the fallback that catches things not caught by other rules
        { pattern: /\b(i don't understand|i don't get that|you can't answer that|error in knowledge|something you don't know|you failed)\b/i, reply: replies.apology_generic },
    ],
    
    // --- COMMON SENSE / WHAT CAN YOU DO ---
    common_sense: [
        { pattern: /\b(what can you do|what are your capabilities|what are you good at|what is your function|can you do for me|what's your job|how can you help|explain your services)\b/i, reply: replies.what_can_you_do },
        { pattern: /\b(how was your day|how do you feel|are you fine|are you okay|what's up with you)\b/i, reply: replies.how_are_you_cs },
        { pattern: /\b(what time is it|current time|give me the time|what is the time now)\b/i, reply: replies.what_is_time },
        { pattern: /\b(can you help me|i need help|i have a question|can i ask something|i have a query)\b/i, reply: replies.general_help },
        { pattern: /\b(solve for x|find x|equals x|solve for y|solve for z)\b/i, reply: replies.math_variable_limit },
    ],

    // ----------------------------------------------------------------------
    // CATEGORY 2: SPEECHES
    // ----------------------------------------------------------------------
    speech_m: [
        { pattern: /\b(speech about motivation|motivational speech|write a speech on motivation|inspiration speech|need motivation|i need a spark|keynote motivation|give me an inspiring speech)\b/i, reply: replies.speech_motivation },
    ],
    speech_t: [
        { pattern: /\b(speech about technology|technology speech|write a speech on tech|future of tech speech|ai speech|digital age speech|impact of technology|speech on automation)\b/i, reply: replies.speech_technology },
    ],
    speech_e: [
        { pattern: /\b(speech about environment|environment speech|write a speech on nature|planet health speech|conservation speech|ecological speech|green speech)\b/i, reply: replies.speech_environment },
    ],
    speech_l: [
        { pattern: /\b(speech about leadership|leadership speech|write a speech on leadership|true leader speech|how to be a leader|management speech|principles of leadership)\b/i, reply: replies.speech_leadership },
    ],
    speech_i: [
        { pattern: /\b(speech about innovation|innovation speech|write a speech on innovation|future thinking speech|value of creativity|status quo speech)\b/i, reply: replies.speech_innovation },
    ],
    
    // ----------------------------------------------------------------------
    // CATEGORY 3: MATH FUNCTIONALITY (Placeholder/Guide)
    // ----------------------------------------------------------------------
    math_help: [
        { pattern: /\b(solve a math|calculate for me|can you do math|math equation|square root|exponent|pow|plus minus times divide|do calculations|calculate|sin|cos|log)\b/i, reply: replies.math_generic },
    ],
    
    // ----------------------------------------------------------------------
    // CATEGORY 4: COMPUTER SCIENCE
    // ----------------------------------------------------------------------
    tech_linked_list: [
        { pattern: /\b(what is linked list|explain linked list|linear data structure|linked nodes|linked list structure)\b/i, reply: replies.linked_list },
    ],
    tech_stack: [
        { pattern: /\b(what is stack|explain stack|lifo principle|last in first out|stack of plates|stack definition)\b/i, reply: replies.stack_def },
    ],
    tech_https: [
        { pattern: /\b(what is https|explain https|secure http|ssl tls encryption|secure data transfer)\b/i, reply: replies.https_def },
    ],
    tech_compiler: [
        { pattern: /\b(what is compiler|explain compiler|source code to machine code|compiler definition)\b/i, reply: replies.compiler_def },
    ],
    tech_oop: [
        { pattern: /\b(what is oop|explain oop|object oriented programming|inheritance encapsulation polymorphism|oop principles)\b/i, reply: replies.oop_def },
    ],
    tech_big_o: [ 
        { pattern: /\b(what is big o notation|explain big o|algorithm complexity|limiting behavior)\b/i, reply: replies.big_o_def },
    ],
    tech_rest_api: [ 
        { pattern: /\b(what is a rest api|explain restful api|http methods api|application program interface)\b/i, reply: replies.rest_api },
    ],
    
    // ----------------------------------------------------------------------
    // CATEGORY 5: PHYSICS/CHEMISTRY ADVANCED
    // ----------------------------------------------------------------------
    sci_schrodinger: [
        { pattern: /\b(schrodinger's equation|explain schrodinger's equation|quantum mechanics equation|quantum state change)\b/i, reply: replies.schrodinger_eq },
    ],
    sci_ideal_gas: [
        { pattern: /\b(what is ideal gas law|explain ideal gas law|pv equals nrt|equation of state)\b/i, reply: replies.ideal_gas_law },
    ],
    sci_photosynthesis: [
        { pattern: /\b(what is photosynthesis|explain photosynthesis|light energy to chemical energy|photosynthesis formula)\b/i, reply: replies.photosynthesis },
    ],
    sci_periodic_table: [
        { pattern: /\b(what is the periodic table|explain periodic table|tabular arrangement of elements|atomic number order)\b/i, reply: replies.periodic_table_def },
    ],
    sci_first_law_thermo: [ 
        { pattern: /\b(first law of thermodynamics|conservation of energy|delta u equals q minus w)\b/i, reply: replies.first_law_thermo },
    ],
    sci_doppler_effect: [ 
        { pattern: /\b(doppler effect|change in frequency|ambulance siren effect|explain doppler)\b/i, reply: replies.doppler_effect },
    ],

    // ----------------------------------------------------------------------
    // CATEGORY 6: HEALTH & HUMAN BODY
    // ----------------------------------------------------------------------
    health_immune: [
        { pattern: /\b(what is immune system|explain immune system|defend body invaders|cells tissues organs defense)\b/i, reply: replies.immune_system_def },
    ],
    health_respiratory: [
        { pattern: /\b(what is respiratory system|explain respiratory system|organs that help you breathe|gas exchange function)\b/i, reply: replies.respiratory_system },
    ],
    health_dna_rep: [
        { pattern: /\b(what is dna replication|explain dna replication|producing dna replicas|cell division process)\b/i, reply: replies.dna_replication },
    ],
    health_crebs_cycle: [ 
        { pattern: /\b(what is the krebs cycle|citric acid cycle|metabolic pathway|produce atp)\b/i, reply: replies.crebs_cycle },
    ],
    health_homeostasis: [ 
        { pattern: /\b(what is homeostasis|explain homeostasis|steady internal conditions|stable equilibrium)\b/i, reply: replies.homeostasis_def },
    ],
    
    // ----------------------------------------------------------------------
    // CATEGORIES 7 & 12: HISTORY & GEOGRAPHY (Advanced & Basic)
    // ----------------------------------------------------------------------
    hist_adv: [
        { pattern: /\b(when did world war 1 start|ww1 start date|1914 to 1918|start of the great war)\b/i, reply: replies.ww1_start },
        { pattern: /\b(great pyramid of giza|who built giza pyramid|pharaoh khufu pyramid)\b/i, reply: replies.giza_pyramid },
        { pattern: /\b(fall of roman empire|when did roman empire fall|romulus augustulus)\b/i, reply: replies.roman_empire_fall },
        { pattern: /\b(when was magna carta signed|what is magna carta|king subject to law)\b/i, reply: replies.magna_carta },
        { pattern: /\b(invention of printing press|johannes gutenberg|when was printing press invented)\b/i, reply: replies.invention_printing_press },
        { pattern: /\b(when did cold war start|cold war start date|tension between us and soviet union)\b/i, reply: replies.cold_war_start },
    ],

    // ----------------------------------------------------------------------
    // CATEGORY 9: ESSENTIAL COMMON KNOWLEDGE (NEW)
    // ----------------------------------------------------------------------
    common_knowledge: [
        // Using flexible patterns for common knowledge
        { pattern: /\b(\w+\s*){0,3}(why is sleep important|need sleep|sleep benefits)\b/i, reply: replies.ess_com_know_sleep },
        { pattern: /\b(\w+\s*){0,3}(who invented the telephone|invented phone|alexander graham bell)\b/i, reply: replies.ess_com_know_phone },
        { pattern: /\b(\w+\s*){0,3}(who invented the wheel|invention of wheel|when was wheel invented)\b/i, reply: replies.ess_com_know_wheel },
        { pattern: /\b(\w+\s*){0,3}(what is the sun|sun type|solar system star)\b/i, reply: replies.ess_com_know_sun },
        { pattern: /\b(\w+\s*){0,3}(why are there seasons|earth seasons|tilted axis)\b/i, reply: replies.ess_com_know_seasons },
        { pattern: /\b(\w+\s*){0,3}(how does a compass work|magnetic compass|points north)\b/i, reply: replies.ess_com_know_compass },
        { pattern: /\b(\w+\s*){0,3}(water formula|h2o formula|what is h2o)\b/i, reply: replies.ess_com_know_water_formula },
        { pattern: /\b(\w+\s*){0,3}(what is gravity|gravity definition|why objects fall)\b/i, reply: replies.ess_com_know_gravity },
        { pattern: /\b(\w+\s*){0,3}(how do plants make food|plants make food|basic photosynthesis)\b/i, reply: replies.ess_com_know_photosynthesis_basic },
        { pattern: /\b(\w+\s*){0,3}(capital of india|new delhi capital)\b/i, reply: replies.ess_com_know_capital_india },
    ],
    
    // ----------------------------------------------------------------------
    // CATEGORY 8: TRIVIA / JOKES / FUN FACTS (UPDATED)
    // ----------------------------------------------------------------------
    joke: [
        // Using flexible pattern matching for jokes
        { pattern: /\b(\w+\s*){0,3}(joke|make me laugh|tell something funny)\b/i, reply: replies.joke_9 },
        { pattern: /\b(\w+\s*){0,3}(another joke|more jokes|second joke|friend dreams joke)\b/i, reply: replies.joke_2 },
        { pattern: /\b(\w+\s*){0,3}(third joke|last joke|battery relationship joke)\b/i, reply: replies.joke_3 },
        { pattern: /\b(\w+\s*){0,3}(bed alarm joke|relationship joke)\b/i, reply: replies.joke_4 },
        { pattern: /\b(\w+\s*){0,3}(tree shade joke|exam shade joke)\b/i, reply: replies.joke_5 },
        { pattern: /\b(\w+\s*){0,3}(wifi joke|left me on read joke)\b/i, reply: replies.joke_6 },
        { pattern: /\b(\w+\s*){0,3}(doctor video game joke)\b/i, reply: replies.joke_7 },
        { pattern: /\b(\w+\s*){0,3}(pillow hairstyle joke)\b/i, reply: replies.joke_8 },
        { pattern: /\b(\w+\s*){0,3}(late to school joke|school ahead go slow joke)\b/i, reply: replies.joke_13 },
        { pattern: /\b(\w+\s*){0,3}(messy room surprise joke|messy surprise joke)\b/i, reply: replies.joke_14 },
        { pattern: /\b(\w+\s*){0,3}(earn millions book joke|shopkeeper joke)\b/i, reply: replies.joke_15 },
        { pattern: /\b(\w+\s*){0,3}(internet family joke|internet down joke)\b/i, reply: replies.joke_16 },
        { pattern: /\b(fridge running joke|cold behavior joke)\b/i, reply: replies.joke_17 },
        { pattern: /\b(alarm clock hate joke|alarm clock screams joke)\b/i, reply: replies.joke_18 },
    ],
    fun_fact: [
        { pattern: /\b(fun fact|tell me a fun fact|random fact|something interesting|coffee fruit|is coffee a fruit)\b/i, reply: replies.fun_fact_coffee },
        { pattern: /\b(hottest planet|which planet is hottest|venus fact|planet fact)\b/i, reply: replies.fun_fact_planet },
        { pattern: /\b(english word with most definitions|word set definition)\b/i, reply: replies.fun_fact_language },
    ],
    riddle_q: [
        // Riddles (New, sequential logic for progression and flexible phrasing)
        { pattern: /\b(\w+\s*){0,3}(riddle me this|i need a riddle|ask me a riddle|give me a brain teaser|a riddle|riddle 1)\b/i, reply: replies.riddle_def }, // Riddle 1: Hole
        { pattern: /\b(\w+\s*){0,3}(second riddle|another riddle|next riddle|riddle 2)\b/i, reply: replies.riddle_def_2 }, // Riddle 2: Promise
        { pattern: /\b(\w+\s*){0,3}(third riddle|riddle 3)\b/i, reply: replies.riddle_def_3 }, // Riddle 3: Name
        { pattern: /\b(\w+\s*){0,3}(fourth riddle|riddle 4|always in front)\b/i, reply: replies.riddle_def_4 }, // Riddle 4: Future
        { pattern: /\b(\w+\s*){0,3}(fifth riddle|riddle 5|more you have less you see)\b/i, reply: replies.riddle_def_5 }, // Riddle 5: Darkness
        { pattern: /\b(\w+\s*){0,3}(sixth riddle|riddle 6|words but never speaks)\b/i, reply: replies.riddle_def_10 }, // Riddle 6: Book
        { pattern: /\b(\w+\s*){0,3}(seventh riddle|riddle 7|hold without hands)\b/i, reply: replies.riddle_def_11 }, // Riddle 7: Breath
        { pattern: /\b(\w+\s*){0,3}(eighth riddle|riddle 8|everyone has but no one can lose)\b/i, reply: replies.riddle_def_12 }, // Riddle 8: Shadow
        { pattern: /\b(\w+\s*){0,3}(ninth riddle|riddle 9|goes up but never comes down)\b/i, reply: replies.riddle_def_13 }, // Riddle 9: Age
        { pattern: /\b(\w+\s*){0,3}(tenth riddle|riddle 10|breaks when you say its name)\b/i, reply: replies.riddle_def_14 }, // Riddle 10: Silence
    ],
    riddle_a: [
        // Correct Answers (Specific patterns for better flow - Must come *before* the wrong guess fallback)
        { pattern: /\b(a hole|hole|an opening)\b/i, reply: replies.riddle_feedback_correct }, // Ans 1
        { pattern: /\b(a promise|promise)\b/i, reply: replies.riddle_feedback_correct }, // Ans 2
        { pattern: /\b(your name|name)\b/i, reply: replies.riddle_feedback_correct }, // Ans 3
        { pattern: /\b(the future|future)\b/i, reply: replies.riddle_feedback_correct }, // Ans 4
        { pattern: /\b(darkness)\b/i, reply: replies.riddle_feedback_correct }, // Ans 5
        { pattern: /\b(a book|book)\b/i, reply: replies.riddle_feedback_correct }, // Ans 6
        { pattern: /\b(your breath|breath)\b/i, reply: replies.riddle_feedback_correct }, // Ans 7
        { pattern: /\b(your shadow|shadow)\b/i, reply: replies.riddle_feedback_correct }, // Ans 8
        { pattern: /\b(your age|age)\b/i, reply: replies.riddle_feedback_correct }, // Ans 9
        { pattern: /\b(silence)\b/i, reply: replies.riddle_feedback_correct }, // Ans 10

        // I Don't Know / Reveal Answer (Specific number requests override the generic state trigger)
        { pattern: /\b(\w+\s*){0,3}(i don't know the answer to riddle 1|what is the answer to riddle 1|reveal riddle 1|i dont know 1)\b/i, reply: replies.riddle_ans_1_reveal },
        { pattern: /\b(\w+\s*){0,3}(i don't know the answer to riddle 2|what is the answer to riddle 2|reveal riddle 2|i dont know 2)\b/i, reply: replies.riddle_ans_2_reveal },
        { pattern: /\b(\w+\s*){0,3}(i don't know the answer to riddle 3|what is the answer to riddle 3|reveal riddle 3|i dont know 3)\b/i, reply: replies.riddle_ans_3_reveal },
        { pattern: /\b(\w+\s*){0,3}(i don't know the answer to riddle 4|what is the answer to riddle 4|reveal riddle 4|i dont know 4)\b/i, reply: replies.riddle_ans_4_reveal },
        { pattern: /\b(\w+\s*){0,3}(i don't know the answer to riddle 5|what is the answer to riddle 5|reveal riddle 5|i dont know 5)\b/i, reply: replies.riddle_ans_5_reveal },
        { pattern: /\b(\w+\s*){0,3}(i don't know the answer to riddle 6|what is the answer to riddle 6|reveal riddle 6|i dont know 6)\b/i, reply: replies.riddle_ans_10_reveal },
        { pattern: /\b(\w+\s*){0,3}(i don't know the answer to riddle 7|what is the answer to riddle 7|reveal riddle 7|i dont know 7)\b/i, reply: replies.riddle_ans_11_reveal },
        { pattern: /\b(\w+\s*){0,3}(i don't know the answer to riddle 8|what is the answer to riddle 8|reveal riddle 8|i dont know 8)\b/i, reply: replies.riddle_ans_12_reveal },
        { pattern: /\b(\w+\s*){0,3}(i don't know the answer to riddle 9|what is the answer to riddle 9|reveal riddle 9|i dont know 9)\b/i, reply: replies.riddle_ans_13_reveal },
        { pattern: /\b(\w+\s*){0,3}(i don't know the answer to riddle 10|what is the answer to riddle 10|reveal riddle 10|i dont know 10)\b/i, reply: replies.riddle_ans_14_reveal },
        
        // General I Don't Know / Answer (Detects "I don't know" and triggers STATE_ANSWER_REQUIRED in main.js)
        { pattern: /\b(\w+\s*){0,3}(i don't know|i dont know|give me the answer|what is the answer|reveal the answer)\b/i, reply: replies.riddle_i_dont_know_generic },
        
        // Wrong Guess Fallback (Specific guess structure)
        { pattern: /\b(the answer is|my guess is|i think it is|is it|is that)\b/i, reply: replies.riddle_feedback_wrong },
    ],

    // ----------------------------------------------------------------------
    // CATEGORY 10: ESSENTIAL FOUNDATIONAL SCIENCE (Existing)
    // ----------------------------------------------------------------------
    ess_bio: [
        { pattern: /\b(difference between respiration and breathing|respiration vs breathing|breathing vs respiration)\b/i, reply: replies.ess_bio_respiration_vs_breathing },
        { pattern: /\b(why is photosynthesis important|importance of photosynthesis|produces food and oxygen)\b/i, reply: replies.ess_bio_photo_importance },
        { pattern: /\b(function of mitochondria|what do mitochondria do|powerhouse of the cell)\b/i, reply: replies.ess_bio_mitochondria_function },
        { pattern: /\b(difference between arteries and veins|arteries vs veins|carry blood away or toward heart)\b/i, reply: replies.ess_bio_arteries_vs_veins },
        { pattern: /\b(why do plants need sunlight|sunlight for plants|plants make food)\b/i, reply: replies.ess_bio_sunlight_plants },
    ],
    ess_phy: [
        { pattern: /\b(what is inertia|inertia definition|objects stay at rest)\b/i, reply: replies.ess_phy_inertia },
        { pattern: /\b(why do objects fall to the ground|objects fall gravity|gravity pulls everything)\b/i, reply: replies.ess_phy_gravity_fall },
        { pattern: /\b(difference between speed and velocity|speed vs velocity|speed with direction)\b/i, reply: replies.ess_phy_speed_vs_velocity },
        { pattern: /\b(why do we feel weightless in space|astronauts feel weightless|free fall around earth)\b/i, reply: replies.ess_phy_weightless_space },
        { pattern: /\b(what is refraction|refraction of light|bending of light medium)\b/i, reply: replies.ess_phy_refraction },
    ],
    ess_chem: [
        { pattern: /\b(what is matter|matter definition|has mass and occupies space)\b/i, reply: replies.ess_chem_matter },
        { pattern: /\b(what is an atom|atom smallest unit|retains chemical properties)\b/i, reply: replies.ess_chem_atom },
        { pattern: /\b(why do metals conduct electricity|metals conduct electricity|free electrons in metals)\b/i, reply: replies.ess_chem_metals_conduct },
        { pattern: /\b(what is the ph scale|ph scale definition|measures acidity basicity)\b/i, reply: replies.ess_chem_ph_scale },
        { pattern: /\b(why do we see bubbles during boiling|bubbles during boiling|water turns to steam)\b/i, reply: replies.ess_chem_boiling_bubbles },
    ],
    
    // ----------------------------------------------------------------------
    // CATEGORY 12: NEW GEOGRAPHY (M)
    // ----------------------------------------------------------------------
    new_geo: [
        { pattern: /\b(difference between weather and climate|weather vs climate|day-to-day conditions average weather)\b/i, reply: replies.geo_weather_vs_climate },
        { pattern: /\b(why is earth called the blue planet|earth blue planet|71 percent water)\b/i, reply: replies.geo_blue_planet },
        { pattern: /\b(what causes seasons|seasons happen because|earth tilted on axis revolves around sun)\b/i, reply: replies.geo_seasons_causes },
        { pattern: /\b(what are the major heat zones of the earth|heat zones of the earth|torrid temperate frigid zone)\b/i, reply: replies.geo_heat_zones },
        { pattern: /\b(why do winds blow|winds blow|air pressure differences high to low pressure)\b/i, reply: replies.geo_winds_blow },
        { pattern: /\b(what is soil erosion|soil erosion definition|removal of soil by wind water)\b/i, reply: replies.geo_soil_erosion },
        { pattern: /\b(how can we conserve water|conserve water methods|rainwater harvesting afforestation)\b/i, reply: replies.geo_water_conserve },
        { pattern: /\b(what is the water cycle|water cycle steps|evaporation condensation precipitation collection)\b/i, reply: replies.geo_water_cycle },
        { pattern: /\b(difference between renewable and non-renewable resources|renewable vs non-renewable resources|sun wind coal petroleum)\b/i, reply: replies.geo_renewable_vs_nonrenewable },
        { pattern: /\b(why are forests important|importance of forests|provide oxygen prevent soil erosion maintain climate)\b/i, reply: replies.geo_forest_importance },
    ],

    // ----------------------------------------------------------------------
    // CATEGORY 13: NEW CIVICS (N)
    // ----------------------------------------------------------------------
    new_civics: [
        { pattern: /\b(what is democracy|democracy definition|people choose government)\b/i, reply: replies.civ_democracy },
        { pattern: /\b(what are fundamental rights|basic rights guaranteed to all citizens|right to equality freedom)\b/i, reply: replies.civ_fundamental_rights },
        { pattern: /\b(difference between government and governance|government vs governance|people institutions rule how well they run)\b/i, reply: replies.civ_gov_vs_governance },
        { pattern: /\b(what is the role of parliament|parliament role|make laws control government represent people)\b/i, reply: replies.civ_parliament_role },
        { pattern: /\b(why do we need constitution|need constitution|define rights duties rules powers)\b/i, reply: replies.civ_constitution_need },
        { pattern: /\b(what is secularism|secularism definition|government does not promote or discriminate any religion)\b/i, reply: replies.civ_secularism },
        { pattern: /\b(what is federalism|federalism definition|power divided between central and state governments)\b/i, reply: replies.civ_federalism },
        { pattern: /\b(what is the rule of law|rule of law definition|everyone is equal before the law)\b/i, reply: replies.civ_rule_of_law },
        { pattern: /\b(what are elections|elections definition|people vote to choose representatives)\b/i, reply: replies.civ_elections },
        { pattern: /\b(what is local self-government|local self government|panchayats municipalities)\b/i, reply: replies.civ_local_self_gov },
    ],

    // ----------------------------------------------------------------------
    // CATEGORY 14: NEW HISTORY (O)
    // ----------------------------------------------------------------------
    new_history: [
        { pattern: /\b(what is civilization|civilization definition|developed society cities writing culture)\b/i, reply: replies.hist_civilization },
        { pattern: /\b(why is the indus valley civilization important|indus valley civilization importance|first urban planned cities drainage standardized bricks)\b/i, reply: replies.hist_indus_valley },
        { pattern: /\b(why did the british come to india|british came to india|came for trade took control)\b/i, reply: replies.hist_british_india },
        { pattern: /\b(what was the main cause of the revolt of 1857|cause of revolt of 1857|political social economic military grievances cartridge issue)\b/i, reply: replies.hist_revolt_1857 },
        { pattern: /\b(who led the indian freedom struggle|indian freedom struggle leaders|gandhi nehru subhas bose bhagat singh patel)\b/i, reply: replies.hist_freedom_leaders },
    ],

    // ----------------------------------------------------------------------
    // CATEGORY 15: NEW MATH FUNDAMENTALS (P)
    // ----------------------------------------------------------------------
    new_math_fund: [
        { pattern: /\b(what is lcm and hcf|lcm vs hcf|least common multiple highest common factor)\b/i, reply: replies.math_lcm_hcf },
        { pattern: /\b(formula for percentage|calculate percentage|value over total times 100)\b/i, reply: replies.math_percentage_formula },
        { pattern: /\b(what is simple interest|simple interest formula|si equals prt over 100)\b/i, reply: replies.math_simple_interest },
        { pattern: /\b(what is ratio|ratio comparison of quantities)\b/i, reply: replies.math_ratio },
        { pattern: /\b(what is average|average formula|sum of numbers over total numbers)\b/i, reply: replies.math_average },
    ],

    // ----------------------------------------------------------------------
    // CATEGORY 16: NEW ALGEBRA (Q)
    // ----------------------------------------------------------------------
    new_algebra: [
        { pattern: /\b(difference between equation and expression|equation vs expression|has equals sign no equals sign)\b/i, reply: replies.alg_eq_vs_exp },
        { pattern: /\b(how do you solve linear equations|solve linear equations|move variables one side)\b/i, reply: replies.alg_solve_linear },
        { pattern: /\b(what is factorization|factorization definition|breaking expression multiplicative parts)\b/i, reply: replies.alg_factorization },
        { pattern: /\b(what is the quadratic formula|quadratic formula|x equals minus b plus minus root b squared minus 4ac)\b/i, reply: replies.alg_quadratic_formula },
        { pattern: /\b(what are algebraic identities|algebraic identities|a plus b squared a minus b squared a squared minus b squared)\b/i, reply: replies.alg_identities },
    ],

    // ----------------------------------------------------------------------
    // CATEGORY 17: NEW GEOMETRY (R)
    // ----------------------------------------------------------------------
    new_geometry: [
        { pattern: /\b(what is a triangle’s angle sum|triangle angle sum|sum of angles of a triangle is 180)\b/i, reply: replies.geom_triangle_sum },
        { pattern: /\b(what is pythagoras theorem|pythagoras theorem|a squared plus b squared equals c squared right triangle)\b/i, reply: replies.geom_pythagoras },
        { pattern: /\b(what are congruent triangles|congruent triangles|same size and shape)\b/i, reply: replies.geom_congruent_tri },
        { pattern: /\b(what is a parallelogram|parallelogram definition|opposite sides parallel and equal)\b/i, reply: replies.geom_parallelogram },
        { pattern: /\b(what is the area of a circle|area of a circle formula|pi r squared)\b/i, reply: replies.geom_circle_area },
    ],

    // ----------------------------------------------------------------------
    // CATEGORY 18: NEW MENSURATION (S)
    // ----------------------------------------------------------------------
    new_mensuration: [
        { pattern: /\b(what is the perimeter of a rectangle|perimeter of a rectangle formula|two times l plus b)\b/i, reply: replies.men_rect_perimeter },
        { pattern: /\b(what is the area of a triangle|area of a triangle formula|half base times height)\b/i, reply: replies.men_tri_area },
        { pattern: /\b(what is the volume of a cube|volume of a cube formula|a cubed side cubed)\b/i, reply: replies.men_cube_volume },
        { pattern: /\b(what is the volume of a cylinder|volume of a cylinder formula|pi r squared h)\b/i, reply: replies.men_cylinder_volume },
        { pattern: /\b(what is the curved surface area of a cylinder|curved surface area of a cylinder formula|two pi r h csa)\b/i, reply: replies.men_cylinder_csa },
    ],

    // ----------------------------------------------------------------------
    // CATEGORY 19: NEW TRIGONOMETRY (T)
    // ----------------------------------------------------------------------
    new_trigonometry: [
        { pattern: /\b(what is sin cos tan|sin cos tan definition|opposite hypotenuse adjacent right triangle)\b/i, reply: replies.trig_sin_cos_tan },
        { pattern: /\b(what are the main trigonometric identities|trigonometric identities|sin squared plus cos squared equals 1 tan equals sin over cos)\b/i, reply: replies.trig_identities },
        { pattern: /\b(what is the value of sin 0 30 45 60 90|sin values 0 to 90|basic sine values)\b/i, reply: replies.trig_basic_values },
    ],
};


/* ---------------- Constants ---------------- */
const nowTs = () => Date.now();

// The Bot Identity Object
export const HA_USER = {
  id: "ha_bot",
  name: "HA Chat",
  photo: "https://api.dicebear.com/6.x/identicon/svg?seed=HAChat",
  isBot: true,
  online: true,
};

// ----------------------------------------------------------------------
// CORE MATH FUNCTIONALITY (EXPANDED LOGIC)
// ----------------------------------------------------------------------

function handleMath(t) {
    // 1. Simple Arithmetic Match (e.g., 5+7)
    const simpleMatch = t.match(/(-?\d+)\s*([+\-x*\/])\s*(-?\d+)/);
    if (simpleMatch) {
        const a = Number(simpleMatch[1]);
        const op = simpleMatch[2].replace("x", "*");
        const b = Number(simpleMatch[3]);
        try {
            // eslint-disable-next-line no-eval
            const res = eval(`${a}${op}${b}`);
            return `The result of ${a} ${simpleMatch[2]} ${b} is: ${res}`;
        } catch {
            return "I tried the simple math, but I had an error.";
        }
    }

    // 2. Exponentiation Match (e.g., 5^3 or 4 to the power of 2)
    const expMatch = t.match(/(\d+)\s*(\^|to the power of)\s*(\d+)/i);
    if (expMatch) {
        const base = Number(expMatch[1]);
        const exp = Number(expMatch[3]);
        const res = Math.pow(base, exp);
        return `${base} raised to the power of ${exp} is: ${res}`;
    }

    // 3. Square Root Match (e.g., sqrt of 81)
    const sqrtMatch = t.match(/(square root|sqrt|what is the root of)\s*(\d+)/i);
    if (sqrtMatch) {
        const num = Number(sqrtMatch[2]);
        const res = Math.sqrt(num);
        return `The square root of ${num} is: ${res}`;
    }

    // 4. Multi-step Equation (Controlled Expression Evaluation)
    const complexMatch = t.match(/(?:what is|solve|calculate)\s*([\d\s\.\(\)\+\-\*\/]+)/i);
    if (complexMatch) {
        // Clean the expression string for safe use (only digits, parentheses, and operators)
        let expression = complexMatch[1].replace(/x/g, '*').trim();
        
        // Basic sanitization: check for high-risk characters or patterns (e.g., letters, multiple operators)
        if (/[a-zA-Z]/.test(expression)) {
             return "I only process numerical math expressions. Please remove any letters.";
        }
        
        try {
            // Use Function constructor for controlled evaluation (safer than eval)
            // eslint-disable-next-line no-new-func
            const func = new Function('return ' + expression);
            const res = func();
            
            if (typeof res === 'number' && isFinite(res)) {
                 // Format the result to limit decimals
                 const formattedRes = parseFloat(res.toFixed(6)); 
                return `Solving the expression (${expression}): ${formattedRes}`;
            }
            return "That expression resulted in an infinite or non-numeric value. I cannot compute it.";

        } catch {
            return "I recognize that as a multi-step equation, but a syntax error or complexity prevents me from solving it.";
        }
    }

    return null; // No math recognized
}


/* ---------------- The "Brain" (Reply Logic) ---------------- */
export function getHaReply(text) { 
    if (!text) return "I didn't catch that — please repeat.";
    const t = text.toLowerCase().trim();
    
    // 1. Attempt to handle math first using the expanded function
    const mathReply = handleMath(t);
    if (mathReply) return mathReply;
    
    // 2. DYNAMIC RULE CHECKER (Handles all hardcoded facts, speeches, and fun chat)
    for (const groupKey in ruleGroups) {
        for (const rule of ruleGroups[groupKey]) {
            if (rule.pattern.test(t)) {
                return rule.reply;
            }
        }
    }

    // 3. FINAL FALLBACK: Ensures a defined string is returned if no match is found
    return replies.apology_generic; 
}


/* ---------------- The "Action" (Send Reply) ---------------- */
export async function replyAsHaBot(chatId, userMessageText) {
  // 1. Get the generated reply 
  const replyText = getHaReply(userMessageText);

  // ** CRITICAL FIX: EXTREME SAFETY CHECK **
  // This ensures that even if getHaReply somehow returns null or undefined, 
  // we force it to a safe string before pushing to Firebase.
  const safeReplyText = replyText || replies.apology_generic;

  // 2. Simulate delay (typing effect)
  setTimeout(async () => {
    // 3. Push to Firebase
    const messagesRef = dbRef(db, `chats/${chatId}/messages`);
    const newMsgRef = push(messagesRef);
    
    await set(newMsgRef, {
      sender: HA_USER.id,
      name: HA_USER.name,
      text: safeReplyText, // Use the guaranteed safe variable
      type: "text",
      timestamp: nowTs(),
      delivered: true,
      read: true,
    });
  }, 700);
}