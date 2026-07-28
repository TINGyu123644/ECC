# install.ps1 — shim: forward to install.js (Node). 路径解析全在 JS 里.
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& node "$ScriptDir/install.js" @args
exit $LASTEXITCODE
