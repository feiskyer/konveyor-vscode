# Copilot Instructions

This file provides guidance to Github Copilot when working with code in this repository.

## Common Commands

### Development

- `npm run dev` - Start all workspaces in development mode with hot reload
- `npm run build` - Build all workspaces for production
- `npm run collect-assets -- --use-workflow-artifacts --branch=main` - Download external runtime assets (kai analyzer, jdt.ls, rulesets)

### Testing & Quality

- `npm run test` - Run all tests across workspaces

### Packaging

- `npm run dist` - Copy built files to dist/ folder
- `npm run package` - Create .vsix archive for VSCode installation

### Workspace-Specific Commands

- `npm run dev -w vscode` - Run only the extension in dev mode
- `npm run dev -w webview-ui` - Run only the webview UI in dev mode
- `npm run build -w shared` - Build only the shared workspace

### Git Commit Guidelines

When creating commits in this repository:

- **Use signed commits**: Always use `git commit -s` to sign your commits with the `-s` flag
- **Follow conventional commit format**: Use prefixes like `✨`, `:bug:`, etc. following the existing style
- **Write descriptive commit messages**: Include what was changed and why

Example:

```bash
git commit -s -m "✨ Add new feature for user authentication"
```

## Architecture Overview

The **AKS Migrate** VSCode extension assists with container‑focused application migration by combining a purpose‑built static analysis engine with AI‑powered solution generation. The codebase uses a multi‑workspace architecture:

### Core Workspaces

- **`vscode/`** - Main VSCode extension with entry point at `vscode/src/extension.ts`
- **`webview-ui/`** - React-based UI using PatternFly components
- **`shared/`** - Common types and utilities shared across workspaces
- **`agentic/`** - LangChain-based AI workflow system for solution generation

### Key Components

- **ExtensionState** - Immutable state management using Immer
- **AnalyzerClient** - Manages JSON-RPC communication with kai-analyzer-rpc binary
- **WebviewProviders** - Handle different UI panels (analysis, resolution, profiles)
- **Interactive Workflows** - Multi-step AI agents for complex problem-solving

### External Dependencies

- **kai-analyzer-rpc** - Static code analysis engine (binary downloaded to `downloaded_assets/kai/`)
- **JDT Language Server** - Eclipse JDT.LS for Java language intelligence
- **Konveyor Rulesets** - Community-maintained migration rules

## Development Workflow

### Setting Up Development Environment

1. Install Node.js (version specified in `.nvmrc`)
2. Run `npm install` to install all workspace dependencies
3. Run `npm run collect-assets -- --use-workflow-artifacts --branch=main` to download external binaries
4. Press F5 in VSCode to launch Extension Development Host

### Code Organization

- **State Management**: All state flows through `ExtensionData` type with immutable updates
- **Communication**: Webview ↔ Extension via VSCode messaging API, Extension ↔ Analyzer via JSON-RPC
- **Type Safety**: Full TypeScript coverage with shared types in `shared/` workspace

### Testing Strategy

- Unit tests use Jest framework
- Integration tests use VSCode extension testing framework
- Run `npm run test` to execute all tests

### Key Files to Understand

- `vscode/src/extension.ts` - Main extension entry point
- `shared/src/types/` - Core data types and interfaces
- `webview-ui/src/App.tsx` - Main UI component
- `agentic/src/workflows/` - AI workflow implementations

### Wizard‑based UI (new)

The traditional multi‑view interface has been replaced by a **single, four‑step wizard**. The steps are:

1. Setup – verifies LLM provider credentials
2. Profile – pick or create an analysis profile
3. Analysis – run the static analysis & review results
4. Resolution – guided AI fix experience

`webview-ui/src/components/Wizard/` contains the React components for each step and their navigation helper logic.

## Configuration

### VSCode Settings

The extension uses standard VSCode settings with prefix `aksmigrate.`. Provider (LLM) configuration is still stored globally so users can reuse the same credentials across projects.

