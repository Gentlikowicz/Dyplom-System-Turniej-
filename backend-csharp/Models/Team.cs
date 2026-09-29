namespace TurniejApp.Models;

public class Team
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int TournamentId { get; set; }
    public Tournament? Tournament { get; set; }

    // True when this team was added only to fill the bracket to a power of two.
    public bool IsBye { get; set; } = false;
}
