export interface Hashable {
    hash() : string
}

export interface HashChainable extends Hashable {
    hash(): string
    dependencies(): Hashable[]
}

export interface HasID {
    id: string
};

export interface HasTimeStamp {
    timestamp : Date
}

export interface AIGoal extends HasID {
    description : string
}

export interface AIFileReadRequest extends HasID, HasTimeStamp {
    requested_uri : string
}

export interface AIAction extends HasID, HasTimeStamp { 
    description : string
    commands : Array<AICommand>
};

export interface AICommand {
    verb : string
    arg1 : string|null
    arg2 : string|null
    arg3 : string|null
};

export interface AICommandExecutionResult {
    success : boolean
    commands : Array<AICommand>,
    definitions: Map<string,string>
    context: Map<string,string>
};

export interface AIClarification extends HasID {
    text: string
};

export interface AIContextItem extends HasID, HasTimeStamp {
    text : string
};

export interface AIDefinition extends HasID {
    text : string
};

export interface AINotification extends HasID {
    text: string
};

export interface AISummarization  extends HasID {
    text: string
    originalItems: Array<HasID>
}


export interface AIChatItem extends HasID {
    text : string
    originalItem : HasID
}

export interface AIInfoItem extends HasID {
    text : string
    originalItem : HasID
}