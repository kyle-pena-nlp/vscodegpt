export interface AICommand {
    verb : string
    arg1 : string|null
    arg2 : string|null
}

export interface AICommandExecutionResult {
    success : boolean
    commands : Array<AICommand>,
    definitions: Map<string,string>
    context: Map<string,string>
};

export interface AIAction {
    description : string
    id : string
    commands : Array<AICommand>
}