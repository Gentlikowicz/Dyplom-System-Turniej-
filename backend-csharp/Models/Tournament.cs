namespace TurniejApp.Models;

public enum TournamentStatus
{
    Rejestracja,
    WTrakcie,
    Zakonczony
}

public class Tournament
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Sport { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public TournamentStatus Status { get; set; } = TournamentStatus.Rejestracja;

    public List<Team> Teams { get; set; } = new();
    public List<Match> Matches { get; set; } = new();

    // Number of rounds implied by the bracket, computed once teams are locked in.
    public int RoundCount => Matches.Count == 0 ? 0 : Matches.Max(m => m.Round);
}
