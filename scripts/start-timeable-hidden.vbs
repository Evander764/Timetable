Option Explicit

Dim shell, fso, scriptDir, projectDir
Dim service, processes, process, commandLine

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectDir = fso.GetParentFolderName(scriptDir)

Set service = GetObject("winmgmts:\\.\root\cimv2")
Set processes = service.ExecQuery("SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name = 'electron.exe'")

For Each process In processes
  commandLine = ""
  If Not IsNull(process.CommandLine) Then
    commandLine = process.CommandLine
  End If

  If InStr(1, commandLine, projectDir, vbTextCompare) > 0 And InStr(1, commandLine, " --type=", vbTextCompare) = 0 Then
    shell.AppActivate "Timeable"
    WScript.Quit 0
  End If
Next

shell.CurrentDirectory = projectDir
shell.Run "cmd.exe /d /s /c npm.cmd run dev > dev-run.log 2>&1", 0, False
