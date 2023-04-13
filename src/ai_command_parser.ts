import { parse } from "path";
import { AIAction, AICommand } from "./ai_com_types";
import { v4 as uuidv4 } from 'uuid';

export class AICommandParser {

    private command_grammars : Array<Array<string>>;

    constructor(command_grammars : Array<Array<string>>) {
        this.command_grammars = command_grammars;
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
        const raw_command_arrs = this.try_parse_commands(prompt_response);
        return raw_command_arrs.map(command_arr => this.arr_to_AI_command_obj(command_arr));
    }
    
    arr_to_AI_command_obj(command_arr : Array<string>) {
        return { 
            verb: command_arr[0],
            arg1: command_arr?.[1],
            arg2: command_arr?.[2]
        } as AICommand;
    }

    private try_parse_commands(multiline_input : string) : string[][] {
        const command_arrs : string[][] = [];
        let input_copy = multiline_input.slice(0);
        while(true) {

            // termination condition: no input left to parse.
            input_copy = input_copy.trim();
            if (input_copy.length === 0) {
                break;
            }

            // if what remains is a command, parse it and continue
            const [success, command_arr, reduced_input] = this.try_parse_next_command(input_copy);
            if (success) {
                command_arrs.push(command_arr!);
                input_copy = reduced_input!;
            }
            // otherwise consume a line and continue
            else {
                input_copy = this.consume_line(input_copy);
            }
        }
        return command_arrs;
    }

    private consume_line(input_copy : string) {
        const pat = /^[^\r\n]*[\r\n]?/g
        return input_copy.replace(pat,"");
    }

    try_parse_next_command(multiline_input : string) : [boolean,string[]|null,string|null] {
        for (const grammar of this.command_grammars) {
            const [success,contents,reduced_input] = this.try_parse_start_of_string_with_grammar(multiline_input, grammar);
            if (success) {
                return [true,contents!,reduced_input];
            }
        }
        return [false,null,null];
    }

    private try_parse_start_of_string_with_grammar(input : string, grammar : string[]) : [boolean,string[]|null,string|null] {
        
        let grammar_copy = grammar.slice(0);
        let input_copy = input.slice(0);
        let parse_success = true;
        const contents : string[] = [];

        while (grammar_copy.length > 0) {
            const [smaller_input,content,success] = this.consume_grammar_token(grammar_copy[0], input_copy);
            if (!success) {
                parse_success = false;
                break;
            }
            input_copy = smaller_input;
            grammar_copy = grammar_copy.slice(1);
            contents.push(content!);
        }

        if (!parse_success) {
            return [false,null,null];
        }

        return [true,contents,input_copy];
    }

    private consume_grammar_token(token : string, input : string) : [string,string|null,boolean] {

        // Consume a quoted string (or just a word, if there are no quotes)
        if (token === "<quoted-string>") {
            const pattern = /^\s*(["'][^"']*["']|\b\w+\b)/;
            const match = input.match(pattern);
            if (match) {
                const content = match[1];
                const reduced_input = input.replace(pattern, "");
                return [reduced_input,content,true];
            }
            else {
                return [input,null,false];
            }
        }
        // Consume the rest of the response ("until end of file")
        else if (token == "<until-EOF>") {
            return ["", input, true];
        }
        // Consume the rest of the line ("until end of line")
        else if (token == "<until-EOL>") {
            const pattern = /^.*$/m;
            const match = input.match(pattern);
            const content = match?.[0] || "";
            const reduced_input = input.replace(pattern, "");
            return [reduced_input,content,true];          
        }
        // Consume the rest of the response until the token listed after "<until-" and before ">" is encountered as the first token on a new line. Else, consume rest of response.
        else if (token.startsWith("<until-")) {
            // TODO: error condition. <until- is malformed.
            const sentinel_token = token.match(/<until-([^>]+)>/)?.[1];
            const pattern = RegExp(`^((?!\\s*${sentinel_token})[^\\r\\n]*[\\r\\n]*)+`, "m"); // i.e.; /^((?!\s*ENDDEFINEFILECONTENT)[^\r\n]*[\r\n]*)+/m
            const match = input.match(pattern);
            const content = match?.[0] || "";
            const reduced_input = input.replace(pattern, "");
            return [reduced_input,content,true];
        }
        // Match a literal token.
        else {
            // TODO: error condition when the token interpolated into the command has single or double quotes
            const pattern = RegExp(`^\\s*((["']${token}["'])|(\\b${token}\\b))`);
            const match = input.match(pattern);
            if (match) {
                const content = match[1];
                const reduced_input = input.replace(pattern, "");
                return [reduced_input,content,true];
            }
            else {
                return [input,null,false];
            }
        }
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