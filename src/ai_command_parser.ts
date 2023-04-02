import { AIAction, AICommand } from "./ai_command";
import { v4 as uuidv4 } from 'uuid';

export class AICommandParser {

    private known_commands : Array<string>;

    constructor() {
        this.known_commands = [
            "DEFINEFILECONTENTS",
            "ENDDEFINEFILECONTENTS",
            "MOVEFILE",
            "CREATEFILE",
            "CREATEDIR",
            "READFILE",
            "READDIR",
            "CLARIFY"
        ]
    }

    parse_action(prompt_response : string) {
        
        const commands = this.parse_commands(prompt_response);
        const commands_description = JSON.stringify(commands);
        const id = uuidv4();
        return {
            id: id,
            description : commands_description,
            commands: commands
        } as AIAction;
    }

    parse_commands(prompt_response : string) {
        const raw_parsed_commands = this.parse_commands_internal(prompt_response);
        return raw_parsed_commands.map(command_arr => this.arr_to_AI_command_obj(command_arr));
    }
    
    arr_to_AI_command_obj(command_arr : Array<string>) {
        return { 
            verb: command_arr[0],
            arg1: command_arr?.[1],
            arg2: command_arr?.[2]
        } as AICommand;
    }

    parse_commands_internal(prompt_response : string) {

        console.log(prompt_response);

        const lines = prompt_response.split(/\r\n|\r|\n/);
        
        let state = "PARSING";
        let current_definition = [];
        let define_key = undefined;
        const parsed_commands = [];
        const definitions = new Map<string,string>();

        for (const line of lines) {
            console.log(`parsing line: ${line}`)
            if (state == "PARSING") {
                if (this.looks_like_command(line)) {
                    console.log("Looks like command");
                    const command_tokens = this.parse_command(line);
                    if (!command_tokens) {
                        console.log("But has no command tokens");
                        continue;
                    }
                    parsed_commands.push(command_tokens);
                    if (command_tokens[0] === "DEFINEFILECONTENTS") {
                        console.log("Starting to define file contents")
                        const maybe_define_key = command_tokens[1];
                        if (maybe_define_key) {
                            state = "DEFINING";
                            define_key = maybe_define_key;
                            console.log("Entered defining state")
                        }
                        else {
                            console.log("But there was no define key")
                        }
                    }                    
                }
            }
            else if (state == "DEFINING") {
                console.log("   in defining state")
                if (this.looks_like_command(line)) {
                    const command_tokens = this.parse_command(line);
                    if (!command_tokens) {
                        continue;
                    }
                    const command_verb = command_tokens[0];
                    if (command_verb == "ENDDEFINEFILECONTENTS") {
                        console.log("   breaking out of defining state")
                        if (define_key) {
                            state = "PARSING";
                            const complete_definition = current_definition.join("\n");
                            definitions.set(define_key, complete_definition);
                            console.log("   Back into parsing state!")
                            continue;
                        }
                        else {
                            console.log("   but couldn't because there wasn't a define_key")
                        }
                    }
                }
                current_definition.push(line);
            }
        }

        console.log("parsed commands: " );
        console.log(JSON.stringify(parsed_commands));

        return parsed_commands;
    }

    looks_like_command(line : string) {
        const cleaned_line = this.clean_up_command_line_junk(line);
        const startsWithCommand = (this.known_commands.map(known_command => cleaned_line.startsWith(known_command)).includes(true));
        return startsWithCommand;
    }

    clean_up_command_line_junk(line : string) {
        return line.replace(/^[-*\d.]+\s*/, "").trim();
    }

    parse_command(line : string) {
        const cleaned_line = this.clean_up_command_line_junk(line);
        const tokens = cleaned_line.trim().match(/"([^"]*)"|'([^']*)'|`([^`]+)`|\S+/g)?.map(match => match.toString()) || [];
        if (tokens.length == 0) {
            return undefined;
        }
        const verb = this.clean_up_verb(tokens[0]);
        if (verb == "DEFINEFILECONTENTS") {
            if (tokens[1]) {
                return [verb, this.remove_quoting(tokens[1])];
            }
        }
        else if (verb == "ENDDEFINEFILECONTENTS") {
            return [verb];
        }
        else if (verb == "MOVEFILE") {
            if (tokens[1] && tokens[2]) {
                return [verb, this.remove_quoting(tokens[1]), this.remove_quoting(tokens[2])];
            }
        }
        else if (verb == "CREATEFILE") {
            if (tokens[1] && tokens[2]) {
                return [verb, this.remove_quoting(tokens[1]), this.remove_quoting(tokens[2])];
            }
        }
        else if (verb == "CREATEDIR") {
            if (tokens[1]) {
                return [verb, this.remove_quoting(tokens[1])];
            }
        }
        else if (verb == "READFILE") {
            if (tokens[1]) {
                return [verb, this.remove_quoting(tokens[1])];
            }
        }
        else if (verb == "READDIR") {
            if (tokens[1]) {
                return [verb, this.remove_quoting(tokens[1])];
            }
        }
        else if (verb == "CLARIFY") {
            if (tokens[1]) {
                return [verb, this.remove_quoting(tokens.slice(1).join(" "))];
            }
        }
        else if (verb == "ENDDEFINEFILECONTENTS") {
            return [verb];
        }
        return tokens;
    }

    clean_up_verb(verb : string) {
        return verb.replace(/^[:'"]|[:'"]$/g, '');
    }

    remove_quoting(verb : string) {
        return verb.replace(/^['"]|['"]$/g, '');
    }
}