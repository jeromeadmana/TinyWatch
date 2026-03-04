import BackgroundService from "react-native-background-actions";

const SLEEP_INTERVAL_MS = 60_000;

const backgroundOptions = {
  taskName: "TinyWatch",
  taskTitle: "TinyWatch Baby Monitor",
  taskDesc: "Streaming is active",
  taskIcon: {
    name: "ic_launcher",
    type: "mipmap",
  },
  color: "#0f3460",
  linkingURI: "tinywatch://",
};

async function keepAliveTask() {
  // The task just needs to stay alive; the actual streaming is handled
  // by WebRTC which runs on native threads. This loop keeps the
  // foreground service notification active.
  while (BackgroundService.isRunning()) {
    await new Promise((resolve) => setTimeout(resolve, SLEEP_INTERVAL_MS));
  }
}

export async function startBackgroundService(): Promise<void> {
  if (BackgroundService.isRunning()) return;
  try {
    await BackgroundService.start(keepAliveTask, backgroundOptions);
  } catch (err) {
    console.warn("Background service failed to start:", err);
  }
}

export async function stopBackgroundService(): Promise<void> {
  if (!BackgroundService.isRunning()) return;
  try {
    await BackgroundService.stop();
  } catch (err) {
    console.warn("Background service failed to stop:", err);
  }
}
