import * as vscode from 'vscode';


// A work queue with deep cancellation
export class ProgressWindow {
    
    private name : string;
    private state : ProgressWindowState;
    private executingFnNames : Array<string>;

    constructor(name : string) {
        this.name = name;
        this.state = ProgressWindowState.Unopened;
        this.executingFnNames = [];
    }

    open() {

        if (this.state != ProgressWindowState.Unopened) {
            console.debug(`Not re-opening progress window ${this.name} because it is already ${this.state}`);
            return;
        }

        const progressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: this.name,
            cancellable: true
        };

        // open a vscode progres window that stays open until there are no active promises or it is explicitly cancelled
        vscode.window.withProgress(progressOptions, 
            async (progress, token) => {
                
                token.onCancellationRequested(() => {
                    this.state = ProgressWindowState.Cancelled;
                    progress.report({ increment: 100, message: "Cancelling..." });
                });
                
                progress.report({ increment: 0 });

                const checkIfCancelledOrComplete = async () => this.state == ProgressWindowState.Cancelled || this.state == ProgressWindowState.Completed

                const updateProgress = () => { 
                    const current_fn_name = this.executingFnNames.at(-1);
                    progress.report({ message: current_fn_name || this.name });
                    return; 
                };

                await pollUntilConditionMet(checkIfCancelledOrComplete, updateProgress, 10);

                progress.report({ message: "Finished!" });
            });

        this.state = ProgressWindowState.Opened;
    }

    close() {
        this.state = ProgressWindowState.Completed;
    }

    cancel() {
        this.state == ProgressWindowState.Cancelled;
    }

    wrapAsync<T>(title : string, async_fn: () => Promise<T>) : Promise<T|'UserCancelled'> {

        const fn_name = title;
        const promise = new Promise<T|'UserCancelled'>((resolve, reject) => {   
            
            if (this.state == ProgressWindowState.Unopened) {
                this.open();
            }

            if (this.state == ProgressWindowState.Cancelled) {
                console.debug(`Not executing ${fn_name} because the progress window ${this.name} was cancelled`);
                resolve('UserCancelled');
            }
            else {
                this.executingFnNames.push(fn_name);
                async_fn().then((t) => 
                {
                    // If the window was cancelled after the fn was kicked off, we need to recognize this and return empty
                    if (this.state == ProgressWindowState.Cancelled) {
                        console.debug(`Discarding output from ${fn_name} because its execution was cancelled`)
                        resolve('UserCancelled');
                    }
                    else {
                        console.debug(`Successfully executed ${fn_name} for progress window ${this.name}`);
                        resolve(t);
                    }
                }, (reason) => {
                    console.debug(`${fn_name} failed during execution`)
                }).finally(() => {
                    const fnNameIndex = this.executingFnNames.lastIndexOf(fn_name);
                    if (fnNameIndex !== -1) {
                        this.executingFnNames.splice(fnNameIndex, 1);
                    }
                });
            }
        });
        return promise;
    }
    
    wrap<T>(title: string, fn : () => T): T|'UserCancelled' {

        const fn_name = title;
        
        if (this.state == ProgressWindowState.Unopened) {
            this.open();
        }
        
        if (this.state == ProgressWindowState.Cancelled) {
            console.debug(`Not executing ${fn_name} because the progress window ${this.name} was cancelled`);            
            return 'UserCancelled';
        }       
        else {
            console.debug(`Executing ${fn_name} for progress window ${this.name}`); 
            const t = fn();
            console.debug(`Successfully executed ${fn_name} for progress window ${this.name}`); 
            return t;
        }
    }
}

enum ProgressWindowState {
    Unopened,
    Opened,
    Cancelled,
    Completed
}

async function pollUntilConditionMet(conditionMet: () => Promise<boolean>,  pollingSideEffect : () => void, interval: number): Promise<void> {
    while (true) {
        if (await conditionMet()) {
            break;
        }
        pollingSideEffect();
        await new Promise<void>(resolve => setTimeout(resolve, interval));
    }
}
