import * as vscode from "vscode";
import { ExportSummaryUseCase } from "../../application/usecases/export-summary-use-case.js";

export class ExportSummaryCommand {
  constructor(private readonly _useCase: ExportSummaryUseCase) {}

  async execute(): Promise<void> {
    const result = await this._useCase.execute();
    if (!result.ok) {
      await vscode.window.showErrorMessage(
        `サマリーのエクスポートに失敗しました: ${result.error.message}`,
      );
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const folderName = workspaceFolder?.name ?? "project";
    const date = new Date().toISOString().slice(0, 10);
    const defaultUri = vscode.Uri.joinPath(
      workspaceFolder?.uri ?? vscode.Uri.file(""),
      `time-summary_${folderName}_${date}.json`,
    );

    const uri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { JSON: ["json"] },
      saveLabel: "Export Summary",
    });

    if (!uri) {
      return;
    }

    try {
      const data = Buffer.from(result.value, "utf-8");
      await vscode.workspace.fs.writeFile(uri, data);
      await vscode.window.showInformationMessage("作業時間サマリーをエクスポートしました");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await vscode.window.showErrorMessage(
        `ファイルの書き込みに失敗しました: ${message}`,
      );
    }
  }
}
