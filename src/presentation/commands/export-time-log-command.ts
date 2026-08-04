import * as vscode from "vscode";
import { ExportTimeLogUseCase } from "../../application/usecases/export-time-log-use-case.js";

export class ExportTimeLogCommand {
  constructor(private readonly _useCase: ExportTimeLogUseCase) {}

  async execute(): Promise<void> {
    const result = await this._useCase.execute();
    if (!result.ok) {
      await vscode.window.showErrorMessage(
        `エクスポートに失敗しました: ${result.error.message}`,
      );
      return;
    }

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
      filters: { JSON: ["json"] },
      saveLabel: "Export",
    });

    if (!uri) {
      return;
    }

    try {
      const data = Buffer.from(result.value, "utf-8");
      await vscode.workspace.fs.writeFile(uri, data);
      await vscode.window.showInformationMessage("タイムログをエクスポートしました");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await vscode.window.showErrorMessage(
        `ファイルの書き込みに失敗しました: ${message}`,
      );
    }
  }
}
