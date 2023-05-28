import { FoldingRange } from "vscode";
const {encode, decode} = require('gpt-3-encoder')
/*
type Code = string;
type Summary = string;
type ContentKind = 'Code'|'Summary';
type LineRange = [number,number];
type FullyQualifiedSymbolPath = string;
type TokenBudgetSolve = {
    success: boolean,
    ask : number,
    giveBack: number,
    newInstance : CodeObject
};

export class CodeObject {

    static FUDGE_FACTOR = 1.1;

    private parent : CodeObject|null;
    private symbolName : string;
    private range : LineRange;
    private code : Code;
    private summary : string|null;
    private contentKind : ContentKind;
    private children : CodeObject[];
    private tokenCount : number|undefined;

    constructor(parent : CodeObject|null, symbolName : string, range : LineRange, code : Code, summary : Summary|null, contentKind : ContentKind, children : CodeObject[], tokenCount?: number) {
        this.parent = parent;
        this.symbolName = symbolName;
        this.range = range;
        this.code = code;
        this.summary = summary;
        this.contentKind = contentKind;
        this.children = children;
        this.tokenCount = tokenCount;
    }

    fullyQualifiedSymbolName() {
        let path = "";
        let parent = this.parent;
        while(parent != null) {
            path = parent.symbolName + "." + path;
        }
        return path;
    }

    copy() {
        return new CodeObject(this.parent, this.symbolName, this.range, this.code, this.summary, this.contentKind, this.children, this.tokenCount);
    }

    private summarize(tokenBudget : number, focusAreas : FullyQualifiedSymbolPath[]) {
        if ((this.estimateTokenCount() * CodeObject.FUDGE_FACTOR) < tokenBudget) {
            return this;
        }
        else {
            return this.solveForTokenBudget(tokenBudget, focusAreas);
        }
    }

    private estimateTokenCount() {
        // use the tokenizer only as much as you need to, recursively.
        if (this.tokenCount) {
            return this.tokenCount;
        }
        else if (this.children.length == 0) {
            return encode(this.content()).length as number;
        }
        else {
            let totalTokenCount = 0;
            for (const child of this.children) {
                child.estimateTokenCount();
                totalTokenCount += child.tokenCount!;
            }
            return totalTokenCount;
        }
    }

    private content() {
        if (this.contentKind == 'Code') {
            return this.code;
        }
        else if (this.contentKind == 'Summary') {
            return this.summary;
        }
    }

    private solveForTokenBudget(tokenBudget : number, focusAreas : FullyQualifiedSymbolPath[]) : TokenBudgetSolve|'Infeasible' {
        
        // If we're already under the token budget, no need to solve
        if (this.estimateTokenCount() < tokenBudget) {
            return { success: true, ask: 0, giveBack : (tokenBudget - this.estimateTokenCount()), newInstance : this };
        }
        
        // If not, we need to compress, but leave the focus areas unaffected.
        const focusAreaTokenTotals = this.countTokensInFocusAreas(focusAreas);

        // If the focus areas already have too many tokens, this is an infeasible ask
        if (focusAreaTokenTotals > tokenBudget) {
            return 'Infeasible';
        }

        // After taking out the focus area token counts, this is our budget we have to fit everything else under
        const remainingBudget = tokenBudget - focusAreaTokenTotals;

        // My rough theory is that the number of tokens in the code roughly is linearly related to the number of tokens in the summarization of the code
        // So a good first pass for the budget for each child object is a percent based on current token count
        const nonFocusAreaTokens = this.countNonFocusAreaTokensPerChild();
        const totalNonFocusAreaTokens = nonFocusAreaTokens.sum();
        const tokenBudgetPerChild = nonFocusAreaTokens.map(tokens => remainingBudget * tokens / totalNonFocusAreaTokens);

        let anyChanges = true;
        let spent = 0;

        const newChildren = this.children.map(child => child.copy());

        while(anyChanges) {

            newChildren.map((child,index) => {
                const solution = child.solveForTokenBudget(tokenBudgetPerChild[index], focusAreas);               
            });

        }

        const newInstance = new CodeObject(this.parent, this.symbolName, this.range, this.code, summary, contentKind, newChildren);

        if (spent < tokenBudget) {
            return { success: true, ask: 0, giveBack : (tokenBudget - spent), newInstance: newInstance };
        }
        else {
            return { success: false, ask: ( spent - tokenBudget ), giveBack: 0, newInstance : null };
        }
    }
}*/