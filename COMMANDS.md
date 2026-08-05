# COMMANDS.md — ECC 命令清单

> 自动生成 · 数据源: commands/*.md · 共 95 个命令

| 命令 | 描述 |
|------|------|
| `/aside` | Answer a quick side question without interrupting or losing context from the ... |
| `/auto-update` | Pull the latest ECC repo changes and reinstall the current managed targets. |
| `/build-fix` | Detect the project build system and incrementally fix build/type errors with ... |
| `/checkpoint` | Create, verify, or list workflow checkpoints after running verification checks. |
| `/code-review` | Code review — local uncommitted changes or GitHub PR (pass PR number/URL for ... |
| `/cost-report` | Generate a local Claude Code cost report from the ECC cost-tracker metrics log. |
| `/cpp-build` | Fix C++ build errors, CMake issues, and linker problems incrementally. Invoke... |
| `/cpp-review` | Comprehensive C++ code review for memory safety, modern C++ idioms, concurren... |
| `/cpp-test` | Enforce TDD workflow for C++. Write GoogleTest tests first, then implement. V... |
| `/ecc-guide` | Navigate ECC's current agents, skills, commands, hooks, install profiles, and... |
| `/epic-claim` | Claim an epic issue, stamp coordination state, and sync local ownership. |
| `/epic-decompose` | Break an epic into task children without creating task branches. |
| `/epic-publish` | Publish a validated epic update back to the issue and local cache. |
| `/epic-review` | Mark epic review requested, approved, or changes requested. |
| `/epic-sync` | Sync epic issue bodies, labels, and local coordination snapshots from GitHub. |
| `/epic-unblock` | Sweep blocked epic issues and reopen anything whose dependencies are closed. |
| `/epic-validate` | Validate epic readiness, dependencies, and coordination policy. |
| `/evolve` | Analyze instincts and suggest or generate evolved structures |
| `/fastapi-review` | Review a FastAPI application for architecture, async correctness, dependency ... |
| `/feature-dev` | Guided feature development with codebase understanding and architecture focus |
| `/flutter-build` | Fix Dart analyzer errors and Flutter build failures incrementally. Invokes th... |
| `/flutter-review` | Review Flutter/Dart code for idiomatic patterns, widget best practices, state... |
| `/flutter-test` | Run Flutter/Dart tests, report failures, and incrementally fix test issues. C... |
| `/gan-build` | Run a generator/evaluator build loop for implementation tasks with bounded it... |
| `/gan-design` | Run a generator/evaluator design loop for frontend or visual work with bounde... |
| `/go-build` | Fix Go build errors, go vet warnings, and linter issues incrementally. Invoke... |
| `/go-review` | Comprehensive Go code review for idiomatic patterns, concurrency safety, erro... |
| `/go-test` | Enforce TDD workflow for Go. Write table-driven tests first, then implement. ... |
| `/gradle-build` | Fix Gradle build errors for Android and KMP projects |
| `/harness-audit` | Run a deterministic repository harness audit and return a prioritized scorecard. |
| `/hookify-configure` | Enable or disable hookify rules interactively |
| `/hookify-help` | Get help with the hookify system |
| `/hookify-list` | List all configured hookify rules |
| `/hookify` | Create hooks to prevent unwanted behaviors from conversation analysis or expl... |
| `/instinct-export` | Export instincts from project/global scope to a file |
| `/instinct-import` | Import instincts from file or URL into project/global scope |
| `/instinct-status` | Show learned instincts (project + global) with confidence |
| `/jira` | Retrieve a Jira ticket, analyze requirements, update status, or add comments.... |
| `/kotlin-build` | Fix Kotlin/Gradle build errors, compiler warnings, and dependency issues incr... |
| `/kotlin-review` | Comprehensive Kotlin code review for idiomatic patterns, null safety, corouti... |
| `/kotlin-test` | Enforce TDD workflow for Kotlin. Write Kotest tests first, then implement. Ve... |
| `/learn-eval` | "Extract reusable patterns from the session, self-evaluate quality before sav... |
| `/learn` | Extract reusable patterns from the current session and save them as candidate... |
| `/loop-start` | Start a managed autonomous loop pattern with safety defaults and explicit sto... |
| `/loop-status` | Inspect active loop state, progress, failure signals, and recommended interve... |
| `/marketing-campaign` | Plan and execute a full marketing campaign. Accepts a product brief and retur... |
| `/model-route` | Recommend the best model tier for the current task based on complexity, risk,... |
| `/multi-backend` | Run a backend-focused multi-model workflow for APIs, algorithms, data, and bu... |
| `/multi-execute` | Execute a multi-model implementation plan while preserving Claude as the only... |
| `/multi-frontend` | Run a frontend-focused multi-model workflow for components, layouts, animatio... |
| `/multi-plan` | Create a multi-model implementation plan without modifying production code. |
| `/multi-workflow` | Run a full multi-model development workflow with research, planning, executio... |
| `/orch-add-feature` | Orchestrate building a brand-new feature end to end — research, plan, TDD, re... |
| `/orch-build-mvp` | Orchestrate bootstrapping a working MVP from a design/spec doc — ingest, slic... |
| `/orch-change-feature` | Orchestrate altering an existing, working feature to new desired behavior — u... |
| `/orch-fix-defect` | Orchestrate fixing a bug — reproduce it as a failing regression test, fix to ... |
| `/orch-refine-code` | Orchestrate a behavior-preserving refactor — confirm tests green, restructure... |
| `/orch-review` | Run the orch-review native Workflow over a diff (local changes or a GitHub PR... |
| `/plan-canvas` | Open a plan or HTML artifact in the browser Plan Canvas for annotate-and-appr... |
| `/plan-prd` | "Generate a lean, problem-first PRD and hand off to /plan for implementation ... |
| `/plan` | Restate requirements, assess risks, and create step-by-step implementation pl... |
| `/pm2` | Analyze a project and generate PM2 service commands for detected frontend, ba... |
| `/pr` | "Create a GitHub PR from current branch with unpushed commits — discovers tem... |
| `/project-init` | Detect a project's stack and produce a dry-run ECC onboarding plan using the ... |
| `/projects` | List known projects and their instinct statistics |
| `/promote` | Promote project-scoped instincts to global scope |
| `/prp-commit` | "Quick commit with natural language file targeting — describe what to commit ... |
| `/prp-implement` | Execute an implementation plan with rigorous validation loops |
| `/prp-plan` | Create comprehensive feature implementation plan with codebase analysis and p... |
| `/prp-pr` | "Create a GitHub PR from current branch with unpushed commits — discovers tem... |
| `/prp-prd` | "Interactive PRD generator - problem-first, hypothesis-driven product spec wi... |
| `/prune` | Delete pending instincts older than 30 days that were never promoted |
| `/python-review` | Comprehensive Python code review for PEP 8 compliance, type hints, security, ... |
| `/quality-gate` | Run the ECC formatter quality gate for a single file and report remediation s... |
| `/react-build` | Fix React build failures (Vite, webpack, Next.js, CRA, Parcel, esbuild, Bun) ... |
| `/react-review` | Comprehensive React/JSX code review for hook correctness, render performance,... |
| `/react-test` | Enforce TDD workflow for React. Write React Testing Library tests first (beha... |
| `/refactor-clean` | Safely identify and remove dead code with verification after each change. |
| `/resume-session` | Load the most recent session file from ~/.claude/session-data/ and resume wor... |
| `/review-pr` | Comprehensive PR review using specialized agents |
| `/rust-build` | Fix Rust build errors, borrow checker issues, and dependency problems increme... |
| `/rust-review` | Comprehensive Rust code review for ownership, lifetimes, error handling, unsa... |
| `/rust-test` | Enforce TDD workflow for Rust. Write tests first, then implement. Verify 80%+... |
| `/santa-loop` | Adversarial dual-review convergence loop — two independent model reviewers mu... |
| `/save-session` | Save current session state to a dated file in ~/.claude/session-data/ so work... |
| `/security-scan` | Run AgentShield against agent, hook, MCP, permission, and secret surfaces. |
| `/sessions` | Manage Claude Code session history, aliases, and session metadata. |
| `/setup-pm` | Configure your preferred package manager (npm/pnpm/yarn/bun) |
| `/skill-create` | Analyze local git history to extract coding patterns and generate SKILL.md fi... |
| `/skill-health` | Show skill portfolio health dashboard with charts and analytics |
| `/stock-analyzer` | Run end-to-end three-dimension stock analysis (基本面 / 新闻面 / 资金面) for a specifi... |
| `/test-coverage` | Analyze coverage, identify gaps, and generate missing tests toward the target... |
| `/update-codemaps` | Scan project structure and generate token-lean architecture codemaps. |
| `/update-docs` | Sync documentation from source-of-truth files such as scripts, schemas, route... |
| `/vue-review` | Comprehensive Vue.js code review for Composition API correctness, reactivity,... |

---

**说明**：本表由各命令 SKILL.md 的 YAML frontmatter `description` 字段自动汇总。
