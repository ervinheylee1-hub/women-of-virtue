param(
  [int]$Port = 5173
)

$ErrorActionPreference = "Stop"
$script:Root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$script:DataDirectory = Join-Path $script:Root "cms-data"
$script:AdminPath = Join-Path $script:DataDirectory "admin.json"
$script:ContentPath = Join-Path $script:DataDirectory "content.json"
$script:Encoding = New-Object System.Text.UTF8Encoding($false)
$script:Sessions = @{}
$script:LoginFailures = @{}
$script:PasswordIterations = 210000

New-Item -ItemType Directory -Path $script:DataDirectory -Force | Out-Null

function Set-SecurityHeaders {
  param($Response)
  $Response.Headers["X-Content-Type-Options"] = "nosniff"
  $Response.Headers["X-Frame-Options"] = "SAMEORIGIN"
  $Response.Headers["Referrer-Policy"] = "same-origin"
  $Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
}

function Send-Response {
  param(
    $Context,
    [int]$StatusCode,
    [string]$ContentType,
    [string]$Body
  )
  $bytes = $script:Encoding.GetBytes($Body)
  $response = $Context.Response
  $response.StatusCode = $StatusCode
  $response.ContentType = $ContentType
  $response.ContentEncoding = $script:Encoding
  $response.ContentLength64 = $bytes.Length
  Set-SecurityHeaders $response
  $response.OutputStream.Write($bytes, 0, $bytes.Length)
  $response.Close()
}

function Send-Json {
  param($Context, $Value, [int]$StatusCode = 200)
  $json = ConvertTo-Json -InputObject $Value -Depth 30 -Compress
  $Context.Response.Headers["Cache-Control"] = "no-store"
  Send-Response $Context $StatusCode "application/json; charset=utf-8" $json
}

function Read-JsonBody {
  param($Request)
  if ($Request.ContentLength64 -gt 1048576) {
    throw "Request body is too large."
  }
  $reader = New-Object System.IO.StreamReader($Request.InputStream, $Request.ContentEncoding)
  try {
    $body = $reader.ReadToEnd()
  } finally {
    $reader.Dispose()
  }
  if ([string]::IsNullOrWhiteSpace($body)) {
    return [pscustomobject]@{}
  }
  return ConvertFrom-Json -InputObject $body
}

function Read-ContentStore {
  if (-not (Test-Path $script:ContentPath)) {
    return [pscustomobject]@{
      copyOverrides = @{}
      richTextOverrides = @{}
      textStyles = @{}
      theme = @{}
      devotionals = @()
    }
  }
  $document = Get-Content -LiteralPath $script:ContentPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $copy = @{}
  if ($null -ne $document.copyOverrides) {
    foreach ($property in $document.copyOverrides.PSObject.Properties) {
      $copy[$property.Name] = [string]$property.Value
    }
  }
    $richText = @{}
    if ($null -ne $document.richTextOverrides) {
      foreach ($property in $document.richTextOverrides.PSObject.Properties) {
        $richText[$property.Name] = [string]$property.Value
      }
    }
    $textStyles = @{}
    if ($null -ne $document.textStyles) {
      foreach ($property in $document.textStyles.PSObject.Properties) {
        $textStyles[$property.Name] = $property.Value
      }
    }
    $theme = @{}
    if ($null -ne $document.theme) {
      foreach ($property in $document.theme.PSObject.Properties) {
        $theme[$property.Name] = [string]$property.Value
      }
    }
  $devotionals = @()
  foreach ($item in @($document.devotionals)) {
    if ($null -ne $item) {
      $devotionals += [pscustomobject]@{
        id = [string]$item.id
        slug = [string]$item.slug
        title = [string]$item.title
        titleHtml = [string]$item.titleHtml
        intro = [string]$item.intro
        body = [string]$item.body
        resource = [string]$item.resource
        image = [string]$item.image
      }
    }
  }
  return [pscustomobject]@{
    copyOverrides = $copy
    richTextOverrides = $richText
    textStyles = $textStyles
    theme = $theme
    devotionals = $devotionals
  }
}