### Configuration & Profile Storage (updated)

Analysis profiles are stored inside the workspace so that they travel with the project: profiles are persisted to `<workspace>/.aksmigrate/profiles.json`.

This allows teams to commit the `.aksmigrate` folder (or specific profiles) to source control and keep project specific analysis settings under version control.

### Profile System

• Built‑in profiles for common migration scenarios (e.g., EAP6→EAP7, Spring Boot→Quarkus)
• Custom profiles can be created with user‑defined rules and label selectors
• Profiles are validated in real‑time during configuration

### AI Configuration

- Multiple LLM providers supported (OpenAI, Anthropic, Ollama, etc.)
- Effort levels: `simplified`, `balanced`, `extra`
- Demo mode available for testing without real LLM calls

## Build System

### Multi-Workspace Build

- **Webpack** for extension bundling with hot reload
- **Vite** for modern webview UI development
- **TypeScript** for type safety across all workspaces

### Asset Management

External assets are downloaded by `scripts/collect-assets.js`:

- kai-analyzer-rpc binary for current platform
- JDT Language Server with Konveyor java-analyzer-bundle
- Community rulesets for various migration scenarios

### Development vs Production

- Development: Uses Vite dev server for webview UI
- Production: Webview assets are bundled and served statically

## Common Issues

### Asset Download

If `npm run collect-assets` fails:

- Check network connectivity
- Verify GitHub token with `gh auth token` if using workflow artifacts
- Use `--release-tag` flag to specify a different release version

### Extension Development

- Ensure workspace folder is open in Extension Development Host
- Use "View: Show AKS Migrate" command to open extension UI
- Check Output panel for kai-analyzer-rpc logs if analysis fails

### Build Issues

- Run `npm run clean` to clear build artifacts
- Ensure all workspaces build successfully with `npm run build`
- Check TypeScript compilation errors in individual workspaces

# How AKS Migrate VSCode Extension works

## Overview

This project extends Visual Studio Code to assist developers in migrating and modernizing applications to AKS. The extension provides a web-based UI built with **Vite and React (PatternFly)**, and integrates analysis and AI-driven solution suggestions to help developers resolve modernization issues directly within the editor. The primary goal is to create a seamless and intelligent development experience, reducing the friction and complexity often associated with large-scale application migrations.

The user interface is a sophisticated single-page application embedded within a VS Code webview. It leverages modern frontend technologies to deliver a responsive and interactive experience. At its core, the extension employs a dual-pronged approach to modernization. First, it integrates a powerful static analyzer, **Kai**, which utilizes language-specific services like **JDTLS for Java**, to meticulously scan the codebase. This analysis identifies potential migration roadblocks and modernization opportunities based on a comprehensive set of predefined and custom rules.

Second, for the issues identified, the extension utilizes an advanced, workflow-based AI engine built with **LangGraph** and **LangChain**. This engine goes far beyond simple code suggestions by generating context-aware solutions that can span multiple files and include changes to dependencies. By embedding this entire process within the familiar environment of VS Code, the extension streamlines the modernization workflow, minimizes context-switching, and empowers developers with actionable, AI-powered insights.

## Architecture and Design

The project is a monorepo using **npm workspaces** to manage dependencies between several distinct packages. This modular structure is crucial for maintaining a clean separation of concerns between the VS Code extension backend, the AI engine, the frontend UI, and shared code.

