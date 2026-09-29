# Turniej — system organizacji amatorskich turniejów sportowych

Projekt zaliczeniowy zrealizowany w technologii **ASP.NET Core Blazor Server (.NET 8)**
z wykorzystaniem **Entity Framework Core** (dostawca InMemory — brak konieczności
konfigurowania osobnej bazy danych na potrzeby demonstracji; łatwo podmienić na
`UseSqlServer(...)` lub `UseSqlite(...)` w `Program.cs`).

## Funkcjonalność

- Zakładanie turnieju z dowolną liczbą zgłoszonych drużyn
- **Automatyczne generowanie drabinki pucharowej** (system pojedynczej eliminacji),
  z automatycznym doborem wolnych losów (bye), gdy liczba drużyn nie jest potęgą dwójki
- Wprowadzanie wyników meczów i **automatyczne awansowanie zwycięzcy** do kolejnej rundy
- Wizualizacja drabinki turniejowej rundami (ćwierćfinał, półfinał, finał)
- Dwa tryby widoku: **Organizator** (wpisuje wyniki) i **Widz** (tylko podgląd)
- Automatyczne oznaczenie turnieju jako zakończonego po rozegraniu finału

## Architektura

- `Models/` — encje domenowe: `Tournament`, `Team`, `Match`
- `Data/AppDbContext.cs` — kontekst EF Core
- `Services/BracketService.cs` — logika generowania drabinki i awansowania zwycięzców
  (algorytm: dopełnienie liczby drużyn do najbliższej potęgi dwójki wolnymi losami,
  budowa struktury rund, powiązanie każdego meczu z meczem kolejnej rundy)
- `Services/TournamentService.cs` — odczyt/zapis turniejów
- `Components/Pages/` — strony Blazor (Start, Turnieje, Nowy turniej, Szczegóły turnieju)

## Uruchomienie

Wymagany .NET 8 SDK.

```bash
dotnet restore
dotnet run
```

Aplikacja domyślnie wystartuje pod adresem podanym w konsoli (zwykle `https://localhost:5001`).

## Możliwe rozszerzenia (na wypadek pytań komisji)

- Podpięcie prawdziwej bazy danych (SQL Server / SQLite) zamiast dostawcy InMemory
- Autoryzacja ról poprzez ASP.NET Core Identity zamiast prostego przełącznika trybu
- Obsługa systemu grupowego lub podwójnej eliminacji jako alternatywy dla pojedynczej eliminacji
- Powiadomienia e-mail do drużyn o terminie i wyniku meczu
