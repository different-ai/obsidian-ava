import { complete, search } from "./utils";

// TODO: make it work on browser
// import { merge } from 'embeddings-splitter';
const maxLen = 1800; // TODO: probably should be more with string length
// TODO: very experimental
export const createContext = async (question: string, token: string, vaultId: string, version: string) => {
    const searchResponse = await search(question, token, vaultId, version);
    let curLen = 0;
    const returns = [];
    for (const similarity of searchResponse["similarities"]) {
        const sentence = similarity["data"];
        // const nTokens = enc.encode(sentence).length;
        const nChars = sentence.length;
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

export const generativeSearch = async (question: string, token: string, vaultId: string, version: string) => {
    const context = await createContext(question, token, vaultId, version);
    const newPrompt = `Answer the question based on the context below, and if the question can't be answered based on the context, say "I don't know"\n\nContext: ${context}\n\n---\n\nQuestion: ${question}\nAnswer:`;
    console.log('generativeSearch', newPrompt);
    return complete(newPrompt, token, version, {
        stream: true,
    });
};