1. **`vscode/` (The VS Code Extension)**
   - This is the central nervous system of the extension, responsible for integrating with the VS Code API and orchestrating all other components.
   - **`extension.ts`**: The main activation point. It initializes all components, registers commands, sets up the webview providers, and manages the extension's lifecycle.
   - **`client/analyzerClient.ts`**: Manages the lifecycle of the `kai-rpc-server` process, a background service that performs the static analysis. This client handles starting, stopping, and communicating with the server to run analyses and receive results.
   - **`client/modelProvider.ts`**: A critical abstraction layer that makes the extension LLM-agnostic. It reads the `provider-settings.yaml` file to configure and initialize the appropriate Large Language Model (e.g., OpenAI, Azure, Bedrock, or a local Ollama instance) using the LangChain library.
   - **`commands.ts`**: Registers all user-facing commands, acting as the bridge between UI actions (like button clicks) and the extension's backend logic. The `aksmigrate.getSolution` command is a key entry point that triggers the AI fix workflows.
   - **`issueView/` & `diffView/`**: These directories contain the logic for the custom side panel views. They provide a richer, more focused user experience for browsing analysis issues and reviewing code diffs than the standard VS Code "Problems" panel.
   - **`webviewMessageHandler.ts`**: Facilitates the two-way communication between the VS Code extension process and the embedded React-based webview UI, ensuring the frontend is always in sync with the backend state.
2. **`agentic/` (AI Workflow Engine)**
   - This package is the "brains" of the AI operation, containing the core logic for the AI-driven workflows.
   - **`workflows/interactiveWorkflow.ts`**: Defines the main state machine graph using **LangGraph**. This allows for the creation of complex, cyclical, and stateful agentic workflows that are more powerful than simple, linear chains. It orchestrates the entire issue resolution process, from the initial fix to handling any subsequent diagnostic issues that arise.
   - **`nodes/analysisIssueFix.ts`**: Contains the `AnalysisIssueFix` node, which acts as the primary "solver." It constructs detailed prompts with code context and violation information, then calls the configured LLM to generate a code fix.
   - **`nodes/diagnosticsIssueFix.ts`**: Contains the `DiagnosticsIssueFix` node, which acts as a secondary agent. It can plan and execute fixes for cascading issues or new problems that are identified as a result of an initial fix, making the entire process more robust and intelligent.
   - **`tools/`**: Provides a set of functions that the AI agents can call to interact with the development environment. These tools give the AI capabilities beyond simple text generation. Key examples include `filesystem.ts` for reading and writing files and `javaDependency.ts` for managing Maven dependencies in a `pom.xml` file.
   - **`clients/solutionServerClient.ts`**: An optional client for interacting with a Model-Context-Protocol (MCP) server. This can be used to fetch metadata about past solutions, such as success rates and hints, to further improve the quality of AI-generated suggestions.
3. **`webview-ui/` (Frontend UI)**
   - A modern **React** application built with **Vite** for fast development and bundling. It uses the **PatternFly** component library to create an accessible, enterprise-grade user interface.
   - **`App.tsx`**: The root React component that acts as a router, directing the user to different views based on the context, such as the `AnalysisPage`, `ResolutionsPage`, or `ProfileManagerPage`.
   - **`components/AnalysisPage/`**: The main dashboard where users can select an analysis profile, start and stop the analysis server, and view a high-level summary of the results.
   - **`components/ResolutionsPage/`**: Presents the AI's output in an intuitive, chat-based interface. It displays the AI's reasoning and a list of proposed file changes (diffs) for the user to review.
   - **`components/ProfileManager/`**: A dedicated UI for creating, editing, and managing analysis profiles, allowing users to tailor the analysis to their specific migration needs.
   - **`context/ExtensionStateContext.tsx`**: A crucial piece for state management. It uses React Context to subscribe to state updates from the extension backend, ensuring the UI is always a reflection of the current data.
4. **`shared/` & `extra-types/`**
   - These packages are essential for maintaining consistency and type safety across the monorepo. They contain shared TypeScript types (like `EnhancedIncident` and `RuleSet`) and utility functions that are used by both the Node.js-based `vscode` extension and the browser-based `webview-ui`, preventing bugs and ensuring smooth communication between the two environments.

## Key Features

1. **Analysis Integration**
   - Integrates with the **Kai** static analyzer, which leverages **JDTLS** for Java analysis.
   - Collects and categorizes analysis issues into violations and incidents.
   - Displays issues in a custom tree view and as diagnostics within the code editor.
