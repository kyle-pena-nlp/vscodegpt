# ChatGPT Agent

Table of Contents

- [ChatGPT Agent](#chatgpt-agent)
  - [Introduction](#introduction)
  - [Quick Start](#quick-start)
  - [How To Use](#how-to-use)
  - [Command List](#command-list)
  - [Settings](#settings)
  - [Things You Can Try](#things-you-can-try)
  - [Using the AI Command Panel](#using-the-ai-command-panel)
  - [Remarks](#remarks)
  - [Legal](#legal)


## Introduction

ChatGPT Agent for VSCode uses OpenAI's ChatGPT to:
- Build projects from the ground up
- Write code
- Write unit tests
- Answer questions about / analyze code
- Dynamically inspects compiler outputs and corrects broken code

You can:
- Build projects from the ground up by specifying a high-level goal and letting the ChatGPT Agent do the rest.
- Ask the ChatGPT Agent questions about code using natural language.
- Create new code or modify existing code by describing what you would like done.

What makes ChatGPT Agent different is its ability to seek out knowledge about your code as well as 3rd party dependencies, and to dynamically re-plan as it works.
- ChatGPT Agent maintains its own memory bank and dynamic planning engine that it uses to fulfill your requests.
- ChatGPT Agent intelligently works around API token limits by extracting and compressing data in its memory banks.
- ChatGPT Agent's current steps and execution plan are viewable in realtime through the `AI Command Panel`.

## Quick Start

This extension uses OpenAI's API to talk to ChatGPT.  You'll need to sdpply your own API key.

1. If you haven't already, <a href="https://platform.openai.com/signup/">sign up</a> to access the OpenAI API.
2. Once you have signed up, <a href="https://platform.openai.com/account/api-keys">create an API key</a> - don't forget to copy it so you can use it later!
3. Install this extension.
4. Execute the `Set OpenAI API Key` command from the command palette (`ctrl-chift-p`).

## How To Use

ChatGPT Agent's features are accessible mainly through the context menus in the Explorer and Editor (`right-click` to see commands).
For example, to build a new project from scratch:
1. Right-click on an empty folder
2. Select the `Give AI Command`
3. Describe the kind of project you want to build
4. Answer any requests for clarification ChatGPT Agent poses

Here are some other features:
1. `Analyze Code`: Accessible when right-clicking on a file, an open editor, or on selected code.
2. `Modify Code`: Accessible when right-clicking on a file or on selected code.
3. `Write Code`: Accessible when right-clicking at a position in an open editor.
4. `Make Recommendations`: Accessible when right-cliking on a file, a folder, an open editor, or on selected code.

## Command List

## Settings

## Things You Can Try

## Using the AI Command Panel

## Remarks

- First and foremost, this extension is just a clever way to integrate ChatGPT with VSCode.  The credit for the model belongs solely to OpenAI.
- In my experience, it's worth paying for the metered usage with an OpenAI API Key.
- This extension is heavily inspired by Classic AI algorithms like STRIPs and Hierarchical Task Networks
- Deepfakes pose a real risk to society.  But it's addressable with a little cooperation from industry players.  <a href="">Read this</a>.
- My views and opinions are my own and not those of my employer.
  
## Legal

<disclaimer of liability>
<all credit due to OpenAI and/or VSCode>
