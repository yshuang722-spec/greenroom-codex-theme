param([ValidateSet('Enable','Restore','Probe')][string]$Action='Enable', [switch]$WaitForClose, [switch]$BackgroundOnly)
$ErrorActionPreference='Stop'
$themeDirectory=$PSScriptRoot
$nodeCandidates=@(
  "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe",
  "$env:LOCALAPPDATA\OpenAI\Codex\runtimes\cua_node"
)
$nodeExe=$nodeCandidates[0]
if(!(Test-Path -LiteralPath $nodeExe)){
  $nodeExe=Get-ChildItem -LiteralPath $nodeCandidates[1] -Filter node.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
}
if(!$nodeExe -or !(Test-Path -LiteralPath $nodeExe)){throw 'Node.js runtime not found. Install Node.js 22 or use the bundled Codex runtime.'}
$stateDirectory=Join-Path $themeDirectory 'state'
. (Join-Path $themeDirectory 'AppActivation.ps1')
New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
$clientProcesses=@(Get-Process -Name ChatGPT,Codex -ErrorAction SilentlyContinue | Where-Object {$_.Path -like '*WindowsApps*\app\*'})
if($Action -eq 'Probe') { & $nodeExe (Join-Path $themeDirectory 'runtime.mjs') probe; exit $LASTEXITCODE }
if($Action -eq 'Restore') {
  Remove-Item -LiteralPath (Join-Path $stateDirectory 'theme-enabled') -Force -ErrorAction SilentlyContinue
  & $nodeExe (Join-Path $themeDirectory 'runtime.mjs') restore
  & $nodeExe (Join-Path $themeDirectory 'config.mjs') restore
  & $nodeExe (Join-Path $themeDirectory 'runtime.mjs') appearance-restore
  if($LASTEXITCODE -ne 0){throw 'Could not restore the live native appearance.'}
  Write-Host 'Restored live CSS and previous appearance settings. Restart the client normally to close the debugging port.'
  exit
}
function Start-ThemeWatcher {
  $runtimeFile=Join-Path $themeDirectory 'runtime.mjs'
  try { Start-Process -FilePath $nodeExe -ArgumentList ('"'+$runtimeFile+'" watch') -WorkingDirectory $themeDirectory -WindowStyle Hidden | Out-Null }
  catch { throw ('Could not start the independent theme watcher: '+$_.Exception.Message) }
}
function Confirm-Theme {
  $runtimeFile=Join-Path $themeDirectory 'runtime.mjs'
  for($attempt=0;$attempt -lt 20;$attempt++){
    & $nodeExe $runtimeFile verify | Out-Null
    if($LASTEXITCODE -eq 3){
      $health=Get-Content -LiteralPath (Join-Path $stateDirectory 'compatibility-status.json') -Raw -Encoding UTF8 | ConvertFrom-Json
      throw $health.message
    }
    if($LASTEXITCODE -eq 0){
      & $nodeExe $runtimeFile appearance-enable
      if($LASTEXITCODE -ne 0){$health=Get-Content -LiteralPath (Join-Path $stateDirectory 'compatibility-status.json') -Raw -Encoding UTF8 | ConvertFrom-Json;throw $health.message}
      $health=Get-Content -LiteralPath (Join-Path $stateDirectory 'compatibility-status.json') -Raw -Encoding UTF8 | ConvertFrom-Json
      Write-Host $health.message;return
    }
    Start-Sleep -Seconds 1
  }
  $healthPath=Join-Path $stateDirectory 'compatibility-status.json'
  if(Test-Path -LiteralPath $healthPath){$health=Get-Content -LiteralPath $healthPath -Raw -Encoding UTF8 | ConvertFrom-Json;throw $health.message}
  throw '无法完成主题检测。请确认 Codex 已启动并完成登录，再从托盘中重新开启主题。'
}
if($Action -eq 'Enable'){
  Set-Content -LiteralPath (Join-Path $stateDirectory 'theme-enabled') -Value 'enabled'
  if($BackgroundOnly){Start-ThemeWatcher;Write-Host 'Theme watcher ready; waiting for the animation launcher.';exit}
  $pages=@()
  try {
    $pages=Invoke-RestMethod 'http://127.0.0.1:19335/json/list' -TimeoutSec 2
  } catch {}
  if(@($pages | Where-Object {$_.url -like 'app://*'}).Count -gt 0){
    & $nodeExe (Join-Path $themeDirectory 'runtime.mjs') appearance-enable
    if($LASTEXITCODE -ne 0){$health=Get-Content -LiteralPath (Join-Path $stateDirectory 'compatibility-status.json') -Raw -Encoding UTF8 | ConvertFrom-Json;throw $health.message}
    Start-ThemeWatcher;Confirm-Theme;exit
  }
}
if($clientProcesses.Count -gt 0){
  $clientExe=$clientProcesses[0].Path
  if(!$WaitForClose){
    Write-Host 'Exit Codex/ChatGPT first, then run Enable again. Current chats are not closed by this script.'
    exit 2
  }
  Write-Host 'Theme is ready. Exit Codex/ChatGPT completely; this window will relaunch it with Green Room.'
  while(@(Get-Process -Name ChatGPT,Codex -ErrorAction SilentlyContinue | Where-Object {$_.Path -like '*WindowsApps*\app\*'}).Count -gt 0){Start-Sleep -Seconds 2}
}else{
  $saved=Join-Path $stateDirectory 'client-path.txt'
  if(Test-Path -LiteralPath $saved){$clientExe=(Get-Content -LiteralPath $saved -Raw).Trim()}
  if(!$clientExe -or !(Test-Path -LiteralPath $clientExe)){
    $package=Get-AppxPackage '*Codex*' -ErrorAction SilentlyContinue | Sort-Object Version -Descending | Select-Object -First 1
    if($package){$clientExe=Join-Path $package.InstallLocation 'app\ChatGPT.exe'}
  }
}
if(!$clientExe -or !(Test-Path -LiteralPath $clientExe)){throw 'Client not found. Open Codex once, then use Enable while waiting for it to close.'}
if(Get-NetTCPConnection -LocalPort 19335 -State Listen -ErrorAction SilentlyContinue){throw 'Port 19335 is in use. Restore/close the previous theme session before enabling again.'}
Set-Content -LiteralPath (Join-Path $stateDirectory 'client-path.txt') -Value $clientExe
& $nodeExe (Join-Path $themeDirectory 'config.mjs') apply
if($LASTEXITCODE -ne 0){throw 'Could not apply appearance settings.'}
Start-ThemeWatcher
$arguments='--remote-debugging-address=127.0.0.1 --remote-debugging-port=19335 --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-features=CalculateNativeWinOcclusion'
$activation=Start-CodexPackageApp $arguments $false
if($activation.Mode -ne 'activation-manager'){throw ('Codex opened without theme launch arguments: '+$activation.Error)}
Confirm-Theme