2. **Agentic Workflow Automation**
   - Uses **LangGraph** to define complex, multi-step agentic workflows for resolving issues.
   - The `interactiveWorkflow` can fix an initial issue, then use file system and dependency management tools to address cascading problems.
3. **AI-Driven Code Fixes**
   - Leverages various LLMs (OpenAI, Azure, Bedrock, etc.) via the **LangChain** library.
   - Prompts are dynamically constructed within workflow nodes (e.g., `AnalysisIssueFix`) to provide context to the AI.
   - Generates code modifications as diffs, which are displayed to the user for review.
   - Uses an in-memory file cache (`fsCache`) during a workflow run to allow agents to work on files without immediate disk writes.
4. **Interactive Fix Flow**
   - Users trigger fixes from the "Problems" view or the custom "AKS Migrate Issues" panel.
   - The `ResolutionsPage` displays a chat-like view of the AI's reasoning and a list of file changes.
   - Users can view diffs for each changed file and choose to **apply** or **discard** the changes individually or all at once.
5. **Configuration and Usability**
   - **Analysis Profiles**: Users can create and manage multiple analysis profiles, specifying source/target technologies and custom rules.
   - **Walkthrough & Guided Setup**: A welcome page guides new users through the configuration process.
   - **Server Management**: UI controls are provided to start/stop the backend `kai-rpc-server`.
   - **Status Indicators**: The UI provides clear status indicators for the server state, analysis progress, and configuration validity.

### Code Reference Analysis

#### Analysis Integration

1. **JDTLS Integration**: The extension packages a JDTLS bundle. The `kai-rpc-server` process, which wraps the analyzer, is configured with the path to this bundle on startup. This is defined in `vscode/src/client/analyzerClient.ts`.
2. **Issue Collection**: The `analyzerClient.runAnalysis()` method sends a request to the server. The response, containing an array of `RuleSet` objects, is processed and stored in `ExtensionState`.
3. **Displaying Diagnostics**: `vscode/src/data/analyzerResults.ts` contains the `processIncidents` function, which converts incidents from the analysis report into `vscode.Diagnostic` objects that appear in the "Problems" panel and as squiggles in the editor.

#### Workflow Automation

1. **LangGraph Integration**: The workflow is defined in `agentic/src/workflows/interactiveWorkflow.ts` using `new StateGraph({...})`.
2. **Node Registration**: Nodes are added to the graph via `graph.addNode(...)`, for example, adding the `fix_analysis_issue` node which maps to the `analysisIssueFixNodes.fixAnalysisIssue` method.
3. **Edge Conditions**: Conditional logic for routing between nodes is defined in functions passed to `graph.addConditionalEdges(...)`, such as `analysisIssueFixRouterEdge` in `interactiveWorkflow.ts`.
4. **File Caching**: The `SimpleInMemoryCache` is passed to the workflow and used by tools in `agentic/src/tools/filesystem.ts` to read from and write to an in-memory representation of files during a run.

#### AI-Driven Code Fixes

1. **AI Request Protocol**: The extension uses various `@langchain` packages to interact with LLMs. The model provider is dynamically chosen based on `provider-settings.yaml`, as seen in `vscode/src/client/modelProvider.ts`.
2. **Prompt Engineering**: Prompts are constructed inside the agentic nodes. For example, the main fix prompt is built in the `fixAnalysisIssue` method in `agentic/src/nodes/analysisIssueFix.ts`.
3. **Code Modification Handling**: Agents write changes to the `KaiFsCache`. When the workflow completes, `vscode/src/commands.ts` calculates the final diffs between the original file content and the modified content in the cache. These diffs are then displayed in the `ResolutionsPage`. Applying a fix copies the modified content to the actual workspace file.

#### Interactive Fix Flow

