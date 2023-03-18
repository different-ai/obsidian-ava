import { App } from "obsidian";
import { complete, getCompleteFiles, search } from "./utils";
import { AvaSettings } from "./LegacySettings";

// TODO: make it work on browser
// import { merge } from 'embeddings-splitter';
const maxLen = 1800; // TODO: probably should be more with string length
// TODO: very experimental
export const createContext = async (question: string, settings: AvaSettings, version: string, app: App) => {
    const [searchResponse, files] = await Promise.all([search(question, settings, version), getCompleteFiles(app)]);
    let curLen = 0;
    const returns = [];
    for (const similarity of searchResponse["similarities"]) {
        const sentence = files.find((file) => file.path === similarity.path)?.content;
        // const nTokens = enc.encode(sentence).length;
        const nChars = sentence?.length || 0;
        // curLen += nTokens + 4;
        curLen += nChars;
        if (curLen > maxLen) {
            break;
        }
        returns.push(sentence);
    }
    return returns.join("\n\n###\n\n");
    // return output;
    // return merge(searchResponse["similarities"].map((similarity) => similarity["data"]));
}

export const generativeSearch = async (question: string, settings: AvaSettings, version: string, app: App) => {
    const context = await createContext(question, settings, version, app);
    const newPrompt = `Answer the question based on the context below, and if the question can't be answered based on the context, say "I don't know"\n\nContext: ${context}\n\n---\n\nQuestion: ${question}\nAnswer:`;
    console.log('generativeSearch', newPrompt);
    return complete(newPrompt, settings.token, version, {
        stream: true,
    });
};
