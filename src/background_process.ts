export class BackgroundProcess {
    
    private name : string;
    private interval : number;
    private state : string;
    private callback : () => Promise<void>;

    constructor(name : string, interval : number, callback : () => Promise<void>) {
        this.name = name;
        this.interval = interval;
        this.state = "stopped";
        this.callback = callback;
    }

    async start() {
        const isAwaited = (new Error().stack?.split('\n')[2].includes('await'));
        if (isAwaited) {
            throw `Do not await the start method for ${this.name}`;
        }
        if (this.state == "running") {
            console.log(`${this.name} is already running.`)
        }
        this.state = "running";
        console.debug(`Starting ${this.name}`);
        while(true) {
            if (this.state == "stopped") {
                break;
            }
            console.debug(`Calling callback for ${this.name}`)
            await this.callback();
            await this.delay(this.interval);
        }

        console.debug(`Stopped ${this.name}`);
    }


    stop() {
        this.state = "stopped";
        console.debug(`Stopping ${this.name}`);
    }

    private async delay(ms : number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }    
}