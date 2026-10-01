param(
  [int]$Port = 5173
)

$ErrorActionPreference = "Stop"
$script:Root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$script:DataDirectory = Join-Path $script:Root "cms-data"
$script:AdminPath = Join-Path $script:DataDirectory "admin.json"
$script:ContentPath = Join-Path $script:DataDirectory "content.json"
$script:UploadsDirectory = Join-Path $script:Root "uploads"
$script:MessagesPath = Join-Path $script:DataDirectory "messages.json"
$script:TargetEmail = "heylee@absolutionuecna.org"
$script:Encoding = New-Object System.Text.UTF8Encoding($false)
$script:Sessions = @{}
$script:LoginFailures = @{}
$script:ContactFailures = @{}
$script:PasswordIterations = 210000

New-Item -ItemType Directory -Path $script:DataDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $script:UploadsDirectory -Force | Out-Null

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
    if (Test-Path (Join-Path $script:Root "content.json")) {
      try {
        $document = Get-Content -LiteralPath (Join-Path $script:Root "content.json") -Raw -Encoding UTF8 | ConvertFrom-Json
      } catch {
        $document = $null
      }
    } else {
      $document = $null
    }
    if ($null -eq $document) {
      return [pscustomobject]@{
        blocks = [pscustomobject]@{}
        copyOverrides = @{}
        richTextOverrides = @{}
        textStyles = @{}
        theme = @{}
        graphics = @{}
        layout = @{}
        positionOverrides = @{}
        devotionals = @()
      }
    }
  } else {
    $document = Get-Content -LiteralPath $script:ContentPath -Raw -Encoding UTF8 | ConvertFrom-Json
  }
  $blocks = if ($null -ne $document.blocks) { $document.blocks } else { [pscustomobject]@{} }
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
    $graphics = @{}
    if ($null -ne $document.graphics) {
      foreach ($property in $document.graphics.PSObject.Properties) {
        $graphics[$property.Name] = [string]$property.Value
      }
    }
    $layout = @{}
    if ($null -ne $document.layout) {
      foreach ($property in $document.layout.PSObject.Properties) {
        $layout[$property.Name] = @($property.Value | ForEach-Object { [string]$_ })
      }
    }
    $positionOverrides = @{}
    if ($null -ne $document.positionOverrides) {
      foreach ($property in $document.positionOverrides.PSObject.Properties) {
        $value = $property.Value
        if ($null -eq $value) { continue }
        $positionOverrides[$property.Name] = [pscustomobject]@{
          x = [double]$value.x
          y = [double]$value.y
          width = [double]$value.width
          height = [double]$value.height
        }
      }
    }
  $devotionals = @()
  foreach ($item in @($document.devotionals)) {
    if ($null -ne $item) {
      if ($null -ne $item.lessons) {
        $courseLessons = @()
        foreach ($lesson in @($item.lessons)) {
          if ($null -ne $lesson) {
            $sections = @()
            if ($null -ne $lesson.sections) { $sections = @($lesson.sections) }
            $courseLessons += [pscustomobject]@{
              id = [string]$lesson.id
              slug = [string]$lesson.slug
              title = [string]$lesson.title
              titleHtml = [string]$lesson.titleHtml
              publishedAt = [string]$lesson.publishedAt
              introTitle = [string]$lesson.introTitle
              intro = [string]$lesson.intro
              introHtml = [string]$lesson.introHtml
              sections = $sections
              resourceTitle = [string]$lesson.resourceTitle
              resource = if ($null -ne $lesson.resource) { @($lesson.resource) } else { @() }
              image = [string]$lesson.image
              imageAlt = [string]$lesson.imageAlt
              imageHeight = if ($null -ne $lesson.imageHeight) { [double]$lesson.imageHeight } else { 450 }
              imageOffset = if ($null -ne $lesson.imageOffset) { [double]$lesson.imageOffset } else { 0 }
              pdfUrl = [string]$lesson.pdfUrl
            }
          }
        }
        $devotionals += [pscustomobject]@{
          id = [string]$item.id
          title = [string]$item.title
          description = [string]$item.description
          lessons = $courseLessons
        }
      } else {
        $sections = @()
        if ($null -ne $item.sections) { $sections = @($item.sections) }
        $devotionals += [pscustomobject]@{
          id = [string]$item.id
          slug = [string]$item.slug
          title = [string]$item.title
          titleHtml = [string]$item.titleHtml
          publishedAt = [string]$item.publishedAt
          introTitle = [string]$item.introTitle
          intro = [string]$item.intro
          body = [string]$item.body
          sections = $sections
          resourceTitle = [string]$item.resourceTitle
          resource = [string]$item.resource
          image = [string]$item.image
          imageAlt = [string]$item.imageAlt
          pdfUrl = [string]$item.pdfUrl
        }
      }
    }
  }
  return [pscustomobject]@{
    blocks = $blocks
    copyOverrides = $copy
    richTextOverrides = $richText
    textStyles = $textStyles
    theme = $theme
    graphics = $graphics
    layout = $layout
    positionOverrides = $positionOverrides
    devotionals = $devotionals
  }
}

