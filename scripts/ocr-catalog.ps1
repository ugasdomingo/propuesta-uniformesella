param([string]$InputDirectory = 'tmp/catalog/ocr-images', [string]$OutputDirectory = 'tmp/catalog/ocr')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType=WindowsRuntime] | Out-Null
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await-WinRT($operation, $resultType) {
  $task = $asTask.MakeGenericMethod($resultType).Invoke($null, @($operation))
  try { $task.Wait() } catch { Write-Host $task.Exception.ToString(); throw }
  return $task.Result
}
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
foreach ($inputImage in Get-ChildItem -LiteralPath $InputDirectory -Filter '*.png' | Sort-Object Name) {
  $output = Join-Path $OutputDirectory ($inputImage.BaseName + '.json')
  if (Test-Path -LiteralPath $output) { continue }
  $file = Await-WinRT ([Windows.Storage.StorageFile]::GetFileFromPathAsync($inputImage.FullName)) ([Windows.Storage.StorageFile])
  $stream = Await-WinRT ($file.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
  $decoder = Await-WinRT ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await-WinRT ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $result = Await-WinRT ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  $lines = @($result.Lines | ForEach-Object { @{text=$_.Text; words=@($_.Words | ForEach-Object { @{text=$_.Text; x=$_.BoundingRect.X; y=$_.BoundingRect.Y; w=$_.BoundingRect.Width; h=$_.BoundingRect.Height} })} })
  @{file=$inputImage.Name; text=$result.Text; lines=$lines} | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath $output -Encoding UTF8
  $stream.Dispose()
  $bitmap.Dispose()
  Write-Output $inputImage.BaseName
}
