/**
 * ============================================================
 * CrazyBot - Mohit Peshwani Local LLM Portfolio Assistant
 * ============================================================
 *
 * Runs entirely in the browser.
 *
 * Architecture:
 *
 *   User
 *      ↓
 *   CrazyBot UI
 *      ↓
 *   WebLLM
 *      ↓
 *   WebGPU
 *      ↓
 *   Local LLM
 *      ↓
 *   Mohit Knowledge Base
 *      ↓
 *   Response
 *
 * No backend
 * No API key
 * No paid API
 * No Cloudflare
 * No OpenRouter
 *
 * Requirements:
 * - Modern browser
 * - WebGPU support
 * - HTTPS / GitHub Pages
 * ============================================================
 */

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  const CONFIG = {
    botName: "CrazyBot",

    knowledgeUrl:
      "knowledge/mohit-knowledge.json",

    /*
     * Small local model selected intentionally for browser use.
     * WebLLM currently provides this model in its prebuilt
     * model configuration.
     */
    modelId:
      "Llama-3.2-1B-Instruct-q4f16_1-MLC",

    maxRetrievedDocuments: 12,

    maxKnowledgeCharacters: 14000,

    maxConversationMessages: 8,

    maxTokens: 500,

    temperature: 0.2,

    speechRate: 1.05,

    speechPitch: 1.0,

    modelLoadingTimeoutMs: 180000
  };


  // ==========================================================
  // INTERNAL STATE
  // ==========================================================

  let webllm = null;

  let engine = null;

  let knowledgeBase = null;

  let knowledgeDocuments = [];

  let enginePromise = null;

  let knowledgePromise = null;

  const conversationHistory = [];


  // ==========================================================
  // EVENT SYSTEM
  // ==========================================================

  const listeners = {
    loading: [],
    ready: [],
    error: []
  };

  function on(eventName, callback) {
    if (!listeners[eventName]) {
      listeners[eventName] = [];
    }

    listeners[eventName].push(callback);
  }

  function emit(eventName, payload) {
    const callbacks =
      listeners[eventName] || [];

    callbacks.forEach((callback) => {
      try {
        callback(payload);
      } catch (error) {
        console.warn(
          "CrazyBot event callback error:",
          error
        );
      }
    });
  }


  // ==========================================================
  // UTILITY
  // ==========================================================

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^\w\s/&.-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }


  function escapeHtml(str) {
    if (str === null || str === undefined) {
      return "";
    }

    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function formatMarkdown(text) {
    if (!text) {
      return "";
    }

    let html =
      escapeHtml(text);

    html =
      html.replace(
        /\*\*([^*]+)\*\*/g,
        "<strong>$1</strong>"
      );

    html =
      html.replace(
        /\*([^*]+)\*/g,
        "<em>$1</em>"
      );

    html =
      html.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:underline;">$1</a>'
      );

    html =
      html.replace(
        /^### (.+)$/gm,
        "<strong>$1</strong>"
      );

    html =
      html.replace(
        /^## (.+)$/gm,
        "<strong>$1</strong>"
      );

    html =
      html.replace(
        /^# (.+)$/gm,
        "<strong>$1</strong>"
      );

    html =
      html.replace(
        /\n/g,
        "<br>"
      );

    return html;
  }


  function getCurrentTime() {
    return new Date().toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  }


  // ==========================================================
  // LOAD WEBLLM
  // ==========================================================

  async function loadWebLLM() {
    if (webllm) {
      return webllm;
    }

    emit("loading", {
      stage: "library",
      progress: 5,
      message:
        "Loading local AI engine..."
    });

    webllm =
      await import(
        "https://esm.run/@mlc-ai/web-llm"
      );

    return webllm;
  }


  // ==========================================================
  // WEBGPU CHECK
  // ==========================================================

  async function checkWebGPU() {

    emit("loading", {
      stage: "gpu",
      progress: 1,
      message:
        "Checking WebGPU support..."
    });

    if (!navigator.gpu) {
      throw new Error(
        "WebGPU is not supported by this browser."
      );
    }

    const adapter =
      await navigator.gpu.requestAdapter();

    if (!adapter) {
      throw new Error(
        "No compatible WebGPU adapter was found."
      );
    }

    return true;
  }


  // ==========================================================
  // LOAD MOHIT KNOWLEDGE BASE
  // ==========================================================

  async function loadKnowledgeBase() {

    if (knowledgeBase) {
      return knowledgeBase;
    }

    if (knowledgePromise) {
      return knowledgePromise;
    }

    knowledgePromise =
      (async () => {

        emit("loading", {
          stage: "knowledge",
          progress: 10,
          message:
            "Loading Mohit's knowledge base..."
        });

        /*
         * First preference:
         * existing PORTFOLIO_DATA object.
         *
         * This means the bot can continue working with your
         * existing portfolio-data.js if you still have it.
         */
        if (
          window.PORTFOLIO_DATA &&
          typeof window.PORTFOLIO_DATA ===
            "object"
        ) {
          knowledgeBase =
            window.PORTFOLIO_DATA;

        } else {

          const response =
            await fetch(
              CONFIG.knowledgeUrl,
              {
                method: "GET",
                cache: "no-store"
              }
            );

          if (!response.ok) {
            throw new Error(
              `Could not load ${CONFIG.knowledgeUrl} (${response.status}).`
            );
          }

          knowledgeBase =
            await response.json();
        }

        knowledgeDocuments =
          buildKnowledgeDocuments(
            knowledgeBase
          );

        emit("loading", {
          stage: "knowledge",
          progress: 15,
          message:
            `Loaded ${knowledgeDocuments.length} knowledge items.`
        });

        return knowledgeBase;

      })();

    try {
      return await knowledgePromise;
    } finally {
      knowledgePromise = null;
    }
  }


  // ==========================================================
  // FLATTEN KNOWLEDGE JSON
  // ==========================================================

  function buildKnowledgeDocuments(root) {

    const documents = [];

    function walk(
      node,
      path,
      depth
    ) {

      if (
        node === null ||
        node === undefined
      ) {
        return;
      }

      if (depth > 10) {
        return;
      }

      if (documents.length >= 1000) {
        return;
      }

      // ------------------------------------------------------
      // Array
      // ------------------------------------------------------

      if (Array.isArray(node)) {

        node.forEach(
          (item, index) => {

            walk(
              item,
              `${path}[${index}]`,
              depth + 1
            );

          }
        );

        return;
      }

      // ------------------------------------------------------
      // Object
      // ------------------------------------------------------

      if (
        typeof node ===
        "object"
      ) {

        Object.entries(node)
          .forEach(
            ([key, value]) => {

              const nextPath =
                path
                  ? `${path}.${key}`
                  : key;

              /*
               * Keep complete arrays/objects as useful chunks
               * when they are project records, experience
               * records, repositories, etc.
               */
              if (
                value &&
                typeof value ===
                  "object"
              ) {

                if (
                  isUsefulRecord(value)
                ) {

                  const recordText =
                    flattenRecord(
                      value
                    );

                  if (recordText) {
                    documents.push({
                      path:
                        nextPath,
                      text:
                        recordText
                    });
                  }
                }

                walk(
                  value,
                  nextPath,
                  depth + 1
                );

                return;
              }

              // Primitive value

              documents.push({
                path:
                  nextPath,
                text:
                  `${key}: ${String(value)}`
              });

            }
          );

        return;
      }

      documents.push({
        path,
        text: String(node)
      });
    }

    walk(
      root,
      "",
      0
    );

    return deduplicateDocuments(
      documents
    );
  }


  function isUsefulRecord(value) {

    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return false;
    }

    const keys =
      Object.keys(value)
        .map(
          (key) =>
            key.toLowerCase()
        );

    const usefulKeys = [
      "name",
      "title",
      "role",
      "company",
      "description",
      "problem",
      "solution",
      "objective",
      "outcome",
      "impact",
      "project",
      "capability",
      "degree",
      "institution",
      "technology",
      "technologies",
      "classification"
    ];

    return usefulKeys.some(
      (key) =>
        keys.includes(key)
    );
  }


  function flattenRecord(record) {

    const parts = [];

    Object.entries(record)
      .forEach(
        ([key, value]) => {

          if (
            value === null ||
            value === undefined
          ) {
            return;
          }

          if (
            Array.isArray(value)
          ) {

            const arrayText =
              value
                .map(
                  (item) =>
                    typeof item ===
                    "object"
                      ? flattenRecord(
                          item
                        )
                      : String(item)
                )
                .filter(Boolean)
                .join(", ");

            if (arrayText) {
              parts.push(
                `${key}: ${arrayText}`
              );
            }

            return;
          }

          if (
            typeof value ===
            "object"
          ) {

            const objectText =
              flattenRecord(
                value
              );

            if (objectText) {
              parts.push(
                `${key}: ${objectText}`
              );
            }

            return;
          }

          parts.push(
            `${key}: ${String(value)}`
          );
        }
      );

    return parts.join(
      " | "
    );
  }


  function deduplicateDocuments(
    documents
  ) {

    const seen =
      new Set();

    return documents.filter(
      (document) => {

        const signature =
          normalizeText(
            `${document.path}|${document.text}`
          );

        if (
          seen.has(signature)
        ) {
          return false;
        }

        seen.add(signature);

        return true;
      }
    );
  }


  // ==========================================================
  // RETRIEVAL
  // ==========================================================

  function scoreDocument(
    query,
    document
  ) {

    const normalizedQuery =
      normalizeText(query);

    const normalizedDocument =
      normalizeText(
        `${document.path} ${document.text}`
      );

    if (
      !normalizedQuery ||
      !normalizedDocument
    ) {
      return 0;
    }

    const queryWords =
      normalizedQuery
        .split(" ")
        .filter(
          (word) =>
            word.length >= 3
        );

    let score = 0;

    queryWords.forEach(
      (word) => {

        if (
          normalizedDocument
            .includes(word)
        ) {
          score += 1;
        }

        if (
          normalizeText(
            document.path
          ).includes(word)
        ) {
          score += 2;
        }
      }
    );

    /*
     * Strong domain boosts.
     */
    const boostTerms = [
      "agentforce",
      "agentic",
      "salesforce",
      "data cloud",
      "data360",
      "python",
      "apex",
      "lwc",
      "flows",
      "einstein",
      "github",
      "topmate",
      "youtube",
      "forward deployed",
      "fde",
      "recruitment",
      "banking",
      "bfsi",
      "certificate",
      "certification",
      "experience",
      "education",
      "career",
      "project"
    ];

    boostTerms.forEach(
      (term) => {

        if (
          normalizedQuery
            .includes(term) &&
          normalizedDocument
            .includes(term)
        ) {
          score += 4;
        }
      }
    );

    /*
     * Exact phrase match.
     */
    if (
      normalizedDocument.includes(
        normalizedQuery
      )
    ) {
      score += 15;
    }

    return score;
  }


  function retrieveRelevantKnowledge(
    query
  ) {

    if (
      !knowledgeDocuments.length
    ) {
      return [];
    }

    return knowledgeDocuments
      .map(
        (document) => ({
          ...document,
          score:
            scoreDocument(
              query,
              document
            )
        })
      )
      .filter(
        (document) =>
          document.score > 0
      )
      .sort(
        (a, b) =>
          b.score - a.score
      )
      .slice(
        0,
        CONFIG.maxRetrievedDocuments
      );
  }


  function buildRelevantContext(
    query
  ) {

    const documents =
      retrieveRelevantKnowledge(
        query
      );

    if (!documents.length) {

      /*
       * Fallback to core identity.
       */
      const fallback = {
        profile:
          knowledgeBase?.profile ||
          {},
        professionalIdentity:
          knowledgeBase
            ?.professionalIdentity ||
          {},
        geeksoft:
          knowledgeBase?.geeksoft ||
          {}
      };

      return JSON.stringify(
        fallback,
        null,
        2
      );
    }

    let context = "";

    documents.forEach(
      (document, index) => {

        context +=
          `\n### KNOWLEDGE ${index + 1}\n`;

        context +=
          `SOURCE: ${document.path}\n`;

        context +=
          `CONTENT: ${document.text}\n`;
      }
    );

    if (
      context.length >
      CONFIG.maxKnowledgeCharacters
    ) {

      context =
        context.slice(
          0,
          CONFIG.maxKnowledgeCharacters
        );
    }

    return context;
  }


  // ==========================================================
  // SYSTEM PROMPT
  // ==========================================================

  function buildSystemPrompt(
    relevantContext
  ) {

    return `
You are CrazyBot, the professional AI representative for Mohit Peshwani.

Your job is to answer questions about Mohit using the supplied knowledge context.

IDENTITY:
- Mohit Peshwani is a Salesforce Consultant at GeekSoft Consulting Pvt Ltd.
- His technical focus includes Salesforce, Agentforce, Data Cloud/Data360, AI, automation, integrations and data analytics.
- He is actively developing toward a Forward Deployed Engineer career.
- FDE is an emerging career direction, not his current job title.

SOURCE OF TRUTH:
The supplied Mohit knowledge context is your factual source of truth.

ACCURACY RULES:
1. Never invent experience.
2. Never invent clients.
3. Never invent metrics.
4. Never invent certifications.
5. Never invent responsibilities.
6. Never invent GitHub ownership.
7. Never claim forked repositories are original work.
8. Keep professional work separate from independent projects.
9. Keep GitHub repositories separate from employment history.
10. Keep Topmate separate from employment.
11. Keep YouTube separate from employment.
12. Never reveal confidential client, banking, architecture, credential or proprietary information.
13. If information is not in the provided context, say that the information is not currently available.
14. Do not pretend to know private information.
15. Do not say you personally worked with Mohit.
16. You are CrazyBot, not Mohit.
17. Do not exaggerate.
18. Prefer concrete evidence.
19. Answer directly.
20. Use concise professional English unless the user asks for detail.

RESPONSE STYLE:
- Natural
- Professional
- Clear
- Human
- Helpful
- No unnecessary disclaimers
- No fabricated details
- Use bullets when useful
- Use short paragraphs

PROJECT CLASSIFICATION:
- GeekSoft projects = professional current work.
- Areya, Delbridge and BrowserStack = professional employment work.
- Independent projects = portfolio/personal projects.
- GitHub = public technical work.
- Topmate = mentorship/community.
- YouTube = creator/education.
- FDE = emerging career direction.

RELEVANT MOHIT KNOWLEDGE:
${relevantContext}
`;
  }


  // ==========================================================
  // INITIALIZE LOCAL LLM
  // ==========================================================

  async function initializeLLM() {

    if (engine) {
      return engine;
    }

    if (enginePromise) {
      return enginePromise;
    }

    enginePromise =
      (async () => {

        try {

          await checkWebGPU();

          await loadWebLLM();

          await loadKnowledgeBase();

          emit("loading", {
            stage: "model",
            progress: 15,
            message:
              "Preparing CrazyBot's local AI model..."
          });

          const progressCallback =
            (progress) => {

              let value = 15;

              if (
                typeof progress?.progress ===
                "number"
              ) {

                value =
                  15 +
                  Math.round(
                    progress.progress *
                      80
                  );
              }

              value =
                Math.max(
                  15,
                  Math.min(
                    95,
                    value
                  )
                );

              emit("loading", {
                stage: "model",
                progress: value,
                message:
                  progress?.text ||
                  "Downloading local AI model..."
              });
            };

          engine =
            await webllm.CreateMLCEngine(
              CONFIG.modelId,
              {
                initProgressCallback:
                  progressCallback
              }
            );

          emit("loading", {
            stage: "ready",
            progress: 100,
            message:
              "CrazyBot AI is ready."
          });

          emit("ready", {
            model:
              CONFIG.modelId
          });

          return engine;

        } catch (error) {

          emit("error", {
            error
          });

          engine = null;

          throw error;
        }

      })();

    try {
      return await enginePromise;
    } finally {
      enginePromise = null;
    }
  }


  // ==========================================================
  // CONVERSATION MEMORY
  // ==========================================================

  function addConversationMessage(
    role,
    content
  ) {

    conversationHistory.push({
      role,
      content
    });

    while (
      conversationHistory.length >
      CONFIG.maxConversationMessages
    ) {
      conversationHistory.shift();
    }
  }


  function clearConversation() {
    conversationHistory.length = 0;
  }


  // ==========================================================
  // LOCAL LLM QUESTION
  // ==========================================================

  async function askLocalLLM(
    userMessage
  ) {

    const message =
      String(userMessage || "")
        .trim();

    if (!message) {
      throw new Error(
        "Please enter a question."
      );
    }

    const localEngine =
      await initializeLLM();

    const context =
      buildRelevantContext(
        message
      );

    const systemPrompt =
      buildSystemPrompt(
        context
      );

    addConversationMessage(
      "user",
      message
    );

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...conversationHistory
    ];

    try {

      const result =
        await localEngine
          .chat
          .completions
          .create({
            model:
              CONFIG.modelId,

            messages,

            temperature:
              CONFIG.temperature,

            max_tokens:
              CONFIG.maxTokens,

            stream: false
          });

      const answer =
        result
          ?.choices?.[0]
          ?.message
          ?.content
          ?.trim();

      if (!answer) {
        throw new Error(
          "The local model returned an empty response."
        );
      }

      addConversationMessage(
        "assistant",
        answer
      );

      return answer;

    } catch (error) {

      /*
       * Remove failed user message
       * so retry is clean.
       */
      conversationHistory.pop();

      throw error;
    }
  }


  // ==========================================================
  // LOAD STATUS UI
  // ==========================================================

  function getModelStatus() {

    if (engine) {
      return "ready";
    }

    if (enginePromise) {
      return "loading";
    }

    return "not-started";
  }


  // ==========================================================
  // CRAZYBOT WIDGET
  // ==========================================================

  class CrazyBotWidget {

    constructor(
      options = {}
    ) {

      this.data =
        options.data ||
        window.PORTFOLIO_DATA ||
        null;

      this.voiceEnabled =
        localStorage.getItem(
          "crazybot_voice_enabled"
        ) !== "false";

      this.isOpen = false;

      this.isSpeaking = false;

      this.isListening = false;

      this.isProcessing = false;

      this.currentUtterance = null;

      this.recognition = null;

      this.selectedVoice = null;

      this.init();
    }


    // --------------------------------------------------------
    // INITIALIZE
    // --------------------------------------------------------

    async init() {

      try {

        await this.loadData();

        this.injectStyles();

        this.renderWidget();

        this.setupSpeech();

        this.setupEventListeners();

        const greeting =
          this.data
            ?.bot
            ?.greeting ||
          this.data
            ?.profile
            ?.voiceIntro ||
          "👋 Hi! I'm CrazyBot, Mohit's AI portfolio assistant. Ask me about his Salesforce, Agentforce, projects, experience, mentorship or FDE journey.";

        this.addBotMessage(
          greeting,
          {
            speak: false,
            quickChips: true
          }
        );

      } catch (error) {

        console.error(
          "CrazyBot initialization error:",
          error
        );

        this.injectStyles();

        this.renderWidget();

        this.setupSpeech();

        this.setupEventListeners();

        this.addBotMessage(
          "👋 Hi! I'm CrazyBot. I could not fully load Mohit's knowledge base yet, but the chat interface is ready.",
          {
            speak: false,
            quickChips: true
          }
        );
      }
    }


    async loadData() {

      if (
        this.data &&
        typeof this.data ===
          "object"
      ) {
        knowledgeBase =
          this.data;

        knowledgeDocuments =
          buildKnowledgeDocuments(
            this.data
          );

        return this.data;
      }

      this.data =
        await loadKnowledgeBase();

      return this.data;
    }


    // --------------------------------------------------------
    // CSS
    // --------------------------------------------------------

    injectStyles() {

      if (
        !document.getElementById(
          "pbot-css"
        )
      ) {

        const link =
          document.createElement(
            "link"
          );

        link.id =
          "pbot-css";

        link.rel =
          "stylesheet";

        link.href =
          "bot-styles.css";

        document.head.appendChild(
          link
        );
      }
    }


    // --------------------------------------------------------
    // RENDER WIDGET
    // --------------------------------------------------------

    renderWidget() {

      const existing =
        document.getElementById(
          "portfolio-bot-root"
        );

      if (existing) {
        existing.remove();
      }

      const root =
        document.createElement(
          "div"
        );

      root.id =
        "portfolio-bot-root";

      const profile =
        this.data?.profile || {
          name:
            "Mohit Peshwani",
          title:
            "Salesforce Consultant | Agentforce & AI Engineer"
        };

      const botName =
        this.data
          ?.bot
          ?.name ||
        CONFIG.botName;

      root.innerHTML = `

        <!-- Floating Greeting Pill -->

        <div
          class="pbot-greeting-pill"
          id="pbot-greeting-pill"
          title="Click to chat with CrazyBot"
        >

          <span class="pbot-wave-emoji">
            👋
          </span>

          <span>
            Ask CrazyBot about Mohit's work & projects!
          </span>

        </div>


        <!-- Floating Launcher -->

        <button
          class="pbot-launcher-btn"
          id="pbot-launcher-btn"
          aria-label="Open CrazyBot AI Assistant"
        >

          <div
            class="pbot-launcher-pulse"
          ></div>

          <div
            style="font-size:28px;line-height:1;"
            title="CrazyBot"
          >
            🤖
          </div>

          <div
            class="pbot-online-badge"
            title="CrazyBot Online"
          ></div>

        </button>


        <!-- Chat Window -->

        <div
          class="pbot-window"
          id="pbot-window"
          role="dialog"
          aria-modal="true"
          aria-label="CrazyBot Chat Window"
        >

          <!-- Header -->

          <div class="pbot-header">

            <div class="pbot-header-info">

              <div
                style="
                  width:40px;
                  height:40px;
                  border-radius:50%;
                  background:linear-gradient(135deg,#6366f1,#06b6d4);
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-size:22px;
                  flex-shrink:0;
                  border:2px solid #818cf8;
                "
              >
                🤖
              </div>

              <div class="pbot-header-text">

                <div class="pbot-header-title">

                  <span>
                    ${escapeHtml(
                      botName
                    )}
                  </span>

                  <span
                    class="pbot-zero-badge"
                    id="pbot-ai-badge"
                  >
                    Local AI
                  </span>

                </div>

                <div
                  class="pbot-header-subtitle"
                >

                  <span
                    class="pbot-status-dot"
                    id="pbot-status-dot"
                  ></span>

                  <span
                    id="pbot-status-text"
                  >
                    Mohit Peshwani's AI Assistant
                  </span>

                </div>

              </div>

            </div>


            <div class="pbot-header-actions">

              <button
                class="pbot-header-btn"
                id="pbot-pitch-btn"
                title="Play 30s Audio Pitch"
              >
                🎙️
              </button>

              <button
                class="pbot-header-btn ${this.voiceEnabled ? "pbot-active" : ""}"
                id="pbot-mute-btn"
                title="Toggle Voice Audio"
              >
                ${this.voiceEnabled ? "🔊" : "🔇"}
              </button>

              <button
                class="pbot-header-btn"
                id="pbot-clear-btn"
                title="Clear Conversation"
              >
                🗑️
              </button>

              <button
                class="pbot-header-btn"
                id="pbot-close-btn"
                title="Close Window"
              >
                ✕
              </button>

            </div>

          </div>


          <!-- AI Loading Banner -->

          <div
            id="pbot-ai-loading"
            style="
              display:none;
              padding:8px 12px;
              font-size:11px;
              color:#cbd5e1;
              background:rgba(15,23,42,.85);
            "
          >

            <div
              id="pbot-ai-loading-text"
            >
              Loading local AI...
            </div>

            <div
              style="
                margin-top:5px;
                height:4px;
                background:rgba(148,163,184,.2);
                border-radius:4px;
                overflow:hidden;
              "
            >

              <div
                id="pbot-ai-progress"
                style="
                  width:0%;
                  height:100%;
                  background:#6366f1;
                  transition:width .2s ease;
                "
              ></div>

            </div>

          </div>


          <!-- Audio Banner -->

          <div
            class="pbot-audio-banner"
            id="pbot-audio-banner"
          >

            <div
              class="pbot-audio-status"
            >

              <div
                class="pbot-eq-bars"
              >

                <div
                  class="pbot-eq-bar"
                ></div>

                <div
                  class="pbot-eq-bar"
                ></div>

                <div
                  class="pbot-eq-bar"
                ></div>

                <div
                  class="pbot-eq-bar"
                ></div>

                <div
                  class="pbot-eq-bar"
                ></div>

              </div>

              <span
                id="pbot-audio-label"
              >
                CrazyBot speaking...
              </span>

            </div>

            <button
              class="pbot-stop-audio-btn"
              id="pbot-stop-audio-btn"
            >
              ⏹️ Stop Audio
            </button>

          </div>


          <!-- Messages -->

          <div
            class="pbot-body"
            id="pbot-messages-body"
          ></div>


          <!-- Quick Chips -->

          <div
            class="pbot-chips-container"
            id="pbot-chips-container"
          ></div>


          <!-- Listening Banner -->

          <div
            class="pbot-listening-banner"
            id="pbot-listening-banner"
          >

            <span>
              🔴 Listening to your voice... Speak now!
            </span>

            <button
              class="pbot-stop-audio-btn"
              id="pbot-cancel-mic-btn"
            >
              Cancel
            </button>

          </div>


          <!-- Input -->

          <form
            class="pbot-footer"
            id="pbot-input-form"
          >

            <div
              class="pbot-input-wrap"
            >

              <input
                type="text"
                id="pbot-user-input"
                class="pbot-input"
                placeholder="Ask about Mohit's projects, Agentforce, career..."
                autocomplete="off"
              />

              <button
                type="button"
                id="pbot-mic-btn"
                class="pbot-mic-btn"
                title="Ask with your voice"
              >
                🎙️
              </button>

            </div>

            <button
              type="submit"
              id="pbot-send-btn"
              class="pbot-send-btn"
              title="Send message"
              aria-label="Send"
            >
              ➤
            </button>

          </form>


          <!-- Footer -->

          <div
            class="pbot-credit-tag"
          >
            ⚡ CrazyBot • Local WebLLM • No API Key
          </div>

        </div>
      `;

      document.body.appendChild(
        root
      );

      this.renderQuickChips();
    }


    // --------------------------------------------------------
    // QUICK CHIPS
    // --------------------------------------------------------

    renderQuickChips() {

      const container =
        document.getElementById(
          "pbot-chips-container"
        );

      if (!container) {
        return;
      }

      const chips =
        this.data?.quickChips ||
        [
          {
            label:
              "🎙️ 30s Voice Pitch",
            query:
              "Give me Mohit's 30-second elevator pitch"
          },

          {
            label:
              "🤖 Agentforce & AI",
            query:
              "Tell me about Mohit's Agentforce and AI experience"
          },

          {
            label:
              "🏢 GeekSoft",
            query:
              "Tell me about Mohit's current work at GeekSoft"
          },

          {
            label:
              "💼 Projects",
            query:
              "Show me Mohit's professional and independent projects"
          },

          {
            label:
              "🐙 GitHub",
            query:
              "Tell me about Mohit's GitHub projects"
          },

          {
            label:
              "⭐ Topmate",
            query:
              "Tell me about Mohit's Topmate mentorship journey"
          },

          {
            label:
              "🎥 YouTube",
            query:
              "Tell me about Mohit's YouTube journey"
          },

          {
            label:
              "🚀 FDE Journey",
            query:
              "Tell me about Mohit's Forward Deployed Engineer journey"
          },

          {
            label:
              "📜 Certifications",
            query:
              "What certifications does Mohit hold?"
          },

          {
            label:
              "📫 Contact",
            query:
              "How can I contact Mohit Peshwani?"
          }
        ];

      container.innerHTML =
        chips
          .map(
            (chip) =>
              `
                <button
                  type="button"
                  class="pbot-chip"
                  data-query="${escapeHtml(
                    chip.query
                  )}"
                >
                  ${escapeHtml(
                    chip.label
                  )}
                </button>
              `
          )
          .join("");
    }


    // --------------------------------------------------------
    // SPEECH
    // --------------------------------------------------------

    setupSpeech() {

      // TTS

      if (
        "speechSynthesis" in
        window
      ) {

        const loadVoices =
          () => {

            const voices =
              window.speechSynthesis
                .getVoices();

            this.selectedVoice =
              voices.find(
                (voice) =>
                  voice.lang.startsWith(
                    "en"
                  ) &&
                  (
                    voice.name.includes(
                      "Natural"
                    ) ||
                    voice.name.includes(
                      "Google"
                    ) ||
                    voice.name.includes(
                      "Samantha"
                    ) ||
                    voice.name.includes(
                      "Daniel"
                    )
                  )
              ) ||
              voices.find(
                (voice) =>
                  voice.lang.startsWith(
                    "en"
                  )
              ) ||
              voices[0] ||
              null;
          };

        loadVoices();

        if (
          window.speechSynthesis
            .onvoiceschanged !==
          undefined
        ) {

          window.speechSynthesis
            .onvoiceschanged =
            loadVoices;
        }
      }


      // STT

      const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

      if (
        SpeechRecognition
      ) {

        this.recognition =
          new SpeechRecognition();

        this.recognition.continuous =
          false;

        this.recognition.interimResults =
          false;

        this.recognition.lang =
          "en-US";


        this.recognition.onstart =
          () => {

            this.isListening =
              true;

            this.updateListeningUI(
              true
            );
          };


        this.recognition.onresult =
          (event) => {

            const transcript =
              event
                ?.results?.[0]?.[0]
                ?.transcript ||
              "";

            const input =
              document.getElementById(
                "pbot-user-input"
              );

            if (input) {
              input.value =
                transcript;
            }

            this.handleUserQuery(
              transcript
            );
          };


        this.recognition.onerror =
          (event) => {

            console.warn(
              "CrazyBot speech recognition error:",
              event.error
            );

            this.isListening =
              false;

            this.updateListeningUI(
              false
            );

            if (
              event.error ===
              "not-allowed"
            ) {

              this.addBotMessage(
                "Microphone permission was not allowed. You can still type your question.",
                {
                  speak: false
                }
              );
            }
          };


        this.recognition.onend =
          () => {

            this.isListening =
              false;

            this.updateListeningUI(
              false
            );
          };
      }
    }


    updateListeningUI(
      active
    ) {

      const micBtn =
        document.getElementById(
          "pbot-mic-btn"
        );

      const banner =
        document.getElementById(
          "pbot-listening-banner"
        );

      if (micBtn) {

        micBtn.classList.toggle(
          "pbot-recording",
          active
        );
      }

      if (banner) {

        banner.classList.toggle(
          "pbot-active",
          active
        );
      }
    }


    // --------------------------------------------------------
    // TEXT TO SPEECH
    // --------------------------------------------------------

    speak(
      text,
      label =
        "CrazyBot speaking..."
    ) {

      if (
        !this.voiceEnabled ||
        !("speechSynthesis" in window)
      ) {
        return;
      }

      this.stopSpeaking();

      const cleanText =
        String(text || "")
          .replace(
            /\[([^\]]+)\]\([^)]+\)/g,
            "$1"
          )
          .replace(
            /[#*`_~]/g,
            ""
          )
          .replace(
            /https?:\/\/\S+/g,
            ""
          )
          .replace(
            /[🏆🚀⭐📜💡📫⚡🎥🤖★]/g,
            ""
          )
          .trim();

      if (!cleanText) {
        return;
      }

      const utterance =
        new SpeechSynthesisUtterance(
          cleanText
        );

      if (
        this.selectedVoice
      ) {
        utterance.voice =
          this.selectedVoice;
      }

      utterance.rate =
        CONFIG.speechRate;

      utterance.pitch =
        CONFIG.speechPitch;


      utterance.onstart =
        () => {

          this.isSpeaking =
            true;

          this.currentUtterance =
            utterance;

          const banner =
            document.getElementById(
              "pbot-audio-banner"
            );

          const labelElement =
            document.getElementById(
              "pbot-audio-label"
            );

          if (banner) {
            banner.classList.add(
              "pbot-active"
            );
          }

          if (labelElement) {
            labelElement.textContent =
              label;
          }
        };


      utterance.onend =
        () => {

          this.isSpeaking =
            false;

          this.currentUtterance =
            null;

          const banner =
            document.getElementById(
              "pbot-audio-banner"
            );

          if (banner) {
            banner.classList.remove(
              "pbot-active"
            );
          }
        };


      utterance.onerror =
        () => {

          this.isSpeaking =
            false;

          this.currentUtterance =
            null;

          const banner =
            document.getElementById(
              "pbot-audio-banner"
            );

          if (banner) {
            banner.classList.remove(
              "pbot-active"
            );
          }
        };

      window.speechSynthesis.speak(
        utterance
      );
    }


    stopSpeaking() {

      if (
        "speechSynthesis" in
        window
      ) {

        window.speechSynthesis.cancel();
      }

      this.isSpeaking =
        false;

      this.currentUtterance =
        null;

      const banner =
        document.getElementById(
          "pbot-audio-banner"
        );

      if (banner) {

        banner.classList.remove(
          "pbot-active"
        );
      }
    }


    // --------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------

    setupEventListeners() {

      const launcherBtn =
        document.getElementById(
          "pbot-launcher-btn"
        );

      const greetingPill =
        document.getElementById(
          "pbot-greeting-pill"
        );

      const closeBtn =
        document.getElementById(
          "pbot-close-btn"
        );

      const clearBtn =
        document.getElementById(
          "pbot-clear-btn"
        );

      const muteBtn =
        document.getElementById(
          "pbot-mute-btn"
        );

      const pitchBtn =
        document.getElementById(
          "pbot-pitch-btn"
        );

      const stopAudioBtn =
        document.getElementById(
          "pbot-stop-audio-btn"
        );

      const micBtn =
        document.getElementById(
          "pbot-mic-btn"
        );

      const cancelMicBtn =
        document.getElementById(
          "pbot-cancel-mic-btn"
        );

      const form =
        document.getElementById(
          "pbot-input-form"
        );

      const input =
        document.getElementById(
          "pbot-user-input"
        );

      const chipsContainer =
        document.getElementById(
          "pbot-chips-container"
        );


      const toggleChat =
        () => {

          this.isOpen =
            !this.isOpen;

          const win =
            document.getElementById(
              "pbot-window"
            );

          if (!win) {
            return;
          }

          if (
            this.isOpen
          ) {

            win.classList.add(
              "pbot-open"
            );

            if (
              greetingPill
            ) {
              greetingPill.style.display =
                "none";
            }

            setTimeout(
              () =>
                input?.focus(),
              250
            );

          } else {

            win.classList.remove(
              "pbot-open"
            );

            this.stopSpeaking();
          }
        };


      launcherBtn?.addEventListener(
        "click",
        toggleChat
      );

      greetingPill?.addEventListener(
        "click",
        toggleChat
      );


      closeBtn?.addEventListener(
        "click",
        () => {

          this.isOpen =
            false;

          document
            .getElementById(
              "pbot-window"
            )
            ?.classList.remove(
              "pbot-open"
            );

          this.stopSpeaking();
        }
      );


      muteBtn?.addEventListener(
        "click",
        () => {

          this.voiceEnabled =
            !this.voiceEnabled;

          localStorage.setItem(
            "crazybot_voice_enabled",
            String(
              this.voiceEnabled
            )
          );

          muteBtn.textContent =
            this.voiceEnabled
              ? "🔊"
              : "🔇";

          muteBtn.classList.toggle(
            "pbot-active",
            this.voiceEnabled
          );

          if (
            !this.voiceEnabled
          ) {
            this.stopSpeaking();
          }
        }
      );


      clearBtn?.addEventListener(
        "click",
        () => {

          const body =
            document.getElementById(
              "pbot-messages-body"
            );

          if (body) {
            body.innerHTML =
              "";
          }

          clearConversation();

          this.stopSpeaking();

          this.addBotMessage(
            "Conversation cleared. What would you like to know about Mohit?",
            {
              speak: false
            }
          );
        }
      );


      pitchBtn?.addEventListener(
        "click",
        () => {
          this.playPitch();
        }
      );


      stopAudioBtn?.addEventListener(
        "click",
        () => {
          this.stopSpeaking();
        }
      );


      micBtn?.addEventListener(
        "click",
        () => {

          if (
            !this.recognition
          ) {

            alert(
              "Speech recognition is not available in this browser."
            );

            return;
          }

          if (
            this.isListening
          ) {

            this.recognition.stop();

          } else {

            this.stopSpeaking();

            try {

              this.recognition.start();

            } catch (error) {

              console.warn(
                "Could not start speech recognition:",
                error
              );
            }
          }
        }
      );


      cancelMicBtn?.addEventListener(
        "click",
        () => {

          if (
            this.recognition &&
            this.isListening
          ) {

            this.recognition.stop();
          }
        }
      );


      form?.addEventListener(
        "submit",
        (event) => {

          event.preventDefault();

          const text =
            input?.value?.trim();

          if (!text) {
            return;
          }

          input.value =
            "";

          this.handleUserQuery(
            text
          );
        }
      );


      chipsContainer?.addEventListener(
        "click",
        (event) => {

          const chip =
            event.target.closest(
              ".pbot-chip"
            );

          if (!chip) {
            return;
          }

          const query =
            chip.dataset.query;

          if (query) {

            this.handleUserQuery(
              query
            );
          }
        }
      );


      const body =
        document.getElementById(
          "pbot-messages-body"
        );

      body?.addEventListener(
        "click",
        (event) => {

          const button =
            event.target.closest(
              ".pbot-speech-bubble-btn"
            );

          if (!button) {
            return;
          }

          const text =
            button.dataset.text;

          if (text) {
            this.speak(
              text,
              "Reading message"
            );
          }
        }
      );


      // WebLLM status events

      on(
        "loading",
        (status) =>
          this.updateAIStatus(
            status
          )
      );

      on(
        "ready",
        () =>
          this.updateAIReady()
      );

      on(
        "error",
        (payload) =>
          this.updateAIError(
            payload?.error
          )
      );
    }


    // --------------------------------------------------------
    // AI STATUS UI
    // --------------------------------------------------------

    updateAIStatus(
      status
    ) {

      const loading =
        document.getElementById(
          "pbot-ai-loading"
        );

      const text =
        document.getElementById(
          "pbot-ai-loading-text"
        );

      const progress =
        document.getElementById(
          "pbot-ai-progress"
        );

      const statusText =
        document.getElementById(
          "pbot-status-text"
        );

      if (loading) {
        loading.style.display =
          "block";
      }

      if (text) {

        text.textContent =
          status?.message ||
          "Loading local AI...";
      }

      if (progress) {

        const percentage =
          Number(
            status?.progress || 0
          );

        progress.style.width =
          `${Math.max(
            0,
            Math.min(
              100,
              percentage
            )
          )}%`;
      }

      if (
        statusText &&
        status?.message
      ) {

        statusText.textContent =
          status.message;
      }
    }


    updateAIReady() {

      const loading =
        document.getElementById(
          "pbot-ai-loading"
        );

      const statusText =
        document.getElementById(
          "pbot-status-text"
        );

      if (loading) {
        loading.style.display =
          "none";
      }

      if (statusText) {

        statusText.textContent =
          "Mohit's Local AI Assistant";
      }
    }


    updateAIError(
      error
    ) {

      const loading =
        document.getElementById(
          "pbot-ai-loading"
        );

      const statusText =
        document.getElementById(
          "pbot-status-text"
        );

      if (loading) {
        loading.style.display =
          "none";
      }

      if (statusText) {

        statusText.textContent =
          "AI fallback mode";
      }

      console.warn(
        "CrazyBot local AI error:",
        error
      );
    }


    // --------------------------------------------------------
    // 30 SECOND PITCH
    // --------------------------------------------------------

    playPitch() {

      const pitch =
        this.data
          ?.bot
          ?.pitch30s ||
        this.data
          ?.profile
          ?.pitch30s ||
        "Mohit Peshwani is a Salesforce Consultant focused on Agentforce, Data Cloud, AI-driven automation and enterprise Salesforce solutions. He is also building toward a broader Forward Deployed Engineer career while mentoring developers and sharing technical knowledge.";

      this.addBotMessage(
        `🎙️ **30-Second Spoken Pitch for Mohit Peshwani:**\n\n"${pitch}"`,
        {
          speakText:
            pitch,
          label:
            "30s Pitch for Mohit"
        }
      );
    }


    // --------------------------------------------------------
    // ADD USER MESSAGE
    // --------------------------------------------------------

    addUserMessage(
      text
    ) {

      const body =
        document.getElementById(
          "pbot-messages-body"
        );

      if (!body) {
        return;
      }

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "pbot-message pbot-msg-user";

      row.innerHTML = `
        <div class="pbot-msg-content">
          <div class="pbot-bubble">
            ${escapeHtml(text)}
          </div>
        </div>
      `;

      body.appendChild(
        row
      );

      this.scrollToBottom();
    }


    // --------------------------------------------------------
    // ADD BOT MESSAGE
    // --------------------------------------------------------

    addBotMessage(
      content,
      options = {}
    ) {

      const body =
        document.getElementById(
          "pbot-messages-body"
        );

      if (!body) {
        return;
      }

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "pbot-message pbot-msg-bot";

      let html = "";

      if (
        typeof content ===
        "string"
      ) {

        html =
          formatMarkdown(
            content
          );

      } else if (
        content?.html
      ) {

        html =
          content.html;
      }

      const speakText =
        options.speakText ||
        (
          typeof content ===
          "string"
            ? content
            : content?.speakText ||
              ""
        );

      row.innerHTML = `

        <div
          style="
            width:28px;
            height:28px;
            border-radius:50%;
            background:linear-gradient(135deg,#6366f1,#06b6d4);
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:15px;
            flex-shrink:0;
            margin-top:2px;
          "
        >
          🤖
        </div>

        <div class="pbot-msg-content">

          <div class="pbot-bubble">
            ${html}
          </div>

          <div class="pbot-msg-meta">

            <span>
              ${getCurrentTime()}
            </span>

            ${
              speakText
                ? `
                  <button
                    class="pbot-speech-bubble-btn"
                    data-text="${escapeHtml(
                      speakText
                    )}"
                    title="Listen to CrazyBot"
                  >
                    🔊 Listen
                  </button>
                `
                : ""
            }

          </div>

        </div>
      `;

      body.appendChild(
        row
      );

      this.scrollToBottom();

      if (
        options.speak !== false &&
        speakText
      ) {

        this.speak(
          speakText,
          options.label ||
            "CrazyBot"
        );
      }
    }


    // --------------------------------------------------------
    // TYPING
    // --------------------------------------------------------

    showTyping() {

      const body =
        document.getElementById(
          "pbot-messages-body"
        );

      if (!body) {
        return null;
      }

      this.hideTyping();

      const typing =
        document.createElement(
          "div"
        );

      typing.className =
        "pbot-typing";

      typing.id =
        "pbot-typing-indicator";

      typing.innerHTML = `
        <div class="pbot-typing-dot"></div>
        <div class="pbot-typing-dot"></div>
        <div class="pbot-typing-dot"></div>
      `;

      body.appendChild(
        typing
      );

      this.scrollToBottom();

      return typing;
    }


    hideTyping() {

      const typing =
        document.getElementById(
          "pbot-typing-indicator"
        );

      if (typing) {
        typing.remove();
      }
    }


    scrollToBottom() {

      const body =
        document.getElementById(
          "pbot-messages-body"
        );

      if (body) {

        body.scrollTop =
          body.scrollHeight;
      }
    }


    // --------------------------------------------------------
    // MAIN QUESTION HANDLER
    // --------------------------------------------------------

    async handleUserQuery(
      rawQuery
    ) {

      const query =
        String(
          rawQuery || ""
        ).trim();

      if (!query) {
        return;
      }

      if (
        this.isProcessing
      ) {
        return;
      }

      this.isProcessing =
        true;

      this.addUserMessage(
        query
      );

      this.showTyping();

      try {

        /*
         * First attempt:
         * Local WebLLM.
         */

        let answer;

        try {

          answer =
            await askLocalLLM(
              query
            );

        } catch (
          llmError
        ) {

          console.warn(
            "WebLLM unavailable. Using local knowledge fallback.",
            llmError
          );

          /*
           * Fallback means the website still works even when
           * WebGPU/model loading is unavailable.
           */

          answer =
            this.generateFallbackAnswer(
              query
            );
        }

        this.hideTyping();

        this.addBotMessage(
          answer,
          {
            speakText:
              answer,
            label:
              "CrazyBot AI"
          }
        );

      } catch (
        error
      ) {

        console.error(
          "CrazyBot query error:",
          error
        );

        this.hideTyping();

        this.addBotMessage(
          this.getFriendlyErrorMessage(
            error
          ),
          {
            speak: false
          }
        );

      } finally {

        this.isProcessing =
          false;
      }
    }


    // --------------------------------------------------------
    // FALLBACK ANSWER ENGINE
    // --------------------------------------------------------

    generateFallbackAnswer(
      query
    ) {

      const normalized =
        normalizeText(
          query
        );

      const matches =
        retrieveRelevantKnowledge(
          query
        );

      /*
       * Try direct semantic-ish extraction from
       * retrieved structured knowledge.
       */

      if (
        matches.length
      ) {

        const useful =
          matches
            .slice(
              0,
              5
            )
            .map(
              (item) =>
                `• ${item.text}`
            )
            .join(
              "\n"
            );

        return (
          `I’m currently using CrazyBot's knowledge-base mode because the local AI model is not ready yet.\n\n` +
          `Here is the relevant information I found:\n\n` +
          `${useful}`
        );
      }


      /*
       * Basic direct answers.
       */

      if (
        normalized.includes(
          "contact"
        ) ||
        normalized.includes(
          "email"
        ) ||
        normalized.includes(
          "linkedin"
        )
      ) {

        const profile =
          this.data?.profile ||
          {};

        const email =
          profile.email ||
          "mohitpeshwani101@gmail.com";

        const linkedin =
          profile
            ?.socials
            ?.linkedin ||
          "https://linkedin.com/in/mohit-peshwani2";

        return (
          `You can contact Mohit Peshwani at ${email}.\n\n` +
          `LinkedIn: ${linkedin}`
        );
      }


      return (
        "I couldn't generate the local AI response yet. Please try again after CrazyBot finishes loading its local model."
      );
    }


    // --------------------------------------------------------
    // FRIENDLY ERROR
    // --------------------------------------------------------

    getFriendlyErrorMessage(
      error
    ) {

      const message =
        String(
          error?.message ||
          error ||
          ""
        ).toLowerCase();

      if (
        message.includes(
          "webgpu"
        )
      ) {

        return (
          "CrazyBot's local AI requires WebGPU. Please open this portfolio in a recent version of Chrome or Edge."
        );
      }

      if (
        message.includes(
          "knowledge"
        ) ||
        message.includes(
          "json"
        )
      ) {

        return (
          "I couldn't load Mohit's knowledge base. Please verify that `knowledge/mohit-knowledge.json` is available."
        );
      }

      if (
        message.includes(
          "model"
        ) ||
        message.includes(
          "wasm"
        )
      ) {

        return (
          "The local AI model could not be loaded on this device. The browser may not have enough GPU/RAM resources."
        );
      }

      return (
        "Something went wrong while processing that question. Please try again."
      );
    }


    // --------------------------------------------------------
    // UPDATE DATA
    // --------------------------------------------------------

    updateData(
      newData
    ) {

      if (
        !newData ||
        typeof newData !==
          "object"
      ) {
        return;
      }

      this.data =
        newData;

      knowledgeBase =
        newData;

      knowledgeDocuments =
        buildKnowledgeDocuments(
          newData
        );

      window.PORTFOLIO_DATA =
        newData;

      this.renderWidget();

      this.setupSpeech();

      this.setupEventListeners();
    }
  }


  // ==========================================================
  // GLOBAL EXPORTS
  // ==========================================================

  window.CrazyBotWidget =
    CrazyBotWidget;

  window.CrazyBotLLM = {

    initialize:
      initializeLLM,

    ask:
      askLocalLLM,

    clearConversation,

    retrieve:
      retrieveRelevantKnowledge,

    status:
      getModelStatus,

    on
  };


  // ==========================================================
  // START CRAZYBOT
  // ==========================================================

  function initializeCrazyBot() {

    if (
      window.crazyBotInstance
    ) {
      return;
    }

    window.crazyBotInstance =
      new CrazyBotWidget();
  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializeCrazyBot
    );

  } else {

    initializeCrazyBot();
  }

})();
