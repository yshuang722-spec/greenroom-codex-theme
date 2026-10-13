$GreenRoomAppIdentityFile=Join-Path $PSScriptRoot 'state\client-app.txt'
function Get-CodexAppId {
  $appIdFiles=@($GreenRoomAppIdentityFile,(Join-Path $env:USERPROFILE 'AppData\Local\Codex System Boot\client-app.txt'),(Join-Path $env:LOCALAPPDATA 'Codex System Boot\client-app.txt'))
  foreach($appIdFile in $appIdFiles){if(Test-Path -LiteralPath $appIdFile){$cached=(Get-Content -LiteralPath $appIdFile -Raw).Trim();if($cached.Contains('!')){return $cached}}}
  try {
    $item=Get-StartApps -ErrorAction Stop | Where-Object {$_.Name -match '(?i)Codex'} | Select-Object -First 1
    if($item -and $item.AppID -and $item.AppID.Contains('!')){return $item.AppID}
  } catch {}
  throw 'Codex application identity was not found.'
}
function Start-CodexPackageApp([string]$Arguments,[bool]$AllowFallback=$true) {
  $appId=Get-CodexAppId
  if(-not ('GreenRoomAppActivation' -as [type])){
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class GreenRoomAppActivation {
  [ComImport, Guid("2e941141-7f97-4756-ba1d-9decde894a3d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IApplicationActivationManager {
    [PreserveSig] int ActivateApplication([MarshalAs(UnmanagedType.LPWStr)] string appUserModelId,[MarshalAs(UnmanagedType.LPWStr)] string arguments,uint options,out uint processId);
  }
  public static uint Activate(string appUserModelId,string arguments) {
    Type managerType=Type.GetTypeFromCLSID(new Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C"),true);
    object manager=Activator.CreateInstance(managerType);
    uint processId=0;
    int result=((IApplicationActivationManager)manager).ActivateApplication(appUserModelId,arguments??String.Empty,0,out processId);
    if(result<0)Marshal.ThrowExceptionForHR(result);
    if(Marshal.IsComObject(manager))Marshal.FinalReleaseComObject(manager);
    return processId;
  }
}
'@
  }
  try {
    $processId=[GreenRoomAppActivation]::Activate($appId,$Arguments)
    return [pscustomobject]@{Mode='activation-manager';AppId=$appId;ProcessId=$processId;Error=$null}
  } catch {
    $activationError=$_.Exception.Message
    if(-not $AllowFallback){throw ('Codex activation with theme arguments failed: '+$activationError)}
    try {
      Start-Process -FilePath (Join-Path $env:WINDIR 'explorer.exe') -ArgumentList ('shell:AppsFolder\'+$appId) -WindowStyle Hidden | Out-Null
      return [pscustomobject]@{Mode='apps-folder-fallback';AppId=$appId;ProcessId=0;Error=$activationError}
    } catch {throw ('Codex activation failed: '+$activationError+'; AppsFolder fallback failed: '+$_.Exception.Message)}
  }
}
