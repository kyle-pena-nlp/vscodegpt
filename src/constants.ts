export const CONSTANTS = {
    "extname": "vscode-gpt",
    "exttitle": "VsCode Agent For ChatGPT",
    "always_refuse_to_read_patterns": [

        // keys
        "**/*.ppk",
        "**/*.cert",
        "**/*.key",
        "**/*.pem",

        // https://github.com/github/gitignore/blob/main/Global/Images.gitignore
        "**/*.jpg",
        "**/*.jpeg",
        "**/*.jpe",
        "**/*.jif",
        "**/*.jfif",
        "**/*.jfi",
        "**/*.jp2",
        "**/*.j2k",
        "**/*.jpf",
        "**/*.jpx",
        "**/*.jpm",
        "**/*.mj2",
        "**/*.jxr",
        "**/*.hdp",
        "**/*.wdp",
        "**/*.gif",
        "**/*.raw",
        "**/*.webp",
        "**/*.png",
        "**/*.apng",
        "**/*.mng",
        "**/*.tiff",
        "**/*.tif",
        "**/*.svg",
        "**/*.svgz",
        "**/*.pdf",
        "**/*.xbm",  
        "**/*.bmp",
        "**/*.dib", 
        "**/*.ico", 
        "**/*.3dm",
        "**/*.max",
    ],
    "models": [
        "gpt-3.5-turbo",
        "text-davinci-003"
    ],
    "recommendedModel": "gpt-3.5-turbo"
}

