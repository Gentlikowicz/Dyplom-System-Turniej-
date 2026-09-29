using Microsoft.EntityFrameworkCore;
using TurniejApp.Data;
using TurniejApp.Models;

namespace TurniejApp.Services;

public class TournamentService
{
    private readonly AppDbContext _db;

    public TournamentService(AppDbContext db)
    {
        _db = db;
    }

    public Task<List<Tournament>> GetAllAsync() =>
        _db.Tournaments.Include(t => t.Teams).OrderByDescending(t => t.CreatedAt).ToListAsync();

    public Task<Tournament?> GetByIdAsync(int id) =>
        _db.Tournaments
            .Include(t => t.Teams)
            .Include(t => t.Matches).ThenInclude(m => m.TeamA)
            .Include(t => t.Matches).ThenInclude(m => m.TeamB)
            .FirstOrDefaultAsync(t => t.Id == id);

    public async Task<Tournament> CreateAsync(string name, string sport, string description)
    {
        var tournament = new Tournament { Name = name, Sport = sport, Description = description };
        _db.Tournaments.Add(tournament);
        await _db.SaveChangesAsync();
        return tournament;
    }
}
