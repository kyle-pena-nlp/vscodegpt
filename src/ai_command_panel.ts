import * as vscode from 'vscode';
import { AIAction } from "./ai_command";
import { AICommandDispatcher } from "./ai_command_dispatcher";
import { WorkspaceConfiguration } from "./workspace_configuration";

export class AICommandPanel {

  private workspace_configuration : WorkspaceConfiguration;
  private command_dispatcher : AICommandDispatcher;

  constructor(context : vscode.ExtensionContext) {
    this.workspace_configuration = new WorkspaceConfiguration(context);
    this.command_dispatcher = new AICommandDispatcher();
  }

  panelUserAddsGoal = async (goal : string) => {
    this.workspace_configuration.add_AI_goal(goal);
  }

  panelUserRemovesGoal = async (goal : string) => {
    this.workspace_configuration.remove_AI_goal(goal);
  }

  async panelUserApprovesAction(id : string) {
    const action = await this.workspace_configuration.get_recommended_action_by_id(id);
    if (action == null) {
      console.debug(`Couldn't find action with id ${id}`);
      return;
    }
    const definitions = await this.workspace_configuration.get_command_execution_definitions();
    const context = await this.workspace_configuration.get_command_execution_context();
    const result = await this.command_dispatcher.dispatch_commands(action.commands, definitions, context);
    if (result.success) {
      await this.workspace_configuration.remove_recommended_action(id);
    }
  }

  async refresh_panel() {
    this.show(await this.workspace_configuration.get_recommended_actions(), await this.workspace_configuration.get_AI_goals());
  }

  show = async (actions: Array<AIAction>, goals : Array<string>) => {
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
                <button onclick="approveAction(${action.id})">Approve</button>
                <button onclick="rejectAction(${action.id})">Reject</button>
              </li>
            `).join('')}
          </ul>
        </div>
        <div class="right-panel">
          <h1>Goals</h1>
          <ul id="goals">
            ${goals.map(goal => `
              <li>
                ${goal}
                <button onclick="removeGoal(${goal})">Reject</button>
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

            const goalsList = document.getElementById('goals');
            const goalItem = document.createElement('li');
            goalItem.innerText = goalText;
            goalItem.innerHTML += ' <button onclick="removeGoal(this)">Remove</button>';
            goalsList.appendChild(goalItem);

            newGoalInput.value = '';
          }

          function removeGoal(button) {
            const goalItem = button.parentElement;
            vscode.postMessage({ command: 'removeGoal', id });            
            goalItem.remove();
          }
        </script>
      </body>
    </html>
  `;
  }


}