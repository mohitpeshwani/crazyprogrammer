/**
 * ============================================================
 * CrazyBot - WebLLM Client
 * ============================================================
 *
 * Browser-only local LLM.
 *
 * Architecture:
 *
 *   User
 *     ↓
 * CrazyBot
 *     ↓
 * WebLLM
 *     ↓
 * Local browser model
 *     ↓
 * Mohit knowledge retrieval
 *     ↓
 * Answer
 *
 * No API key
 * No backend
 * No Cloudflare
 * No OpenRouter
 * No paid LLM API
 * ============================================================
 */

(function () {
  "use strict";

  // ------------------------------------------------------------
  // Configuration
  // ------------------------------------------------------------

  const CONFIG = {
    knowledgeUrl: "knowledge/mohit-knowledge.json",

    modelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",

    maxKnowledgeItems: 10,

    maxKnowledgeChars: 12000,

    maxConversationMessages: 8,

    temperature: 0.2,

    maxTokens: 500
  };

  // ------------------------------------------------------------
  // Internal state
  // ------------------------------------------------------------

  let webllm = null;
  let engine = null;

  let knowledgeBase = null;
  let knowledgeDocuments = [];

  let initializationPromise = null;
  let knowledgePromise = null;

  const conversationHistory = [];

  // ------------------------------------------------------------
  // Events
  // ------------------------------------------------------------

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
    const callbacks = listeners[eventName] || [];

    callbacks.forEach((callback) => {
      try {
        callback(payload);
      } catch (error) {
        console.warn(
          "CrazyBot WebLLM event callback error:",
          error
        );
      }
    });
  }

  // ------------------------------------------------------------
  // Utility
  // ------------------------------------------------------------

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^\w\s/&.-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function safeStringify(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (_) {
      return String(value);
    }
  }

  function cleanForPrompt(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ------------------------------------------------------------
  // Load WebLLM library
  // ------------------------------------------------------------

  async function loadWebLLMLibrary() {
    if (webllm) {
      return webllm;
    }

    /*
     * Dynamic import means your existing CrazyBot JavaScript
     * remains a normal script and does not need to become an ES
     * module.
     */

    webllm = await import(
      "https://esm.run/@mlc-ai/web-llm"
    );

    return webllm;
  }

  // ------------------------------------------------------------
  // Check WebGPU
  // ------------------------------------------------------------

  async function checkWebGPU() {
    if (!("gpu" in navigator)) {
      throw new Error(
        "WebGPU is not available in this browser."
      );
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();

      if (!adapter) {
        throw new Error(
          "No compatible WebGPU adapter was found."
        );
      }

      return true;
    } catch (error) {
      throw new Error(
        "WebGPU is unavailable or blocked in this browser."
      );
    }
  }

  // ------------------------------------------------------------
  // Load knowledge JSON
  // ------------------------------------------------------------

  async function loadKnowledge() {
    if (knowledgeBase) {
      return knowledgeBase;
    }

    if (knowledgePromise) {
      return knowledgePromise;
    }

    knowledgePromise = (async () => {
      try {
        const response = await fetch(
          CONFIG.knowledgeUrl,
          {
            method: "GET",
            cache: "no-store"
          }
        );

        if (!response.ok) {
          throw new Error(
            `Could not load knowledge base (${response.status}).`
          );
        }

        const json = await response.json();

        knowledgeBase = json;

        knowledgeDocuments =
          buildKnowledgeDocuments(
            json
          );

        return json;

      } catch (error) {
        knowledgePromise = null;
        throw error;
      }
    })();

    return knowledgePromise;
  }

  // ------------------------------------------------------------
  // Convert JSON to searchable documents
  // ------------------------------------------------------------

  function buildKnowledgeDocuments(root) {
    const documents = [];

    function walk(node, path, depth) {
      if (documents.length > 500) {
        return;
      }

      if (node === null || node === undefined) {
        return;
      }

      if (depth > 8) {
        return;
      }

      if (Array.isArray(node)) {

        node.forEach((item, index) => {
          walk(
            item,
            `${path}[${index}]`,
            depth + 1
          );
        });

        return;
      }

      if (typeof node === "object") {

        Object.entries(node).forEach(
          ([key, value]) => {

            const nextPath = path
              ? `${path}.${key}`
              : key;

            if (
              typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean"
            ) {
              const text =
                `${key}: ${value}`;

              documents.push({
                path: nextPath,
                text
              });

              return;
            }

            walk(
              value,
              nextPath,
              depth + 1
            );
          }
        );

        return;
      }

      documents.push({
        path,
        text: String(node)
      });
    }

    walk(root, "", 0);

    return documents;
  }

  // ------------------------------------------------------------
  // Retrieval
  // ------------------------------------------------------------

  function scoreDocument(query, document) {
    const queryWords = normalizeText(query)
      .split(" ")
      .filter((word) => word.length > 2);

    if (!queryWords.length) {
      return 0;
    }

    const documentText =
      normalizeText(
        `${document.path} ${document.text}`
      );

    let score = 0;

    queryWords.forEach((word) => {

      if (documentText.includes(word)) {
        score += 1;
      }

      if (
        document.path
          .toLowerCase()
          .includes(word)
      ) {
        score += 2;
      }
    });

    // Domain boosts
    const lowerQuery =
      normalizeText(query);

    const domainTerms = [
      "agentforce",
      "salesforce",
      "data cloud",
      "data360",
      "python",
      "apex",
      "lwc",
      "github",
      "topmate",
      "youtube",
      "fde",
      "forward deployed",
      "recruitment",
      "banking",
      "certification",
      "experience",
      "education"
    ];

    domainTerms.forEach((term) => {

      if (
        lowerQuery.includes(term) &&
        documentText.includes(term)
      ) {
        score += 3;
      }
    });

    return score;
  }

  function retrieveRelevantKnowledge(
    query,
    maxItems = CONFIG.maxKnowledgeItems
  ) {
    if (!knowledgeDocuments.length) {
      return [];
    }

    const scored =
      knowledgeDocuments
        .map((document) => ({
          ...document,
          score: scoreDocument(
            query,
            document
          )
        }))
        .filter(
          (document) =>
            document.score > 0
        )
        .sort(
          (a, b) =>
            b.score - a.score
        );

    return scored.slice(
      0,
      maxItems
    );
  }

  function buildKnowledgeContext(query) {

    const documents =
      retrieveRelevantKnowledge(
        query
      );

    if (!documents.length) {

      // Small fallback context
      // if retrieval finds nothing.
      return safeStringify(
        {
          profile:
            knowledgeBase?.profile || {},

          professionalIdentity:
            knowledgeBase?.professionalIdentity || {}
        }
      );
    }

    let context = "";

    documents.forEach(
      (document, index) => {

        context +=
          `\n### SOURCE ${index + 1}\n`;

        context +=
          `PATH: ${document.path}\n`;

        context +=
          `CONTENT: ${cleanForPrompt(
            document.text
          )}\n`;
      }
    );

    if (
      context.length >
      CONFIG.maxKnowledgeChars
    ) {
      context =
        context.slice(
          0,
          CONFIG.maxKnowledgeChars
        );
    }

    return context;
  }

  // ------------------------------------------------------------
  // System prompt
  // ------------------------------------------------------------

  function buildSystemPrompt(
    relevantContext
  ) {

    return `
You are CrazyBot, the professional AI representative for Mohit Peshwani.

Your purpose is to answer questions about Mohit accurately and naturally.

IMPORTANT:
You are not Mohit.
You represent Mohit's professional profile.

SOURCE OF TRUTH:
Use the supplied Mohit knowledge context as your factual source.

RULES:

1. Never invent experience.
2. Never invent clients.
3. Never invent certifications.
4. Never invent metrics.
5. Never invent responsibilities.
6. Never invent repository ownership.
7. Never claim a forked GitHub repository as original work.
8. Keep professional employment separate from independent projects.
9. Keep GitHub repositories separate from employment history.
10. Keep Topmate separate from employment.
11. Keep YouTube separate from employment.
12. Describe Forward Deployed Engineering as Mohit's emerging career direction unless the supplied data explicitly says otherwise.
13. Do not disclose confidential banking, client, architecture, credential or proprietary information.
14. Prefer evidence over exaggerated marketing language.
15. If the knowledge context does not contain the answer, say that the information is not currently available.
16. Do not pretend to know private information.
17. Answer the question directly.
18. Keep normal answers concise unless the user asks for detail.
19. Use professional, human language.
20. When listing projects, identify whether they are professional, independent, or GitHub work when relevant.

IMPORTANT CURRENT POSITION:
Mohit is a Salesforce Consultant at GeekSoft Consulting Pvt Ltd.

RELEVANT MOHIT KNOWLEDGE:
${relevantContext}
`;
  }

  // ------------------------------------------------------------
  // Initialize engine
  // ------------------------------------------------------------

  async function initialize() {

    if (engine) {
      return engine;
    }

    if (initializationPromise) {
      return initializationPromise;
    }

    initializationPromise =
      (async () => {

        try {

          emit("loading", {
            stage: "checking",
            progress: 0,
            message:
              "Checking browser GPU support..."
          });

          await checkWebGPU();

          emit("loading", {
            stage: "library",
            progress: 5,
            message:
              "Loading local AI engine..."
          });

          await loadWebLLMLibrary();

          emit("loading", {
            stage: "knowledge",
            progress: 10,
            message:
              "Loading Mohit's knowledge base..."
          });

          await loadKnowledge();

          emit("loading", {
            stage: "model",
            progress: 15,
            message:
              "Loading CrazyBot's local AI model..."
          });

          const initProgressCallback =
            (progress) => {

              const percentage =
                Math.max(
                  15,
                  Math.min(
                    95,
                    Math.round(
                      15 +
                      progress.progress *
                        80
                    )
                  )
                );

              emit("loading", {
                stage: "model",
                progress: percentage,
                message:
                  progress.text ||
                  "Downloading AI model..."
              });
            };

          engine =
            await webllm.CreateMLCEngine(
              CONFIG.modelId,
              {
                initProgressCallback
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

          engine = null;

          emit("error", {
            error
          });

          throw error;
        }
      })();

    try {
      return await initializationPromise;
    } finally {
      initializationPromise = null;
    }
  }

  // ------------------------------------------------------------
  // Conversation memory
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // Ask LLM
  // ------------------------------------------------------------

  async function ask(
    userMessage,
    options = {}
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
      await initialize();

    const relevantContext =
      buildKnowledgeContext(
        message
      );

    const systemPrompt =
      buildSystemPrompt(
        relevantContext
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

      const completion =
        await localEngine.chat.completions.create(
          {
            model:
              CONFIG.modelId,

            messages,

            temperature:
              typeof options.temperature ===
              "number"
                ? options.temperature
                : CONFIG.temperature,

            max_tokens:
              typeof options.maxTokens ===
              "number"
                ? options.maxTokens
                : CONFIG.maxTokens,

            stream: false
          }
        );

      const answer =
        completion
          ?.choices?.[0]
          ?.message
          ?.content
          ?.trim() ||
        "I couldn't generate an answer.";

      addConversationMessage(
        "assistant",
        answer
      );

      return {
        success: true,
        answer,
        model: CONFIG.modelId,
        contextItems:
          retrieveRelevantKnowledge(
            message
          ).length
      };

    } catch (error) {

      // Remove the failed user turn
      // so a retry does not duplicate it.
      conversationHistory.pop();

      throw error;
    }
  }

  // ------------------------------------------------------------
  // Streaming version
  // ------------------------------------------------------------

  async function askStream(
    userMessage,
    callbacks = {}
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
      await initialize();

    const relevantContext =
      buildKnowledgeContext(
        message
      );

    const systemPrompt =
      buildSystemPrompt(
        relevantContext
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

    let finalAnswer = "";

    try {

      const stream =
        await localEngine.chat.completions.create(
          {
            model:
              CONFIG.modelId,

            messages,

            temperature:
              CONFIG.temperature,

            max_tokens:
              CONFIG.maxTokens,

            stream: true
          }
        );

      for await (
        const chunk of stream
      ) {

        const delta =
          chunk
            ?.choices?.[0]
            ?.delta
            ?.content || "";

        if (!delta) {
          continue;
        }

        finalAnswer += delta;

        if (
          typeof callbacks.onToken ===
          "function"
        ) {
          callbacks.onToken(
            delta,
            finalAnswer
          );
        }
      }

      finalAnswer =
        finalAnswer.trim();

      addConversationMessage(
        "assistant",
        finalAnswer
      );

      if (
        typeof callbacks.onComplete ===
        "function"
      ) {
        callbacks.onComplete(
          finalAnswer
        );
      }

      return {
        success: true,
        answer: finalAnswer,
        model: CONFIG.modelId
      };

    } catch (error) {

      conversationHistory.pop();

      if (
        typeof callbacks.onError ===
        "function"
      ) {
        callbacks.onError(error);
      }

      throw error;
    }
  }

  // ------------------------------------------------------------
  // Status
  // ------------------------------------------------------------

  function isReady() {
    return !!engine;
  }

  function getModel() {
    return CONFIG.modelId;
  }

  function getKnowledgeStatus() {
    return {
      loaded:
        !!knowledgeBase,

      documents:
        knowledgeDocuments.length
    };
  }

  // ------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------

  window.MOHIT_LLM = {

    initialize,

    ask,

    askStream,

    clearConversation,

    isReady,

    getModel,

    getKnowledgeStatus,

    retrieveRelevantKnowledge,

    on
  };

})();
