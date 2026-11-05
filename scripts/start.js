const net = require("net");
const { spawn } = require("child_process");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const processes = [
  { name: "server", port: 5050, args: ["run", "dev", "--prefix", "server"] },
  { name: "client", port: 5173, args: ["run", "dev", "--prefix", "client"] },
];

const children = [];

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function startProcess({ name, args }) {
  const child = spawn(npmCommand, args, {
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(`[${name}] failed to start: ${error.message}`);
  });

  child.on("exit", (code, signal) => {
    if (signal) console.log(`[${name}] stopped with signal ${signal}`);
    else if (code !== 0) console.error(`[${name}] stopped with exit code ${code}`);
  });

  children.push(child);
}

async function startMissingProcesses() {
  for (const processInfo of processes) {
    if (await isPortInUse(processInfo.port)) {
      console.log(`[${processInfo.name}] port ${processInfo.port} is already in use; using the existing process.`);
      continue;
    }
    startProcess(processInfo);
  }
}

function stopAll(signal) {
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

process.on("SIGINT", () => stopAll("SIGINT"));
process.on("SIGTERM", () => stopAll("SIGTERM"));

console.log("InkWrite client and server are starting...");
startMissingProcesses().catch((error) => {
  console.error(`Unable to start InkWrite services: ${error.message}`);
  process.exitCode = 1;
});
