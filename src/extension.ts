import * as vscode from "vscode";
import { runDataForm } from "./cmd/run-dataform";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "sqlx-bigquery-develop" is now active!'
  );
  const outputChannel = vscode.window.createOutputChannel("Dataform Command", {
    log: true,
  });
  context.subscriptions.push(outputChannel);

  const dataformRunCommand = vscode.commands.registerCommand(
    "dataform.run",
    () => runDataForm(outputChannel)
  );
  context.subscriptions.push(dataformRunCommand);
}
