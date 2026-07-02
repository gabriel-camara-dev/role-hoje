# setup.ps1
$currentFolder = Split-Path -Leaf (Get-Location)

# Gera uma chave JWT aleatória de 64 caracteres hexadecimais
$bytes = New-Object Byte[] 32
[System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$jwtSecret = [System.BitConverter]::ToString($bytes) -replace '-'

Write-Host "Removendo .env antigo e criando um novo a partir do .env.example..."

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
} else {
    Write-Host ".env ja existe; mantendo valores atuais e atualizando apenas os campos basicos."
}

(Get-Content .env) -replace "^APP_NAME=.*", "APP_NAME=$currentFolder" `
                 -replace "^JWT_SECRET=.*", "JWT_SECRET=$jwtSecret" `
                 -replace "^PROJECT_NAME=.*", "PROJECT_NAME=$currentFolder" | Set-Content .env

Write-Host "APP_NAME definido como: $currentFolder"
Write-Host "JWT_SECRET gerado automaticamente."