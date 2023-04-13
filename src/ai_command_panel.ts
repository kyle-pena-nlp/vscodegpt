import * as vscode from 'vscode';
import { AIAction, AIClarification, AIContextItem, AIDefinition, AIGoal, AINotification, AISummarization } from "./ai_com_types";
import { AICommandDispatcher } from "./ai_command_dispatcher";
import { WorkspaceConfiguration } from "./workspace_configuration";
import { v4 as uuidv4 } from 'uuid';

export class AIPanelState {
  private actions : Array<AIAction>;
  private goals : Array<AIGoal>;
  private clarifications : Array<AIClarification>;
  private notifications : Array<AINotification>;
  private contextItems : Array<AIContextItem>;
  private definitions : Array<AIDefinition>;
  private summarizations : Array<AISummarization>;


  constructor(actions : Array<AIAction>, goals : Array<AIGoal>, clarifications : Array<AIClarification>, notifications : Array<AINotification>, contextItems : Array<AIContextItem>, definitions : Array<AIDefinition>, summarizations : Array<AISummarization>) {
    this.actions = actions;
    this.goals = goals;
    this.clarifications = clarifications;
    this.notifications = notifications;
    this.contextItems = contextItems;
    this.definitions = definitions;
    this.summarizations = summarizations;
  }

  get_chat_items() : Array<AIChatItem> {
    return [
      ...this.actions,
      ...this.summarizations, 
    ]
  }

  get_info_items() : Array<AIInfoItem> {
    return []
  }
}

export class AICommandPanel {

  private workspace_configuration : WorkspaceConfiguration;
  private command_dispatcher : AICommandDispatcher;
  private panel : vscode.WebviewPanel|null;

  constructor(context : vscode.ExtensionContext) {
    this.workspace_configuration = new WorkspaceConfiguration(context);
    this.command_dispatcher = new AICommandDispatcher(context);
    this.panel = null;
  }


  async refresh() {
    const rendered_markup = await this.render_markup(await this.workspace_configuration.get_recommended_actions(), await this.workspace_configuration.get_AI_goals());
    await this.ensure_panel();
    this.panel!.webview.html = rendered_markup;
  }    

  private async panelUserAddsGoal(goalText : string) {
    const id = uuidv4();
    await this.workspace_configuration.add_AI_goal({
      id: id,
      description : goalText
    } as AIGoal);
  }

  private async panelUserRemovesGoal(id : string) {
    await this.workspace_configuration.remove_AI_goal(id);
  }

  private async panelUserApprovesAction(id : string) {
    const action = await this.workspace_configuration.get_recommended_action_by_id(id);
    if (action == null) {
      return;
    }
    await this.command_dispatcher.dispatch_commands(action.commands);
    await this.workspace_configuration.remove_recommended_action(id);
  }

  private async panelUserRejectsAction(id : string) {
    await this.workspace_configuration.remove_recommended_action(id);
  }


  private async ensure_panel() {
    if (!this.panel) {
      await this.make_panel();
    }
  }

  private async make_panel() {
    this.panel = vscode.window.createWebviewPanel(
      'aiCommandPanel',
      'AI Command Panel',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    this.panel.webview.onDidReceiveMessage(this.handlePanelMessage.bind(this));
  }


  private async handlePanelMessage(message : any) {
    switch (message.command) {
      case 'approveAction':
        console.log(`Action approved: ${message.id}`);
        await this.panelUserApprovesAction(message.id);
        await this.refresh();
        break;
      case 'rejectAction':
        console.log(`Action rejected: ${message.id}`);
        await this.panelUserRejectsAction(message.id);
        await this.refresh();
        break;
      case 'addGoal':
        await this.panelUserAddsGoal(message.goal);
        await this.refresh();
        break;
      case 'editGoal':
        // TODO:
        this.refresh();
        break;
      case 'removeGoal':
        await this.panelUserRemovesGoal(message.id);
        await this.refresh();
        break;
      case 'addClarification':
        // TODO
        this.refresh();
        break;
      case 'editClarification':
        // TODO
        this.refresh();
        break;
      case 'removeClarification':
        // TODO
        this.refresh();
        break;
    }
  }

  private async render_markup(actions: Array<AIAction>, goals : Array<AIGoal>) {
    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            display: flex;
            margin: 0;
            padding: 0;
            font-family: sans-serif;
          }
          .left-panel, .right-panel {
            flex: 1;
            padding: 16px;
          }
          ul {
            list-style-type: none;
            padding: 0;
          }
          li {
            margin-bottom: 8px;
          }
          input[type="text"] {
            width: 100%;
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>

        <div id="fakeChatWindow" class="left-panel">
          {chatItemsMarkup}
        </div>

        <div id="infoSidePanel" class="right-panel">
          {infoItemsMarkup}
        </div>
        
        <script>

          const ENTER_KEY = 13;

          const vscode = acquireVsCodeApi();

          function approveAction(id) {
            vscode.postMessage({ command: 'approveAction', id });
          }

          function rejectAction(id) {
            vscode.postMessage({ command: 'rejectAction', id });
          }

          function goalInputKeyPress(event) {
            if (event.keyCode != ENTER_KEY) {
              return;
            }
            const goalText = event.target.value.trim();
            addGoal(goalText);
          }

          function addGoal(goalText) {
            vscode.postMessage({ command: 'addGoal', goal: goalText });     
          }

          function removeGoal(id) {
            vscode.postMessage({ command: 'removeGoal', id: id });            
          }
        </script>
      </body>
    </html>
  `;
  }
}