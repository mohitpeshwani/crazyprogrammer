/**
 * Portfolio Data Configuration for Mohit Peshwani (CrazyBot)
 * Configured for https://mohitpeshwani.github.io/crazyprogrammer/
 * 100% Client-side, 0 API credits required.
 */

const PORTFOLIO_DATA = {
  bot: {
    name: "CrazyBot",
    greeting: "👋 Hi! I'm CrazyBot. Ask me about Mohit's projects, Salesforce & Agentforce work, 5★ mentorship, or YouTube channel!"
  },

  profile: {
    name: "Mohit Peshwani",
    title: "Senior Salesforce Developer & AI/Data Analytics Engineer",
    tagline: "3+ years building enterprise Salesforce solutions, Agentforce AI agents, and ML pipelines. 5-Star Topmate mentor & YouTube educator.",
    location: "Pune, India (Open to EU / EMEA / UAE relocation)",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80", // Can be replaced with Mohit's photo
    status: "🟢 Open for Senior Salesforce / AI roles & consulting",
    phone: "+91-9834332600",
    email: "mohitpeshwani101@gmail.com",
    socials: {
      github: "https://github.com/mohitpeshwani",
      linkedin: "https://linkedin.com/in/mohit-peshwani2",
      trailblazer: "https://salesforce.com/trailblazer/mpeshwani",
      youtube: "https://mohitpeshwani.github.io/crazyprogrammer/",
      topmate: "https://topmate.io",
      website: "https://mohitpeshwani.github.io/crazyprogrammer/"
    },
    voiceIntro: "Hi there! I'm CrazyBot, Mohit Peshwani's AI portfolio assistant. I can tell you all about Mohit's Salesforce and Agentforce expertise, enterprise projects at Areya and Delbridge, 5-star Topmate mentorship, academic coaching, or play a quick 30-second audio pitch. What would you like to explore?",
    pitch30s: "Mohit Peshwani is a Senior Salesforce Developer and AI Analytics specialist with over 3 years of experience across Real Estate, SaaS, Fintech, and Nonprofit domains. He is 7 times Salesforce certified including Salesforce AI Specialist and Data Cloud Consultant. Mohit has built autonomous Agentforce AI assistants, optimized enterprise admissions by 70% at Boston University, achieved a 5-star rating on Topmate mentoring students, and runs an educational YouTube channel sharing programming knowledge."
  },

  mentorshipAndCommunity: {
    topmate: {
      rating: "5.0 ★★★★★",
      title: "Topmate 5-Star Rated Mentor",
      description: "Mentored aspiring engineers and students in Salesforce development, Apex, LWC, career transitions, and data analytics with stellar 5-star reviews."
    },
    academics: {
      title: "Academic Mentorship & Guidance",
      description: "Mentored college students and juniors in computer engineering fundamentals, OOPs, data structures, and practical industry project implementations."
    },
    youtube: {
      channel: "CrazyProgrammer / Mohit Peshwani",
      focus: "Educational tutorials on Salesforce, Apex, LWC, Agentforce, Python, and full-stack software development.",
      url: "https://mohitpeshwani.github.io/crazyprogrammer/"
    }
  },

  achievements: [
    {
      id: "ach-1",
      title: "5-Star Rated Topmate Mentor & Educator",
      category: "Mentorship & Community",
      icon: "⭐",
      metric: "5.0 ★ Rating",
      description: "Guided students and professionals in Salesforce careers, resume reviews, technical mock interviews, and academic project roadmaps.",
      date: "Ongoing",
      link: "https://topmate.io"
    },
    {
      id: "ach-2",
      title: "7x Salesforce & Data Certified Professional",
      category: "Certifications",
      icon: "📜",
      metric: "7 Certifications",
      description: "Certified Salesforce AI Specialist (Agentforce), Data Cloud Consultant, Platform Developer I & II, App Builder, AI Associate, and SPIFF Python Data Analysis.",
      date: "2023 - 2025",
      link: "https://salesforce.com/trailblazer/mpeshwani"
    },
    {
      id: "ach-3",
      title: "Reduced Admissions Processing Time by 70%",
      category: "Enterprise Impact",
      icon: "🚀",
      metric: "70% Faster",
      description: "Architected and deployed Salesforce automation and Flow redesign for Boston University Admissions & Recruiting, managing complex profile security.",
      date: "2023 - 2024",
      link: "https://linkedin.com/in/mohit-peshwani2"
    },
    {
      id: "ach-4",
      title: "Streamlined Sales Operations at Ola Krutrim",
      category: "Production Impact",
      icon: "⚡",
      metric: "30% Effort Reduction",
      description: "Optimized sales operations workflows using Apex, Flows, and Lightning Web Components (LWC), reducing manual intervention by 30%.",
      date: "2024 - Present",
      link: "https://linkedin.com/in/mohit-peshwani2"
    },
    {
      id: "ach-5",
      title: "YouTube Channel & Knowledge Sharing Hub",
      category: "Content Creation",
      icon: "🎥",
      metric: "Active Creator",
      description: "Created in-depth programming and Salesforce tutorials on YouTube, breaking down complex software engineering concepts for the developer community.",
      date: "Ongoing",
      link: "https://mohitpeshwani.github.io/crazyprogrammer/"
    }
  ],

  projects: [
    {
      id: "proj-agentforce-property",
      title: "Agentic AI Property Manager for Tenant Queries",
      category: "Agentforce & GenAI",
      featured: true,
      description: "Agentforce-driven autonomous AI assistant that handles tenant maintenance workflows: email tenant verification, automated case generation, category mapping, priority scoring, owner assignment, and real-time stakeholder alerts.",
      impact: "Zero-touch automated maintenance case triage",
      tags: ["Agentforce", "Salesforce Flows", "Apex", "Prompt Engineering", "Email-to-Case", "Einstein AI"],
      github: "https://github.com/mohitpeshwani",
      demo: "https://mohitpeshwani.github.io/crazyprogrammer/",
      voiceSummary: "The Agentic AI Property Manager uses Salesforce Agentforce to automate tenant maintenance triage from email verification and priority scoring to automated case assignment."
    },
    {
      id: "proj-agentforce-banking",
      title: "Agentic AI Banking Query Handler",
      category: "Agentforce & BFSI",
      featured: true,
      description: "BFSI Agentforce bot delivering email-based customer identification, intelligent complaint logging, systematized case creation, escalation routing, stakeholder notifications, and self-service knowledge base retrieval.",
      impact: "Automated end-to-end BFSI inquiry resolution",
      tags: ["Agentforce", "Salesforce Service Cloud", "LWC", "Apex", "REST APIs", "Knowledge Base"],
      github: "https://github.com/mohitpeshwani",
      demo: "https://mohitpeshwani.github.io/crazyprogrammer/",
      voiceSummary: "The Agentic AI Banking Handler is an autonomous BFSI assistant handling complaint logging, intelligent case escalation, and personal finance self-service."
    },
    {
      id: "proj-crm-analytics",
      title: "CRM Analytics & Einstein Discovery Predictive Models",
      category: "Data & Predictive Analytics",
      featured: true,
      description: "Streamlined weighted pipeline dashboards, scheduled daily amount trackers, and opportunity win-rate analytics. Engineered Einstein Discovery predictive models combining Amazon S3, CSV, and Salesforce CRM data.",
      impact: "30% improvement in executive decision-making speed",
      tags: ["CRM Analytics", "Einstein Discovery", "Tableau", "SQL", "Data Recipes", "Amazon S3"],
      github: "https://github.com/mohitpeshwani",
      demo: "https://mohitpeshwani.github.io/crazyprogrammer/",
      voiceSummary: "This project combined Salesforce CRM data with Amazon S3 and CSV files in CRM Analytics, using Einstein Discovery predictive models to boost win-rate forecasting accuracy."
    },
    {
      id: "proj-ml-crowdfunding",
      title: "Crowdfunding Campaign Success Prediction ML",
      category: "Machine Learning & Python",
      featured: false,
      description: "End-to-end machine learning system built with Flask and scikit-learn predicting campaign funding success with approximately 88% accuracy, including feature engineering and model evaluation.",
      impact: "~88% prediction accuracy",
      tags: ["Python", "scikit-learn", "Flask", "Pandas", "NumPy", "ML Workflows"],
      github: "https://github.com/mohitpeshwani",
      demo: "https://mohitpeshwani.github.io/crazyprogrammer/",
      voiceSummary: "Crowdfunding Success Prediction is an end-to-end machine learning model built with Python, scikit-learn, and Flask, predicting campaign outcomes with 88 percent accuracy."
    },
    {
      id: "proj-experience-samit",
      title: "Samit Hostel Admission Portal (Nonprofit Cloud)",
      category: "Salesforce Experience Cloud",
      featured: false,
      description: "Engineered a full hostel admissions portal on Salesforce Experience Cloud with Cashfree payment gateway integration and automated WhatsApp status tracking.",
      impact: "Reduced processing turnaround time by 40%",
      tags: ["Experience Cloud", "Cashfree API", "WhatsApp Integration", "Apex", "LWC"],
      github: "https://github.com/mohitpeshwani",
      demo: "https://mohitpeshwani.github.io/crazyprogrammer/",
      voiceSummary: "Built an Experience Cloud hostel admission portal with Cashfree payments and WhatsApp notifications, cutting processing time by 40%."
    }
  ],

  skills: {
    salesforce: [
      { name: "Apex & Async Apex (Batch, Queueable)", level: "Expert", pct: 95 },
      { name: "Lightning Web Components (LWC)", level: "Expert", pct: 94 },
      { name: "Agentforce & Einstein AI", level: "Expert", pct: 92 },
      { name: "Salesforce Flows & Process Automation", level: "Expert", pct: 96 },
      { name: "Data Cloud & CRM Analytics", level: "Advanced", pct: 88 }
    ],
    dataAndAI: [
      { name: "Python (Pandas, NumPy, scikit-learn)", level: "Advanced", pct: 88 },
      { name: "Einstein Discovery Predictive Models", level: "Advanced", pct: 86 },
      { name: "SQL & Relational Data Modeling", level: "Advanced", pct: 90 },
      { name: "Tableau & Dashboard Analytics", level: "Advanced", pct: 85 },
      { name: "REST APIs, Integrations & Webhooks", level: "Expert", pct: 92 }
    ],
    toolsAndDevOps: [
      { name: "Git, GitHub & Version Control", level: "Expert", pct: 92 },
      { name: "SFDX, VS Code & Postman", level: "Expert", pct: 94 },
      { name: "Agile/Scrum & Stakeholder Management", level: "Expert", pct: 90 },
      { name: "Mentorship & Technical Training", level: "Expert", pct: 95 }
    ]
  },

  experience: [
    {
      role: "Salesforce Consultant",
      company: "GeekSoft Consulting Pvt Ltd",
      period: "Apr 2026 – Present",
      location: "Pune, India",
      highlights: [
        "Oversee end-to-end readiness activities for Data360 and Agentforce implementation.",
        "Act as primary liaison between stakeholders, enterprise customers, and engineering teams.",
        "Define project timelines, milestones, architecture standards, and success criteria.",
        "Ensure continuous alignment with business objectives and proactively manage dependencies."
      ]
    },
    {
      role: "Senior Salesforce Developer",
      company: "Areya Technologies Pvt. Ltd.",
      period: "Apr 2024 – Apr 2026",
      location: "Pune, India",
      highlights: [
        "Ola Krutrim: Streamlined sales operations workflows using Apex, Flows, and LWC, reducing manual effort by 30%.",
        "Samiti (Nonprofit Cloud): Built hostel admission portal in Experience Cloud with Cashfree payments and WhatsApp alerts (-40% time).",
        "Real Estate CRM & FSL: Refactored data models and implemented Field Service Lightning (FSL) scheduling (+35% efficiency).",
        "Inmar Intelligence: Constructed 3+ CRM Analytics dashboards & Einstein Discovery predictive models with Data Cloud (+25% accuracy).",
        "Emerson Commerce Cloud: Salesforce Payments Adapter, tokenization, authorization flows, and payment orchestration."
      ]
    },
    {
      role: "Salesforce Consultant",
      company: "Delbridge Solutions",
      period: "Mar 2023 – Mar 2024",
      location: "Remote / Hybrid",
      highlights: [
        "Architected and deployed Salesforce solutions for Boston University Admissions & Recruiting.",
        "Reduced admissions processing turnaround by 70% through Flow automation redesign.",
        "Managed the BU Recruitment Manager app with complex profile, access, and security configurations."
      ]
    },
    {
      role: "SDET (Software Development Engineer in Test)",
      company: "BrowserStack",
      period: "Jun 2022 – Jan 2023",
      location: "Mumbai, India",
      highlights: [
        "Supported BrowserStack's acquisition of Percy by leading Salesforce CRM data migration, deduplication, and field mapping.",
        "Built REST API integrations synchronizing customer analytics and product usage telemetry into Salesforce."
      ]
    }
  ],

  education: [
    {
      degree: "Master of Science in Artificial Intelligence & Data Science",
      institution: "Woolf University",
      period: "2025 – Pursuing",
      details: "Advanced machine learning, deep neural networks, AI agent architectures, and big data systems."
    },
    {
      degree: "Bachelor of Engineering (Computer Engineering)",
      institution: "VES Institute of Technology (VESIT), University of Mumbai",
      period: "2019 – 2022",
      details: "Strong foundation in data structures, algorithms, DBMS, operating systems, and OOPs."
    },
    {
      degree: "Technical Diploma in Computer Engineering",
      institution: "Government Polytechnic, Khamgaon — MSBTE",
      period: "2016 – 2019",
      details: "Computer fundamentals, C/C++, Java, web development, and networking."
    }
  ],

  certificationsList: [
    "Salesforce Platform Developer I",
    "Salesforce Platform Developer II",
    "Salesforce App Builder",
    "Salesforce Data Cloud Consultant",
    "Salesforce AI Associate",
    "Salesforce AI Specialist (Agentforce Specialist)",
    "Salesforce Certified Tableau Data Analyst",
    "Data Analysis Using Python",
    "SPIFF Certified"
  ],

  quickChips: [
    { label: "🎙️ 30s Voice Pitch", action: "pitch", query: "Give me your 30s elevator pitch" },
    { label: "🤖 Agentforce & AI Projects", action: "projects", query: "Tell me about your Agentforce and AI projects" },
    { label: "⭐ Topmate & Mentorship", action: "mentorship", query: "Tell me about your 5-star Topmate mentorship and teaching" },
    { label: "🎥 YouTube Channel", action: "youtube", query: "Tell me about your YouTube channel" },
    { label: "🏆 Achievements & Impact", action: "achievements", query: "What are your key achievements?" },
    { label: "📜 Certifications", action: "certs", query: "What Salesforce certifications do you hold?" },
    { label: "🛠️ Tech Stack", action: "skills", query: "What is your tech stack and skills?" },
    { label: "💼 Work Experience", action: "experience", query: "Tell me about your experience at Areya and Delbridge" },
    { label: "📫 Contact Mohit", action: "contact", query: "How can I contact Mohit Peshwani?" }
  ]
};

// Export to window and modules
if (typeof window !== "undefined") {
  window.PORTFOLIO_DATA = PORTFOLIO_DATA;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = PORTFOLIO_DATA;
}
