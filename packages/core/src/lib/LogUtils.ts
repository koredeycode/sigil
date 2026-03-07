import { EventEmitter } from "node:events";
import fs from "node:fs";

/**
 * Cross-platform tail implementation for Node.js
 */
export class Tail extends EventEmitter {
  private size: number = 0;
  private watcher: fs.FSWatcher | null = null;
  private filePath: string;

  constructor(filePath: string, options: { lines: number } = { lines: 50 }) {
    super();
    this.filePath = filePath;
    this.init(options.lines);
  }

  private init(initialLines: number) {
    if (!fs.existsSync(this.filePath)) {
      this.emit("error", new Error(`File not found: ${this.filePath}`));
      return;
    }

    const stats = fs.statSync(this.filePath);
    this.size = stats.size;

    // Read last N lines
    this.readLastLines(initialLines);

    // Watch for changes
    try {
      this.watcher = fs.watch(this.filePath, (event) => {
        if (event === "change") {
          this.onChanged();
        }
      });
    } catch (err) {
      this.emit("error", err);
    }
  }

  private readLastLines(count: number) {
    const stats = fs.statSync(this.filePath);
    const bufferSize = Math.min(stats.size, 65536); // Read last 64KB max for initial lines
    const buffer = Buffer.alloc(bufferSize);
    const fd = fs.openSync(this.filePath, "r");
    
    fs.readSync(fd, buffer, 0, bufferSize, Math.max(0, stats.size - bufferSize));
    fs.closeSync(fd);

    const content = buffer.toString();
    const lines = content.split("\n");
    const lastLines = lines.slice(-count - 1).join("\n");
    this.emit("line", lastLines);
  }

  private onChanged() {
    try {
      const stats = fs.statSync(this.filePath);
      if (stats.size > this.size) {
        const stream = fs.createReadStream(this.filePath, {
          start: this.size,
          end: stats.size,
        });
        stream.on("data", (chunk) => {
          this.emit("line", chunk.toString());
        });
        stream.on("end", () => {
          this.size = stats.size;
        });
      } else if (stats.size < this.size) {
        // File truncated
        this.size = stats.size;
      }
    } catch (err) {
      // Ignore errors (e.g. file busy on Windows)
    }
  }

  public kill() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

/**
 * Convenience function to show last N lines and optionally follow
 */
export function tailFile(
  filePath: string,
  options: { lines: number; follow?: boolean },
  onData: (data: string) => void,
) {
  if (options.follow) {
    const tail = new Tail(filePath, { lines: options.lines });
    tail.on("line", onData);
    return tail;
  } else {
    // Just read last N lines and return
    const stats = fs.statSync(filePath);
    const bufferSize = Math.min(stats.size, 65536);
    const buffer = Buffer.alloc(bufferSize);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buffer, 0, bufferSize, Math.max(0, stats.size - bufferSize));
    fs.closeSync(fd);

    const content = buffer.toString();
    const lines = content.split("\n");
    const lastLines = lines.slice(-options.lines - 1).join("\n");
    onData(lastLines);
    return null;
  }
}