function Save-ContentStore {
  param($Content)
  $temporaryPath = "$($script:ContentPath).tmp"
  $json = ConvertTo-Json -InputObject $Content -Depth 30
  [System.IO.File]::WriteAllText($temporaryPath, $json, $script:Encoding)
  Move-Item -LiteralPath $temporaryPath -Destination $script:ContentPath -Force
}

function New-RandomToken {
  $bytes = New-Object byte[] 32
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($bytes)
  } finally {
    $generator.Dispose()
  }
  return [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function Get-PasswordHash {
  param([string]$Password, [byte[]]$Salt)
  $derive = [System.Security.Cryptography.Rfc2898DeriveBytes]::new(
    $Password,
    $Salt,
    $script:PasswordIterations,
    [System.Security.Cryptography.HashAlgorithmName]::SHA256
  )
  try {
    return [Convert]::ToBase64String($derive.GetBytes(32))
  } finally {
    $derive.Dispose()
  }
}

function Test-Password {
  param([string]$Password, $Admin)
  $salt = [Convert]::FromBase64String($Admin.salt)
  $expected = [Convert]::FromBase64String($Admin.hash)
  $actual = [Convert]::FromBase64String((Get-PasswordHash $Password $salt))
  $difference = 0
  for ($index = 0; $index -lt $expected.Length; $index++) {
    $difference = $difference -bor ($expected[$index] -bxor $actual[$index])
  }
  return $difference -eq 0
}

function Normalize-GodCapitalization {
  param([string]$Text)
  $normalized = [regex]::Replace($Text, "(?i)\bgod['’]s\b", "God's")
  return [regex]::Replace($normalized, "(?i)\bgod\b", "God")
}

function New-Session {
  param($Context)
  $id = New-RandomToken
  $csrf = New-RandomToken
  $script:Sessions[$id] = [pscustomobject]@{
    csrf = $csrf
    expires = [DateTime]::UtcNow.AddMinutes(30)
  }
  $Context.Response.AppendHeader("Set-Cookie", "wov_session=$id; Path=/; HttpOnly; SameSite=Strict; Max-Age=1800")
  return $csrf
}

function Get-Session {
  param($Request)
  $cookie = $Request.Cookies["wov_session"]
  if ($null -eq $cookie -or [string]::IsNullOrWhiteSpace($cookie.Value)) {
    return $null
  }
  $id = $cookie.Value
  if (-not $script:Sessions.ContainsKey($id)) {
    return $null
  }
  $session = $script:Sessions[$id]
  if ($session.expires -lt [DateTime]::UtcNow) {
    $script:Sessions.Remove($id)
    return $null
  }
  $session.expires = [DateTime]::UtcNow.AddMinutes(30)
  return $session
}

function Require-Session {
  param($Context)
  $session = Get-Session $Context.Request
  if ($null -eq $session) {
    Send-Json $Context @{ error = "Authentication required." } 401
    return $null
  }
  return $session
}

function Require-Csrf {
  param($Context, $Session)
  if ($null -eq $Session -or $Context.Request.Headers["X-CSRF-Token"] -cne $Session.csrf) {
    Send-Json $Context @{ error = "Invalid or expired request token." } 403
    return $false
  }
  return $true
}

function Normalize-Devotional {
  param($Item, [string[]]$ExistingSlugs)
  $title = (Normalize-GodCapitalization ([string]$Item.title)).Trim()
  $titleHtml = Normalize-GodCapitalization ([string]$Item.titleHtml)
  if ($title.Length -lt 1 -or $title.Length -gt 140) {
    throw "Devotional titles must be between 1 and 140 characters."
  }
  $slug = $title.ToLowerInvariant() -replace "[^a-z0-9]+", "-"
  $slug = $slug.Trim("-")
  if ([string]::IsNullOrWhiteSpace($slug)) {
    throw "The title must include letters or numbers."
  }
  if ($ExistingSlugs -contains $slug) {
    throw "A devotional with this title already exists."
  }
  $intro = (Normalize-GodCapitalization ([string]$Item.intro)).Trim()
  $body = (Normalize-GodCapitalization ([string]$Item.body)).Trim()
  $resource = (Normalize-GodCapitalization ([string]$Item.resource)).Trim()
  $image = ([string]$Item.image).Trim()
  if ($titleHtml.Length -gt 5000 -or $intro.Length -gt 5000 -or $body.Length -gt 20000 -or $resource.Length -gt 20000) {
    throw "Devotional content exceeds the allowed length."
  }
  if ($image.Length -gt 2048) {
    throw "The image URL is too long."
  }
  if (-not [string]::IsNullOrWhiteSpace($image)) {
      $imageUri = $null
    if (-not [Uri]::TryCreate($image, [UriKind]::Absolute, [ref]$imageUri) -or $imageUri.Scheme -ne "https") {
      throw "Image URLs must use HTTPS."
    }
  }
  return [pscustomobject]@{
    id = [guid]::NewGuid().ToString("N")
    slug = $slug
    title = $title
    titleHtml = $titleHtml
    intro = $intro
    body = $body
    resource = $resource
    image = $image
  }
}

function Save-ContentRequest {
  param($Body)
  $copy = @{}
  $copyProperties = $Body.copyOverrides.PSObject.Properties
  if ($copyProperties.Count -gt 300) {
    throw "Too many copy overrides were submitted."
  }
  foreach ($property in $copyProperties) {
    if ($property.Name -notmatch "^[a-zA-Z0-9._:%-]{1,240}$") {
      throw "A text key contains invalid characters."
    }
    $value = Normalize-GodCapitalization ([string]$property.Value)
    if ($value.Length -gt 10000) {
      throw "Page text exceeds the 10,000 character limit."
    }
    $copy[$property.Name] = $value
  }
  $richText = @{}
  $richProperties = $Body.richTextOverrides.PSObject.Properties
  if ($richProperties.Count -gt 300) {
    throw "Too many rich-text overrides were submitted."
  }
  foreach ($property in $richProperties) {
    if ($property.Name -notmatch "^[a-zA-Z0-9._:%-]{1,240}$") { throw "A rich-text key contains invalid characters." }
    $value = Normalize-GodCapitalization ([string]$property.Value)
    if ($value.Length -gt 20000) { throw "Rich text exceeds the 20,000 character limit." }
    $richText[$property.Name] = $value
  }
  $textStyles = @{}
  $styleProperties = $Body.textStyles.PSObject.Properties
  if ($styleProperties.Count -gt 300) { throw "Too many text styles were submitted." }
  foreach ($property in $styleProperties) {
    if ($property.Name -notmatch "^[a-zA-Z0-9._:%-]{1,240}$") { throw "A style key contains invalid characters." }
    $style = [ordered]@{}
    if ($property.Value.fontFamily -in @("Georgia, serif", "Arial, sans-serif", "cursive")) { $style.fontFamily = $property.Value.fontFamily }
    if ([string]$property.Value.fontSize -match "^(?:1[0-9]|2[0-9]|3[0-6]|48)px$") { $style.fontSize = [string]$property.Value.fontSize }
    if ([string]$property.Value.color -match "^#[0-9a-fA-F]{6}$") { $style.color = [string]$property.Value.color }
    if ([string]$property.Value.textAlign -in @("left", "center", "right", "justify")) { $style.textAlign = [string]$property.Value.textAlign }
    if ([string]$property.Value.fontStyle -in @("normal", "italic")) { $style.fontStyle = [string]$property.Value.fontStyle }
    if ([string]$property.Value.textDecoration -in @("none", "underline")) { $style.textDecoration = [string]$property.Value.textDecoration }
    if ([string]$property.Value.fontWeight -in @("normal", "bold")) { $style.fontWeight = [string]$property.Value.fontWeight }
    $textStyles[$property.Name] = [pscustomobject]$style
  }
  $theme = @{}
  foreach ($name in @("headerPink", "headingPink", "bodyTextColor")) {
    $value = [string]$Body.theme.$name
    if ($value -match "^#[0-9a-fA-F]{6}$") { $theme[$name] = $value }
  }
  $items = @()
  $slugs = @("defining-femininity", "prayer-life-and-church-community")
  foreach ($item in @($Body.devotionals)) {
    $normalized = Normalize-Devotional $item $slugs
    $items += $normalized
    $slugs += $normalized.slug
  }
  return [pscustomobject]@{
    copyOverrides = $copy
    richTextOverrides = $richText
    textStyles = $textStyles
    theme = $theme
    devotionals = $items
  }
}

function Send-StaticFile {
  param($Context, [string]$Path)
  $relativePath = [Uri]::UnescapeDataString($Path.TrimStart("/")).Replace("/", [System.IO.Path]::DirectorySeparatorChar)
  if ([string]::IsNullOrWhiteSpace($relativePath)) {
    $relativePath = "index.html"
  }
  if ($relativePath -eq "admin") {
    $relativePath = "admin.html"
  }
  $filePath = [System.IO.Path]::GetFullPath((Join-Path $script:Root $relativePath))
  $rootPrefix = $script:Root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
  $dataPrefix = $script:DataDirectory.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
  $insideRoot = $filePath.Equals($script:Root, [StringComparison]::OrdinalIgnoreCase) -or $filePath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)
  $insidePrivateData = $filePath.Equals($script:DataDirectory, [StringComparison]::OrdinalIgnoreCase) -or $filePath.StartsWith($dataPrefix, [StringComparison]::OrdinalIgnoreCase)
  if (-not $insideRoot -or $insidePrivateData) {
    Send-Response $Context 404 "text/plain; charset=utf-8" "Not found"
    return
  }
  if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
    Send-Response $Context 404 "text/plain; charset=utf-8" "Not found"
    return
  }
  $types = @{
    ".html" = "text/html; charset=utf-8"
    ".css" = "text/css; charset=utf-8"
    ".js" = "text/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg" = "image/svg+xml"
    ".png" = "image/png"
    ".jpg" = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".ico" = "image/x-icon"
  }
  $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
  if (-not $types.ContainsKey($extension)) {
    Send-Response $Context 404 "text/plain; charset=utf-8" "Not found"
    return
  }
  $bytes = [System.IO.File]::ReadAllBytes($filePath)
  $Context.Response.StatusCode = 200
  $Context.Response.ContentType = $types[$extension]
  $Context.Response.ContentLength64 = $bytes.Length
  $Context.Response.Headers["Cache-Control"] = "no-store"
  Set-SecurityHeaders $Context.Response
  $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Context.Response.Close()
}

