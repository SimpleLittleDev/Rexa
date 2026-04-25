# Sub-Agent Guide

Rexa sub-agents are runtime workers designed by the main agent for the current task. There are no default worker names, profiles, or fixed worker prompts in config.

Flow:

```text
1. Planner marks a task as complex enough for delegation.
2. Rexa asks the main model to design worker JSON.
3. Main model chooses worker name, role, model, tools, systemPrompt, and task.
4. Rexa forces worker provider to match main provider when sameProviderAsMain is enabled.
5. SubAgentManager spawns isolated worker instances.
6. Rexa validates every worker result before continuing.
```

Dynamic worker proposal:

```json
{
  "shouldSpawn": true,
  "agents": [
    {
      "name": "SiteMapper",
      "role": "website-data-worker",
      "model": "gpt-5.4",
      "tools": ["browser", "file"],
      "systemPrompt": "You collect website data and return structured findings.",
      "task": "Extract data from the target website and summarize it for Rexa."
    }
  ]
}
```

Sub-agent output contract:

```json
{
  "agentId": "agent_sitemapper_001",
  "name": "SiteMapper",
  "role": "website-data-worker",
  "provider": "codex-cli",
  "model": "gpt-5.4",
  "taskId": "task_001",
  "status": "completed",
  "summary": "Short result summary",
  "findings": [],
  "filesChanged": [],
  "commandsRun": [],
  "risks": [],
  "needsUserConfirmation": false,
  "recommendedNextStep": "Run tests",
  "rawOutputPath": "./logs/subagents/agent_yanto_001.log"
}
```

Sub-agents should not publish, send, delete, or run dangerous commands directly. They return the proposed action to Rexa main agent for confirmation.
