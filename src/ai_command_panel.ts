import * as vscode from 'vscode';
import { AIAction, AIGoal } from "./ai_command";
import { AICommandDispatcher } from "./ai_command_dispatcher";
import { WorkspaceConfiguration } from "./workspace_configuration";
import { v4 as uuidv4 } from 'uuid';

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
      case 'removeGoal':
        await this.panelUserRemovesGoal(message.id);
        await this.refresh();
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
        <div class="left-panel">
          <h1>Action Approval</h1>
          <ul>
            ${actions.map(action => `
              <li>
                ${action.description}
                <button onclick="approveAction('${action.id}')">Approve</button>
                <button onclick="rejectAction('${action.id}')">Reject</button>
              </li>
            `).join('')}
          </ul>
        </div>
        <div class="right-panel">
          <h1>Goals</h1>
          <ul id="goals">
            ${goals.map(goal => `
              <li>
                ${goal.description}
                <button onclick="removeGoal('${goal.id}')">Remove</button>
              </li>
            `).join('')}
          </ul>
          <input type="text" id="newGoal" placeholder="Type a new goal">
          <button onclick="addGoal()">Add Goal</button>
        </div>
        <script>
          const vscode = acquireVsCodeApi();

          function approveAction(id) {
            vscode.postMessage({ command: 'approveAction', id });
          }

          function rejectAction(id) {
            vscode.postMessage({ command: 'rejectAction', id });
          }

          function addGoal() {
            const newGoalInput = document.getElementById('newGoal');
            const goalText = newGoalInput.value.trim();
            if (goalText.length === 0) {
              return;
            }
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