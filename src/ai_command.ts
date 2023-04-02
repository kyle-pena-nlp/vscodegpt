export interface HasID {
    id: string
};

export interface AIGoal extends HasID {
    id: string
    description : string
}


export interface AIAction extends HasID {
    id : string    
    description : string
    commands : Array<AICommand>
};

export interface AICommand {
    verb : string
    arg1 : string|null
    arg2 : string|null
};

export interface AICommandExecutionResult {
    success : boolean
    commands : Array<AICommand>,
    definitions: Map<string,string>
    context: Map<string,string>
};