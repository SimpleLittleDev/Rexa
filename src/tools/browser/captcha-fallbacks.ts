import type { LLMRouter } from "../../llm/llm-router";
import type { AudioSolver, InteractiveSolver, VisionLLMSolver, CaptchaTask } from "./captcha-solver";

/**
 * Vision-LLM solver backed by the configured `LLMRouter`.
 *
 * Uses the `vision` role first; falls back to `general`/`reasoning` if no
 * vision model is configured. The image is passed inline as a data URI.
 */
export class RouterVisionSolver implements VisionLLMSolver {
  constructor(private readonly router: LLMRouter, private readonly roles: string[] = ["vision", "general", "reasoning"]) {}

  async solveImage(task: { imageBase64: string; question?: string }): Promise<string> {
    const prompt = task.question
      ? task.question
      : "This is a CAPTCHA challenge. Read the characters or solve the question shown in the image. " +
        "Reply with ONLY the answer — no explanation, no surrounding quotes, no punctuation other than what's in the answer itself.";
    const dataUri = `data:image/png;base64,${task.imageBase64}`;

    const errors: string[] = [];
    for (const role of this.roles) {
      try {
        const response = await this.router.generateForRole(role, {
          messages: [
            {
              role: "user",
              content: prompt,
              attachments: [{ kind: "image", url: dataUri }],
            },
          ],
          temperature: 0,
          maxTokens: 64,
        });
        const text = response.text.trim();
        if (text) return cleanup(text);
        errors.push(`${role}: empty response`);
      } catch (error) {
        errors.push(`${role}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    throw new Error(`Vision LLM solver failed: ${errors.join(" | ")}`);
  }
}

/** Whisper-based audio reCAPTCHA fallback (OpenAI). */
export class WhisperAudioSolver implements AudioSolver {
  constructor(
    private readonly apiKeyEnv = "OPENAI_API_KEY",
    private readonly model = "whisper-1",
    private readonly endpoint = "https://api.openai.com/v1/audio/transcriptions",
  ) {}

  async transcribe(task: { audioBase64: string }): Promise<string> {
    const apiKey = process.env[this.apiKeyEnv];
    if (!apiKey) throw new Error(`Missing ${this.apiKeyEnv}`);
    const buffer = Buffer.from(task.audioBase64, "base64");
    const blob = new Blob([buffer], { type: "audio/wav" });
    const form = new FormData();
    form.append("file", blob, "audio.wav");
    form.append("model", this.model);
    form.append("response_format", "text");
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!response.ok) throw new Error(`Whisper failed: ${response.status} ${await response.text()}`);
    return cleanup((await response.text()).trim());
  }
}

/**
 * Last-resort solver that asks a human via the active chat channel.
 *
 * `ask` is supplied by the calling surface (CLI, Telegram, WhatsApp). When
 * called from a non-interactive surface (daemon, API) the resolver returns
 * `null` and the captcha fails cleanly so the agent can decide to retry
 * later or alert.
 */
export class InteractivePromptSolver implements InteractiveSolver {
  constructor(private readonly ask: (prompt: string, task: CaptchaTask) => Promise<string | null>) {}

  async prompt(task: CaptchaTask, prompt: string): Promise<string> {
    const answer = await this.ask(prompt, task);
    if (!answer) throw new Error("interactive prompt unavailable or rejected");
    return cleanup(answer);
  }
}

function cleanup(value: string): string {
  return value
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/\s+/g, " ");
}
