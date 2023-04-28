import * as assert from 'assert';
import {AICommandParser} from "../../ai_command_parser";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

function make_commmand(verb : string, arg1? : string, arg2? : string) {
	if (arg1 === undefined) {
		return {
			verb: verb,
			arg1: null,
			arg2: null
		};
	}

	if (arg2 === undefined) {
		return {
			verb: verb,
			arg1: arg1,
			arg2: null
		}
	}

	return {
		verb : verb,
		arg1: arg1,
		arg2: arg2
	}
}

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('Test Parse Commands', () => {
		const grammars : string[][] = [
			["LITERAL"],
			["UNTILEOF", "<until-EOF>"],
			["UNTILEOL", "<until-EOL>"],
			["UNTILTOKEN", "<until-TOKEN>"],
			["QUOTED", "<quoted-string>"],
			["TWOQUOTED", "<quoted-string>", "<quoted-string>"]
		];
		const parser = new AICommandParser(grammars);

		// works parsing single literal
		assert.deepEqual([make_commmand("LITERAL")],  parser.parse_commands("LITERAL"));

		// works parsing single literal followed by whitespace
		assert.deepEqual([make_commmand("LITERAL")], parser.parse_commands("LITERAL  "));

		// works parsing single literal with whitespace in front of it
		assert.deepEqual([make_commmand("LITERAL")], parser.parse_commands("  LITERAL"));

		// works parsing single literal followed by whitespace, including linebreaks
		assert.deepEqual([make_commmand("LITERAL")], parser.parse_commands("LITERAL \n  \r  "));

		// works parsing multiple literals
		assert.deepEqual([make_commmand("LITERAL"), make_commmand("LITERAL")], parser.parse_commands("LITERAL\nLITERAL"));

		// ignores junk
		assert.deepEqual([make_commmand("LITERAL"), make_commmand("LITERAL")], parser.parse_commands("LITERAL\nGPT blabbering\nfor\nseveral\n\lines\nLITERAL"));

		// parses "until EOL"
		assert.deepEqual([make_commmand("UNTILEOL", " a bunch of stuff")], parser.parse_commands("UNTILEOL a bunch of stuff"));

		// parses "until EOL", ignores stuff on next line
		assert.deepEqual([make_commmand("UNTILEOL", " a bunch of stuff")], parser.parse_commands("UNTILEOL a bunch of stuff\n stuff to ignore"));

		// parses "until EOL", ignores commands on rest of line
		assert.deepEqual([make_commmand("UNTILEOL", " LITERAL")], parser.parse_commands("UNTILEOL LITERAL"));

		// parses "until EOF", ignores commands on rest of line
		assert.deepEqual([make_commmand("UNTILEOF", "\nline1\nline2\nline3")], parser.parse_commands("UNTILEOF\nline1\nline2\nline3"));

		// parses "until EOF", ignores commands in remainder of input
		assert.deepEqual([make_commmand("UNTILEOF", "\nline1\nline2\nline3\nLITERAL")], parser.parse_commands("UNTILEOF\nline1\nline2\nline3\nLITERAL"));

		// parses "until EOF", ignores commands in remainder of input
		assert.deepEqual([make_commmand("UNTILTOKEN", "\nline1\nline2\nline3\n")], parser.parse_commands("UNTILTOKEN\nline1\nline2\nline3\nTOKEN"));	
		
		// the last token is "TOKENZ" not "TOKEN" - but the parser isn't fooled!
		assert.notDeepEqual([make_commmand("UNTILTOKEN", "\nline1\nline2\nline3\n")], parser.parse_commands("UNTILTOKEN\nline1\nline2\nline3\nTOKENZ"));	

		// parses "<until-TOKEN>", captures contents
		assert.deepEqual([make_commmand("UNTILTOKEN", "\nline1\nline2\nline3\n")], parser.parse_commands("UNTILTOKEN\nline1\nline2\nline3\nTOKEN"));	
		
		// parses "<until-TOKEN>", captures contents, ignores stuff after contents
		assert.deepEqual([make_commmand("UNTILTOKEN", "\nline1\nline2\nline3\n")], parser.parse_commands("UNTILTOKEN\nline1\nline2\nline3\nTOKEN\ningore this stuff"));	

		// parses "<until-TOKEN>", captures contents, ignores commands within contents
		assert.deepEqual([make_commmand("UNTILTOKEN", "\nline1\nline2\nline3\nLITERAL\n")], parser.parse_commands("UNTILTOKEN\nline1\nline2\nline3\nLITERAL\nTOKEN"));

		assert.deepEqual([make_commmand("QUOTED", "content")], parser.parse_commands("QUOTED 'content'"));

		assert.deepEqual([make_commmand("QUOTED", "content")], parser.parse_commands('QUOTED "content"'));

		assert.deepEqual([make_commmand("QUOTED", "quoted content")], parser.parse_commands('QUOTED "quoted content"'));

		assert.deepEqual([make_commmand("QUOTED", "quoted content")], parser.parse_commands('QUOTED "quoted content" "ignored content"'));

		assert.deepEqual([make_commmand("QUOTED", "singleword")], parser.parse_commands('QUOTED singleword'));

		assert.deepEqual([make_commmand("QUOTED", "singleword")], parser.parse_commands('QUOTED singleword "ignored content"'));

		assert.notDeepEqual([make_commmand("QUOTED", "noclosingquotes")], parser.parse_commands('QUOTED "noclosingquotes'));
	})
});
