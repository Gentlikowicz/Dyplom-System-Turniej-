using Microsoft.EntityFrameworkCore;
using TurniejApp.Data;
using TurniejApp.Models;

namespace TurniejApp.Services;

// Generates a single-elimination bracket for a tournament and handles advancing
// winners into the next round once a result is submitted.
public class BracketService
{
    private readonly AppDbContext _db;

    public BracketService(AppDbContext db)
    {
        _db = db;
    }

    public async Task GenerateBracketAsync(int tournamentId, List<string> teamNames)
    {
        var tournament = await _db.Tournaments.FindAsync(tournamentId)
            ?? throw new InvalidOperationException("Nie znaleziono turnieju.");

        var realTeams = teamNames
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Select(n => new Team { Name = n.Trim(), TournamentId = tournamentId })
            .ToList();

        int size = NextPowerOfTwo(Math.Max(realTeams.Count, 2));
        int byeCount = size - realTeams.Count;

        // Wolne losy trafiają do RÓŻNYCH meczów pierwszej rundy (byeCount < size / 2),
        // a kolejność meczów oraz stron jest losowa.
        var rng = new Random();
        var shuffledReal = realTeams.OrderBy(_ => rng.Next()).ToList();

        var pairs = new List<(Team First, Team Second)>();
        int next = 0;
        for (int i = 0; i < byeCount; i++)
        {
            var bye = new Team { Name = "— (wolny los)", TournamentId = tournamentId, IsBye = true };
            pairs.Add((shuffledReal[next++], bye));
        }
        while (next < shuffledReal.Count)
        {
            pairs.Add((shuffledReal[next], shuffledReal[next + 1]));
            next += 2;
        }

        var slots = new List<Team>();
        foreach (var pair in pairs.OrderBy(_ => rng.Next()))
        {
            if (rng.Next(2) == 0) { slots.Add(pair.First); slots.Add(pair.Second); }
            else { slots.Add(pair.Second); slots.Add(pair.First); }
        }

        _db.Teams.AddRange(slots);
        await _db.SaveChangesAsync();

        int totalRounds = (int)Math.Log2(size);
        var matchesByRound = new List<List<Match>>();

        // Build every round's matches first (later rounds start empty), then link them.
        for (int round = 1; round <= totalRounds; round++)
        {
            int matchesInRound = size / (int)Math.Pow(2, round);
            var roundMatches = new List<Match>();
            for (int pos = 0; pos < matchesInRound; pos++)
            {
                roundMatches.Add(new Match
                {
                    TournamentId = tournamentId,
                    Round = round,
                    Position = pos
                });
            }
            matchesByRound.Add(roundMatches);
        }

        // Fill round 1 with the actual teams.
        for (int pos = 0; pos < matchesByRound[0].Count; pos++)
        {
            var teamA = slots[pos * 2];
            var teamB = slots[pos * 2 + 1];
            matchesByRound[0][pos].TeamAId = teamA?.Id;
            matchesByRound[0][pos].TeamBId = teamB?.Id;
        }

        _db.Matches.AddRange(matchesByRound.SelectMany(r => r));
        await _db.SaveChangesAsync();

        // Link each match to its slot in the next round.
        for (int round = 0; round < matchesByRound.Count - 1; round++)
        {
            foreach (var match in matchesByRound[round])
            {
                var nextMatch = matchesByRound[round + 1][match.Position / 2];
                match.NextMatchId = nextMatch.Id;
                match.NextSlotIsA = match.Position % 2 == 0;
            }
        }
        await _db.SaveChangesAsync();

        tournament.Status = TournamentStatus.WTrakcie;
        await _db.SaveChangesAsync();

        // Auto-resolve any round-1 matches where one side is a bye.
        foreach (var match in matchesByRound[0])
        {
            await AutoAdvanceIfByeAsync(match.Id);
        }
    }

    public async Task SubmitResultAsync(int matchId, int scoreA, int scoreB)
    {
        var match = await _db.Matches.FindAsync(matchId)
            ?? throw new InvalidOperationException("Nie znaleziono meczu.");
        if (!match.IsReady) throw new InvalidOperationException("Mecz nie ma jeszcze obu drużyn.");
        if (scoreA == scoreB) throw new InvalidOperationException("Remis nie jest dozwolony w fazie pucharowej.");

        match.ScoreA = scoreA;
        match.ScoreB = scoreB;
        match.WinnerId = scoreA > scoreB ? match.TeamAId : match.TeamBId;
        await _db.SaveChangesAsync();

        await AdvanceWinnerAsync(match);
        await MaybeCompleteTournamentAsync(match.TournamentId);
    }

    private async Task AutoAdvanceIfByeAsync(int matchId)
    {
        var match = await _db.Matches.Include(m => m.TeamA).Include(m => m.TeamB)
            .FirstOrDefaultAsync(m => m.Id == matchId);
        if (match == null || !match.IsReady) return;

        bool aIsBye = match.TeamA?.IsBye == true;
        bool bIsBye = match.TeamB?.IsBye == true;
        if (!aIsBye && !bIsBye) return;

        match.WinnerId = aIsBye ? match.TeamBId : match.TeamAId;
        await _db.SaveChangesAsync();
        await AdvanceWinnerAsync(match);
    }

    private async Task AdvanceWinnerAsync(Match match)
    {
        if (match.NextMatchId == null || match.WinnerId == null) return;

        var nextMatch = await _db.Matches.FindAsync(match.NextMatchId.Value);
        if (nextMatch == null) return;

        if (match.NextSlotIsA) nextMatch.TeamAId = match.WinnerId;
        else nextMatch.TeamBId = match.WinnerId;

        await _db.SaveChangesAsync();

        // The team that advanced might immediately face a bye in the next round.
        await AutoAdvanceIfByeAsync(nextMatch.Id);
    }

    private async Task MaybeCompleteTournamentAsync(int tournamentId)
    {
        var allDecided = !await _db.Matches
            .Where(m => m.TournamentId == tournamentId)
            .AnyAsync(m => m.WinnerId == null);

        if (allDecided)
        {
            var tournament = await _db.Tournaments.FindAsync(tournamentId);
            if (tournament != null) tournament.Status = TournamentStatus.Zakonczony;
            await _db.SaveChangesAsync();
        }
    }

    private static int NextPowerOfTwo(int n)
    {
        int p = 1;
        while (p < n) p *= 2;
        return p;
    }
}
