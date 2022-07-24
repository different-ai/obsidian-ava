import fs from "fs";
import path from "path";

const nodeModules = new RegExp(/^(?:.*[\\\/])?node_modules(?:[\\\/].*)?$/);

const dirnamePlugin = {
    name: "dirname",

    setup(build) {
        build.onLoad({ filter: /.*/ }, ({ path: filePath }) => {
            if (!filePath.match(nodeModules)) {
                let contents = fs.readFileSync(filePath, "utf8");
                const loader = path.extname(filePath).substring(1);
                const dirname = path.dirname(filePath);
                contents = contents
                    .replace("__dirname", ".")
                    .replace("__filename", `"${filePath}"`);
                return {
                    contents,
                    loader,
                };
            }
        });
    },
};

export default dirnamePlugin;