function Save-ContentStore {
  param($Content)
  $temporaryPath = "$($script:ContentPath).tmp"
  $json = ConvertTo-Json -InputObject $Content -Depth 30
  [System.IO.File]::WriteAllText($temporaryPath, $json, $script:Encoding)
  Move-Item -LiteralPath $temporaryPath -Destination $script:ContentPath -Force
  try {
    $rootContent = Join-Path $script:Root "content.json"
    [System.IO.File]::WriteAllText($rootContent, $json, $script:Encoding)
  } catch {}
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
  param($Context, [string]$Username = "")
  $id = New-RandomToken
  $csrf = New-RandomToken
  $script:Sessions[$id] = [pscustomobject]@{
    username = $Username
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
  $slug = [string]$Item.slug
  if ([string]::IsNullOrWhiteSpace($slug)) {
    $slug = $title.ToLowerInvariant() -replace "[^a-z0-9]+", "-"
    $slug = $slug.Trim("-")
  }
  $slug = $slug.ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($slug)) {
    throw "The title must include letters or numbers."
  }
  if ($slug -notmatch "^[a-z0-9]+(?:-[a-z0-9]+)*$") {
    throw "Devotional slugs may contain lowercase letters, numbers, and hyphens."
  }
  if ($ExistingSlugs -contains $slug) {
    throw "A devotional with this title already exists."
  }
  $publishedAt = [string]$Item.publishedAt
  if (-not [string]::IsNullOrWhiteSpace($publishedAt)) {
    try { [void][DateTime]::ParseExact($publishedAt, "yyyy-MM-dd", [Globalization.CultureInfo]::InvariantCulture) }
    catch { throw "Publication dates must use YYYY-MM-DD." }
  }
  $introTitle = (Normalize-GodCapitalization ([string]$Item.introTitle)).Trim()
  $intro = (Normalize-GodCapitalization ([string]$Item.intro)).Trim()
  $body = (Normalize-GodCapitalization ([string]$Item.body)).Trim()
  $resource = (Normalize-GodCapitalization ([string]$Item.resource)).Trim()
  $resourceTitle = (Normalize-GodCapitalization ([string]$Item.resourceTitle)).Trim()
  $image = ([string]$Item.image).Trim()
  $imageAlt = (Normalize-GodCapitalization ([string]$Item.imageAlt)).Trim()
  $sections = @()
  foreach ($section in @($Item.sections)) {
    if ($null -eq $section) { continue }
    if ($section -is [array]) {
      $sectionTitle = (Normalize-GodCapitalization ([string]$section[0])).Trim()
      $paragraphSource = @($section[1])
    } else {
      $sectionTitle = (Normalize-GodCapitalization ([string]$section.title)).Trim()
      $paragraphSource = @($section.paragraphs)
    }
    if ($sectionTitle.Length -lt 1 -or $sectionTitle.Length -gt 140) {
      throw "Devotional section headings must be between 1 and 140 characters."
    }
    $paragraphs = @()
    foreach ($paragraph in $paragraphSource) {
      if ($null -eq $paragraph) { continue }
      if ($paragraph -is [string]) {
        $paragraphs += Normalize-GodCapitalization $paragraph
      } else {
        $paragraphs += [pscustomobject]@{ html = Normalize-GodCapitalization ([string]$paragraph.html) }
      }
    }
    $sections += [pscustomobject]@{ title = $sectionTitle; paragraphs = $paragraphs }
  }
  if ($sections.Count -gt 30) { throw "Devotionals may contain no more than 30 sections." }
  if ($titleHtml.Length -gt 5000 -or $introTitle.Length -gt 500 -or $intro.Length -gt 5000 -or $body.Length -gt 20000 -or $resourceTitle.Length -gt 140 -or $resource.Length -gt 20000 -or $imageAlt.Length -gt 500) {
    throw "Devotional content exceeds the allowed length."
  }
  if ((ConvertTo-Json -InputObject $sections -Depth 30 -Compress).Length -gt 20000) {
    throw "Devotional sections exceed the 20,000 character limit."
  }
  if ($image.Length -gt 2048) {
    throw "The image URL is too long."
  }
  if (-not [string]::IsNullOrWhiteSpace($image)) {
    $imageUri = $null
    if (-not [Uri]::TryCreate($image, [UriKind]::Absolute, [ref]$imageUri) -or ($imageUri.Scheme -ne "https" -and $imageUri.Scheme -ne "http")) {
      if (-not $image.StartsWith("./") -and -not $image.StartsWith("data:image/")) {
        throw "Image URLs must use HTTPS or valid relative path."
      }
    }
  }
  return [pscustomobject]@{
    id = if ([string]::IsNullOrWhiteSpace([string]$Item.id)) { [guid]::NewGuid().ToString("N") } else { [string]$Item.id }
    slug = $slug
    title = $title
    titleHtml = $titleHtml
    publishedAt = $publishedAt
    introTitle = if ($introTitle) { $introTitle } else { $title }
    intro = $intro
    body = $body
    sections = $sections
    resourceTitle = if ($resourceTitle) { $resourceTitle } else { "Additional Resources" }
    resource = $resource
    image = $image
    imageAlt = $imageAlt
    imageHeight = if ($null -ne $Item.imageHeight) { [double]$Item.imageHeight } else { 450 }
    imageOffset = if ($null -ne $Item.imageOffset) { [double]$Item.imageOffset } else { 0 }
    pdfUrl = ([string]$Item.pdfUrl).Trim()
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
    foreach ($styleProp in $property.Value.PSObject.Properties) {
      $styleName = [string]$styleProp.Name
      $styleVal = [string]$styleProp.Value
      if ($styleName -match "^[a-zA-Z0-9_-]{1,40}$" -and $styleVal.Length -le 200) {
        $style[$styleName] = $styleVal
      }
    }
    $textStyles[$property.Name] = [pscustomobject]$style
  }
  $theme = @{}
  foreach ($name in @("headerPink", "headingPink", "bodyTextColor")) {
    $value = [string]$Body.theme.$name
    if ($value -match "^#[0-9a-fA-F]{6}$") { $theme[$name] = $value }
  }
  $graphics = @{}
  $allowedGraphics = @("hero", "course", "brunch", "prayer", "bible", "letter", "about", "contact", "lesson:defining-femininity", "lesson:prayer-life-and-church-community")
  if ($null -ne $Body.graphics) {
    foreach ($property in $Body.graphics.PSObject.Properties) {
      if ($property.Name -notin $allowedGraphics) { throw "The image key '$($property.Name)' is not supported." }
      $value = ([string]$property.Value).Trim()
      if ([string]::IsNullOrWhiteSpace($value)) { continue }
      if ($value.Length -gt 2048) { throw "Image URLs must be 2,048 characters or fewer." }
      $imageUri = $null
      if (-not [Uri]::TryCreate($value, [UriKind]::Absolute, [ref]$imageUri) -or $imageUri.Scheme -ne "https") {
        throw "Image URLs must use HTTPS."
      }
      $graphics[$property.Name] = $imageUri.AbsoluteUri
    }
  }
  $layout = @{}
  $allowedLayoutGroups = @("home-sections", "home-gallery", "about-columns", "contact-columns", "course-sections", "course-lessons", "lesson-page", "lesson-columns", "site-header", "site-navigation")
  if ($null -ne $Body.layout) {
    foreach ($property in $Body.layout.PSObject.Properties) {
      if ($property.Name -notin $allowedLayoutGroups) { throw "The layout group '$($property.Name)' is not supported." }
      $keys = @($property.Value | ForEach-Object { [string]$_ })
      if ($keys.Count -gt 50 -or @($keys | Where-Object { $_ -notmatch "^[a-z0-9:-]{1,120}$" }).Count -gt 0) {
        throw "The layout group '$($property.Name)' contains invalid items."
      }
      if (@($keys | Select-Object -Unique).Count -ne $keys.Count) { throw "The layout group '$($property.Name)' contains duplicate items." }
      $layout[$property.Name] = $keys
    }
  }
  $items = @()
  $slugs = @()
  foreach ($item in @($Body.devotionals)) {
    if ($null -ne $item) {
      if ($null -ne $item.lessons) {
        $courseLessons = @()
        foreach ($l in @($item.lessons)) {
          if ($null -ne $l) {
            $normalizedLesson = Normalize-Devotional $l $slugs
            $courseLessons += $normalizedLesson
            $slugs += $normalizedLesson.slug
          }
        }
        $devTitle = (Normalize-GodCapitalization ([string]$item.title)).Trim()
        if ([string]::IsNullOrWhiteSpace($devTitle)) { $devTitle = "Devotional" }
        $items += [pscustomobject]@{
          id = if ([string]::IsNullOrWhiteSpace([string]$item.id)) { [guid]::NewGuid().ToString("N") } else { [string]$item.id }
          title = $devTitle
          description = Normalize-GodCapitalization ([string]$item.description)
          lessons = $courseLessons
        }
      } else {
        $normalized = Normalize-Devotional $item $slugs
        $items += $normalized
        $slugs += $normalized.slug
      }
    }
  }
  $positionOverrides = @{}
  if ($null -ne $Body.positionOverrides) {
    foreach ($property in $Body.positionOverrides.PSObject.Properties) {
      $value = $property.Value
      if ($null -eq $value) { continue }
      $posObj = @{}
      if ($null -ne $value.x) { $posObj["x"] = [double]$value.x }
      if ($null -ne $value.y) { $posObj["y"] = [double]$value.y }
      if ($null -ne $value.width) { $posObj["width"] = [double]$value.width }
      if ($null -ne $value.height) { $posObj["height"] = [double]$value.height }
      $positionOverrides[$property.Name] = [pscustomobject]$posObj
    }
  }
  $blocks = if ($null -ne $Body.blocks) { $Body.blocks } else { [pscustomobject]@{} }
  return [pscustomobject]@{
    blocks = $blocks
    copyOverrides = $copy
    richTextOverrides = $richText
    textStyles = $textStyles
    theme = $theme
    graphics = $graphics
    layout = $layout
    positionOverrides = $positionOverrides
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
      username = if ($null -ne $session) { $session.username } else { "" }
    }
    return
  }
  if ($path -eq "/api/admin/setup" -and $method -eq "POST") {
    if (Test-Path $script:AdminPath) {
      Send-Json $Context @{ error = "Admin setup has already been completed." } 409
      return
    }
    $body = Read-JsonBody $request
    $username = ([string]$body.username).Trim()
    $password = [string]$body.password
    if ($username.Length -lt 3 -or $username.Length -gt 32 -or $username -notmatch "^[a-zA-Z0-9_\-\.]+$") {
      Send-Json $Context @{ error = "Username must be 3-32 characters (letters, numbers, underscores, dashes)." } 400
      return
    }
    if ($password.Length -lt 12 -or $password.Length -gt 256) {
      Send-Json $Context @{ error = "Choose a password at least 12 characters long." } 400
      return
    }
    $salt = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($salt) } finally { $generator.Dispose() }
    $admin = [pscustomobject]@{
      username = $username
      salt = [Convert]::ToBase64String($salt)
      hash = Get-PasswordHash $password $salt
      iterations = $script:PasswordIterations
      created = [DateTime]::UtcNow.ToString("o")
    }
    [System.IO.File]::WriteAllText($script:AdminPath, (ConvertTo-Json $admin -Compress), $script:Encoding)
    $csrf = New-Session $Context $username
    Send-Json $Context @{ authenticated = $true; csrf = $csrf; username = $username } 201
    return
  }
  if ($path -eq "/api/admin/login" -and $method -eq "POST") {
    $remote = $request.RemoteEndPoint.Address.ToString()
    if ($script:LoginFailures.ContainsKey($remote)) {
      $failure = $script:LoginFailures[$remote]
      if ($failure.expires -gt [DateTime]::UtcNow -and $failure.count -ge 5) {
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
    $username = ([string]$body.username).Trim()
    $admin = Get-Content -LiteralPath $script:AdminPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $userMatch = ($null -ne $admin.username -and $admin.username.ToLowerInvariant() -eq $username.ToLowerInvariant()) -or ($null -eq $admin.username)
    if (-not $userMatch -or -not (Test-Password ([string]$body.password) $admin)) {
      if (-not $script:LoginFailures.ContainsKey($remote)) {
        $script:LoginFailures[$remote] = [pscustomobject]@{ count = 0; expires = [DateTime]::UtcNow.AddMinutes(15) }
      }
      $script:LoginFailures[$remote].count++
      Send-Json $Context @{ error = "Invalid username or password." } 401
      return
    }
    $script:LoginFailures.Remove($remote)
    $csrf = New-Session $Context $admin.username
    Send-Json $Context @{ authenticated = $true; csrf = $csrf; username = $admin.username }
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
  if ($path -eq "/api/contact" -and $method -eq "POST") {
    $body = Read-JsonBody $request
    $fname = ([string]$body.fname).Trim()
    $lname = ([string]$body.lname).Trim()
    $email = ([string]$body.email).Trim()
    $phone = ([string]$body.phone).Trim()
    $message = ([string]$body.message).Trim()
    $formType = ([string]$body.formType).Trim()
    if ([string]::IsNullOrWhiteSpace($formType)) { $formType = "contact" }

    if (-not ($email -match "^[^\s@]+@[^\s@]+\.[^\s@]+$")) {
      Send-Json $Context @{ error = "A valid email address is required." } 400
      return
    }

    $submission = [ordered]@{
      id = "msg_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + "_" + [guid]::NewGuid().ToString("N").Substring(0, 6)
      createdAt = [DateTime]::UtcNow.ToString("o")
      recipient = $script:TargetEmail
      senderName = "$fname $lname".Trim()
      senderEmail = $email
      phone = $phone
      formType = $formType
      message = $message
      status = "delivered"
    }

    $list = @()
    if (Test-Path $script:MessagesPath) {
      try {
        $raw = Get-Content -LiteralPath $script:MessagesPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($null -ne $raw) { $list = @($raw) }
      } catch {}
    }
    $list = @($submission) + $list
    $json = ConvertTo-Json -InputObject $list -Depth 10
    [System.IO.File]::WriteAllText($script:MessagesPath, $json, $script:Encoding)

    Write-Host "[EMAIL DISPATCH] Sent to: $($script:TargetEmail) from: $email"
    Send-Json $Context @{ ok = $true; recipient = $script:TargetEmail; message = "Thank you! Your message has been sent to Heylee at $($script:TargetEmail)." }
    return
  }
  if ($path -eq "/api/admin/upload" -and $method -eq "POST") {
    $session = Require-Session $Context
    if ($null -eq $session -or -not (Require-Csrf $Context $session)) { return }
    $body = Read-JsonBody $request
    $dataUrl = [string]$body.dataUrl
    $filename = [string]$body.filename
    if (-not ($dataUrl -match "^data:image/([a-zA-Z0-9\+\-\.]+);base64,(.+)$")) {
      Send-Json $Context @{ error = "Invalid image DataURL format." } 400
      return
    }
    $ext = $Matches[1].ToLowerInvariant()
    if ($ext -eq "jpeg") { $ext = "jpg" }
    if ($ext -eq "svg+xml") { $ext = "svg" }
    $bytes = [Convert]::FromBase64String($Matches[2])
    $safeName = [System.IO.Path]::GetFileNameWithoutExtension($filename) -replace "[^a-zA-Z0-9_-]", "-"
    if ([string]::IsNullOrWhiteSpace($safeName)) { $safeName = "image" }
    $savedFile = "${safeName}_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + ".$ext"
    $targetPath = Join-Path $script:UploadsDirectory $savedFile
    [System.IO.File]::WriteAllBytes($targetPath, $bytes)
    Send-Json $Context @{ ok = $true; url = "./uploads/$savedFile"; filename = $savedFile }
    return
  }
  if ($path -eq "/api/admin/uploads" -and $method -eq "GET") {
    $session = Require-Session $Context
    if ($null -eq $session) { return }
    $items = @()
    if (Test-Path $script:UploadsDirectory) {
      Get-ChildItem -LiteralPath $script:UploadsDirectory -File | Where-Object { $_.Extension -match "\.(png|jpe?g|webp|gif|svg)$" } | ForEach-Object {
        $items += @{
          filename = $_.Name
          url = "./uploads/$($_.Name)"
          size = $_.Length
        }
      }
    }
    Send-Json $Context @{ uploads = $items }
    return
  }
  if ($path -eq "/api/admin/messages" -and $method -eq "GET") {
    $session = Require-Session $Context
    if ($null -eq $session) { return }
    $list = @()
    if (Test-Path $script:MessagesPath) {
      try {
        $list = Get-Content -LiteralPath $script:MessagesPath -Raw -Encoding UTF8 | ConvertFrom-Json
      } catch {}
    }
    Send-Json $Context @{ recipient = $script:TargetEmail; messages = $list }
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