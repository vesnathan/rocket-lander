import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";

let isDebugModeEnabled = false;
let logFilePath: string | null = null;
let logFileStream: fs.WriteStream | null = null;

const getTimestamp = (): string => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  const ms = now.getMilliseconds().toString().padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${ms}`;
};

const getISOTimestamp = (): string => {
  return new Date().toISOString();
};

const writeToLogFile = (level: string, message: string): void => {
  if (logFileStream) {
    const logEntry = `[${getISOTimestamp()}] [${level}] ${message}\n`;
    logFileStream.write(logEntry);
  }
};

const spinnerFrames = ["|", "/", "-", "\\"];
let currentSpinnerFrame = 0;
let spinnerInterval: NodeJS.Timeout | null = null;

const createSpinner = (message: string): (() => void) => {
  const timestamp = chalk.gray(`[${getTimestamp()}]`);
  let currentLine = `${timestamp} ${chalk.blue("[INFO]")} ${message} ${chalk.cyan("|")}`;
  process.stdout.write(currentLine);

  spinnerInterval = setInterval(() => {
    process.stdout.write("\r" + " ".repeat(currentLine.length) + "\r");
    const timestamp = chalk.gray(`[${getTimestamp()}]`);
    currentSpinnerFrame = (currentSpinnerFrame + 1) % spinnerFrames.length;
    const spinnerChar = chalk.cyan(spinnerFrames[currentSpinnerFrame]);
    currentLine = `${timestamp} ${chalk.blue("[INFO]")} ${message} ${spinnerChar}`;
    process.stdout.write(currentLine);
  }, 150);

  return () => {
    if (spinnerInterval) {
      clearInterval(spinnerInterval);
      spinnerInterval = null;
    }
    process.stdout.write("\r" + " ".repeat(currentLine.length) + "\r");
    const timestamp = chalk.gray(`[${getTimestamp()}]`);
    console.log(timestamp, chalk.blue("[INFO]"), message);
  };
};

export const logger = {
  menu: (message: string) => {
    writeToLogFile("MENU", message);
    console.log(message);
  },
  success: (message: string) => {
    writeToLogFile("SUCCESS", message);
    if (spinnerInterval) {
      clearInterval(spinnerInterval);
      spinnerInterval = null;
      process.stdout.write("\r" + " ".repeat(150) + "\r");
    }
    const timestamp = chalk.gray(`[${getTimestamp()}]`);
    console.log(timestamp, chalk.green("[SUCCESS]"), message);
  },
  warning: (message: string) => {
    writeToLogFile("WARNING", message);
    if (spinnerInterval) {
      clearInterval(spinnerInterval);
      spinnerInterval = null;
      process.stdout.write("\r" + " ".repeat(150) + "\r");
    }
    const timestamp = chalk.gray(`[${getTimestamp()}]`);
    console.log(timestamp, chalk.yellow("[WARNING]"), message);
  },
  error: (message: string) => {
    writeToLogFile("ERROR", message);
    if (spinnerInterval) {
      clearInterval(spinnerInterval);
      spinnerInterval = null;
      process.stdout.write("\r" + " ".repeat(150) + "\r");
    }
    const timestamp = chalk.gray(`[${getTimestamp()}]`);
    console.log(timestamp, chalk.red("[ERROR]"), message);
  },
  info: (message: string) => {
    writeToLogFile("INFO", message);
    if (spinnerInterval) {
      clearInterval(spinnerInterval);
      spinnerInterval = null;
      process.stdout.write("\r" + " ".repeat(150) + "\r");
    }
    const timestamp = chalk.gray(`[${getTimestamp()}]`);
    console.log(timestamp, chalk.blue("[INFO]"), message);
  },
  infoWithSpinner: (message: string): (() => void) => {
    writeToLogFile("INFO", message + " (spinner)");
    return createSpinner(message);
  },
  debug: (message: string) => {
    writeToLogFile("DEBUG", message);
    if (isDebugModeEnabled) {
      if (spinnerInterval) {
        clearInterval(spinnerInterval);
        spinnerInterval = null;
        process.stdout.write("\r" + " ".repeat(150) + "\r");
      }
      const timestamp = chalk.gray(`[${getTimestamp()}]`);
      console.log(timestamp, chalk.magenta("[DEBUG]"), message);
    }
  },
};

export const setDebugMode = (enabled: boolean): void => {
  isDebugModeEnabled = enabled;
  if (enabled) {
    logger.debug("Debug mode has been enabled for the logger.");
  }
};

export const getDebugMode = (): boolean => {
  return isDebugModeEnabled;
};

export const resetDebugMode = (): void => {
  isDebugModeEnabled = false;
};

export const setLogFile = (filePath: string): void => {
  if (logFileStream) {
    logFileStream.end();
  }

  logFilePath = filePath;

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  logFileStream = fs.createWriteStream(filePath, { flags: "a" });

  const separator = "=".repeat(80);
  logFileStream.write(`\n${separator}\n`);
  logFileStream.write(`[${getISOTimestamp()}] Deployment started\n`);
  logFileStream.write(`${separator}\n`);
};

export const closeLogFile = (): void => {
  if (logFileStream) {
    const separator = "=".repeat(80);
    logFileStream.write(`${separator}\n`);
    logFileStream.write(`[${getISOTimestamp()}] Deployment completed\n`);
    logFileStream.write(`${separator}\n\n`);
    logFileStream.end();
    logFileStream = null;
  }
  logFilePath = null;
};

export const getLogFilePath = (): string | null => {
  return logFilePath;
};
