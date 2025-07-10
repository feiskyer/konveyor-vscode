# AKS Migrate VS Code Extension (`aks-migrate`)

The AKS Migrate VSCode Extension is a powerful tool for application
modernization and migration analysis. It leverages cutting-edge AI to analyze
code, identify modernization opportunities, and assist in migrating applications
to Azure Kubernetes Service (AKS).

---

## Features

- **Analysis View**: Provides an overview of identified issues and modernization opportunities.
- **Resolutions View**: Displays proposed resolutions and allows easy application or dismissal of changes.
- **Customizability**: Configure analysis settings, rulesets, and incident filters.
- **Integration with Generative AI**: Utilize advanced AI-powered insights with configurable backend support.
- **Seamless Navigation**: Command palette, menus, and activity bar integration for intuitive usage.

---

## Installation

1. Install [Visual Studio Code](https://code.visualstudio.com/).
2. Search for `aks-migrate` in the Extensions Marketplace or [download it directly from GitHub Releases](https://github.com/azure/aks-migrate/releases).
3. Follow the setup walkthrough to configure your environment. Alternatively, Command Palette, select "Welcome: Open Walkthrough", and select "AKS Migrate".

---

## Getting Started

### Configure Generative AI Key

Set up your AI backend by providing a Generative AI configurations:

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
2. Run `AKS Migrate: Open the GenAI model provider configuration file`.

### Run an Analysis

1. Start the server: `AKS Migrate: Start Server` and `AKS Migrate: Run Analysis`.
2. Run an analysis on your code: `AKS Migrate: Run Analysis`.
3. Open the Analysis View to view issues: `AKS Migrate: Open AKS Migrate Analysis View`.

### Get Solutions

1. Find an violation or incident you would like to use Generative AI to fix.
2. Run "Get Solution".
3. View the proposed changes and accept/reject/modify them.

---

## Excluding paths from analysis

The extension can be configured to ignore certain files and paths when performing analysis
and report issues.

Path exclusion configuration follow this priority ordering:

1. The extension will look for `.aksmigrateignore` files first. They are expected to follow the
   [standard `.gitignore` syntax](http://git-scm.com/docs/gitignore). If any `.aksmigrateignore`
   files are found in the workspace, they will be used.

2. If no `.aksmigrateignore` files are found, any found `.gitignore` files will be used.

3. If neither are found, a default set of ignores will be used. (`.vscode/`, `target/`, `.git/`,
   and `node_modules/`).

Due to some restrictions in underlying technology, exclusions apply to directories only. While
the [gitignore syntax](http://git-scm.com/docs/gitignore) allows for individual file exclusions.
Only directory exclusion will be applied. This may cause some individual files to be included
if they're named directly.

---

## Configuration Options

Customize your setup through the VS Code settings:

| Setting                             | Description                                  | Default          |
| ----------------------------------- | -------------------------------------------- | ---------------- |
| `aksmigrate.analyzerPath`           | Path to a custom analyzer binary.            | Bundled Analyzer |
| `aksmigrate.logLevel`               | Log level for the extension (`debug`, etc.). | `debug`          |
| `aksmigrate.analysis.incidentLimit` | Max number of incidents reported.            | `10000`          |
| `aksmigrate.analysis.customRules`   | Array of paths to custom rulesets.           | `[]`             |

---

## Commands

Access these commands via the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

| Command                                                         | Description                              |
| --------------------------------------------------------------- | ---------------------------------------- |
| `AKS Migrate: Open the GenAI model provider configuration file` | Configure your Generative AI.            |
| `AKS Migrate: Start Server`                                     | Start the backend server.                |
| `AKS Migrate: Run Analysis`                                     | Analyze your codebase for modernization. |
| `AKS Migrate: Stop Server`                                      | Stop the backend server.                 |

---

## Contributing

We welcome contributions! Please file issues on [GitHub](https://github.com/azure/aks-migrate/issues) or open a pull request.

---

## License

This extension is licensed under the [Apache License 2.0](LICENSE).
