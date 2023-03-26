interface BackgroundProcess {
    intervalId: NodeJS.Timeout | null;
    start(): void;
    stop(): void;
}
  
export function make_background_process(interval: number, callback: () => Promise<void>): BackgroundProcess {
    const backgroundProcess: BackgroundProcess = {
        intervalId: null,
        start() {
            if (this.intervalId === null) {
                this.intervalId = setInterval(async () => { await callback() }, interval);
            }
        },
        stop() {
            if (this.intervalId !== null) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
        }
    }
    return backgroundProcess;    
}