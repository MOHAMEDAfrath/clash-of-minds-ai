/*
 * Clash of Minds AI
 * Multi-Agent AI Debate System
 *
 * Flow:
 * 1. User selects Supporter, Challenger and Judge models.
 * 2. Supporter generates arguments for the topic.
 * 3. Challenger receives the Supporter's arguments and responds to them.
 * 4. Judge evaluates both sides and selects a winner.
 *
 * API:
 * Hugging Face Inference API
 */

"use strict";


// =========================================
// Configuration
// =========================================

const HUGGING_FACE_API =
    "https://router.huggingface.co/v1/chat/completions";

let apiKey = "";
let debateInProgress = false;


// =========================================
// DOM Elements
// =========================================

const apiKeyInput = document.getElementById("apikey");
const setApiKeyButton = document.getElementById("set-api-key");

const supporterSelect = document.getElementById("ai1Select");
const challengerSelect = document.getElementById("ai2Select");
const judgeSelect = document.getElementById("judgeSelect");

const debateTopicInput = document.getElementById("debateTopic");

const generateTopicButton =
    document.getElementById("generate-topic");

const startDebateButton =
    document.getElementById("initiate-debate");

const keyWarning =
    document.getElementById("keyWarning");

const aiWarning =
    document.getElementById("aiWarning");

const supporterName =
    document.getElementById("ai1Name");

const challengerName =
    document.getElementById("ai2Name");

const judgeName =
    document.getElementById("judgeName");

const supporterOutput =
    document.getElementById("ai1Argument");

const challengerOutput =
    document.getElementById("ai2Counterpoint");

const judgeOutput =
    document.getElementById("judgeDecision");

const supporterWinner =
    document.getElementById("winner-result");

const challengerWinner =
    document.getElementById("runner-up-result");


// =========================================
// Event Listeners
// =========================================

setApiKeyButton.addEventListener("click", setApiKey);

startDebateButton.addEventListener("click", initiateDebate);

generateTopicButton.addEventListener(
    "click",
    generateDebateTopic
);


// =========================================
// API Key
// =========================================

function setApiKey() {

    const enteredKey = apiKeyInput.value.trim();

    if (!enteredKey) {

        keyWarning.textContent =
            "Please enter a valid Hugging Face API token.";

        return;
    }

    apiKey = enteredKey;

    keyWarning.textContent = "";

    apiKeyInput.value = "";

    document.querySelector(".api-card").innerHTML = `
        <h2>Hugging Face Connected ✓</h2>
        <p>Your API token has been provided for this session.</p>
    `;
}


// =========================================
// Validation
// =========================================

function validateApiKey() {

    if (!apiKey) {

        keyWarning.textContent =
            "Please set your Hugging Face API key before starting a debate.";

        return false;
    }

    keyWarning.textContent = "";

    return true;
}


function validateModels() {

    const supporter = supporterSelect.value;
    const challenger = challengerSelect.value;
    const judge = judgeSelect.value;

    const modelsAreUnique =
        supporter !== challenger &&
        supporter !== judge &&
        challenger !== judge;

    if (!modelsAreUnique) {

        aiWarning.textContent =
            "Supporter, Challenger and Judge must use three different AI models.";

        return false;
    }

    aiWarning.textContent = "";

    return true;
}


function validateTopic() {

    const topic = debateTopicInput.value.trim();

    if (!topic) {

        aiWarning.textContent =
            "Please enter a debate topic.";

        return false;
    }

    return true;
}


// =========================================
// Hugging Face API
// =========================================

async function callHuggingFace(model, prompt, options = {}) {

    if (!apiKey) {
        throw new Error("Hugging Face API key is missing.");
    }

    const response = await fetch(
        HUGGING_FACE_API,
        {
            method: "POST",

            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                model: model,

                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],

                temperature:
                    options.temperature ?? 0.7,

                max_tokens:
                    options.maxNewTokens ?? 400,

                stream: false
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data?.error?.message ||
            data?.error ||
            `Hugging Face API error: ${response.status}`
        );
    }

    const result =
        data?.choices?.[0]?.message?.content;

    if (!result) {
        throw new Error(
            "No response was returned by the AI model."
        );
    }

    return result.trim();
}
// =========================================
// Response Extraction
// =========================================

function extractGeneratedText(data) {

    const text =
        data?.choices?.[0]?.message?.content;


    if (
        typeof text === "string" &&
        text.trim()
    ) {

        return text.trim();
    }


    throw new Error(
        "The AI model returned an unexpected response."
    );
}

// =========================================
// Start Debate
// =========================================

