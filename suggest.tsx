import {
    App, Editor, EditorPosition, EditorSuggest,
    EditorSuggestContext, EditorSuggestTriggerInfo, MarkdownView, TFile
} from "obsidian";
import { Configuration, OpenAIApi } from "openai";
import { escape, unescape } from "querystring";
import AvaPlugin from "./main";

interface Suggestion {
    context: EditorSuggestContext
    suggestion: string
}
export class AvaSuggest extends EditorSuggest<Suggestion> {
    plugin: AvaPlugin;
    openai: OpenAIApi;
    lastSelectSuggestion: number;
    delayBetweenSelect: number;
    promptLineSize: number;
    lastCompletion: number;
    delayBetweenCompletions: number;
    constructor(app: App, plugin: AvaPlugin, delayBetweenSelect?: number, promptLineSize?: number, delayBetweenCompletions?: number) {
        super(app);
        this.plugin = plugin;
        this.limit = 3;
        this.lastSelectSuggestion = Date.now();
        this.delayBetweenSelect = delayBetweenSelect || 1000;
        this.promptLineSize = promptLineSize || 3;
        this.delayBetweenCompletions = delayBetweenCompletions || 1000;
        const openaiConfiguration = new Configuration({
            apiKey: plugin.settings.openai!.key,
            organization: plugin.settings.openai!.organization,
        });
        this.openai = new OpenAIApi(openaiConfiguration);
    }
    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
        const { ch, line } = cursor;
        // get 3 lines before cursor
        const lines = editor.getValue().split("\n");
        const prompt = lines.slice(line - this.promptLineSize, line + 1).join("\n");
        const triggerInfo = {
            start: {
                line: line - this.promptLineSize,
                ch: 0,
            },
            end: {
                line: line,
                ch: ch,
            },
            query: prompt,
        };
        return triggerInfo;
    }
    async getSuggestions(context: EditorSuggestContext): Promise<Suggestion[]> {
        if (Date.now() - this.lastSelectSuggestion < this.delayBetweenSelect) return [];
        if (Date.now() - this.lastCompletion < this.delayBetweenCompletions) return [];
        const prompt = context.query
        let text = "";
        try {
            const q = {
                ...this.plugin.settings.openai.completionsConfig,
                prompt: prompt,
            };
            // HACK?
            if (q.stop && (q.stop as string[]).some((e) => e === "\\n")) {
                q.stop = (q.stop as string[]).map((e) => e === "\\n" ? "\n" : e);
            }
            // otherwise OpenAI gets angry :)
            if (q.stop && q.stop.length === 0) delete q.stop;
            const response = await this.openai.createCompletion(q);
            text = response.data!.choices![0].text!;
        } catch (e) {
            console.error(e);
            this.close();
        }
        this.lastCompletion = Date.now();
        return [{ context, suggestion: text }];
    }
    renderSuggestion(value: Suggestion, el: HTMLElement): void {
        if (value.suggestion) {
            el.empty();
            // enter emoji key as title
            el.createEl("h2", { text: "Enter ⎆" });
            el.createEl("p", { text: value.suggestion });
            this.open();
        }
    }
    selectSuggestion(value: Suggestion, evt: MouseEvent | KeyboardEvent): void {
        this.close();
        const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;
        const cursorOffset = view.editor.posToOffset(view.editor.getCursor());
        view.editor.replaceRange(value.suggestion, view.editor.getCursor());
        const newCursorOffset = cursorOffset + value.suggestion.length;
        // set cursor afterwards
        view.editor.setCursor(newCursorOffset);
        this.lastSelectSuggestion = Date.now();
    }
}