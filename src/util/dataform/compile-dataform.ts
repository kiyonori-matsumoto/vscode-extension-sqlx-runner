// run dataform compile command and get output result json
import * as dt from "@dataform/protos";
import * as vscode from "vscode";
import * as path from "path";
import { spawn } from "child_process";

export const getCompiledResult =
  async (): Promise<dt.dataform.ICompiledGraph | null> => {
    const document = vscode.window.activeTextEditor?.document;

    if (!document) {
      return null;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage("No workspace folder");
      return null;
    }

    const nodeModulesBinPathDataForm = path.join(
      workspaceFolder.uri.fsPath,
      "node_modules",
      ".bin",
      "dataform"
    );

    const compileCommand = new Promise<string>((resolve, reject) => {
      const cmd = spawn(nodeModulesBinPathDataForm, ["compile", "--json"], {
        cwd: workspaceFolder.uri.fsPath,
      });

      let result = "";
      cmd.stderr.on("data", (data) => {
        console.log(data.toString());
      });
      cmd.stdout.on("data", (data) => {
        result += data.toString();
      });

      cmd.on("exit", (code) => {
        console.log("exit", code);
        if (code === 0) {
          resolve(result);
        } else {
          reject(new Error(`DataForm run failed with exit code ${code}`));
        }
      });

      cmd.on("error", (err) => {
        reject(err);
      });
    });

    const result = await compileCommand;
    return JSON.parse(result) as dt.dataform.ICompiledGraph;
  };