async function initiateDebate() {

    if (debateInProgress) {
        return;
    }

    if (!validateApiKey()) {
        return;
    }

    if (!validateModels()) {
        return;
    }

    if (!validateTopic()) {
        return;
    }


    debateInProgress = true;

    startDebateButton.disabled = true;
    generateTopicButton.disabled = true;

    resetDebate();


    const supporterModel =
        supporterSelect.value;

    const challengerModel =
        challengerSelect.value;

    const judgeModel =
        judgeSelect.value;

    const topic =
        debateTopicInput.value.trim();


    supporterName.textContent =
        `${getSelectedModelName(supporterSelect)} Argument`;

    challengerName.textContent =
        `${getSelectedModelName(challengerSelect)} Counterpoint`;

    judgeName.textContent =
        `${getSelectedModelName(judgeSelect)} Decision`;


    try {

        // -------------------------------
        // Stage 1: Supporter
        // -------------------------------

        showLoader(supporterOutput);

        const supporterArguments =
            await generateSupporterArguments(
                supporterModel,
                topic
            );

        await typeWriter(
            supporterArguments,
            supporterOutput
        );


        // -------------------------------
        // Stage 2: Challenger
        // -------------------------------

        showLoader(challengerOutput);

        const challengerArguments =
            await generateChallengerResponse(
                challengerModel,
                topic,
                supporterArguments
            );

        await typeWriter(
            challengerArguments,
            challengerOutput
        );


        // -------------------------------
        // Stage 3: Judge
        // -------------------------------

        showLoader(judgeOutput);

        const judgement =
            await generateJudgement(
                judgeModel,
                topic,
                supporterArguments,
                challengerArguments,
                getSelectedModelName(supporterSelect),
                getSelectedModelName(challengerSelect)
            );


        await typeWriter(
            judgement.displayText,
            judgeOutput
        );


        displayWinner(
            judgement.winner,
            getSelectedModelName(supporterSelect),
            getSelectedModelName(challengerSelect)
        );


    } catch (error) {

        console.error("Debate error:", error);

        showError(error);


    } finally {

        debateInProgress = false;

        startDebateButton.disabled = false;
        generateTopicButton.disabled = false;
    }
}


// =========================================
// Supporter
// =========================================

async function generateSupporterArguments(
    model,
    topic
) {

    const prompt = `
You are the SUPPORTER in a structured AI debate.

Debate topic:
"${topic}"

Provide exactly TWO strong arguments supporting the topic.

Requirements:
- Each argument must be clear and logically reasoned.
- Address the topic directly.
- Do not introduce yourself.
- Do not mention that you are an AI.
- Do not include a conclusion.
- Number the arguments as 1 and 2.
`.trim();


    return callHuggingFace(
        model,
        prompt,
        {
            temperature: 0.7,
            topP: 0.95,
            maxNewTokens: 400
        }
    );
}


// =========================================
// Challenger
// =========================================

async function generateChallengerResponse(
    model,
    topic,
    supporterArguments
) {

    /*
     * IMPORTANT:
     *
     * Unlike the original implementation, the Challenger
     * now receives the Supporter's actual arguments.
     */

    const prompt = `
You are the CHALLENGER in a structured AI debate.

Debate topic:
"${topic}"

The Supporter presented the following arguments:

--- SUPPORTER ARGUMENTS ---
${supporterArguments}
--- END SUPPORTER ARGUMENTS ---

Respond directly to the Supporter's arguments.

Provide exactly TWO strong counterarguments.

Requirements:
- Directly address the Supporter's claims.
- Identify weaknesses, limitations or assumptions.
- Use logical, ethical or practical reasoning where appropriate.
- Do not simply repeat the topic.
- Do not introduce yourself.
- Do not mention that you are an AI.
- Number the counterarguments as 1 and 2.
`.trim();


    return callHuggingFace(
        model,
        prompt,
        {
            temperature: 0.7,
            topP: 0.95,
            maxNewTokens: 400
        }
    );
}


// =========================================
// Judge
// =========================================

async function generateJudgement(
    model,
    topic,
    supporterArguments,
    challengerArguments,
    supporterNameText,
    challengerNameText
) {

    const prompt = `
You are an impartial AI debate judge.

Debate topic:
"${topic}"

SUPPORTER:
${supporterArguments}

CHALLENGER:
${challengerArguments}

Evaluate both participants using these criteria:

1. Relevance to the topic
2. Logical reasoning
3. Strength of arguments
4. Quality of counterarguments
5. Overall persuasiveness

Give each participant a score from 1 to 10.

Then select exactly ONE winner.

Return the result in this format:

Winner: SUPPORTER or CHALLENGER
Supporter Score: X/10
Challenger Score: X/10
Reason: One concise explanation of why the winner performed better.

Do not select a winner based only on the number of arguments.
`.trim();


    const rawResponse =
        await callHuggingFace(
            model,
            prompt,
            {
                temperature: 0.3,
                topP: 0.9,
                maxNewTokens: 300
            }
        );


    return parseJudgement(
        rawResponse,
        supporterNameText,
        challengerNameText
    );
}


// =========================================
// Judge Response Parser
// =========================================

