import * as vscode from "vscode";
import * as path from "path";
import { spawn } from "child_process";
import { getCompiledResult } from "../util/dataform/compile-dataform";
import * as dt from "@dataform/protos";

// show quickpicks on vscode
async function showContextMenu(targets: string[]) {
  return vscode.window.showQuickPick(
    [
      { label: "include dependencies", id: "--include-deps" },
      { label: "include dependents", id: "--include-dependents" },
      { label: "target", kind: vscode.QuickPickItemKind.Separator, id: "" },
      ...targets.map((t) => ({ label: t, id: t, picked: true })),
    ],
    {
      title: "DataForm Run Option",
      canPickMany: true,
    }
  );
}

export const runDataForm = async (output: vscode.OutputChannel) => {
  const document = vscode.window.activeTextEditor?.document;

  if (!document) {
    vscode.window.showErrorMessage("No active document");
    return;
  }

  // get file basename without extension
  const fileName = path.basename(document.fileName, ".sqlx");

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage("No workspace folder");
    return;
  }

  const nodeModulesBinPathDataForm = path.join(
    workspaceFolder.uri.fsPath,
    "node_modules",
    ".bin",
    "dataform"
  );

  console.log("run compile");

  await vscode.window.withProgress(
    {
      title: "Running DataForm",
      location: vscode.ProgressLocation.Notification,
    },
    async (progress) => {
      progress.report({ message: "compiling" });

      let compilationResult: dt.dataform.ICompiledGraph | null;

      try {
        compilationResult = await getCompiledResult();
      } catch {
        vscode.window.showErrorMessage("DataForm compile failed");
        return;
      }

      const targetNames =
        compilationResult?.tables
          ?.filter((t) => path.basename(t.fileName || "", ".sqlx") === fileName)
          .map((t) => t.target?.name)
          .filter((e): e is string => !!e) ?? [];

      const options = await showContextMenu(targetNames);
      if (!options) {
        console.log("no options");
        return;
      }

      progress.report({ message: "running" });

      const runCommand = new Promise<void>((resolve, reject) => {
        const args = ["run", ...targetNames.flatMap((t) => ["--actions", t])];
        console.log(args);

        const cmd = spawn(nodeModulesBinPathDataForm, args, {
          cwd: workspaceFolder.uri.fsPath,
        });

        cmd.on("exit", (code) => {
          console.log("exit", code);
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`DataForm run failed with exit code ${code}`));
          }
        });

        cmd.on("error", (err) => {
          reject(err);
        });

        cmd.stdout.on("data", (data) => {
          output.append(data.toString());
        });

        cmd.stderr.on("data", (data) => {
          output.append(data.toString());
        });
      });

      try {
        await runCommand;
      } catch (err) {
        if (err instanceof Error) {
          vscode.window.showErrorMessage(err.message);
        } else {
          vscode.window.showErrorMessage("Unknown error occurred");
        }
        output.show(false);
        return;
      }
      progress.report({ message: "Finished" });
    }
  );

  const cmd = await vscode.window.showInformationMessage(
    "DataForm run completed",
    {
      title: "Show output",
    }
  );

  //outputを表示する
  if (cmd?.title === "Show output") {
    output.show();
  }
};