1. **Command Integration**: The `aksmigrate.getSolution` command, defined in `vscode/src/commands.ts`, is the entry point for triggering an AI fix. It can be activated from the `ViolationCodeActionProvider` (the lightbulb menu in the editor) or the issues tree view.
2. **User Acceptance Flow**: The UI in `webview-ui/src/components/ResolutionsPage/FileChanges.tsx` displays the list of changed files. Buttons for "Apply" and "Discard" dispatch messages (`APPLY_FILE`, `DISCARD_FILE`) back to the extension, which then updates the state of the `LocalChange` object.

### Q&A

#### **Q1: What is the architecture, and what are the key components and features?**

**A1:**

- **Architecture & Design**: The project is a monorepo using **npm workspaces**. It separates the VS Code extension backend (`vscode/`), the AI workflow engine (`agentic/`), the frontend UI (`webview-ui/`), and shared code (`shared/`).
- **Key Components**:
  1. **VS Code Extension (`vscode/`)**: Manages the UI, server lifecycle (`client/analyzerClient.ts`), and user commands (`commands.ts`).
  2. **Agentic Engine (`agentic/`)**: Contains **LangGraph** state machines (`workflows/interactiveWorkflow.ts`) that orchestrate AI agents and tools.
  3. **Webview UI (`webview-ui/`)**: A React/PatternFly single-page application for displaying analysis results and interacting with solutions.
  4. **Shared Code (`shared/`)**: Provides common TypeScript types for communication between the extension and the webview.
- **Features**:
  1. Static analysis integration with the Kai analyzer.
  2. Agentic, workflow-driven code modernization using LangGraph.
  3. Interactive issue resolution with diff views.
  4. AI-generated code fixes using LangChain for multi-provider LLM support.
  5. Configurable analysis profiles to tailor the analysis to specific technologies.

#### **Q2: How does the analysis process work?**

**A2:** The analysis workflow is as follows:

1. **Server Start**: The user starts the analysis server via a UI command, which spawns the `kai-rpc-server` process (`vscode/src/client/analyzerClient.ts`).
2. **Analysis Trigger**: The user clicks "Run Analysis" in the UI. This triggers the `aksmigrate.runAnalysis` command.
3. **API Call**: `analyzerClient.runAnalysis()` sends a request to the `kai-rpc-server`, providing the active analysis profile's configuration (label selectors, custom rules).
4. **Violation Processing**: The server runs the analysis and returns a list of `RuleSet` objects.
5. **State Update & Display**: The extension processes this response, enhances the incidents with more context, and updates the central `ExtensionState`. This state change triggers a re-render of the webview, displaying the issues in the "AKS Migrate Issues" tree view. Simultaneously, `vscode/src/data/analyzerResults.ts` converts incidents into `vscode.Diagnostic` objects, making them appear in the editor and "Problems" panel.

#### **Q3: How does it use AI to fix the found issues?**

**A3:** The AI fix process is orchestrated by the `KaiInteractiveWorkflow`:

1. **Trigger**: A user requests a solution for an incident (or group of incidents) via the UI. This executes the `aksmigrate.getSolution` command in `vscode/src/commands.ts`.
2. **Workflow Initialization**: An instance of `KaiInteractiveWorkflow` from the `agentic/` package is created. It's initialized with a LangChain chat model configured from the user's `provider-settings.yaml`.
3. **Workflow Execution**: The `kaiAgent.run()` method is called, which starts the LangGraph state machine.
4. **Prompt Construction & LLM Call**: The `AnalysisIssueFix` node in the graph constructs a detailed prompt containing the file content and violation details. It then calls the LLM to generate a fix.
5. **Code Generation & Caching**: The AI agent writes the modified file content to an in-memory file system (`KaiFsCache`). If the fix introduces new issues, the `DiagnosticsIssueFix` node may be triggered to handle them.
6. **Diff Calculation & Display**: Once the workflow completes, the extension calculates a diff between the original file content and the modified content in the cache. This diff is sent to the `ResolutionsPage` UI for the user to review.
7. **User Acceptance**: The user can apply or discard the changes. Applying a change writes the modified content from the cache to the user's actual workspace file.
