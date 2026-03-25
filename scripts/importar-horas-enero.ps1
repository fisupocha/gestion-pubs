param(
  [string]$ExcelPath = "C:\Users\aranj\Desktop\balance 2026\01-BALANCE TOTAL DATOS ENERO.xlsm"
)

$ErrorActionPreference = "Stop"

function Normalize([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    return ""
  }

  $builder = New-Object System.Text.StringBuilder
  foreach ($char in $value.Normalize([Text.NormalizationForm]::FormD).ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($char) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($char)
    }
  }

  return (($builder.ToString().ToLower().Trim()) -replace "[^a-z0-9]+", "")
}

function Get-EnvValue([string]$name) {
  $line = Get-Content ".env.local" | Where-Object { $_ -match ("^" + [regex]::Escape($name) + "=") } | Select-Object -First 1
  if (-not $line) {
    throw "No se encontro $name en .env.local"
  }
  return ($line -replace ("^" + [regex]::Escape($name) + "="), "").Trim()
}

function Get-Headers() {
  $key = Get-EnvValue "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  return @{
    apikey = $key
    Authorization = "Bearer $key"
    "Content-Type" = "application/json"
    Prefer = "return=representation"
  }
}

function Invoke-SupaGet([string]$url, [string]$path) {
  return Invoke-RestMethod -Uri ($url + "/rest/v1/" + $path) -Headers (Get-Headers) -Method Get
}

function Invoke-SupaPost([string]$url, [string]$path, $body) {
  $payload =
    if ($body -is [System.Collections.IEnumerable] -and -not ($body -is [string]) -and -not ($body -is [hashtable]) -and -not ($body -is [pscustomobject])) {
      @($body)
    }
    else {
      $body
    }

  $json = $payload | ConvertTo-Json -Depth 6 -Compress

  try {
    return Invoke-RestMethod -Uri ($url + "/rest/v1/" + $path) -Headers (Get-Headers) -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($json))
  }
  catch {
    $preview = if ($json.Length -gt 500) { $json.Substring(0, 500) } else { $json }
    throw ("POST fallido en '" + $path + "'. JSON=" + $preview + " ERROR=" + $_.Exception.Message)
  }
}

function Split-Batches($items, [int]$size) {
  for ($i = 0; $i -lt $items.Count; $i += $size) {
    $end = [Math]::Min($i + $size - 1, $items.Count - 1)
    ,($items[$i..$end])
  }
}

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-ZipText($zip, [string]$entryName) {
  $entry = $zip.GetEntry($entryName)
  if (-not $entry) {
    return $null
  }

  $sr = New-Object System.IO.StreamReader($entry.Open())
  try {
    return $sr.ReadToEnd()
  }
  finally {
    $sr.Dispose()
  }
}

function Get-Shared([xml]$ss) {
  $shared = New-Object System.Collections.Generic.List[string]

  if ($ss -and $ss.sst.si) {
    foreach ($si in $ss.sst.si) {
      $text = ""
      if ($si.t) {
        $text = [string]$si.t
      }
      elseif ($si.r) {
        foreach ($run in $si.r) {
          if ($run.t) {
            $text += [string]$run.t
          }
        }
      }
      $shared.Add($text)
    }
  }

  return $shared
}

function Get-CellValue($cell, $shared) {
  $type = [string]$cell.t
  $value = [string]$cell.v

  if ($cell.is) {
    if ($cell.is.t) {
      return [string]$cell.is.t
    }

    if ($cell.is.r) {
      $text = ""
      foreach ($run in $cell.is.r) {
        if ($run.t) {
          $text += [string]$run.t
        }
      }

      if ($text) {
        return $text
      }
    }
  }

  if ($type -eq "s" -and $value -match "^\d+$") {
    $index = [int]$value
    if ($index -lt $shared.Count) {
      return $shared[$index]
    }
  }

  return $value
}