function parseJudgement(
    response,
    supporterNameText,
    challengerNameText
) {

    const winnerMatch =
        response.match(
            /Winner\s*:\s*(SUPPORTER|CHALLENGER)/i
        );

    const winner =
        winnerMatch
            ? winnerMatch[1].toUpperCase()
            : detectWinnerFromText(
                response,
                supporterNameText,
                challengerNameText
            );


    const displayText = response.trim();


    return {
        winner,
        displayText
    };
}


function detectWinnerFromText(
    response,
    supporterNameText,
    challengerNameText
) {

    const text =
        response.toLowerCase();


    if (
        text.includes("winner") &&
        text.includes("challenger")
    ) {

        return "CHALLENGER";
    }


    if (
        text.includes("winner") &&
        text.includes("supporter")
    ) {

        return "SUPPORTER";
    }


    if (
        text.includes(
            supporterNameText.toLowerCase()
        )
    ) {

        return "SUPPORTER";
    }


    if (
        text.includes(
            challengerNameText.toLowerCase()
        )
    ) {

        return "CHALLENGER";
    }


    return "UNKNOWN";
}


// =========================================
// Generate Debate Topic
// =========================================

async function generateDebateTopic() {

    if (!validateApiKey()) {
        return;
    }


    generateTopicButton.disabled = true;

    const originalText =
        generateTopicButton.textContent;

    generateTopicButton.textContent =
        "Generating...";


    try {

        const currentTopic =
            debateTopicInput.value.trim();


        const prompt = `
Generate ONE thought-provoking debate question.

The question must be different from:
"${currentTopic}"

Return only the debate question.
Do not include labels, explanations or quotation marks.
`.trim();


        const question =
            await callHuggingFace(
                "Qwen/Qwen2.5-Coder-32B-Instruct",
                prompt,
                {
                    temperature: 0.8,
                    topP: 0.95,
                    maxNewTokens: 100.
                },
                3,
                5000,
                true
            );


        debateTopicInput.value =
            cleanGeneratedTopic(question);


    } catch (error) {

        console.error(
            "Topic generation error:",
            error
        );

        aiWarning.textContent =
            `Unable to generate a topic: ${error.message}`;

    } finally {

        generateTopicButton.disabled = false;

        generateTopicButton.textContent =
            originalText;
    }
}


// =========================================
// Topic Cleaning
// =========================================

function cleanGeneratedTopic(text) {

    return text
        .replace(/^Debate Question:\s*/i, "")
        .replace(/^["']|["']$/g, "")
        .trim();
}


// =========================================
// UI Helpers
// =========================================

function resetDebate() {
    supporterOutput.textContent = "";
    challengerOutput.textContent = "";
    judgeOutput.textContent = "";

    supporterWinner.textContent = "—";
    challengerWinner.textContent = "—";

    supporterWinner.classList.remove("winnerText");
    challengerWinner.classList.remove("winnerText");

    aiWarning.textContent = "";
}


function showLoader(element) {

    element.innerHTML =
        '<div class="loader" aria-label="Loading"></div>';
}


function showTemporaryMessage(message) {

    aiWarning.textContent = message;
}


function showError(error) {

    const message =
        error?.message ||
        "An unexpected error occurred.";

    judgeOutput.textContent =
        `Unable to complete the debate.\n\n${message}`;

    aiWarning.textContent =
        "The debate could not be completed. Please try again.";
}


function sleep(milliseconds) {

    return new Promise(
        resolve => setTimeout(
            resolve,
            milliseconds
        )
    );
}



// =========================================
// Typewriter Effect
// =========================================

function typeWriter(
    text,
    element,
    speed = 8
) {

    return new Promise(resolve => {

        element.textContent = "";

        let index = 0;


        function typeNextCharacter() {

            if (index >= text.length) {

                resolve();
                return;
            }


            element.textContent +=
                text.charAt(index);

            index++;

            setTimeout(
                typeNextCharacter,
                speed
            );
        }


        typeNextCharacter();
    });
}


// =========================================
// Winner Display
// =========================================

function displayWinner(
    winner,
    supporterNameText,
    challengerNameText
) {
    // Reset previous result styling
    supporterWinner.classList.remove("winnerText");
    challengerWinner.classList.remove("winnerText");

    if (winner === "SUPPORTER") {

        supporterWinner.textContent =
            supporterNameText;

        challengerWinner.textContent =
            challengerNameText;

        supporterWinner.classList.add(
            "winnerText"
        );

        return;
    }

    if (winner === "CHALLENGER") {

        supporterWinner.textContent =
            challengerNameText;

        challengerWinner.textContent =
            supporterNameText;

        challengerWinner.classList.add(
            "winnerText"
        );

        return;
    }

    // If the judge cannot determine a winner
    supporterWinner.textContent =
        "Result unclear";

    challengerWinner.textContent =
        "Result unclear";
}


// =========================================
// Model Display Name
// =========================================

function getSelectedModelName(selectElement) {

    return selectElement
        .options[selectElement.selectedIndex]
        .textContent
        .trim();
}