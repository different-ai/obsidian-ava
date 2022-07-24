import { Check, Clear, Error, Warning } from "@mui/icons-material";
import { CircularProgress, Tooltip } from "@mui/material";
import {
    App, Editor, EditorPosition, EditorSuggest,
    EditorSuggestContext, EditorSuggestTriggerInfo, MarkdownView, TFile
} from "obsidian";
import { Configuration, OpenAIApi } from "openai";
import React from "react";
import AvaPlugin from "./main";


interface StatusBarProps {
    status: "success" | "error" | "loading" | "disabled" | "warning";
    statusMessage?: string;
}



const StatusBar = ({ status, statusMessage }: StatusBarProps) => {
    return (

        <Tooltip title={statusMessage || ""}>
            {
                status === "success" ?
                    <Check
                        fontSize="small"
                    /> :
                    status === "error" ?
                        <Error /> :
                        status === "loading" ?
                            <CircularProgress
                                size="24px"
                            /> :
                            status === "disabled" ?
                                <Clear
                                    fontSize="small"
                                /> :
                                status === "warning" ?
                                    <Warning
                                        fontSize="small"
                                    /> :
                                    <></>
            }
        </Tooltip>
    )
};

interface Suggestion {
    context: EditorSuggestContext;
    suggestion: string;
}
export class AvaSuggest extends EditorSuggest<Suggestion> {
    plugin: AvaPlugin;
    openai: OpenAIApi;
    lastSelectSuggestion: number;
    delayBetweenSelect: number;
    promptLineSize: number;
    lastCompletion: number;
    delayBetweenCompletions: number;
    public automaticSuggestion: boolean;
    setAutomaticSuggestion(automaticSuggestion: boolean): void {
        this.automaticSuggestion = automaticSuggestion;
        this.plugin.settings.openai.automatic = automaticSuggestion;
        this.plugin.saveSettings();
        this.plugin.statusBarItem.render(
            <StatusBar
                status={
                    this.automaticSuggestion ?
                        "success" :
                        "disabled"
                }
                statusMessage={
                    this.automaticSuggestion ?
                        "Automatic completion is ready" :
                        "Automatic completion is disabled"
                }
            />
        );
    }

    constructor(app: App, plugin: AvaPlugin, delayBetweenSelect?: number, promptLineSize?: number, delayBetweenCompletions?: number) {
        super(app);
        this.plugin = plugin;
        this.setInstructions([{
            command: "⎆",
            purpose: "Automatic completion",
        }])
        this.setAutomaticSuggestion(plugin.settings.openai.automatic);
        this.limit = 3;
        this.lastSelectSuggestion = Date.now();
        this.lastCompletion = Date.now();
        this.delayBetweenSelect = delayBetweenSelect || 1000;
        this.promptLineSize = promptLineSize || 3;
        this.delayBetweenCompletions = delayBetweenCompletions || 1000;
        const openaiConfiguration = new Configuration({
            apiKey: plugin.settings.openai!.key,
            organization: plugin.settings.openai!.organization,
        });
        this.openai = new OpenAIApi(openaiConfiguration);
    }
    getQuery(editor: Editor): string {
        const cursor = editor.getCursor()
        const { line } = cursor;
        // get 3 lines before cursor
        const lines = editor.getValue().split("\n");
        const prompt = lines.slice(line - this.promptLineSize, line + 1).join("\n");
        return prompt;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onTrigger(cursor: EditorPosition, editor: Editor, _: TFile): EditorSuggestTriggerInfo | null {
        const prompt = this.getQuery(editor);
        const { ch, line } = cursor;
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
        if (!context) return [];
        if (!this.automaticSuggestion) return [];
        if (Date.now() - this.lastSelectSuggestion < this.delayBetweenSelect) return [];
        if (Date.now() - this.lastCompletion < this.delayBetweenCompletions) return [];
        const prompt = context?.query || this.getQuery(context.editor);
        let text = "";
        this.lastCompletion = Date.now();
        this.plugin.statusBarItem.render(
            <StatusBar
                status="loading"
            />
        );

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
            this.plugin.statusBarItem.render(
                <StatusBar
                    status="success"
                    statusMessage="Completion successful"
                />
            );
        } catch (e) {
            this.plugin.statusBarItem.render(
                <StatusBar
                    status="error"
                    statusMessage={e.message}
                />
            );
            console.error(e);
            this.close();
        }
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    selectSuggestion(value: Suggestion, _: MouseEvent | KeyboardEvent): void {

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