function Get-SheetCells([xml]$sheetXml, $shared) {
  $ns = New-Object System.Xml.XmlNamespaceManager($sheetXml.NameTable)
  $ns.AddNamespace("d", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
  $result = @{}

  foreach ($row in $sheetXml.SelectNodes("//d:sheetData/d:row", $ns)) {
    foreach ($cell in $row.c) {
      $result[[string]$cell.r] = Get-CellValue $cell $shared
    }
  }

  return $result
}

function Parse-Number([string]$value) {
  return [double](($value -replace ",", ".") -as [double])
}

$mapTipos = @{
  "C" = "camareros"
  "D" = "djs"
  "S" = "seguridad"
  "L" = "limpieza"
  "N" = "nico"
  "T" = "taquilla"
  "P" = "persofi"
}

$mapLocales = @{
  "AL" = "Tarantino"
  "AM" = "Cue"
  "AN" = "Hangar"
  "AO" = "Soho"
}

$supabaseUrl = Get-EnvValue "NEXT_PUBLIC_SUPABASE_URL"
$tipos = @((Invoke-SupaGet $supabaseUrl "tipos?select=id,nombre&order=nombre.asc") | Where-Object { $_ })
$familias = @((Invoke-SupaGet $supabaseUrl "familias?select=id,nombre,tipo_id&order=nombre.asc") | Where-Object { $_ })
$empresas = @((Invoke-SupaGet $supabaseUrl "empresas?select=id,nombre&order=nombre.asc") | Where-Object { $_ })
$empleadosExistentes = @(Invoke-SupaGet $supabaseUrl "empleados?select=id" | Where-Object { $_ })
$horasExistentes = @(Invoke-SupaGet $supabaseUrl "operativa_horas?select=id" | Where-Object { $_ })

if ($horasExistentes.Count -gt 0) {
  throw "La tabla operativa_horas no esta vacia. Importacion cancelada para evitar duplicados."
}

$tipoPersonal = $tipos | Where-Object { (Normalize ([string]$_.nombre)) -eq "personal" } | Select-Object -First 1
if (-not $tipoPersonal) {
  throw "No se encontro el tipo Personal en maestros."
}

$familiasPersonal = @{}
foreach ($familia in $familias | Where-Object { $_.tipo_id -eq $tipoPersonal.id }) {
  $familiasPersonal[(Normalize $familia.nombre)] = $familia
}

$localesMap = @{}
foreach ($empresa in $empresas) {
  $localesMap[(Normalize $empresa.nombre)] = $empresa
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($ExcelPath)
try {
  [xml]$sharedXml = Read-ZipText $zip "xl/sharedStrings.xml"
  $shared = Get-Shared $sharedXml

  [xml]$sueldosXml = Read-ZipText $zip "xl/worksheets/sheet33.xml"
  $sueldos = Get-SheetCells $sueldosXml $shared

  $empleadosImport = New-Object System.Collections.Generic.List[object]
  $mapRowEmpleado = @{}

  for ($row = 2; $row -le 108; $row++) {
    $letra = ([string]$sueldos["B$row"]).Trim().ToUpper()
    $nombre = ([string]$sueldos["C$row"]).Trim()
    $sueldo = Parse-Number ([string]$sueldos["AI$row"])
    $adelanto = Parse-Number ([string]$sueldos["AJ$row"])
    $pendiente = Parse-Number ([string]$sueldos["AK$row"])
    $horasMes = Parse-Number ([string]$sueldos["AM$row"])

    if (-not $nombre -or -not $mapTipos.ContainsKey($letra)) {
      continue
    }

    if ($sueldo -le 0 -and $horasMes -le 0) {
      continue
    }

    $tipoNombre = $mapTipos[$letra]
    $familia = $familiasPersonal[$tipoNombre]
    if (-not $familia) {
      throw "No se encontro la familia '$tipoNombre' dentro del tipo Personal."
    }

    $precioHora = if ($horasMes -gt 0) { [Math]::Round($sueldo / $horasMes, 4) } else { 0 }
    $empleado = [PSCustomObject]@{
      nombre = $nombre
      familia_id = $familia.id
      precio_sueldo = $precioHora
    }

    $empleadosImport.Add($empleado)
    $mapRowEmpleado[$row] = [PSCustomObject]@{
      nombre = $nombre
      familiaId = $familia.id
      tipoId = $tipoPersonal.id
      precioHora = $precioHora
      sueldo = $sueldo
      adelanto = $adelanto
      pendiente = $pendiente
      horasMes = $horasMes
    }
  }

  if ($empleadosImport.Count -eq 0) {
    throw "No se encontraron empleados validos para importar."
  }

  if ($empleadosExistentes.Count -eq 0) {
    [void](Invoke-SupaPost $supabaseUrl "empleados" $empleadosImport)
  }

  $empleadosCreados = @((Invoke-SupaGet $supabaseUrl "empleados?select=id,nombre&order=id.asc") | Where-Object { $_ })
  $empleadosPorNombre = @{}
  foreach ($empleado in $empleadosCreados) {
    $empleadosPorNombre[(Normalize $empleado.nombre)] = $empleado
  }

  $horasImport = New-Object System.Collections.Generic.List[object]

  for ($day = 1; $day -le 31; $day++) {
    $sheetName = "xl/worksheets/sheet$($day + 1).xml"
    [xml]$dayXml = Read-ZipText $zip $sheetName
    $dayCells = Get-SheetCells $dayXml $shared
    $titulo = [string]$dayCells["A1"]
    $match = [regex]::Match($titulo, "(\d{2})/(\d{2})/(\d{4})")
    $fecha =
      if ($match.Success) {
        "{0}-{1}-{2}" -f $match.Groups[3].Value, $match.Groups[2].Value, $match.Groups[1].Value
      }
      else {
        "2026-01-{0:d2}" -f $day
      }

    for ($dayRow = 3; $dayRow -le 102; $dayRow++) {
      $salaryRow = $dayRow - 1
      if (-not $mapRowEmpleado.ContainsKey($salaryRow)) {
        continue
      }

      $empleadoMeta = $mapRowEmpleado[$salaryRow]
      $empleadoCreado = $empleadosPorNombre[(Normalize $empleadoMeta.nombre)]
      if (-not $empleadoCreado) {
        throw "No se pudo resolver el empleado importado '$($empleadoMeta.nombre)'."
      }

      foreach ($column in $mapLocales.Keys) {
        $importeLocal = Parse-Number ([string]$dayCells["$column$dayRow"])
        if ($importeLocal -le 0) {
          continue
        }

        $localNombre = $mapLocales[$column]
        $local = $localesMap[(Normalize $localNombre)]
        if (-not $local) {
          throw "No se encontro el local '$localNombre' en maestros."
        }

        if ($empleadoMeta.precioHora -le 0) {
          throw "El empleado '$($empleadoMeta.nombre)' no tiene precio hora valido para convertir importes en horas."
        }

        $horasCalculadas = [Math]::Round($importeLocal / $empleadoMeta.precioHora, 2)

        $horasImport.Add([PSCustomObject]@{
          empleado_id = $empleadoCreado.id
          empresa_id = $local.id
          fecha_horas = $fecha
          tipo_id = $empleadoMeta.tipoId
          familia_id = $empleadoMeta.familiaId
          horas = $horasCalculadas
          precio_sueldo = $empleadoMeta.precioHora
          total_sueldo = [Math]::Round($importeLocal, 2)
          observaciones = "Importado desde Excel enero 2026"
        })
      }
    }
  }

  if ($horasImport.Count -eq 0) {
    throw "No se encontraron lineas de horas para importar."
  }

  foreach ($batch in Split-Batches $horasImport 100) {
    [void](Invoke-SupaPost $supabaseUrl "operativa_horas" $batch)
  }

  Write-Output ("EMPLEADOS_IMPORTADOS=" + $empleadosImport.Count)
  Write-Output ("HORAS_IMPORTADAS=" + $horasImport.Count)
}
finally {
  $zip.Dispose()
}