function Handle-Request {
  param($Context)
  $request = $Context.Request
  $method = $request.HttpMethod.ToUpperInvariant()
  $path = $request.Url.AbsolutePath.TrimEnd("/")
  if ([string]::IsNullOrWhiteSpace($path)) {
    $path = "/"
  }

  if ($path -eq "/api/public-content" -and $method -eq "GET") {
    Send-Json $Context (Read-ContentStore)
    return
  }
  if ($path -eq "/api/admin/status" -and $method -eq "GET") {
    $session = Get-Session $request
    Send-Json $Context @{
      setupRequired = -not (Test-Path $script:AdminPath)
      authenticated = ($null -ne $session)
      csrf = if ($null -ne $session) { $session.csrf } else { "" }
    }
    return
  }
  if ($path -eq "/api/admin/setup" -and $method -eq "POST") {
    if (Test-Path $script:AdminPath) {
      Send-Json $Context @{ error = "Admin setup has already been completed." } 409
      return
    }
    $body = Read-JsonBody $request
    $password = [string]$body.password
    if ($password.Length -lt 12 -or $password.Length -gt 256) {
      Send-Json $Context @{ error = "Choose a password at least 12 characters long." } 400
      return
    }
    $salt = New-Object byte[] 16
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($salt) } finally { $generator.Dispose() }
    $admin = [pscustomobject]@{
      salt = [Convert]::ToBase64String($salt)
      hash = Get-PasswordHash $password $salt
      iterations = $script:PasswordIterations
      created = [DateTime]::UtcNow.ToString("o")
    }
    [System.IO.File]::WriteAllText($script:AdminPath, (ConvertTo-Json $admin -Compress), $script:Encoding)
    $csrf = New-Session $Context
    Send-Json $Context @{ authenticated = $true; csrf = $csrf } 201
    return
  }
  if ($path -eq "/api/admin/login" -and $method -eq "POST") {
    $remote = $request.RemoteEndPoint.Address.ToString()
    if ($script:LoginFailures.ContainsKey($remote)) {
      $failure = $script:LoginFailures[$remote]
      if ($failure.expires -gt [DateTime]::UtcNow -and $failure.count -ge 6) {
        Send-Json $Context @{ error = "Too many sign-in attempts. Try again later." } 429
        return
      }
      if ($failure.expires -le [DateTime]::UtcNow) {
        $script:LoginFailures.Remove($remote)
      }
    }
    if (-not (Test-Path $script:AdminPath)) {
      Send-Json $Context @{ error = "Complete first-run admin setup first." } 409
      return
    }
    $body = Read-JsonBody $request
    $admin = Get-Content -LiteralPath $script:AdminPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not (Test-Password ([string]$body.password) $admin)) {
      if (-not $script:LoginFailures.ContainsKey($remote)) {
        $script:LoginFailures[$remote] = [pscustomobject]@{ count = 0; expires = [DateTime]::UtcNow.AddMinutes(10) }
      }
      $script:LoginFailures[$remote].count++
      Send-Json $Context @{ error = "The password is incorrect." } 401
      return
    }
    $script:LoginFailures.Remove($remote)
    $csrf = New-Session $Context
    Send-Json $Context @{ authenticated = $true; csrf = $csrf }
    return
  }
  if ($path -eq "/api/admin/logout" -and $method -eq "POST") {
    $session = Require-Session $Context
    if ($null -eq $session -or -not (Require-Csrf $Context $session)) { return }
    $cookie = $request.Cookies["wov_session"]
    if ($null -ne $cookie) { $script:Sessions.Remove($cookie.Value) }
    $Context.Response.AppendHeader("Set-Cookie", "wov_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0")
    Send-Json $Context @{ authenticated = $false }
    return
  }
  if ($path -eq "/api/admin/content" -and $method -eq "GET") {
    $session = Require-Session $Context
    if ($null -eq $session) { return }
    Send-Json $Context (Read-ContentStore)
    return
  }
  if ($path -eq "/api/admin/content" -and $method -eq "PUT") {
    $session = Require-Session $Context
    if ($null -eq $session -or -not (Require-Csrf $Context $session)) { return }
    try {
      $body = Read-JsonBody $request
      $content = Save-ContentRequest $body
      Save-ContentStore $content
      Send-Json $Context @{ saved = $true; devotionals = $content.devotionals.Count }
    } catch {
      Send-Json $Context @{ error = $_.Exception.Message } 400
    }
    return
  }
  if ($path.StartsWith("/api/", [StringComparison]::OrdinalIgnoreCase)) {
    Send-Json $Context @{ error = "Not found." } 404
    return
  }
  if ($method -ne "GET" -and $method -ne "HEAD") {
    Send-Response $Context 405 "text/plain; charset=utf-8" "Method not allowed"
    return
  }
  Send-StaticFile $Context $path
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
try {
  $listener.Start()
} catch {
  Write-Error "Could not start the local CMS server on port $Port. $($_.Exception.Message)"
  exit 1
}

Write-Host "Women of Virtue CMS: http://127.0.0.1:$Port/"
Write-Host "Admin panel: http://127.0.0.1:$Port/admin"
Write-Host "Bound to localhost only. Press Ctrl+C to stop."

while ($listener.IsListening) {
  $context = $null
  try {
    $context = $listener.GetContext()
    Handle-Request $context
  } catch {
    Write-Warning $_.Exception.Message
    if ($null -ne $context) {
      try { Send-Json $context @{ error = "The request could not be completed." } 500 } catch {}
    }
  }
}