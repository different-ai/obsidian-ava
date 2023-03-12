// import { merge, split } from 'embeddings-splitter';


/**
 * This function split a list of files into chunks to be indexed by
 * an embeddings API.
 */
export const prepareFilesToEmbed = (files: { path?: string, content: string }[]) => {
    const markdownHeadingRegex = /^#/;

    let entries = [];
    for (const markdownFile of files) {
        const markdownContent = markdownFile.content;
        const markdownEntriesPerFile = [];
        for (const entry of markdownContent.split(markdownHeadingRegex)) {
            const prefix = entry.startsWith('#') ? '#' : '# ';
            if (entry.trim() !== '') {
                markdownEntriesPerFile.push(`${prefix}${entry.trim()}`);
            }
        }
        entries.push(...markdownEntriesPerFile.map((entry) => JSON.stringify((
            markdownFile.path ?
                { content: entry, path: markdownFile.path } :
                { content: entry }
        ))));
    }
    // HACK: atm remove too long entries until we have a better solution
    // to properly index them (either average embeddings or split smartly in the client)
    const maxEntryLength = 2000; // should use tokens once tiktoken works on browser
    entries = entries.filter((entry) => entry.length < maxEntryLength);
    // HACK

    console.log(`Split ${files.length} files into ${entries.length} entries`);
    console.log(entries);
    return entries;
};
