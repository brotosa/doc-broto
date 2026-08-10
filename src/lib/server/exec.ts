import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export class ProcessingError extends Error {
  constructor(message: string, public detail?: string) {
    super(message);
    this.name = "ProcessingError";
  }
}

/** Run a binary, rejecting on non-zero exit. Captures stdout/stderr. */
export function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv } = {}
): Promise<{ stdout: string; stderr: string }> {
  const { cwd, timeoutMs = 120_000, env } = opts;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env } });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new ProcessingError(`Tempo limite excedido ao executar ${cmd}`));
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new ProcessingError(`Falha ao executar ${cmd}: ${err.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else
        reject(
          new ProcessingError(
            `${cmd} terminou com código ${code}`,
            stderr || stdout
          )
        );
    });
  });
}

/** Create an isolated temp workspace and clean it up afterwards. */
export async function withWorkspace<T>(
  fn: (dir: string) => Promise<T>
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "docbroto-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
