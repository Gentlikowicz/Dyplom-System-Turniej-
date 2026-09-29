namespace TurniejApp.Models;

public class Match
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public Tournament? Tournament { get; set; }

    // Round 1 = first round; higher numbers = later rounds. Position orders matches within a round (top to bottom).
    public int Round { get; set; }
    public int Position { get; set; }

    public int? TeamAId { get; set; }
    public Team? TeamA { get; set; }
    public int? TeamBId { get; set; }
    public Team? TeamB { get; set; }

    public int? ScoreA { get; set; }
    public int? ScoreB { get; set; }
    public int? WinnerId { get; set; }

    // The match in the next round this winner feeds into, and which slot (A/B) they land in.
    public int? NextMatchId { get; set; }
    public bool NextSlotIsA { get; set; }

    public bool IsDecided => WinnerId != null;
    public bool IsReady => TeamAId != null && TeamBId != null;
}
