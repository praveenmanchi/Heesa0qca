# Plugin Tabs Documentation Index

This directory contains deep technical documentation for each functional area of the The Bridge plugin. Each document covers technical architecture, IPC protocols, API usage, and code examples.

---

## 📂 Detailed Documentation

| Category | Technical Guide | Description |
| --- | --- | --- |
| **Foundation** | [core-architecture.md](file:///Users/praveenmanchi/Desktop/github-data/figma-plugin/developer-knowledgebase/core-architecture.md) | High-level bridge and resolution engine details. |
| **Tokens** | [tokens-tab.md](file:///Users/praveenmanchi/Desktop/github-data/figma-plugin/developer-knowledgebase/plugin-tabs/tokens-tab.md) | Token CRUD, resolution engine, and document persistence. |
| **Inspector** | [inspector-tab.md](file:///Users/praveenmanchi/Desktop/github-data/figma-plugin/developer-knowledgebase/plugin-tabs/inspector-tab.md) | Node property analysis, selection tracking, and canvas annotations. |
| **Extract** | [extract-tab.md](file:///Users/praveenmanchi/Desktop/github-data/figma-plugin/developer-knowledgebase/plugin-tabs/extract-tab.md) | Variable serialization, GitHub sync, and diffing logic. |
| **Style Guide** | [style-guide-tab.md](file:///Users/praveenmanchi/Desktop/github-data/figma-plugin/developer-knowledgebase/plugin-tabs/style-guide-tab.md) | Automated canvas generation, font management, and Auto Layout. |
| **Variables** | [variables-tab.md](file:///Users/praveenmanchi/Desktop/github-data/figma-plugin/developer-knowledgebase/plugin-tabs/variables-tab.md) | Global variable usage search and node mapping. |
| **UXAI** | [uxai-tab.md](plugin-tabs/uxai-tab.md) | AI-powered variable analysis, change summary, and apply flow. |
| **Settings** | [settings-tab.md](file:///Users/praveenmanchi/Desktop/github-data/figma-plugin/developer-knowledgebase/plugin-tabs/settings-tab.md) | Sync providers, storage architecture, and persistence configuration. |

---

## 🏗 Architectural Foundation

The plugin utilizes a **split-process architecture**:

1.  **UI (React)**: Handles high-level state, user input, and external API calls (e.g., GitHub).
2.  **Controller (Plugin Runtime)**: Direct access to the Figma canvas and native document APIs.
3.  **IPC Layer**: A robust messaging bridge that ensures Type-Safe communication between UI and Controller.

For more information on the messaging layer, refer to the [Async Message Channel](file:///Users/praveenmanchi/Desktop/github-data/figma-plugin/developer-knowledgebase/async-message-channel.md) documentation.
