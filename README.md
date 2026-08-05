# Git Time Tracker Plus

Gitブランチごとの作業時間を自動計測し、JSON形式で記録・出力するVS Code拡張機能。

## Features

- **ブランチ切り替え検知**: VS Code Git APIを利用してブランチの切り替えを自動検出し、セッションを切り替える
- **ウィンドウフォーカス連動**: ウィンドウのフォーカス状態を監視し、非アクティブ中は計測を一時停止する
- **自動保存**: 60秒間隔でストレージに保存し、クラッシュ時のデータ損失を最小限にする
- **クラッシュリカバリ**: 前回異常終了した場合、未終了セッションを自動で閉じて復旧する
- **30日保持**: 30日以上前のセッションデータを自動で削除する

## Commands

コマンドパレット (`Cmd+Shift+P` / `Ctrl+Shift+P`) から実行できます。

| コマンド | 説明 |
|----------|------|
| `Git Time Tracker: Export Time Log` | 全作業セッションをJSON形式でエクスポートする |
| `Git Time Tracker: Export Summary` | ブランチ別・日別の作業時間サマリーをJSON形式でエクスポートする |

### Export Time Log

全セッションの生データをJSON出力します。各セッションにはブランチ名・開始時刻・終了時刻が含まれます。

### Export Summary

直近30日間の作業時間をブランチ別・日別に集計し、分単位でJSON出力します。日をまたぐセッションは日付ごとに正しく分割されます。

## Requirements

- VS Code 1.125.0 以上
- VS Code の Git 拡張機能が有効であること

## License

See [LICENSE](LICENSE) for details.
