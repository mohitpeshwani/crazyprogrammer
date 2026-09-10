/**
 * CrazyBot - Voice AI Portfolio Assistant for Mohit Peshwani
 * Configured for https://mohitpeshwani.github.io/crazyprogrammer/
 * 100% Client-side, 0 API credits required (Runs on Web Speech API)
 */

(function () {
  class CrazyBotWidget {
    constructor(options = {}) {
      this.data = options.data || window.PORTFOLIO_DATA || null;
      this.voiceEnabled = localStorage.getItem("crazybot_voice_enabled") !== "false";
      this.isOpen = false;
      this.isSpeaking = false;
      this.isListening = false;
      this.currentUtterance = null;
      this.recognition = null;
      this.selectedVoice = null;
      this.init();
    }

    init() {
      if (!this.data && window.PORTFOLIO_DATA) {
        this.data = window.PORTFOLIO_DATA;
      }

      this.injectStyles();
      this.renderWidget();
      this.setupSpeech();
      this.setupEventListeners();

      // Initial greeting message from CrazyBot
      const botGreeting =
        this.data?.profile?.voiceIntro ||
        `👋 **Hi! I'm CrazyBot**, Mohit Peshwani's AI assistant. Ask me about Mohit's Salesforce & Agentforce work, 5★ Topmate mentorship, YouTube channel, or click **🎙️ 30s Voice Pitch** to listen!`;

      this.addBotMessage(botGreeting, { speak: false, quickChips: true });
    }

    injectStyles() {
      if (!document.getElementById("pbot-css")) {
        const link = document.createElement("link");
        link.id = "pbot-css";
        link.rel = "stylesheet";
        link.href = "bot-styles.css";
        document.head.appendChild(link);
      }
    }

    renderWidget() {
      const existing = document.getElementById("portfolio-bot-root");
      if (existing) existing.remove();

      const root = document.createElement("div");
      root.id = "portfolio-bot-root";

      const profile = this.data?.profile || {
        name: "Mohit Peshwani",
        title: "Senior Salesforce Developer & AI Specialist"
      };

      const botName = this.data?.bot?.name || "CrazyBot";

      root.innerHTML = `
        <!-- Floating Greeting Pill -->
        <div class="pbot-greeting-pill" id="pbot-greeting-pill" title="Click to chat with CrazyBot">
          <span class="pbot-wave-emoji">👋</span>
          <span>Ask CrazyBot about Mohit's work & 5★ mentorship!</span>
        </div>

        <!-- Floating Launcher Button -->
        <button class="pbot-launcher-btn" id="pbot-launcher-btn" aria-label="Open CrazyBot AI Assistant">
          <div class="pbot-launcher-pulse"></div>
          <div style="font-size: 28px; line-height: 1;" title="CrazyBot">🤖</div>
          <div class="pbot-online-badge" title="CrazyBot Online"></div>
        </button>

        <!-- Chat Window -->
        <div class="pbot-window" id="pbot-window" role="dialog" aria-modal="true" aria-label="CrazyBot Chat Window">
          <!-- Header -->
          <div class="pbot-header">
            <div class="pbot-header-info">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #06b6d4); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; border: 2px solid #818cf8;">
                🤖
              </div>
              <div class="pbot-header-text">
                <div class="pbot-header-title">
                  <span>${botName}</span>
                  <span class="pbot-zero-badge">0 Credits</span>
                </div>
                <div class="pbot-header-subtitle">
                  <span class="pbot-status-dot"></span>
                  <span>Mohit Peshwani's Voice AI Assistant</span>
                </div>
              </div>
            </div>
            <div class="pbot-header-actions">
              <button class="pbot-header-btn" id="pbot-pitch-btn" title="Play 30s Audio Pitch">
                🎙️
              </button>
              <button class="pbot-header-btn ${this.voiceEnabled ? 'pbot-active' : ''}" id="pbot-mute-btn" title="Toggle Voice Audio (TTS)">
                ${this.voiceEnabled ? '🔊' : '🔇'}
              </button>
              <button class="pbot-header-btn" id="pbot-clear-btn" title="Clear Conversation">
                🗑️
              </button>
              <button class="pbot-header-btn" id="pbot-close-btn" title="Close Window">
                ✕
              </button>
            </div>
          </div>

          <!-- Spoken Audio Equalizer Banner (Active during speech synthesis) -->
          <div class="pbot-audio-banner" id="pbot-audio-banner">
            <div class="pbot-audio-status">
              <div class="pbot-eq-bars">
                <div class="pbot-eq-bar"></div>
                <div class="pbot-eq-bar"></div>
                <div class="pbot-eq-bar"></div>
                <div class="pbot-eq-bar"></div>
                <div class="pbot-eq-bar"></div>
              </div>
              <span id="pbot-audio-label">CrazyBot speaking...</span>
            </div>
            <button class="pbot-stop-audio-btn" id="pbot-stop-audio-btn">⏹️ Stop Audio</button>
          </div>

          <!-- Messages Body -->
          <div class="pbot-body" id="pbot-messages-body"></div>

          <!-- Quick Action Chips -->
          <div class="pbot-chips-container" id="pbot-chips-container"></div>

          <!-- Listening Banner (Active during speech-to-text) -->
          <div class="pbot-listening-banner" id="pbot-listening-banner">
            <span>🔴 Listening to your voice... Speak now!</span>
            <button class="pbot-stop-audio-btn" id="pbot-cancel-mic-btn">Cancel</button>
          </div>

          <!-- Input Footer -->
          <form class="pbot-footer" id="pbot-input-form">
            <div class="pbot-input-wrap">
              <input
                type="text"
                id="pbot-user-input"
                class="pbot-input"
                placeholder="Ask about Mohit's projects, Agentforce, 5★ mentorship..."
                autocomplete="off"
              />
              <button type="button" id="pbot-mic-btn" class="pbot-mic-btn" title="Ask with your voice (Free Web Speech STT)">
                🎙️
              </button>
            </div>
            <button type="submit" id="pbot-send-btn" class="pbot-send-btn" title="Send message" aria-label="Send">
              ➤
            </button>
          </form>

          <!-- 0 Credits Footnote -->
          <div class="pbot-credit-tag">
            ⚡ CrazyBot • 100% Free • Web Speech API • 0 API Credits Required
          </div>
        </div>
      `;

      document.body.appendChild(root);
      this.renderQuickChips();
    }

    renderQuickChips() {
      const container = document.getElementById("pbot-chips-container");
      if (!container) return;

      const chips = this.data?.quickChips || [
        { label: "🎙️ 30s Voice Pitch", query: "Give me your 30s elevator pitch" },
        { label: "🤖 Agentforce & AI Projects", query: "Tell me about your Agentforce and AI projects" },
        { label: "⭐ Topmate 5★ Mentorship", query: "Tell me about your 5-star Topmate mentorship and teaching" },
        { label: "🎥 YouTube Channel", query: "Tell me about your YouTube channel" },
        { label: "🏆 Achievements", query: "What are your key achievements?" },
        { label: "📜 Certifications", query: "What Salesforce certifications do you hold?" },
        { label: "🛠️ Tech Stack", query: "What is your tech stack and skills?" },
        { label: "💼 Work Experience", query: "Tell me about your experience at Areya and Delbridge" },
        { label: "📫 Contact Mohit", query: "How can I contact Mohit Peshwani?" }
      ];

      container.innerHTML = chips
        .map(
          chip => `<button type="button" class="pbot-chip" data-query="${escapeHtml(chip.query)}">${chip.label}</button>`
        )
        .join("");
    }

    setupSpeech() {
      // Speech Synthesis (TTS) - 0 credits, browser native
      if ("speechSynthesis" in window) {
        const loadVoices = () => {
          const voices = window.speechSynthesis.getVoices();
          this.selectedVoice =
            voices.find(v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Daniel"))) ||
            voices.find(v => v.lang.startsWith("en")) ||
            voices[0] ||
            null;
        };

        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = loadVoices;
        }
      }

      // Speech Recognition (STT) - 0 credits, browser native
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = "en-US";

        this.recognition.onstart = () => {
          this.isListening = true;
          this.updateListeningUI(true);
        };

        this.recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          const input = document.getElementById("pbot-user-input");
          if (input) input.value = transcript;
          this.handleUserQuery(transcript);
        };

        this.recognition.onerror = (event) => {
          console.warn("CrazyBot speech recognition error:", event.error);
          this.isListening = false;
          this.updateListeningUI(false);
          if (event.error === "not-allowed") {
            this.addBotMessage("Microphone permission was not allowed. You can still type your questions or use the quick buttons!", { speak: false });
          }
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.updateListeningUI(false);
        };
      }
    }

    updateListeningUI(active) {
      const micBtn = document.getElementById("pbot-mic-btn");
      const banner = document.getElementById("pbot-listening-banner");
      if (micBtn) {
        if (active) micBtn.classList.add("pbot-recording");
        else micBtn.classList.remove("pbot-recording");
      }
      if (banner) {
        if (active) banner.classList.add("pbot-active");
        else banner.classList.remove("pbot-active");
      }
    }

    speak(text, label = "CrazyBot speaking...") {
      if (!this.voiceEnabled || !("speechSynthesis" in window)) return;

      this.stopSpeaking();

      // Clean markdown tags & URLs for natural speech
      const cleanText = text
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
        .replace(/[#*`_~]/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[🏆🚀⭐📜💡📫⚡🎥🤖★]/g, "")
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (this.selectedVoice) utterance.voice = this.selectedVoice;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.currentUtterance = utterance;
        const banner = document.getElementById("pbot-audio-banner");
        const lbl = document.getElementById("pbot-audio-label");
        if (banner) banner.classList.add("pbot-active");
        if (lbl) lbl.textContent = label;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        const banner = document.getElementById("pbot-audio-banner");
        if (banner) banner.classList.remove("pbot-active");
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        const banner = document.getElementById("pbot-audio-banner");
        if (banner) banner.classList.remove("pbot-active");
      };

      window.speechSynthesis.speak(utterance);
    }

    stopSpeaking() {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      this.isSpeaking = false;
      this.currentUtterance = null;
      const banner = document.getElementById("pbot-audio-banner");
      if (banner) banner.classList.remove("pbot-active");
    }

    setupEventListeners() {
      const launcherBtn = document.getElementById("pbot-launcher-btn");
      const greetingPill = document.getElementById("pbot-greeting-pill");
      const closeBtn = document.getElementById("pbot-close-btn");
      const clearBtn = document.getElementById("pbot-clear-btn");
      const muteBtn = document.getElementById("pbot-mute-btn");
      const pitchBtn = document.getElementById("pbot-pitch-btn");
      const stopAudioBtn = document.getElementById("pbot-stop-audio-btn");
      const micBtn = document.getElementById("pbot-mic-btn");
      const cancelMicBtn = document.getElementById("pbot-cancel-mic-btn");
      const form = document.getElementById("pbot-input-form");
      const input = document.getElementById("pbot-user-input");
      const chipsContainer = document.getElementById("pbot-chips-container");

      const toggleChat = () => {
        this.isOpen = !this.isOpen;
        const win = document.getElementById("pbot-window");
        if (win) {
          if (this.isOpen) {
            win.classList.add("pbot-open");
            if (greetingPill) greetingPill.style.display = "none";
            setTimeout(() => input?.focus(), 250);
          } else {
            win.classList.remove("pbot-open");
            this.stopSpeaking();
          }
        }
      };

      launcherBtn?.addEventListener("click", toggleChat);
      greetingPill?.addEventListener("click", toggleChat);
      closeBtn?.addEventListener("click", () => {
        this.isOpen = false;
        document.getElementById("pbot-window")?.classList.remove("pbot-open");
        this.stopSpeaking();
      });

      muteBtn?.addEventListener("click", () => {
        this.voiceEnabled = !this.voiceEnabled;
        localStorage.setItem("crazybot_voice_enabled", this.voiceEnabled);
        muteBtn.textContent = this.voiceEnabled ? "🔊" : "🔇";
        muteBtn.classList.toggle("pbot-active", this.voiceEnabled);
        if (!this.voiceEnabled) this.stopSpeaking();
      });

      clearBtn?.addEventListener("click", () => {
        const body = document.getElementById("pbot-messages-body");
        if (body) body.innerHTML = "";
        this.stopSpeaking();
        this.addBotMessage(
          `Conversation cleared! What else would you like to know about Mohit Peshwani?`,
          { speak: false }
        );
      });

      pitchBtn?.addEventListener("click", () => {
        this.playPitch();
      });

      stopAudioBtn?.addEventListener("click", () => {
        this.stopSpeaking();
      });

      micBtn?.addEventListener("click", () => {
        if (!this.recognition) {
          alert("Speech recognition is supported in Google Chrome, Microsoft Edge, and Safari.");
          return;
        }

        if (this.isListening) {
          this.recognition.stop();
        } else {
          this.stopSpeaking();
          try {
            this.recognition.start();
          } catch (err) {
            console.warn("Could not start speech recognition:", err);
          }
        }
      });

      cancelMicBtn?.addEventListener("click", () => {
        if (this.recognition && this.isListening) {
          this.recognition.stop();
        }
      });

      form?.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = input?.value?.trim();
        if (text) {
          input.value = "";
          this.handleUserQuery(text);
        }
      });

      chipsContainer?.addEventListener("click", (e) => {
        const chip = e.target.closest(".pbot-chip");
        if (chip) {
          const query = chip.dataset.query;
          if (query) this.handleUserQuery(query);
        }
      });

      const body = document.getElementById("pbot-messages-body");
      body?.addEventListener("click", (e) => {
        const voiceCardBtn = e.target.closest(".pbot-voice-card-btn");
        if (voiceCardBtn) {
          const summary = voiceCardBtn.dataset.voice;
          if (summary) this.speak(summary, "Project audio summary");
          return;
        }

        const bubbleSpeechBtn = e.target.closest(".pbot-speech-bubble-btn");
        if (bubbleSpeechBtn) {
          const text = bubbleSpeechBtn.dataset.text;
          if (text) this.speak(text, "Reading message");
          return;
        }
      });
    }

    playPitch() {
      const pitch =
        this.data?.profile?.pitch30s ||
        `Mohit Peshwani is a Senior Salesforce Developer and AI Analytics specialist with over 3 years of experience. He is 7 times certified including Salesforce AI Specialist and Data Cloud Consultant.`;

      this.addBotMessage(`🎙️ **30-Second Spoken Pitch for Mohit Peshwani:**\n\n"${pitch}"`, {
        speakText: pitch,
        label: "30s Pitch for Mohit"
      });
    }

    addUserMessage(text) {
      const body = document.getElementById("pbot-messages-body");
      if (!body) return;

      const row = document.createElement("div");
      row.className = "pbot-message pbot-msg-user";
      row.innerHTML = `
        <div class="pbot-msg-content">
          <div class="pbot-bubble">${escapeHtml(text)}</div>
        </div>
      `;
      body.appendChild(row);
      this.scrollToBottom();
    }

    addBotMessage(content, options = {}) {
      const body = document.getElementById("pbot-messages-body");
      if (!body) return;

      const row = document.createElement("div");
      row.className = "pbot-message pbot-msg-bot";

      let html = "";
      if (typeof content === "string") {
        html = formatMarkdown(content);
      } else if (content.html) {
        html = content.html;
      }

      const speakText = options.speakText || (typeof content === "string" ? content : (content.speakText || ""));

      row.innerHTML = `
        <div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #06b6d4); display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; margin-top: 2px;">
          🤖
        </div>
        <div class="pbot-msg-content">
          <div class="pbot-bubble">${html}</div>
          <div class="pbot-msg-meta">
            <span>${getCurrentTime()}</span>
            ${speakText ? `<button class="pbot-speech-bubble-btn" data-text="${escapeHtml(speakText)}" title="Listen to CrazyBot read this">🔊 Listen</button>` : ''}
          </div>
        </div>
      `;

      body.appendChild(row);
      this.scrollToBottom();

      if (options.speak !== false && speakText) {
        this.speak(speakText, options.label || "CrazyBot");
      }
    }

    showTyping() {
      const body = document.getElementById("pbot-messages-body");
      if (!body) return null;

      const typing = document.createElement("div");
      typing.className = "pbot-typing";
      typing.id = "pbot-typing-indicator";
      typing.innerHTML = `
        <div class="pbot-typing-dot"></div>
        <div class="pbot-typing-dot"></div>
        <div class="pbot-typing-dot"></div>
      `;
      body.appendChild(typing);
      this.scrollToBottom();
      return typing;
    }

    hideTyping() {
      const typing = document.getElementById("pbot-typing-indicator");
      if (typing) typing.remove();
    }

    scrollToBottom() {
      const body = document.getElementById("pbot-messages-body");
      if (body) {
        body.scrollTop = body.scrollHeight;
      }
    }

    /**
     * Intelligent Intent Matching & Q&A Engine tailored for Mohit Peshwani
     * 100% Client-side, 0 credits
     */
    handleUserQuery(rawQuery) {
      const query = rawQuery.trim();
      if (!query) return;

      this.addUserMessage(query);
      this.showTyping();

      setTimeout(() => {
        this.hideTyping();
        const response = this.evaluateQuery(query);
        this.addBotMessage(response.content, response.options);
      }, 300);
    }

    evaluateQuery(query) {
      const q = query.toLowerCase();
      const data = this.data;

      // 1. Mentorship, Topmate, Academic guidance, Reviews
      if (
        q.includes("mentor") ||
        q.includes("topmate") ||
        q.includes("rating") ||
        q.includes("academic") ||
        q.includes("student") ||
        q.includes("teach") ||
        q.includes("coaching") ||
        q.includes("guidance")
      ) {
        const m = data.mentorshipAndCommunity;
        let text = `⭐ **Mohit Peshwani's Mentorship & Community Impact:**\n\n`;
        text += `• **Topmate 5-Star Mentor (${m.topmate.rating}):**\n  ${m.topmate.description}\n\n`;
        text += `• **Academic Mentorship:**\n  ${m.academics.description}\n\n`;
        text += `• **YouTube Knowledge Sharing:**\n  Shares Salesforce, Apex, LWC, Agentforce, and Python tutorials on his channel [CrazyProgrammer / Mohit Peshwani](${m.youtube.url}).\n\n`;
        text += `💡 *Looking for career advice or Salesforce guidance? Mohit is always excited to mentor motivated developers!*`;

        const spoken = `Mohit is a top-rated 5-star mentor on Topmate. He has mentored numerous students and professionals in Salesforce, Apex, LWC, and career transitions, alongside his academic mentoring and YouTube channel.`;

        return {
          content: text,
          options: { speakText: spoken, label: "Topmate Mentorship" }
        };
      }

      // 2. YouTube Channel / Knowledge Sharing
      if (
        q.includes("youtube") ||
        q.includes("channel") ||
        q.includes("video") ||
        q.includes("tutorial") ||
        q.includes("crazyprogrammer") ||
        q.includes("content")
      ) {
        const yt = data.mentorshipAndCommunity.youtube;
        let text = `🎥 **YouTube Channel: ${yt.channel}**\n\n`;
        text += `Mohit actively shares technical knowledge on YouTube as his core community passion:\n\n`;
        text += `• **Focus Areas:** Salesforce development (Apex, LWC, Flows), Agentforce AI use cases, Python, data analytics, and hands-on software engineering tutorials.\n`;
        text += `• **Mission:** Making complex enterprise tech concepts accessible and fun for developers worldwide.\n`;
        text += `• **Link:** Visit his portal and channel at [mohitpeshwani.github.io/crazyprogrammer](${yt.url})!`;

        const spoken = `Mohit runs the CrazyProgrammer educational platform and YouTube channel, sharing in-depth tutorials on Salesforce, Apex, LWC, Agentforce, and Python.`;

        return {
          content: text,
          options: { speakText: spoken, label: "YouTube Channel" }
        };
      }

      // 3. 30s Voice Pitch / Elevator Pitch / Bio
      if (
        q.includes("pitch") ||
        q.includes("elevator") ||
        q.includes("30s") ||
        q.includes("introduce") ||
        q.includes("who is mohit") ||
        q.includes("who are you") ||
        q.includes("about mohit") ||
        q.includes("bio") ||
        q.includes("summary")
      ) {
        const pitch = data.profile.pitch30s;
        return {
          content: `🎙️ **30-Second Spoken Pitch for Mohit Peshwani:**\n\n"${pitch}"\n\n💡 *Would you like to explore Mohit's Agentforce projects, 7x certifications, or enterprise experience next?*`,
          options: { speakText: pitch, label: "30s Pitch" }
        };
      }

      // 4. Agentforce & AI Projects
      if (
        q.includes("agentforce") ||
        q.includes("agentic") ||
        q.includes("property manager") ||
        q.includes("banking") ||
        q.includes("einstein") ||
        q.includes("genai")
      ) {
        const aiProjects = data.projects.filter(p =>
          p.tags.includes("Agentforce") || p.category.includes("Agentforce") || p.category.includes("Predictive")
        );

        let html = `<div style="margin-bottom:8px;">🤖 **Mohit's Agentforce & AI Projects:**</div><div class="pbot-card-list">`;
        aiProjects.forEach(p => {
          html += this.renderProjectCard(p);
        });
        html += `</div>`;

        const spoken = `Mohit has engineered autonomous Agentforce AI assistants, including an Agentic Property Manager for tenant maintenance triage and an Agentic Banking Query Handler for BFSI customer operations.`;

        return {
          content: { html, speakText: spoken },
          options: { speakText: spoken, label: "Agentforce Projects" }
        };
      }

      // 5. Certifications (7x Certified)
      if (
        q.includes("certif") ||
        q.includes("credential") ||
        q.includes("exam") ||
        q.includes("trailblazer")
      ) {
        const certs = data.certificationsList || [];
        let text = `📜 **Mohit Peshwani's 7x Certifications:**\n\n`;
        certs.forEach(c => {
          text += `• **${c}**\n`;
        });
        text += `\n🔗 View verified credentials on his [Salesforce Trailblazer Profile](${data.profile.socials.trailblazer})!`;

        const spoken = `Mohit holds 7 certifications, including Salesforce AI Specialist for Agentforce, Data Cloud Consultant, Platform Developer 1 and 2, App Builder, AI Associate, and Python Data Analysis.`;

        return {
          content: text,
          options: { speakText: spoken, label: "Salesforce Certifications" }
        };
      }

      // 6. Work Experience (Areya, Delbridge, BrowserStack, Ola Krutrim, BU)
      if (
        q.includes("experience") ||
        q.includes("areya") ||
        q.includes("delbridge") ||
        q.includes("browserstack") ||
        q.includes("boston") ||
        q.includes("krutrim") ||
        q.includes("company") ||
        q.includes("career")
      ) {
        const exps = data.experience;
        let text = `💼 **Mohit's Professional Experience (3+ Years):**\n\n`;

        exps.forEach(e => {
          text += `• **${e.role}** at *${e.company}* (${e.period})\n`;
          e.highlights.slice(0, 2).forEach(h => {
            text += `  - ${h}\n`;
          });
          text += `\n`;
        });

        const spoken = `Mohit is currently Senior Salesforce Developer at Areya Technologies, optimizing sales workflows for Ola Krutrim and nonprofit portals. Previously at Delbridge Solutions, he reduced Boston University admissions processing time by 70 percent, and at BrowserStack, he supported the Percy CRM acquisition.`;

        return {
          content: text,
          options: { speakText: spoken, label: "Work Experience" }
        };
      }

      // 7. Education (Woolf University MS AI, VESIT Mumbai BE, Khamgaon Diploma)
      if (
        q.includes("education") ||
        q.includes("degree") ||
        q.includes("university") ||
        q.includes("college") ||
        q.includes("woolf") ||
        q.includes("vesit") ||
        q.includes("mumbai")
      ) {
        const eds = data.education;
        let text = `🎓 **Mohit's Educational Background:**\n\n`;
        eds.forEach(ed => {
          text += `• **${ed.degree}**\n  *${ed.institution}* (${ed.period})\n  ${ed.details}\n\n`;
        });

        const spoken = `Mohit is currently pursuing his Master of Science in Artificial Intelligence and Data Science at Woolf University. He holds a Bachelor of Engineering in Computer Engineering from VESIT, University of Mumbai, and a Technical Diploma from Government Polytechnic, Khamgaon.`;

        return {
          content: text,
          options: { speakText: spoken, label: "Education" }
        };
      }

      // 8. Key Achievements & Milestones
      if (
        q.includes("achieve") ||
        q.includes("metric") ||
        q.includes("accomplish") ||
        q.includes("impact") ||
        q.includes("stat")
      ) {
        const achs = data.achievements;
        let html = `<div style="margin-bottom:8px;">🏆 **Key Professional Achievements:**</div><div class="pbot-card-list">`;

        achs.forEach(a => {
          html += `
            <div class="pbot-ach-card">
              <div class="pbot-ach-icon">${a.icon || '🏆'}</div>
              <div class="pbot-ach-content">
                <div class="pbot-ach-title">${escapeHtml(a.title)}</div>
                <div class="pbot-ach-metric">${escapeHtml(a.metric)} • ${escapeHtml(a.category)}</div>
                <div class="pbot-ach-desc">${escapeHtml(a.description)}</div>
              </div>
            </div>
          `;
        });

        html += `</div>`;

        const spoken = `Mohit's key achievements include a 5-star Topmate mentorship record, cutting Boston University admissions processing time by 70 percent, reducing Ola Krutrim manual sales operations by 30 percent, and earning 7 Salesforce certifications.`;

        return {
          content: { html, speakText: spoken },
          options: { speakText: spoken, label: "Key Achievements" }
        };
      }

      // 9. All Projects
      if (
        q.includes("project") ||
        q.includes("built") ||
        q.includes("portfolio") ||
        q.includes("work")
      ) {
        let html = `<div style="margin-bottom:8px;">🚀 **Mohit's Featured Projects:**</div><div class="pbot-card-list">`;
        data.projects.forEach(p => {
          html += this.renderProjectCard(p);
        });
        html += `</div>`;

        const spoken = `Here are Mohit's flagship projects, including the Agentic AI Property Manager, Banking Query Handler, CRM Analytics with Einstein Discovery, and Crowdfunding ML prediction.`;

        return {
          content: { html, speakText: spoken },
          options: { speakText: spoken, label: "Featured Projects" }
        };
      }

      // 10. Tech Stack & Skills
      if (
        q.includes("skill") ||
        q.includes("stack") ||
        q.includes("tech") ||
        q.includes("apex") ||
        q.includes("lwc") ||
        q.includes("python") ||
        q.includes("flow") ||
        q.includes("data cloud")
      ) {
        const skills = data.skills;
        let html = `<div style="margin-bottom:8px;">🛠️ **Mohit's Core Tech Stack:**</div><div class="pbot-skills-grid">`;

        const topSkills = [
          ...skills.salesforce.slice(0, 4),
          ...skills.dataAndAI.slice(0, 2),
          ...skills.toolsAndDevOps.slice(0, 2)
        ];

        topSkills.forEach(s => {
          html += `
            <div class="pbot-skill-row">
              <div class="pbot-skill-header">
                <strong>${escapeHtml(s.name)}</strong>
                <span>${escapeHtml(s.level)} (${s.pct}%)</span>
              </div>
              <div class="pbot-skill-bar-bg">
                <div class="pbot-skill-bar-fill" style="width: ${s.pct}%"></div>
              </div>
            </div>
          `;
        });

        html += `</div><div style="font-size:12px;color:#94a3b8;margin-top:8px;">Expertise in Apex, LWC, Agentforce, Data Cloud, CRM Analytics, Flows, Python, SQL, REST APIs, and SFDX.</div>`;

        const spoken = `Mohit specializes in Apex, Lightning Web Components, Agentforce, Salesforce Flows, Data Cloud, Python, and CRM Analytics.`;

        return {
          content: { html, speakText: spoken },
          options: { speakText: spoken, label: "Tech Stack & Skills" }
        };
      }

      // 11. Contact Info & Relocation
      if (
        q.includes("contact") ||
        q.includes("hire") ||
        q.includes("email") ||
        q.includes("phone") ||
        q.includes("location") ||
        q.includes("relocat") ||
        q.includes("reach") ||
        q.includes("linkedin") ||
        q.includes("github")
      ) {
        const p = data.profile;
        let text = `📫 **Contact Mohit Peshwani:**\n\n`;
        text += `• **Status:** ${p.status}\n`;
        text += `• **Location:** ${p.location}\n`;
        text += `• **Phone:** [${p.phone}](tel:${p.phone})\n`;
        text += `• **Email:** [${p.email}](mailto:${p.email})\n`;
        text += `• **LinkedIn:** [linkedin.com/in/mohit-peshwani2](${p.socials.linkedin})\n`;
        text += `• **GitHub:** [github.com/mohitpeshwani](${p.socials.github})\n`;
        text += `• **Trailblazer:** [Trailblazer Profile](${p.socials.trailblazer})\n`;
        text += `• **Website:** [mohitpeshwani.github.io/crazyprogrammer](${p.socials.website})\n`;

        const spoken = `You can reach Mohit at mohitpeshwani101@gmail.com or by phone at +91 9834332600. He is based in Pune and open to EU, EMEA, and UAE relocation.`;

        return {
          content: text,
          options: { speakText: spoken, label: "Contact Details" }
        };
      }

      // 12. Voice Recommendation
      if (
        q.includes("recommend") ||
        q.includes("suggest") ||
        q.includes("what should i see") ||
        q.includes("where do i start")
      ) {
        let text = `Here are CrazyBot's top voice recommendations for Mohit's portfolio:\n\n`;
        text += `• **For Agentforce & AI Work:** Explore the **Agentic AI Property Manager** and **Agentic Banking Handler**.\n`;
        text += `• **For Enterprise CRM Impact:** Review the **Boston University 70% admission acceleration** and **Ola Krutrim sales operations**.\n`;
        text += `• **For Mentorship & Teaching:** Learn about Mohit's **5-star Topmate mentorship** and his **YouTube tutorials**.\n\n`;
        text += `Which area would you like to dive deeper into?`;

        const spoken = `Here are my top recommendations. For Agentforce, check out the Agentic Property Manager and Banking Handler. For enterprise impact, see the 70% turnaround reduction at Boston University. For mentorship, explore his 5-star Topmate reviews.`;

        return {
          content: text,
          options: { speakText: spoken, label: "CrazyBot Recommendations" }
        };
      }

      // 13. Fallback
      return {
        content: `I'd be happy to tell you all about Mohit Peshwani! You can ask me:\n\n` +
          `• 🎙️ *"Give me your 30s voice pitch"*\n` +
          `• 🤖 *"Tell me about your Agentforce and AI projects"*\n` +
          `• ⭐ *"Tell me about your 5-star Topmate mentorship"*\n` +
          `• 🎥 *"What is on your YouTube channel?"*\n` +
          `• 📜 *"What Salesforce certifications do you have?"*\n` +
          `• 💼 *"Tell me about your experience at Areya and Delbridge"*\n` +
          `• 📫 *"How can I contact Mohit?"*\n\n` +
          `Or press the microphone button to ask with your voice!`,
        options: {
          speakText: `I'm CrazyBot. I can tell you about Mohit's Agentforce projects, 5-star Topmate mentorship, YouTube channel, 7 certifications, and work experience. What would you like to explore?`,
          label: "CrazyBot Guide"
        }
      };
    }

    renderProjectCard(p) {
      return `
        <div class="pbot-card">
          <div class="pbot-card-header">
            <span class="pbot-card-title">${escapeHtml(p.title)}</span>
            <span class="pbot-card-category">${escapeHtml(p.category)}</span>
          </div>
          <div class="pbot-card-desc">${escapeHtml(p.description)}</div>
          ${p.impact ? `<div class="pbot-card-metric">⚡ ${escapeHtml(p.impact)}</div>` : ''}
          <div class="pbot-tags">
            ${p.tags.map(t => `<span class="pbot-tag">${escapeHtml(t)}</span>`).join("")}
          </div>
          <div class="pbot-card-actions">
            ${p.demo ? `<a href="${p.demo}" target="_blank" rel="noopener" class="pbot-card-link">🔗 Live Portal</a>` : ''}
            ${p.github ? `<a href="${p.github}" target="_blank" rel="noopener" class="pbot-card-link">💻 GitHub</a>` : ''}
            ${p.voiceSummary ? `<button type="button" class="pbot-voice-card-btn" data-voice="${escapeHtml(p.voiceSummary)}">🔊 Hear Summary</button>` : ''}
          </div>
        </div>
      `;
    }

    updateData(newData) {
      this.data = newData;
      window.PORTFOLIO_DATA = newData;
      this.renderWidget();
      this.setupEventListeners();
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatMarkdown(text) {
    if (!text) return "";
    let html = escapeHtml(text);
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#38bdf8;text-decoration:underline;">$1</a>');
    html = html.replace(/\n/g, "<br>");
    return html;
  }

  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function initWhenReady() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        window.crazyBotInstance = new CrazyBotWidget();
      });
    } else {
      window.crazyBotInstance = new CrazyBotWidget();
    }
  }

  window.CrazyBotWidget = CrazyBotWidget;
  initWhenReady();
})();
