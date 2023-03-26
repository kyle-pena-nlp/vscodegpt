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

    parse_commands(prompt_response : string) {

        const lines = prompt_response.split(/\r\n|\r|\n/);
        
        let state = "PARSING";
        let current_definition = [];
        let define_key = undefined;
        const parsed_commands = [];
        const definitions = new Map<string,string>();

        for (const line of lines) {
            if (state == "PARSING") {
                if (this.looks_like_command(line)) {
                    
                    const command_tokens = this.parse_command(line);
                    if (!command_tokens) {
                        continue;
                    }
                    parsed_commands.push(command_tokens);
                    if (command_tokens[0] === "DEFINEFILECONTENTS") {
                        const maybe_define_key = command_tokens[1];
                        if (maybe_define_key) {
                            state = "DEFINING";
                            define_key = maybe_define_key;
                        }
                    }                    
                }
            }
            else if (state == "DEFINING") {
                if (this.looks_like_command(line)) {
                    const command_tokens = this.parse_command(line);
                    if (!command_tokens) {
                        continue;
                    }
                    const command_verb = command_tokens[0];
                    if (command_verb == "ENDDEFINEFILECONTENTS") {
                        if (define_key) {
                            state = "PARSING";
                            const complete_definition = current_definition.join("\n");
                            definitions.set(define_key, complete_definition);
                            continue;
                        }
                    }
                }
                current_definition.push(line);
            }
        }

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
        const verb = tokens[0];
        if (verb == "DEFINEFILECONTENTS") {
            if (tokens[1]) {
                return [verb, tokens[1]];
            }
        }
        else if (verb == "ENDDEFINEFILECONTENTS") {
            return [verb];
        }
        else if (verb == "MOVEFILE") {
            if (tokens[1] && tokens[2]) {
                return [verb, tokens[1], tokens[2]];
            }
        }
        else if (verb == "CREATEFILE") {
            if (tokens[1] && tokens[2]) {
                return [verb, tokens[1], tokens[2]];
            }
        }
        else if (verb == "CREATEDIR") {
            if (tokens[1]) {
                return [verb, tokens[1]];
            }
        }
        else if (verb == "READFILE") {
            if (tokens[1]) {
                return [verb, tokens[1]];
            }
        }
        else if (verb == "READDIR") {
            if (tokens[1]) {
                return [verb, tokens[1]];
            }
        }
        else if (verb == "CLARIFY") {
            if (tokens[1]) {
                return [verb, tokens[1]];
            }
        }
        else if (verb == "ENDDEFINEFILECONTENTS") {
            return [verb];
        }
        return tokens;
    }
}