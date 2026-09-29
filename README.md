# Turniej — system organizacji turniejów sportowych

Projekt składa się z dwóch części:

| Folder | Co zawiera | Jak uruchomić |
|---|---|---|
| `frontend-demo/` | Demo w HTML/CSS/JS (bez serwera) | Otwórz `index.html` w przeglądarce |
| `backend-csharp/` | Aplikacja ASP.NET Core Blazor Server (.NET 8) | `cd backend-csharp` → `dotnet restore` → `dotnet run` |

Obie części realizują tę samą logikę: generowanie drabinki pucharowej z wolnymi losami
i automatyczne awansowanie zwycięzców. Szczegóły architektury C# — `backend-csharp/README.md`.

## Struktura

```
Turniej/
├── README.md
├── frontend-demo/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── backend-csharp/
    ├── TurniejApp.csproj
    ├── Program.cs
    ├── Models/        (Tournament, Team, Match)
    ├── Data/          (AppDbContext)
    ├── Services/      (BracketService, TournamentService)
    ├── Components/    (Layout, Pages — Blazor)
    └── wwwroot/app.css
```
