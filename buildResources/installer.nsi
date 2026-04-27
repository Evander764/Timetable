!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "common.nsh"
!include "extractAppPackage.nsh"

!define INSTALL_REGISTRY_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"

RequestExecutionLevel user
InstallDir "$LOCALAPPDATA\Programs\${PRODUCT_FILENAME}"
ShowInstDetails show
ShowUninstDetails show

!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch ${PRODUCT_NAME}"
!define MUI_FINISHPAGE_NOREBOOTSUPPORT

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro addLangs

Function .onInit
  InitPluginsDir
  !insertmacro check64BitAndSetRegView
FunctionEnd

Section "Install" INSTALL_SECTION_ID
  SetShellVarContext current
  RMDir /r "$INSTDIR"
  CreateDirectory "$INSTDIR"
  SetOutPath "$INSTDIR"

  !insertmacro extractEmbeddedAppPackage
  WriteUninstaller "$INSTDIR\${UNINSTALL_FILENAME}"

  WriteRegStr HKCU "${INSTALL_REGISTRY_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKCU "${INSTALL_REGISTRY_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${INSTALL_REGISTRY_KEY}" "Publisher" "${COMPANY_NAME}"
  WriteRegStr HKCU "${INSTALL_REGISTRY_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${INSTALL_REGISTRY_KEY}" "DisplayIcon" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  WriteRegStr HKCU "${INSTALL_REGISTRY_KEY}" "UninstallString" "$INSTDIR\${UNINSTALL_FILENAME}"
  WriteRegDWORD HKCU "${INSTALL_REGISTRY_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${INSTALL_REGISTRY_KEY}" "NoRepair" 1
  !ifdef ESTIMATED_SIZE
    WriteRegDWORD HKCU "${INSTALL_REGISTRY_KEY}" "EstimatedSize" ${ESTIMATED_SIZE}
  !endif

  CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  CreateDirectory "$SMPROGRAMS\${SHORTCUT_NAME}"
  CreateShortCut "$SMPROGRAMS\${SHORTCUT_NAME}\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  CreateShortCut "$SMPROGRAMS\${SHORTCUT_NAME}\Uninstall ${SHORTCUT_NAME}.lnk" "$INSTDIR\${UNINSTALL_FILENAME}"
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
  Delete "$SMPROGRAMS\${SHORTCUT_NAME}\${SHORTCUT_NAME}.lnk"
  Delete "$SMPROGRAMS\${SHORTCUT_NAME}\Uninstall ${SHORTCUT_NAME}.lnk"
  RMDir "$SMPROGRAMS\${SHORTCUT_NAME}"
  DeleteRegKey HKCU "${INSTALL_REGISTRY_KEY}"
  RMDir /r "$INSTDIR"
SectionEnd
